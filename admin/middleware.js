/**
 * Admin auth middleware — attaches req.adminUser when JWT is valid.
 * Responds 401 for missing/invalid tokens.
 */

const { verifyToken, extractBearerToken } = require('./auth');
const { findAdminUserById } = require('./db');

function requireAdmin(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Authentication required' }));
    return;
  }
  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid or expired token' }));
    return;
  }
  const user = findAdminUserById(payload.sub);
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Admin user not found' }));
    return;
  }
  req.adminUser = user;
  next();
}

module.exports = { requireAdmin };
