/**
 * Queens Customs Shop — Admin Backend Integration
 * ================================================
 * Drop this script into queenscustoms.shop to wire up:
 *   1. Contact form → Admin Inquiries inbox
 *   2. Cart checkout → Admin Orders dashboard
 *   3. Product catalog → live inventory from admin backend
 *
 * SETUP:
 *   1. Host this file or paste it inline in your site's <script> tag.
 *   2. Set QC_API_BASE to the URL where your admin server runs.
 *      Examples:
 *        - Local dev:  'http://localhost:3000'
 *        - Production: 'https://your-server-url.com'  (or your Cloudflare tunnel URL)
 *
 * USAGE:
 *   Each integration is opt-in. Only call the functions you need.
 */

const QC_API_BASE = window.QC_API_BASE || 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONTACT FORM INTEGRATION
//    Submits the contact/custom-order form to the Admin Inquiries inbox.
//
//    Usage — attach to your form's submit event:
//
//      document.getElementById('your-contact-form').addEventListener('submit', QC.submitContactForm);
//
//    OR call directly:
//
//      await QC.submitInquiry({ name, email, subject, message });
// ─────────────────────────────────────────────────────────────────────────────

const QC = {

  /**
   * Submit an inquiry directly (called programmatically).
   * Returns { success: true, id, message } on success.
   */
  async submitInquiry({ name, email, subject, message, source = 'website' }) {
    const res = await fetch(`${QC_API_BASE}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message, source }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submission failed');
    return data;
  },

  /**
   * Wire to a form's submit event.
   * Reads: name="#name-field" email="#email-field" subject="#subject-field" message="#message-field"
   * OR pass field IDs: QC.submitContactForm(event, { nameId, emailId, subjectId, messageId })
   *
   * Example HTML:
   *   <form id="contact-form">
   *     <input id="contact-name"    name="name"    ... />
   *     <input id="contact-email"   name="email"   ... />
   *     <input id="contact-subject" name="subject" ... />
   *     <textarea id="contact-msg"  name="message" ...></textarea>
   *     <button type="submit">Send Message 👑</button>
   *   </form>
   *
   *   <script>
   *     document.getElementById('contact-form').addEventListener('submit', QC.submitContactForm);
   *   </script>
   */
  async submitContactForm(event, ids = {}) {
    event.preventDefault();
    const {
      nameId = 'contact-name',
      emailId = 'contact-email',
      subjectId = 'contact-subject',
      messageId = 'contact-msg',
      topicId = 'contact-topic',
    } = ids;

    const name    = document.getElementById(nameId)?.value?.trim();
    const email   = document.getElementById(emailId)?.value?.trim();
    const subject = document.getElementById(subjectId)?.value?.trim()
                 || document.getElementById(topicId)?.value?.trim()
                 || 'Contact Form Submission';
    const message = document.getElementById(messageId)?.value?.trim();

    const btn = event.target.querySelector('[type="submit"]');
    const originalText = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    try {
      await QC.submitInquiry({ name, email, subject, message });
      if (btn) btn.textContent = '✓ Message Sent! The Vibe Queen will reply within 24hrs 👑';
      event.target.reset();
    } catch (err) {
      console.error('[QC] Contact form error:', err.message);
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
      alert('Message could not be sent. Please DM on TikTok instead! 👑');
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CART / ORDER INTEGRATION
  //    Submits a completed cart to the Admin Orders dashboard.
  //
  //    Usage:
  //      const result = await QC.submitOrder({
  //        customer: { name: 'Brianna Scott', email: 'b@email.com', address: '...' },
  //        items: [{ name: 'Pink Glitter Queen Tumbler (30oz)', qty: 1, price: '40.00' }],
  //        total: '40.00',
  //        channel: 'Website',  // 'Website' | 'TikTok Shop' | 'Etsy' | 'Amazon'
  //        notes: 'Gift wrap please',
  //      });
  //      // result.orderNumber → 'QC-10009'
  // ─────────────────────────────────────────────────────────────────────────

  async submitOrder({ customer, items, total, channel = 'Website', notes = '' }) {
    const res = await fetch(`${QC_API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, items, total, channel, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order submission failed');
    return data; // { success, orderNumber, orderId, message }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. LIVE PRODUCT CATALOG
  //    Fetches the current inventory from the admin backend so your site
  //    always shows accurate stock levels and "Only X left!" badges.
  //
  //    Usage:
  //      const products = await QC.getProducts();
  //      // products → [{ id, name, price, inventory, inStock, lowStock, ... }]
  // ─────────────────────────────────────────────────────────────────────────

  async getProducts() {
    const res = await fetch(`${QC_API_BASE}/api/products`);
    if (!res.ok) throw new Error('Failed to load products');
    return res.json();
  },

  /**
   * Update all product cards on the page with live stock data.
   * Looks for elements with data-sku="QC-T001" or data-product-id="..." attributes.
   *
   * Example HTML:
   *   <div data-sku="QC-T001">
   *     <span class="qc-stock-badge"></span>
   *     <button class="qc-add-to-cart">Add to Cart</button>
   *   </div>
   */
  async syncInventoryBadges() {
    try {
      const products = await QC.getProducts();
      const byId  = Object.fromEntries(products.map(p => [p.id,  p]));
      const bySku = Object.fromEntries(products.map(p => [p.sku, p]));

      document.querySelectorAll('[data-sku],[data-product-id]').forEach(el => {
        const p = bySku[el.dataset.sku] || byId[el.dataset.productId];
        if (!p) return;

        const badge = el.querySelector('.qc-stock-badge');
        const cartBtn = el.querySelector('.qc-add-to-cart');

        if (badge) {
          badge.textContent = p.inStock
            ? (p.lowStock ? `🔥 Only ${p.inventory} Left!` : '')
            : '⚠️ Sold Out';
          badge.style.display = (!p.inStock || p.lowStock) ? '' : 'none';
        }
        if (cartBtn) {
          cartBtn.disabled = !p.inStock;
          cartBtn.textContent = p.inStock ? 'Add to Cart' : 'Sold Out';
        }
      });
    } catch (err) {
      console.warn('[QC] Could not sync inventory badges:', err.message);
    }
  },
};

// Auto-run: sync inventory badges on page load if any tagged elements exist
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-sku],[data-product-id]')) {
    QC.syncInventoryBadges();
  }
});

// Expose globally so inline onclick handlers can access it
window.QC = QC;
