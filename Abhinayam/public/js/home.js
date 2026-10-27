(async function () {
  'use strict';
  const { api, productCard, categoryTile, registerProducts, escapeHtml, $ } = window.AB;

  const featuredEl = $('#featured');
  const catEl = $('#categories');
  try {
    const [featured, categories] = await Promise.all([
      api('/api/products?featured=1&limit=8'),
      api('/api/categories'),
    ]);
    let items = featured.items;
    if (!items.length) items = (await api('/api/products?limit=8&sort=newest')).items;
    registerProducts(items);
    featuredEl.innerHTML = items.map(productCard).join('') || '<p class="empty">New collection arriving soon.</p>';
    catEl.innerHTML = categories.map(categoryTile).join('');
  } catch (err) {
    featuredEl.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
  }
})();
