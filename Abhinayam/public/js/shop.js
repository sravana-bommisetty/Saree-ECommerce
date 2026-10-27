(async function () {
  'use strict';
  const { api, productCard, registerProducts, escapeHtml, $ } = window.AB;

  const form = $('#filter-form');
  const sortEl = $('#sort');
  const grid = $('#products');
  const FILTER_KEYS = ['q', 'category', 'fabric', 'color', 'minPrice', 'maxPrice', 'inStock'];

  const fillSelect = (sel, values, label = (v) => v, value = (v) => v) => {
    sel.insertAdjacentHTML('beforeend', values.map((v) => `<option value="${escapeHtml(value(v))}">${escapeHtml(label(v))}</option>`).join(''));
  };

  const [categories, filters] = await Promise.all([api('/api/categories'), api('/api/products/filters')]);
  fillSelect(form.category, categories, (c) => `${c.name} (${c.product_count})`, (c) => c.slug);
  fillSelect(form.fabric, filters.fabrics);
  fillSelect(form.color, filters.colors);

  function stateFromUrl() {
    const params = new URLSearchParams(location.search);
    for (const key of FILTER_KEYS) {
      const el = form.elements[key];
      if (el.type === 'checkbox') el.checked = params.get(key) === '1';
      else el.value = params.get(key) || '';
    }
    sortEl.value = params.get('sort') || 'featured';
    return params;
  }

  function pushState(page = 1) {
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const el = form.elements[key];
      const v = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value.trim();
      if (v) params.set(key, v);
    }
    if (sortEl.value !== 'featured') params.set('sort', sortEl.value);
    if (page > 1) params.set('page', page);
    history.pushState(null, '', `/shop${params.size ? '?' + params : ''}`);
    load();
  }

  async function load() {
    const params = stateFromUrl();
    params.set('limit', 12);
    grid.innerHTML = '<p class="empty">Loading sarees…</p>';
    try {
      const data = await api(`/api/products?${params}`);
      registerProducts(data.items);
      $('#result-count').textContent = `${data.total} saree${data.total === 1 ? '' : 's'} found`;
      grid.innerHTML = data.items.map(productCard).join('') || '<p class="empty">No sarees match your filters. Try clearing some filters or <a data-wa="Hello! I am looking for a specific saree." href="#">ask us on WhatsApp</a>.</p>';
      $('#pagination').innerHTML =
        data.pages > 1
          ? Array.from({ length: data.pages }, (_, i) => `<button class="btn ${i + 1 === data.page ? '' : 'btn-outline'}" data-page="${i + 1}">${i + 1}</button>`).join('')
          : '';
      const s = await window.AB.getSettings();
      grid.querySelectorAll('[data-wa]').forEach((a) => { a.href = window.AB.waLink(s.whatsapp_number, a.dataset.wa); a.target = '_blank'; });
    } catch (err) {
      grid.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); $('#filters').classList.remove('open'); pushState(); });
  form.addEventListener('reset', () => setTimeout(() => pushState(), 0));
  form.category.addEventListener('change', () => pushState());
  sortEl.addEventListener('change', () => pushState());
  $('#pagination').addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (b) { pushState(Number(b.dataset.page)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  $('#filters-toggle').addEventListener('click', () => $('#filters').classList.toggle('open'));
  window.addEventListener('popstate', load);

  load();
})();
