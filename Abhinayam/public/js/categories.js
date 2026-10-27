(async function () {
  'use strict';
  const { api, categoryTile, escapeHtml, $ } = window.AB;
  const el = $('#categories');
  try {
    const categories = await api('/api/categories');
    el.innerHTML = categories.map(categoryTile).join('') || '<p class="empty">Categories coming soon.</p>';
  } catch (err) {
    el.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
  }
})();
