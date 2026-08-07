/**
 * Admin User Management Routes (CRUD)
 * GET    /api/admin/users        — list all admin users
 * POST   /api/admin/users        — create a new admin user
 * PUT    /api/admin/users/:id    — update email and/or password
 * DELETE /api/admin/users/:id    — remove an admin user
 */

const { hashPassword } = require('../auth');
const { requireAdmin } = require('../middleware');
const { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, sanitizeUser } = require('../db');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function handleListUsers(req, res) {
  requireAdmin(req, res, () => {
    const users = getAdminUsers().map(u => sanitizeUser(u));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(users));
  });
}

async function handleCreateUser(req, res) {
  requireAdmin(req, res, async () => {
    let body;
    try { body = await readBody(req); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
      return;
    }

    const { email, password } = body;
    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Email and password are required' }));
      return;
    }
    if (password.length < 8) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Password must be at least 8 characters' }));
      return;
    }

    try {
      const passwordHash = await hashPassword(password);
      const user = createAdminUser({ email, passwordHash, createdBy: req.adminUser.id });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(user));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

async function handleUpdateUser(req, res, id) {
  requireAdmin(req, res, async () => {
    let body;
    try { body = await readBody(req); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
      return;
    }

    const updates = {};
    if (body.email) updates.email = body.email;
    if (body.password) {
      if (body.password.length < 8) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Password must be at least 8 characters' }));
        return;
      }
      updates.passwordHash = await hashPassword(body.password);
    }

    try {
      const user = updateAdminUser(id, updates);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(user));
    } catch (err) {
      const code = err.message === 'User not found' ? 404 : 400;
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function handleDeleteUser(req, res, id) {
  requireAdmin(req, res, () => {
    // Prevent self-deletion
    if (req.adminUser.id === id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Cannot delete your own account' }));
      return;
    }
    try {
      deleteAdminUser(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Admin user deleted' }));
    } catch (err) {
      const code = err.message === 'User not found' ? 404 : 400;
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

module.exports = { handleListUsers, handleCreateUser, handleUpdateUser, handleDeleteUser };
