const express = require('express');
const path = require('path');
const app = express();

// Map each hostname to its site folder
const SITE_MAP = {
  'patemusic.live':      'pate',
  'www.patemusic.live':  'pate',
  'myk.ac':              'myk',
  'www.myk.ac':          'myk',
  'ltibyjmichael.com':   'lti',
  'www.ltibyjmichael.com': 'lti',
};

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MYK Hub running on port ${PORT}`);
});
