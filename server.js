const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Map each hostname to its site folder
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

function resolveSite(hostHeader) {
  const host = (hostHeader || '').toLowerCase().split(':')[0];
  return SITE_MAP[host] || 'myk';
}

app.use((req, res, next) => {
  const proto = req.headers['x-forwarded-proto'];
  if (proto && proto !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use((req, res, next) => {
  const site = resolveSite(req.headers.host);
  const siteRoot = path.join(__dirname, 'sites', site);
  const indexPath = path.join(siteRoot, 'index.html');

  // Serve real files under the site root (assets, images, etc.)
  if (req.path !== '/' && !req.path.endsWith('/')) {
    const safeRel = path.normalize(decodeURIComponent(req.path)).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(siteRoot, safeRel);
    if (filePath.startsWith(siteRoot) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
  }

  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  return res.status(404).send('Site not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MYK Hub running on port ${PORT}`);
});
