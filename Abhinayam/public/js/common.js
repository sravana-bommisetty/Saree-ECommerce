/* Shared helpers for every public page: layout, API, cart, formatting. */
(function () {
  'use strict';

  const CART_KEY = 'abhinayam_cart';
  const NAV = [
    ['/', 'Home'],
    ['/shop', 'Shop Sarees'],
    ['/categories', 'Categories'],
    ['/about', 'About Us'],
    ['/contact', 'Contact Us'],
    ['/shipping-returns', 'Shipping & Returns'],
  ];
  const WA_ICON =
    '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9C5 9.9 9.9 5.2 16 5.2s11 4.7 11 10.6-4.9 10.6-11 10.6zm6-7.9c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.6-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.2 1.5.2 2.1.1.6-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4z"/></svg>';

  const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
  const $ = (sel, root = document) => root.querySelector(sel);

  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  let settingsPromise;
  const getSettings = () => (settingsPromise ||= api('/api/settings'));

  const waLink = (number, text) => `https://wa.me/${String(number || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

  /* ---------- Cart (stored in the browser) ---------- */
  const cart = {
    items() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
    },
    save(items) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      updateCartBadge();
    },
    add(p, qty = 1) {
      const items = cart.items();
      const existing = items.find((i) => i.id === p.id);
      const max = Math.min(p.stock_qty, 10);
      if (existing) existing.qty = Math.min(existing.qty + qty, max);
      else items.push({ id: p.id, slug: p.slug, name: p.name, sku: p.sku, price: p.price, image: p.image_url, stock: p.stock_qty, qty: Math.min(qty, max) });
      cart.save(items);
    },
    setQty(id, qty) {
      cart.save(cart.items().map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, Math.min(i.stock, 10))) } : i)));
    },
    remove(id) { cart.save(cart.items().filter((i) => i.id !== id)); },
    clear() { cart.save([]); },
    count() { return cart.items().reduce((n, i) => n + i.qty, 0); },
    total() { return cart.items().reduce((n, i) => n + i.qty * i.price, 0); },
  };

  function updateCartBadge() {
    const badge = $('#cart-count');
    if (badge) badge.textContent = cart.count();
  }

  function toast(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  /* ---------- Product card ---------- */
  function productCard(p) {
    const img = p.image_url || '/images/placeholder-saree.svg';
    const tag = !p.in_stock ? '<span class="tag out">Sold out</span>' : p.stock_qty <= 2 ? `<span class="tag">Only ${p.stock_qty} left</span>` : p.is_featured ? '<span class="tag">Bestseller</span>' : '';
    const mrp = p.mrp && p.mrp > p.price ? `<s>${inr(p.mrp)}</s>` : '';
    return `
      <article class="card">
        <a class="card-img" href="/saree/${encodeURIComponent(p.slug)}">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy">${tag}
        </a>
        <div class="card-body">
          <h3><a href="/saree/${encodeURIComponent(p.slug)}">${escapeHtml(p.name)}</a></h3>
          <div class="card-meta">${escapeHtml(p.fabric)}${p.color ? ' · ' + escapeHtml(p.color) : ''}</div>
          <div class="price">${inr(p.price)}${mrp}</div>
          <div class="card-actions">
            <button class="btn" data-add="${p.id}" ${p.in_stock ? '' : 'disabled'}>Add to bag</button>
            <a class="btn btn-wa" data-enquire="${p.id}" href="#" aria-label="Enquire on WhatsApp">Enquire</a>
          </div>
        </div>
      </article>`;
  }

  const categoryTile = (c) => `
    <a class="cat-tile" href="/shop?category=${encodeURIComponent(c.slug)}">
      ${c.image_url ? `<img src="${escapeHtml(c.image_url)}" alt="" loading="lazy">` : ''}
      <div><h3>${escapeHtml(c.name)}</h3><p>${c.product_count} sarees</p></div>
    </a>`;

  // "Add to bag" / "Enquire" buttons look up products registered here (one listener for the whole page).
  const productRegistry = new Map();
  function registerProducts(products) {
    products.forEach((p) => productRegistry.set(String(p.id), p));
  }
  document.addEventListener('click', async (e) => {
    const add = e.target.closest('[data-add]');
    const enq = e.target.closest('[data-enquire]');
    const p = productRegistry.get((add || enq)?.dataset[add ? 'add' : 'enquire']);
    if (!p) return;
    e.preventDefault();
    if (add) {
      cart.add(p);
      toast('Added to your bag');
    } else {
      const s = await getSettings();
      window.open(waLink(s.whatsapp_number, enquiryText(p)), '_blank', 'noopener');
    }
  });

  const enquiryText = (p) =>
    `Hello Abhinayam Silks, I'm interested in "${p.name}" (${p.sku}) priced at ${inr(p.price)}. Is it available?\n${location.origin}/saree/${p.slug}`;

  /* ---------- Layout ---------- */
  function renderLayout(s) {
    const path = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
    const header = $('#site-header');
    if (header) {
      header.outerHTML = `
        <div class="topbar">Free shipping on orders above ₹5,000 · Order easily on WhatsApp · Pay securely via UPI</div>
        <header class="site-header">
          <div class="container header-inner">
            <button class="icon-btn menu-toggle" id="menu-toggle" aria-label="Open menu">☰</button>
            <a class="brand" href="/" aria-label="${escapeHtml(s.store_name)} home"><img src="/images/logo.svg" alt="${escapeHtml(s.store_name)} logo" width="174" height="52"></a>
            <nav class="nav" id="nav">${NAV.map(([href, label]) => `<a href="${href}" class="${path === href ? 'active' : ''}">${label}</a>`).join('')}</nav>
            <div class="header-actions">
              <form class="header-search" action="/shop" role="search">
                <input name="q" type="search" placeholder="Search sarees…" aria-label="Search sarees">
                <button aria-label="Search">🔍</button>
              </form>
              <a class="icon-btn" href="/cart" aria-label="Shopping bag">👜<span class="badge" id="cart-count">0</span></a>
            </div>
          </div>
        </header>`;
      $('#menu-toggle').addEventListener('click', () => $('#nav').classList.toggle('open'));
    }

    const footer = $('#site-footer');
    if (footer) {
      footer.outerHTML = `
        <footer class="site-footer">
          <div class="container footer-grid">
            <div>
              <h4>${escapeHtml(s.store_name)}</h4>
              <p>${escapeHtml(s.tagline)}</p>
              <p>${escapeHtml(s.address)}</p>
              <p>${escapeHtml(s.business_hours)}</p>
            </div>
            <div><h4>Shop</h4>${NAV.slice(0, 3).map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}<a href="/cart">My Bag</a></div>
            <div><h4>Help</h4>${NAV.slice(3).map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</div>
            <div>
              <h4>Connect</h4>
              <a href="${escapeHtml(waLink(s.whatsapp_number, 'Hello Abhinayam Silks!'))}" target="_blank" rel="noopener">WhatsApp: ${escapeHtml(s.phone_display)}</a>
              <a href="${escapeHtml(s.instagram_url)}" target="_blank" rel="noopener">Instagram</a>
              <a href="mailto:${escapeHtml(s.email)}">${escapeHtml(s.email)}</a>
            </div>
          </div>
          <div class="footer-bottom">© ${new Date().getFullYear()} ${escapeHtml(s.store_name)}. All rights reserved.</div>
        </footer>
        <a class="wa-float" href="${escapeHtml(waLink(s.whatsapp_number, 'Hello Abhinayam Silks! I would like to know more about your sarees.'))}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${WA_ICON}</a>`;
    }

    // Any element with data-setting="key" shows that editable setting.
    document.querySelectorAll('[data-setting]').forEach((el) => { el.textContent = s[el.dataset.setting] ?? ''; });
    document.querySelectorAll('[data-wa]').forEach((el) => { el.href = waLink(s.whatsapp_number, el.dataset.wa); el.target = '_blank'; el.rel = 'noopener'; });
    document.querySelectorAll('[data-instagram]').forEach((el) => { el.href = s.instagram_url; el.target = '_blank'; el.rel = 'noopener'; });
    updateCartBadge();
  }

  const ready = getSettings().then((s) => { renderLayout(s); return s; }).catch((err) => { console.error(err); return {}; });

  window.AB = { api, getSettings, ready, cart, inr, escapeHtml, productCard, categoryTile, registerProducts, waLink, enquiryText, toast, $ };
})();
