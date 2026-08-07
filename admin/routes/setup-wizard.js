/**
 * Setup Wizard / Integration Routes
 * GET  /api/admin/integrations         — get all integration settings
 * PUT  /api/admin/integrations         — save integration settings
 * POST /api/admin/integrations/test    — test a specific integration connection
 */

const { requireAdmin } = require('../middleware');
const { getIntegrationSettings, saveIntegrationSettings } = require('../db');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function handleGetIntegrations(req, res) {
  requireAdmin(req, res, () => {
    const settings = getIntegrationSettings();
    // Mask secret keys in response — show only first/last 4 chars
    const masked = maskSecrets(settings);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(masked));
  });
}

async function handleSaveIntegrations(req, res) {
  requireAdmin(req, res, async () => {
    let body;
    try { body = await readBody(req); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
      return;
    }
    const current = getIntegrationSettings();
    // Merge: don't overwrite existing secret with masked placeholder
    const merged = deepMergeSkipMasked(current, body);
    const saved = saveIntegrationSettings(merged);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(maskSecrets(saved)));
  });
}

async function handleTestIntegration(req, res) {
  requireAdmin(req, res, async () => {
    let body;
    try { body = await readBody(req); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
      return;
    }
    const { provider } = body;
    const settings = getIntegrationSettings();
    const config = settings[provider];
    if (!config) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Unknown provider: ${provider}` }));
      return;
    }
    // Simulate connection test — replace with real API calls
    const hasCredentials = Object.values(config).some(v => typeof v === 'string' && v.length > 0);
    if (!hasCredentials) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'No credentials configured yet' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: `${provider} credentials saved. Live connection test requires valid API keys.` }));
  });
}

// ── helpers ────────────────────────────────────────────────────────────────

const SECRET_FIELDS = ['apiKey', 'appSecret', 'secretKey', 'clientSecret', 'webhookSecret', 'mwsToken', 'accessToken'];

function maskValue(val) {
  if (typeof val !== 'string' || val.length < 8) return val;
  return val.slice(0, 4) + '••••••••' + val.slice(-4);
}

function maskSecrets(obj, depth = 0) {
  if (depth > 4 || typeof obj !== 'object' || obj === null) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_FIELDS.includes(k) && typeof v === 'string' && v.length > 0) {
      out[k] = maskValue(v);
    } else if (typeof v === 'object' && v !== null) {
      out[k] = maskSecrets(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function isMasked(val) {
  return typeof val === 'string' && val.includes('••••••••');
}

function deepMergeSkipMasked(target, source, depth = 0) {
  if (depth > 4) return source;
  const out = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (SECRET_FIELDS.includes(k) && isMasked(v)) {
      // Keep the existing unmasked value
      continue;
    } else if (typeof v === 'object' && v !== null && typeof target[k] === 'object') {
      out[k] = deepMergeSkipMasked(target[k], v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

module.exports = { handleGetIntegrations, handleSaveIntegrations, handleTestIntegration };
