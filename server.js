const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

const BRAIN_PREFIX = (process.env.BRAIN_PROXY_PREFIX || '/brain').replace(/\/$/, '');
const BRAIN_TARGET = (process.env.BRAIN_PROXY_TARGET || '').replace(/\/$/, '');
const BRAIN_ENABLED = process.env.BRAIN_PROXY_ENABLED === '1' && BRAIN_TARGET;

// Map each hostname to its site folder
const SITE_MAP = {
  'patemusic.live':      'pate',
  'www.patemusic.live':  'pate',
  'myk.ac':              'myk',
  'www.myk.ac':          'myk',
  'ltibyjmichael.com':   'lti',
  'www.ltibyjmichael.com': 'lti',
};

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

// Serve static assets (css, js, images) per site if needed in future
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase().split(':')[0];
  const site = SITE_MAP[host];

  if (!site) {
    // Unknown domain — fall back to MYK
    return res.sendFile(path.join(__dirname, 'sites', 'myk', 'index.html'));
  }

  // Serve the matching site's index.html for all routes under that domain
  res.sendFile(path.join(__dirname, 'sites', site, 'index.html'));
});

const PORT = process.env.PORT || 20010;
app.listen(PORT, () => {
  console.log(`MYK Hub running on port ${PORT}`);
  if (BRAIN_ENABLED) {
    console.log(`Brain proxy: ${BRAIN_PREFIX} -> ${BRAIN_TARGET}`);
  }
});
