const express = require('express');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

const BRAIN_PREFIX = (process.env.BRAIN_PROXY_PREFIX || '/brain').replace(/\/$/, '');
const BRAIN_PROXY_FILE = path.join(__dirname, 'config', 'brain-proxy-target.json');

function loadBrainTargetFromFile() {
  try {
    const raw = fs.readFileSync(BRAIN_PROXY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return String(parsed.url || parsed.target || '').replace(/\/$/, '');
  } catch {
    return '';
  }
}

const fileBrainTarget = loadBrainTargetFromFile();
const BRAIN_TARGET = (process.env.BRAIN_PROXY_TARGET || fileBrainTarget || '').replace(/\/$/, '');
const BRAIN_ENABLED =
  (process.env.BRAIN_PROXY_ENABLED === '1'
    || (process.env.BRAIN_PROXY_ENABLED !== '0' && Boolean(fileBrainTarget)))
  && BRAIN_TARGET;

console.log(`[myk-hub] BRAIN_PROXY enabled=${!!BRAIN_ENABLED} prefix=${BRAIN_PREFIX} target=${BRAIN_TARGET ? BRAIN_TARGET.slice(0, 40) + '...' : '(empty)'}`);

// Map each hostname to its site folder under sites/
const SITE_MAP = {
  'patemusic.live': 'pate',
  'www.patemusic.live': 'pate',
  'myk.ac': 'myk',
  'www.myk.ac': 'myk',
  'pate.myk.ac': 'pate',
  'lti.myk.ac': 'lti',
  'ltibyjmichael.com': 'lti',
  'www.ltibyjmichael.com': 'lti',
  'designbyjmichael.com': 'lti',
  'www.designbyjmichael.com': 'lti',
};

const SITES_ROOT = path.join(__dirname, 'sites');

function hostCandidates(req) {
  const parts = [];
  const add = (value) => {
    if (!value) return;
    const raw = Array.isArray(value) ? value.join(',') : String(value);
    for (const piece of raw.toLowerCase().split(',')) {
      const host = piece.trim().split(':')[0];
      if (host) parts.push(host);
    }
  };
  // X-Hub-Host is set by the Cloudflare worker and is not rewritten by GoDaddy edge.
  add(req.headers['x-hub-host']);
  add(req.headers['x-forwarded-host']);
  add(req.headers.host);
  return parts;
}

function resolveSite(req) {
  for (const host of hostCandidates(req)) {
    const site = SITE_MAP[host];
    if (site) return site;
  }
  return 'myk';
}

if (BRAIN_ENABLED) {
  app.use(
    BRAIN_PREFIX,
    createProxyMiddleware({
      target: BRAIN_TARGET,
      changeOrigin: true,
      ws: true,
      pathRewrite: { [`^${BRAIN_PREFIX}`]: '' },
      on: {
        proxyReq(proxyReq) {
          proxyReq.setHeader('X-Forwarded-Prefix', BRAIN_PREFIX);
          proxyReq.setHeader('X-Forwarded-Proto', 'https');
        },
      },
    })
  );
}

app.get(['/health', '/_health/liveness', '/_health/readiness'], (_req, res) => {
  res.json({ ok: true, service: 'myk-hub' });
});

// Force HTTPS behind GoDaddy / Cloudflare reverse proxy
app.use((req, res, next) => {
  const proto = req.headers['x-forwarded-proto'];
  if (proto === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Security headers for all sites
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

function isBrainPath(req) {
  const p = (req.path || req.url.split('?')[0] || '').replace(/\/$/, '') || '/';
  return p === BRAIN_PREFIX || p.startsWith(`${BRAIN_PREFIX}/`);
}

// Per-domain static file serving
app.use((req, res, next) => {
  if (BRAIN_ENABLED && isBrainPath(req)) return next();

  const site = resolveSite(req);
  const siteDir = path.join(SITES_ROOT, site);

  express.static(siteDir, {
    index: ['index.html'],
    extensions: ['html'],
    fallthrough: true,
  })(req, res, next);
});

// SPA / clean URL fallback — serve index.html for unmatched routes
app.get('*', (req, res, next) => {
  if (BRAIN_ENABLED && isBrainPath(req)) {
    res.status(502).json({
      ok: false,
      error: 'brain_proxy_unavailable',
      hint: 'Check BRAIN_PROXY_TARGET and redeploy myk-hub',
    });
    return;
  }
  const site = resolveSite(req);
  res.sendFile(path.join(SITES_ROOT, site, 'index.html'));
});

const server = app;
server.listen(process.env.PORT || 20010, '0.0.0.0', () => {
  const port = process.env.PORT || 20010;
  console.log(`MYK Hub running on 0.0.0.0:${port}`);
  if (BRAIN_ENABLED) {
    console.log(`Brain proxy: ${BRAIN_PREFIX} -> ${BRAIN_TARGET}`);
  }
});
