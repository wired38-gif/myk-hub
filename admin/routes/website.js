/**
 * Public Website Routes — no authentication required.
 * These endpoints are called directly from the queenscustoms.shop frontend.
 *
 * POST /api/orders      — customer places an order (cart checkout)
 * POST /api/inquiries   — customer submits the contact form
 * GET  /api/products    — public product listing (for the shop page)
 *
 * Security notes:
 *  - No sensitive data is exposed by these endpoints.
 *  - Rate-limiting and CORS are handled at the server level.
 *  - These endpoints only WRITE to their own collections; they cannot
 *    touch admin users, integration secrets, or other admin data.
 */

const { createOrder, createInquiry, getProducts } = require('../db');

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

/**
 * POST /api/orders
 * Body: { customer: { name, email, address }, items: [{ name, qty, price }], total, channel?, notes? }
 */
async function handleCreateOrder(req, res) {
  let body;
  try { body = await readBody(req); } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid request body' }));
    return;
  }

  const { customer, items, total, channel, notes } = body;

  if (!customer?.name || !customer?.email) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'customer.name and customer.email are required' }));
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'items array is required and must not be empty' }));
    return;
  }
  if (!total) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'total is required' }));
    return;
  }

  try {
    const order = createOrder({ customer, items, total, channel, notes });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      message: 'Order received! The Vibe Queen will be in touch within 24 hours. 👑',
    }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to create order' }));
  }
}

/**
 * POST /api/inquiries
 * Body: { name, email, subject, message, source? }
 */
async function handleCreateInquiry(req, res) {
  let body;
  try { body = await readBody(req); } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid request body' }));
    return;
  }

  const { name, email, subject, message, source } = body;

  if (!name || !email || !message) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'name, email, and message are required' }));
    return;
  }

  try {
    const inquiry = createInquiry({
      name,
      email,
      subject: subject || 'Contact Form Submission',
      message,
      source: source || 'website',
    });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      id: inquiry.id,
      message: "Message received! The Vibe Queen responds within 24 hours. 👑",
    }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to submit inquiry' }));
  }
}

/**
 * GET /api/products
 * Returns the public product catalog (no auth needed).
 */
function handleGetPublicProducts(req, res) {
  const products = getProducts()
    .filter(p => p.status === 'active')
    .map(({ id, name, sku, price, inventory, category, image, description, status }) => ({
      id, name, sku, price, inventory, category, image, description,
      inStock: inventory > 0,
      lowStock: inventory > 0 && inventory <= 3,
    }));
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(products));
}

module.exports = { handleCreateOrder, handleCreateInquiry, handleGetPublicProducts };
