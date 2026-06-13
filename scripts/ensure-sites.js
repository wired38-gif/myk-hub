#!/usr/bin/env node
/**
 * Verify portfolio site assets exist before build/start.
 * GoDaddy deploy fails if sites/<site>/index.html is missing from the repo root.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REQUIRED = [
  'sites/myk/index.html',
  'sites/pate/index.html',
  'sites/lti/index.html',
];

const missing = REQUIRED.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));

if (missing.length) {
  console.error('[ensure-sites] Missing required site files:');
  for (const rel of missing) {
    console.error(`  - ${rel}`);
  }
  console.error(
    '[ensure-sites] Add these files to the repository root (alongside server.js) and redeploy.'
  );
  process.exit(1);
}

console.log('[ensure-sites] All required site files present.');
process.exit(0);
