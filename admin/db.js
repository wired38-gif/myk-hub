/**
 * Simple JSON-based database for admin portal.
 * Stores data in /data/*.json files to keep zero-native-dep philosophy.
 * For production, swap this out for a real DB (Postgres/SQLite/etc).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Store data one level up from /admin — i.e. the repo root /data/
// GoDaddy Node PaaS has a writable filesystem at the app root.
const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readCollection(name) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function writeCollection(name, data) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

// ──────────────────────────────────────────────
// Admin Users
// ──────────────────────────────────────────────

function getAdminUsers() {
  return readCollection('admin_users');
}

function findAdminUserByEmail(email) {
  return getAdminUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function findAdminUserById(id) {
  return getAdminUsers().find(u => u.id === id) || null;
}

function createAdminUser({ email, passwordHash, role = 'admin', createdBy = 'system' }) {
  const users = getAdminUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email already exists');
  }
  const user = {
    id: generateId(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.push(user);
  writeCollection('admin_users', users);
  return sanitizeUser(user);
}

function updateAdminUser(id, { email, passwordHash }) {
  const users = getAdminUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('User not found');
  if (email) {
    const conflict = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== id);
    if (conflict) throw new Error('Email already taken by another admin');
    users[idx].email = email.toLowerCase().trim();
  }
  if (passwordHash) users[idx].passwordHash = passwordHash;
  users[idx].updatedAt = new Date().toISOString();
  writeCollection('admin_users', users);
  return sanitizeUser(users[idx]);
}

function deleteAdminUser(id) {
  let users = getAdminUsers();
  const user = users.find(u => u.id === id);
  if (!user) throw new Error('User not found');
  users = users.filter(u => u.id !== id);
  writeCollection('admin_users', users);
  return true;
}

function sanitizeUser(user) {
  const { passwordHash: _p, ...safe } = user;
  return safe;
}

// ──────────────────────────────────────────────
// Orders (demo data store)
// ──────────────────────────────────────────────

function getOrders() {
  const orders = readCollection('orders');
  if (orders.length === 0) return seedOrders();
  return orders;
}

function updateOrderStatus(id, status) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) throw new Error('Order not found');
  orders[idx].status = status;
  orders[idx].updatedAt = new Date().toISOString();
  writeCollection('orders', orders);
  return orders[idx];
}

// ──────────────────────────────────────────────
// Customer Inquiries
// ──────────────────────────────────────────────

function getInquiries() {
  const items = readCollection('inquiries');
  if (items.length === 0) return seedInquiries();
  return items;
}

function updateInquiryStatus(id, { status, reply }) {
  const items = getInquiries();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('Inquiry not found');
  if (status) items[idx].status = status;
  if (reply) items[idx].reply = reply;
  items[idx].updatedAt = new Date().toISOString();
  writeCollection('inquiries', items);
  return items[idx];
}

// ──────────────────────────────────────────────
// Products
// ──────────────────────────────────────────────

function getProducts() {
  const products = readCollection('products');
  if (products.length === 0) return seedProducts();
  return products;
}

function updateProduct(id, updates) {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Product not found');
  Object.assign(products[idx], updates, { updatedAt: new Date().toISOString() });
  writeCollection('products', products);
  return products[idx];
}

// ──────────────────────────────────────────────
// Integration Settings
// ──────────────────────────────────────────────

function getIntegrationSettings() {
  const settings = readCollection('integrations');
  if (!Array.isArray(settings) || settings.length === 0) {
    return defaultIntegrationSettings();
  }
  return settings[0];
}

function saveIntegrationSettings(updates) {
  const current = getIntegrationSettings();
  const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
  writeCollection('integrations', [merged]);
  return merged;
}

// ──────────────────────────────────────────────
// Public website hooks (no-auth — called by the website)
// ──────────────────────────────────────────────

/**
 * Create an order from a website checkout or cart submission.
 * Called by POST /api/orders from the website JavaScript.
 */
