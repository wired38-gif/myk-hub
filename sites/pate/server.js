const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Force HTTPS on GoDaddy (X-Forwarded-Proto header) ──
app.use((req, res, next) => {
  const proto = req.headers['x-forwarded-proto'];
  if (proto && proto !== 'https') {
    return res.redirect(301, 'https://' + req.headers.host + req.url);
  }
  next();
});

// ── Serve static files ──
app.use(express.static(path.join(__dirname)));

// ── Named HTML routes ──
app.get('/bio', (req, res) => {
  res.sendFile(path.join(__dirname, 'bio.html'));
});
app.get('/epk', (req, res) => {
  res.sendFile(path.join(__dirname, 'epk.html'));
});

// ── Fallback ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PATE Music running on port ${PORT}`);
});
