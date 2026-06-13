const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

const BRAIN_PREFIX = (process.env.BRAIN_PROXY_PREFIX || '/brain').replace(/\/$/, '');
const BRAIN_TARGET = (process.env.BRAIN_PROXY_TARGET || '').replace(/\/$/, '');
const BRAIN_ENABLED = process.env.BRAIN_PROXY_ENABLED === '1' && BRAIN_TARGET;

console.log(`[myk-hub] BRAIN_PROXY enabled=${!!BRAIN_ENABLED} prefix=${BRAIN_PREFIX} target=${BRAIN_TARGET ? BRAIN_TARGET.slice(0, 40) + '...' : '(empty)'}`);

// Map each hostname to its site folder under sites/
const SITE_MAP = {
  'patemusic.live': 'pate',
  'www.patemusic.live': 'pate',
  'myk.ac': 'myk',
  'www.myk.ac': 'myk',
  'ltibyjmichael.com': 'lti',
  'www.ltibyjmichael.com': 'lti',
  'designbyjmichael.com': 'lti',
  'www.designbyjmichael.com': 'lti',
};

const SITES_ROOT = path.join(__dirname, 'sites');

function resolveSite(host) {
  const normalized = (host || '').toLowerCase().split(':')[0];
  return SITE_MAP[normalized] || 'myk';
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

// Per-domain static file serving
app.use((req, res, next) => {
  const site = resolveSite(req.headers.host);
  const siteDir = path.join(SITES_ROOT, site);

  express.static(siteDir, {
    index: ['index.html'],
    extensions: ['html'],
    fallthrough: true,
  })(req, res, next);
});

// SPA / clean URL fallback — serve index.html for unmatched routes
app.get('*', (req, res) => {
  const site = resolveSite(req.headers.host);
  res.sendFile(path.join(SITES_ROOT, site, 'index.html'));
});

const PORT = process.env.PORT || 20010;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`MYK Hub running on ${HOST}:${PORT}`);
  if (BRAIN_ENABLED) {
    console.log(`Brain proxy: ${BRAIN_PREFIX} -> ${BRAIN_TARGET}`);
  }
});