function createOrder({ customer, items, total, channel = 'Website', notes = '' }) {
  const orders = getOrders();
  const lastNum = orders.reduce((max, o) => {
    const n = parseInt(String(o.orderNumber).replace('QC-', ''), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 10000);
  const order = {
    id: generateId(),
    orderNumber: `QC-${lastNum + 1}`,
    customer,
    items,
    total: String(total),
    status: 'pending',
    channel,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  orders.push(order);
  writeCollection('orders', orders);
  return order;
}

/**
 * Create a customer inquiry from the website contact form.
 * Called by POST /api/inquiries from the website JavaScript.
 */
function createInquiry({ name, email, subject, message, source = 'website' }) {
  const items = getInquiries();
  const inquiry = {
    id: generateId(),
    name,
    email,
    subject,
    message,
    status: 'new',
    reply: '',
    source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  items.push(inquiry);
  writeCollection('inquiries', items);
  return inquiry;
}

// ──────────────────────────────────────────────
// Demo seed data
// ──────────────────────────────────────────────

function seedOrders() {
  const now = new Date();
  const orders = [
    { id: generateId(), orderNumber: 'QC-10001', customer: { name: 'Destiny Williams', email: 'destiny@example.com', address: '204 Briar Creek Rd, Houston, TX 77042' }, items: [{ name: 'Pink Glitter Queen Tumbler (30oz)', qty: 1, price: '40.00' }], total: '40.00', status: 'delivered', channel: 'TikTok Shop', notes: '', createdAt: new Date(now - 86400000 * 14).toISOString(), updatedAt: new Date(now - 86400000 * 10).toISOString() },
    { id: generateId(), orderNumber: 'QC-10002', customer: { name: 'Janelle Moore', email: 'janelle@example.com', address: '892 Westheimer Rd, Houston, TX 77063' }, items: [{ name: "Queen's Duo Gift Set", qty: 1, price: '60.00' }], total: '60.00', status: 'shipped', channel: 'Website', notes: 'Gift wrap please!', createdAt: new Date(now - 86400000 * 10).toISOString(), updatedAt: new Date(now - 86400000 * 7).toISOString() },
    { id: generateId(), orderNumber: 'QC-10003', customer: { name: 'Tiffany Banks', email: 'tiffany@example.com', address: '1100 Memorial Dr, Houston, TX 77007' }, items: [{ name: 'Custom Order Tumbler (30oz, Pink→Purple ombré, monogram)', qty: 1, price: '45.00' }], total: '45.00', status: 'processing', channel: 'Etsy', notes: 'Name: Tiffany in gold script', createdAt: new Date(now - 86400000 * 6).toISOString(), updatedAt: new Date(now - 86400000 * 5).toISOString() },
    { id: generateId(), orderNumber: 'QC-10004', customer: { name: 'Aaliyah Jackson', email: 'aaliyah@example.com', address: '3300 Main St, Houston, TX 77002' }, items: [{ name: 'Americana Queen Tumbler (30oz)', qty: 2, price: '40.00' }], total: '80.00', status: 'pending', channel: 'TikTok Shop', notes: '', createdAt: new Date(now - 86400000 * 4).toISOString(), updatedAt: new Date(now - 86400000 * 4).toISOString() },
    { id: generateId(), orderNumber: 'QC-10005', customer: { name: 'Shonda Price', email: 'shonda@example.com', address: '567 Bissonnet St, Houston, TX 77005' }, items: [{ name: 'Gothic Queen Tumbler (30oz)', qty: 1, price: '40.00' }, { name: 'Purple Reign Tumbler (30oz)', qty: 1, price: '40.00' }], total: '80.00', status: 'shipped', channel: 'Website', notes: '', createdAt: new Date(now - 86400000 * 3).toISOString(), updatedAt: new Date(now - 86400000 * 2).toISOString() },
    { id: generateId(), orderNumber: 'QC-10006', customer: { name: 'Keisha Campbell', email: 'keisha@example.com', address: '770 Almeda Rd, Houston, TX 77054' }, items: [{ name: 'Glitter Royale Tumbler (30oz)', qty: 1, price: '40.00' }], total: '40.00', status: 'pending', channel: 'Amazon', notes: '', createdAt: new Date(now - 86400000 * 2).toISOString(), updatedAt: new Date(now - 86400000 * 2).toISOString() },
    { id: generateId(), orderNumber: 'QC-10007', customer: { name: 'Monique Harris', email: 'monique@example.com', address: '2244 Lamar St, Houston, TX 77003' }, items: [{ name: 'Custom Order Tumbler (20oz skinny, black chrome, name plate)', qty: 1, price: '45.00' }], total: '45.00', status: 'processing', channel: 'Etsy', notes: 'Name: Monique, black metallic flake finish', createdAt: new Date(now - 86400000).toISOString(), updatedAt: new Date(now - 86400000).toISOString() },
    { id: generateId(), orderNumber: 'QC-10008', customer: { name: 'Crystal Davis', email: 'crystal@example.com', address: '4500 OST Rd, Houston, TX 77021' }, items: [{ name: "Vibe Queen Special", qty: 1, price: '40.00' }], total: '40.00', status: 'pending', channel: 'TikTok Shop', notes: '', createdAt: new Date(now - 43200000).toISOString(), updatedAt: new Date(now - 43200000).toISOString() },
  ];
  writeCollection('orders', orders);
  return orders;
}

function seedInquiries() {
  const now = new Date();
  const inquiries = [
    { id: generateId(), name: 'Brianna Scott', email: 'brianna@example.com', subject: 'Custom order — bridesmaid tumblers', message: "Hi! I'm getting married in October and want to order 6 matching tumblers for my bridesmaids. Each needs a different name. Can you do champagne gold glitter with rose gold names? What's the price for 6?", status: 'new', reply: '', source: 'website', createdAt: new Date(now - 3600000 * 2).toISOString(), updatedAt: new Date(now - 3600000 * 2).toISOString() },
    { id: generateId(), name: 'Latoya Freeman', email: 'latoya@example.com', subject: 'Order QC-10003 — shipping update?', message: "Hey! I ordered a custom tumbler (QC-10003) about 6 days ago. When will it ship? I need it for a birthday party this weekend.", status: 'pending', reply: '', source: 'website', createdAt: new Date(now - 86400000).toISOString(), updatedAt: new Date(now - 86400000).toISOString() },
    { id: generateId(), name: 'Diamond Brooks', email: 'diamond@example.com', subject: 'Wholesale inquiry', message: "I run a boutique in Houston and would love to carry your tumblers. Do you offer wholesale pricing for resellers? Looking to start with 20–30 pieces.", status: 'new', reply: '', source: 'website', createdAt: new Date(now - 86400000 * 2).toISOString(), updatedAt: new Date(now - 86400000 * 2).toISOString() },
    { id: generateId(), name: 'Tamara Jones', email: 'tamara@example.com', subject: 'Corporate gifting — holiday order', message: "I work in HR and we want to do custom tumblers for our team of 50 for the holidays. Logo + employee names. What's your lead time and bulk pricing for that quantity?", status: 'replied', reply: "Hi Tamara! We love corporate orders! For 50 pieces with logo + names, pricing is $35/ea ($1,750 total). Lead time is 3–4 weeks. Reply here or DM on TikTok to get started! 👑", source: 'website', createdAt: new Date(now - 86400000 * 4).toISOString(), updatedAt: new Date(now - 86400000 * 3).toISOString() },
    { id: generateId(), name: 'Simone Walker', email: 'simone@example.com', subject: 'TikTok Live drop — missed item', message: "I was in your live last night and added the Pink Holographic Stunner to my cart but it sold out before I could check out. Will you restock or make another one like it?", status: 'new', reply: '', source: 'tiktok', createdAt: new Date(now - 86400000 * 5).toISOString(), updatedAt: new Date(now - 86400000 * 5).toISOString() },
  ];
  writeCollection('inquiries', inquiries);
  return inquiries;
}

function seedProducts() {
  const products = [
    { id: generateId(), name: 'Pink Glitter Queen Tumbler', sku: 'QC-T001', price: '40.00', inventory: 1, category: '30oz Quencher', image: '', sales: 47, status: 'active', description: 'Chunky pink & holographic glitter. 30oz Stanley-style.', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Americana Queen Tumbler', sku: 'QC-T002', price: '40.00', inventory: 3, category: '30oz Quencher', image: '', sales: 31, status: 'active', description: 'Red, white & blue chunky glitter with patriotic design.', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Gothic Queen Tumbler', sku: 'QC-T003', price: '40.00', inventory: 1, category: '30oz Quencher', image: '', sales: 22, status: 'active', description: 'Deep red chunky glitter with gothic arch design.', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Purple Reign Tumbler', sku: 'QC-T004', price: '40.00', inventory: 4, category: '30oz Quencher', image: '', sales: 38, status: 'active', description: 'Deep purple with galaxy glitter. Queen energy only.', updatedAt: new Date().toISOString() },
    { id: generateId(), name: "Queen's Duo Gift Set", sku: 'QC-G001', price: '60.00', inventory: 2, category: 'Gift Sets', image: '', sales: 19, status: 'active', description: 'Two matching custom tumblers — perfect for gifting. (Was $80)', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Vibe Queen Special', sku: 'QC-T005', price: '40.00', inventory: 1, category: '30oz Quencher', image: '', sales: 14, status: 'active', description: "One-of-a-kind custom epoxy pour — exclusively designed by The Vibe Queen.", updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Glitter Royale Tumbler', sku: 'QC-T006', price: '40.00', inventory: 5, category: '30oz Quencher', image: '', sales: 27, status: 'active', description: 'Luxury chunky glitter pour with holographic finish.', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Custom Order Tumbler', sku: 'QC-CUSTOM', price: '40.00', inventory: 999, category: 'Custom Orders', image: '', sales: 112, status: 'active', description: 'You pick the colors, theme & vibe. We make the magic. From $40.', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Pink Holographic Stunner (20oz)', sku: 'QC-RTS001', price: '40.00', inventory: 0, category: 'Ready to Ship', image: '', sales: 9, status: 'out_of_stock', description: '20oz Skinny — pink holographic finish, ready to ship.', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Black Chrome Royale (40oz)', sku: 'QC-RTS002', price: '40.00', inventory: 1, category: 'Ready to Ship', image: '', sales: 6, status: 'active', description: '40oz Mega — black chrome mirror finish.', updatedAt: new Date().toISOString() },
    { id: generateId(), name: 'Custom DIY Kit', sku: 'QC-DIY001', price: '10.00', inventory: 999, category: 'Digital Products', image: '', sales: 34, status: 'active', description: 'Personalized shopping list + step-by-step guide. Delivered via DM.', updatedAt: new Date().toISOString() },
  ];
  writeCollection('products', products);
  return products;
}

function defaultIntegrationSettings() {
  return {
    etsy: { apiKey: '', shopId: '', connected: false },
    amazon: { sellerId: '', mwsToken: '', connected: false },
    tiktokShop: { appKey: '', appSecret: '', connected: false },
    emailMarketing: { provider: 'mailchimp', apiKey: '', listId: '', connected: false },
    stripe: { publishableKey: '', secretKey: '', webhookSecret: '', connected: false },
    paypal: { clientId: '', clientSecret: '', connected: false },
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getAdminUsers,
  findAdminUserByEmail,
  findAdminUserById,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  sanitizeUser,
  getOrders,
  createOrder,
  updateOrderStatus,
  getInquiries,
  createInquiry,
  updateInquiryStatus,
  getProducts,
  updateProduct,
  getIntegrationSettings,
  saveIntegrationSettings,
};
