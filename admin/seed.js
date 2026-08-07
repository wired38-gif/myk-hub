/**
 * Admin seed script — creates the master admin account from env vars.
 * Run once: node admin/seed.js
 * Or called automatically on first server start if no admins exist.
 */

const { hashPassword } = require('./auth');
const { getAdminUsers, createAdminUser } = require('./db');

async function seedMasterAdmin() {
  const existing = getAdminUsers();
  if (existing.length > 0) {
    console.log('[SEED] Admin users already exist — skipping seed.');
    return;
  }

  const email = process.env.ADMIN_SEED_EMAIL || 'mike@myk.com';
  const password = process.env.ADMIN_SEED_PASSWORD || process.env.ADMIN_PASSWORD || '87188718';

  if (!password) {
    console.error('[SEED] ADMIN_SEED_PASSWORD env var is not set. Cannot seed admin.');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = createAdminUser({ email, passwordHash, role: 'superadmin', createdBy: 'seed' });

  console.log(`[SEED] ✅ Master admin created: ${user.email} (role: ${user.role})`);
}

// Run standalone: node admin/seed.js
if (require.main === module) {
  // Load .env from root if present
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [k, ...v] = trimmed.split('=');
          if (k) process.env[k.trim()] = v.join('=').trim();
        }
      });
    }
  } catch (e) { /* ignore */ }

  seedMasterAdmin()
    .then(() => process.exit(0))
    .catch(err => { console.error('[SEED] Error:', err.message); process.exit(1); });
}

module.exports = { seedMasterAdmin };
