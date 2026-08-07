/**
 * Admin Auth Routes
 * POST /api/admin/auth/login   — authenticate admin, return JWT
 * POST /api/admin/auth/logout  — client-side only; server confirms
 * GET  /api/admin/auth/me      — return current admin info
 */

const { hashPassword, verifyPassword, signToken } = require('../auth');
const { requireAdmin } = require('../middleware');
const { findAdminUserByEmail } = require('../db');

async function handleLogin(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  await new Promise(resolve => req.on('end', resolve));

  let email, password;
  try {
    const parsed = JSON.parse(body);
    email = parsed.email;
    password = parsed.password;
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid request body' }));
    return;
  }

  if (!email || !password) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Email and password are required' }));
    return;
  }

  const user = findAdminUserByEmail(email);
  // Always run bcrypt to prevent timing attacks even if user not found
  const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.abcdefghij';
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, dummyHash).then(() => false);

  if (!user || !passwordOk) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid email or password' }));
    return;
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  }));
}

function handleLogout(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Logged out successfully' }));
}

function handleMe(req, res) {
  requireAdmin(req, res, () => {
    const { passwordHash: _p, ...safeUser } = req.adminUser;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ user: safeUser }));
  });
}

module.exports = { handleLogin, handleLogout, handleMe };
