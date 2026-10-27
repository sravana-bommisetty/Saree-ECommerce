(async function () {
  'use strict';
  const { api, cart, inr, escapeHtml, productCard, registerProducts, waLink, enquiryText, toast, getSettings, $ } = window.AB;

  const root = $('#product');
  const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');

  function stockLabel(p) {
    if (!p.in_stock) return '<span class="stock-out">Out of stock</span> – enquire on WhatsApp for restock';
    if (p.stock_qty <= 2) return `<span class="stock-low">Only ${p.stock_qty} left</span>`;
    return '<span class="stock-ok">In stock</span>';
  }

  try {
    const [p, s] = await Promise.all([api(`/api/products/${encodeURIComponent(slug)}`), getSettings()]);
    const images = p.images.length ? p.images : [{ url: '/images/placeholder-saree.svg', alt: p.name }];
    const mrp = p.mrp && p.mrp > p.price ? `<s>${inr(p.mrp)}</s>` : '';

    root.innerHTML = `
      <nav class="breadcrumb"><a href="/">Home</a> / <a href="/shop">Shop</a>${p.category_slug ? ` / <a href="/shop?category=${encodeURIComponent(p.category_slug)}">${escapeHtml(p.category_name)}</a>` : ''} / ${escapeHtml(p.name)}</nav>
      <div class="product">
        <div>
          <div class="gallery-main"><img id="main-img" src="${escapeHtml(images[0].url)}" alt="${escapeHtml(p.name)}"></div>
          <div class="thumbs">${images.map((im, i) => `<button class="${i ? '' : 'active'}" data-src="${escapeHtml(im.url)}" aria-label="View image ${i + 1}"><img src="${escapeHtml(im.url)}" alt=""></button>`).join('')}</div>
        </div>
        <div>
          <h1>${escapeHtml(p.name)}</h1>
          <div class="price">${inr(p.price)}${mrp}</div>
          <p class="muted">Inclusive of all taxes</p>
          <p>${stockLabel(p)}</p>
          <dl class="specs">
            <dt>Fabric</dt><dd>${escapeHtml(p.fabric || '—')}</dd>
            <dt>Colour</dt><dd>${escapeHtml(p.color || '—')}</dd>
            <dt>Category</dt><dd>${escapeHtml(p.category_name || '—')}</dd>
            <dt>Product code</dt><dd>${escapeHtml(p.sku)}</dd>
          </dl>
          <p class="prose-inline">${escapeHtml(p.description)}</p>
          <div class="actions">
            <button class="btn" id="add" ${p.in_stock ? '' : 'disabled'}>Add to bag</button>
            <a class="btn btn-wa" href="${escapeHtml(waLink(s.whatsapp_number, enquiryText(p)))}" target="_blank" rel="noopener">Enquire on WhatsApp</a>
          </div>
          <div class="info-box"><strong>🚚 Delivery:</strong> ${escapeHtml(s.delivery_info)}<br><a href="/shipping-returns">Shipping &amp; return policy</a></div>
        </div>
      </div>`;

    root.querySelector('.thumbs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-src]');
      if (!b) return;
      $('#main-img').src = b.dataset.src;
      root.querySelectorAll('.thumbs button').forEach((x) => x.classList.toggle('active', x === b));
    });
    $('#add').addEventListener('click', () => { cart.add(p); toast('Added to your bag'); });

    if (p.category_slug) {
      const related = (await api(`/api/products?category=${encodeURIComponent(p.category_slug)}&limit=5`)).items.filter((x) => x.id !== p.id).slice(0, 4);
      registerProducts(related);
      $('#related').innerHTML = related.map(productCard).join('');
    }
    if (!$('#related').innerHTML) $('#related').closest('section').classList.add('hidden');
  } catch (err) {
    root.innerHTML = `<div class="empty"><h2>Saree not found</h2><p>${escapeHtml(err.message)}</p><a class="btn" href="/shop">Browse all sarees</a></div>`;
    $('#related').closest('section').classList.add('hidden');
  }
})();
