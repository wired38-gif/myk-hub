/**
 * Store Operations Routes
 * GET  /api/admin/orders              — list all orders
 * PUT  /api/admin/orders/:id/status   — update order status
 * GET  /api/admin/inquiries           — list all customer inquiries
 * PUT  /api/admin/inquiries/:id       — update inquiry status/reply
 * GET  /api/admin/products            — list all products
 * PUT  /api/admin/products/:id        — update product details
 */

const { requireAdmin } = require('../middleware');
const { getOrders, updateOrderStatus, getInquiries, updateInquiryStatus, getProducts, updateProduct } = require('../db');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function handleGetOrders(req, res) {
  requireAdmin(req, res, () => {
    const orders = getOrders();
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      revenue: orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0).toFixed(2),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ orders, stats }));
  });
}

async function handleUpdateOrderStatus(req, res, id) {
  requireAdmin(req, res, async () => {
    let body;
    try { body = await readBody(req); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
      return;
    }
    try {
      const order = updateOrderStatus(id, body.status);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(order));
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function handleGetInquiries(req, res) {
  requireAdmin(req, res, () => {
    const items = getInquiries();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(items));
  });
}

async function handleUpdateInquiry(req, res, id) {
  requireAdmin(req, res, async () => {
    let body;
    try { body = await readBody(req); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
      return;
    }
    try {
      const item = updateInquiryStatus(id, body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(item));
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function handleGetProducts(req, res) {
  requireAdmin(req, res, () => {
    const products = getProducts();
    const stats = {
      total: products.length,
      active: products.filter(p => p.status === 'active').length,
      outOfStock: products.filter(p => p.status === 'out_of_stock').length,
      totalSales: products.reduce((sum, p) => sum + (p.sales || 0), 0),
      totalRevenue: products.reduce((sum, p) => sum + ((p.sales || 0) * parseFloat(p.price || 0)), 0).toFixed(2),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ products, stats }));
  });
}

async function handleUpdateProduct(req, res, id) {
  requireAdmin(req, res, async () => {
    let body;
    try { body = await readBody(req); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
      return;
    }
    const allowed = ['name', 'price', 'inventory', 'status', 'image', 'category'];
    const updates = {};
    allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; });
    try {
      const product = updateProduct(id, updates);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(product));
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

module.exports = {
  handleGetOrders,
  handleUpdateOrderStatus,
  handleGetInquiries,
  handleUpdateInquiry,
  handleGetProducts,
  handleUpdateProduct,
};
