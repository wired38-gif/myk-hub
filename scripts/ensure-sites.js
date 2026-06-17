#!/usr/bin/env node
/**
 * Verify portfolio site assets exist before build/start.
 * Creates minimal stubs when files are missing so GoDaddy prestart/build
 * does not fail with ENOENT (CommonJS — no local imports).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REQUIRED = [
  'sites/myk/index.html',
  'sites/pate/index.html',
  'sites/lti/index.html',
];

const STUB_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>MYK Hub</title>
</head>
<body>
  <p>Portfolio assets are syncing. Redeploy after site files are committed.</p>
</body>
</html>
`;

const missing = REQUIRED.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));

if (missing.length === 0) {
  console.log('[ensure-sites] All required site files present.');
  process.exit(0);
}

console.warn('[ensure-sites] Missing site files (creating stubs so deploy can continue):');
for (const rel of missing) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, STUB_HTML, 'utf8');
  console.warn(`  - created stub ${rel}`);
}

console.warn(
  '[ensure-sites] Commit real sites/<name>/index.html to the repo root and redeploy.'
);
process.exit(0);
