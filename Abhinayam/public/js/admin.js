(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
  const fmtDate = (s) => new Date(String(s).replace(' ', 'T') + 'Z').toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const pill = (v) => `<span class="pill ${esc(v)}">${esc(v)}</span>`;

  async function api(path, { method = 'GET', body } = {}) {
    const headers = { 'X-Requested-With': 'fetch' };
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const res = await fetch(`/api/admin${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/login') showLogin();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  function showError(form, err) {
    const box = $('[data-error]', form) || $('.alert-error', form);
    box.textContent = err ? err.message : '';
    box.classList.toggle('hidden', !err);
  }

  function flash(message) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  // Shared wiring for dialog forms: submit handler, error display, close buttons.
  function bindDialog(dialog, onSubmit) {
    const form = $('form', dialog);
    $$('[data-close]', dialog).forEach((b) => b.addEventListener('click', () => dialog.close()));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showError(form, null);
      try {
        await onSubmit(form);
        dialog.close();
      } catch (err) {
        showError(form, err);
      }
    });
  }

  /* ---------- Auth ---------- */
  // Same app serves /admin (admins) and /staff (staff); the server enforces the role per portal.
  const PORTAL = /^\/staff(\/|$)/.test(location.pathname) ? 'staff' : 'admin';
  const PORTAL_URL = { admin: '/admin/', staff: '/staff' };
  const PORTAL_LABEL = { admin: 'Admin', staff: 'Staff' };
  document.title = `${PORTAL_LABEL[PORTAL]} | Abhinayam Silks`;
  $('#login-title').textContent = `${PORTAL_LABEL[PORTAL]} login`;

  let me = null;
  const allowedTabs = () => $$('#tabs [data-tab]').filter((b) => b.dataset.roles.split(' ').includes(me.role));

  function showLogin() {
    $('#app-view').classList.add('hidden');
    $('#login-view').classList.remove('hidden');
  }
  function showApp(user) {
    if (user.role !== PORTAL) {
      location.replace(PORTAL_URL[user.role]);
      return;
    }
    me = user;
    $('#who').textContent = `${user.display_name || user.username} · ${user.role === 'admin' ? 'Admin' : 'Staff'}`;
    const allowed = allowedTabs();
    $$('#tabs [data-tab]').forEach((b) => b.classList.toggle('hidden', !allowed.includes(b)));
    $('#login-view').classList.add('hidden');
    $('#app-view').classList.remove('hidden');
    switchTab(allowed[0].dataset.tab);
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    showError(form, null);
    try {
      const user = await api('/login', { method: 'POST', body: { ...Object.fromEntries(new FormData(form)), portal: PORTAL } });
      form.reset();
      showApp(user);
    } catch (err) {
      showError(form, err);
    }
  });

  $('#logout').addEventListener('click', async () => {
    await api('/logout', { method: 'POST' }).catch(() => {});
    showLogin();
  });

  /* ---------- Tabs ---------- */
  const loaders = {
    dashboard: loadDashboard,
    products: loadProducts,
    stock: loadStock,
    categories: loadCategories,
    orders: loadOrders,
    settings: loadSettings,
    users: loadUsers,
    account: async () => {},
  };

  function switchTab(tab) {
    if (!allowedTabs().some((b) => b.dataset.tab === tab)) return;
    $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $$('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== tab));
    loaders[tab]().catch((err) => flash(err.message));
  }
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) switchTab(b.dataset.tab);
  });

  /* ---------- Dashboard ---------- */
  async function loadDashboard() {
    const s = await api('/stats');
    $('#stats').innerHTML = [
      ...Object.entries(s.orders).map(([k, v]) => `<div class="stat"><b>${v}</b><span>${esc(k)} orders</span></div>`),
      `<div class="stat"><b>${inr(s.revenue_paid)}</b><span>Paid revenue</span></div>`,
      `<div class="stat"><b>${s.products}</b><span>Sarees listed</span></div>`,
    ].join('');
    $('#low-stock').innerHTML = s.low_stock.length
      ? `<div class="table-wrap"><table class="table"><tr><th>SKU</th><th>Saree</th><th>Stock</th></tr>${s.low_stock
          .map((p) => `<tr><td>${esc(p.sku)}</td><td>${esc(p.name)}</td><td>${p.stock_qty}</td></tr>`)
          .join('')}</table></div>`
      : '<p class="muted">All sarees are well stocked.</p>';
  }

  /* ---------- Categories ---------- */
  let categories = [];
  let editingCategory = null;

  async function loadCategories() {
    categories = await api('/categories');
    $('#categories-table').innerHTML =
      '<tr><th>Order</th><th>Name</th><th>Description</th><th>Sarees</th><th></th></tr>' +
      categories
        .map(
          (c) => `<tr>
          <td>${c.sort_order}</td><td><strong>${esc(c.name)}</strong></td><td>${esc(c.description)}</td><td>${c.product_count}</td>
          <td class="row-inline"><button class="btn btn-outline" data-edit-cat="${c.id}">Edit</button><button class="btn btn-outline" data-del-cat="${c.id}">Delete</button></td>
        </tr>`
        )
        .join('');
  }

  function openCategory(c) {
    editingCategory = c || null;
    const form = $('#category-form');
    form.reset();
    showError(form, null);
    $('#category-dialog-title').textContent = c ? 'Edit category' : 'Add category';
    if (c) ['name', 'description', 'sort_order'].forEach((k) => (form.elements[k].value = c[k] ?? ''));
    $('#category-dialog').showModal();
  }

  $('#add-category').addEventListener('click', () => openCategory());
  $('#categories-table').addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit-cat]');
    const del = e.target.closest('[data-del-cat]');
    if (edit) openCategory(categories.find((c) => c.id === Number(edit.dataset.editCat)));
    if (del && confirm('Delete this category? Sarees in it will become uncategorised.')) {
      await api(`/categories/${del.dataset.delCat}`, { method: 'DELETE' }).catch((err) => flash(err.message));
      loadCategories();
    }
  });
  bindDialog($('#category-dialog'), async (form) => {
    const fd = new FormData(form);
    if (!fd.get('image')?.size) fd.delete('image');
    await api(editingCategory ? `/categories/${editingCategory.id}` : '/categories', { method: editingCategory ? 'PUT' : 'POST', body: fd });
    flash('Category saved');
    loadCategories();
  });

  /* ---------- Products ---------- */
  let editingProduct = null;
  let searchTimer;

  async function loadProducts() {
    const q = $('#product-search').value.trim();
    const [data, cats] = await Promise.all([api(`/products?q=${encodeURIComponent(q)}`), api('/categories')]);
    categories = cats;
    $('#products-table').innerHTML =
      '<tr><th></th><th>Saree</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>' +
      (data.items
        .map(
          (p) => `<tr>
          <td><img src="${esc(p.image_url || '/images/placeholder-saree.svg')}" alt=""></td>
          <td><strong>${esc(p.name)}</strong><br><span class="muted">${esc(p.fabric)} · ${esc(p.color)}</span></td>
          <td>${esc(p.sku)}</td>
          <td>${esc(p.category_name || '—')}</td>
          <td>${inr(p.price)}</td>
          <td class="row-inline"><input class="stock-input" type="number" min="0" value="${p.stock_qty}" data-stock="${p.id}" aria-label="Stock for ${esc(p.name)}"><button class="btn btn-outline" data-save-stock="${p.id}">Save</button></td>
          <td>${p.is_active ? pill('live') : pill('off')}${p.is_featured ? ' ⭐' : ''}</td>
          <td class="row-inline"><button class="btn btn-outline" data-edit="${p.id}">Edit</button><button class="btn btn-outline" data-del="${p.id}">Delete</button></td>
        </tr>`
        )
        .join('') || '<tr><td colspan="8" class="muted">No sarees yet – click “Add saree”.</td></tr>');
  }

  async function openProduct(id) {
    const form = $('#product-form');
    form.reset();
    showError(form, null);
    const [cats, filters] = await Promise.all([api('/categories'), fetch('/api/products/filters').then((r) => r.json())]);
    form.category_id.innerHTML = '<option value="">— None —</option>' + cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    $('#fabric-list').innerHTML = filters.fabrics.map((f) => `<option value="${esc(f)}">`).join('');
    $('#color-list').innerHTML = filters.colors.map((c) => `<option value="${esc(c)}">`).join('');
    editingProduct = id ? await api(`/products/${id}`) : null;
    $('#product-dialog-title').textContent = editingProduct ? 'Edit saree' : 'Add saree';
    if (editingProduct) {
      ['name', 'sku', 'category_id', 'fabric', 'color', 'stock_qty', 'price', 'mrp', 'description'].forEach(
        (k) => (form.elements[k].value = editingProduct[k] ?? '')
      );
      form.is_active.checked = editingProduct.is_active;
      form.is_featured.checked = editingProduct.is_featured;
    } else {
      form.stock_qty.value = 1;
    }
    renderImages();
    $('#product-dialog').showModal();
  }

  function renderImages() {
    $('#existing-images').innerHTML = (editingProduct?.images || [])
      .map((im) => `<figure><img src="${esc(im.url)}" alt=""><button type="button" data-del-img="${im.id}" aria-label="Remove photo">×</button></figure>`)
      .join('');
  }

  $('#existing-images').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del-img]');
    if (!b || !confirm('Remove this photo?')) return;
    await api(`/images/${b.dataset.delImg}`, { method: 'DELETE' });
    editingProduct.images = editingProduct.images.filter((im) => im.id !== Number(b.dataset.delImg));
    renderImages();
    loadProducts();
  });

  bindDialog($('#product-dialog'), async (form) => {
    const fd = new FormData(form);
    fd.set('is_active', form.is_active.checked ? '1' : '0');
    fd.set('is_featured', form.is_featured.checked ? '1' : '0');
    fd.delete('images');
    [...form.images.files].forEach((f) => fd.append('images', f));
    await api(editingProduct ? `/products/${editingProduct.id}` : '/products', { method: editingProduct ? 'PUT' : 'POST', body: fd });
    flash('Saree saved');
    loadProducts();
  });

  $('#add-product').addEventListener('click', () => openProduct().catch((err) => flash(err.message)));
  $('#product-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadProducts, 300);
  });
  $('#products-table').addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    try {
      if (t.dataset.edit) await openProduct(t.dataset.edit);
      if (t.dataset.saveStock) {
        const qty = $(`[data-stock="${t.dataset.saveStock}"]`).value;
        await api(`/products/${t.dataset.saveStock}/stock`, { method: 'PATCH', body: { stock_qty: qty } });
        flash('Stock updated');
      }
      if (t.dataset.del && confirm('Delete this saree permanently? Past orders keep their details.')) {
        await api(`/products/${t.dataset.del}`, { method: 'DELETE' });
        flash('Saree deleted');
        loadProducts();
      }
    } catch (err) {
      flash(err.message);
    }
  });

  /* ---------- Stock (admin + staff) ---------- */
  let stockTimer;

  async function loadStock() {
    const params = new URLSearchParams();
    if ($('#stock-search').value.trim()) params.set('q', $('#stock-search').value.trim());
    if ($('#stock-low').checked) params.set('lowStock', '2');
    const [items, history] = await Promise.all([api(`/stock?${params}`), api('/stock/history?limit=30')]);
    $('#stock-table').innerHTML =
      '<tr><th></th><th>Saree</th><th>SKU</th><th>Category</th><th>Status</th><th>In stock</th><th>Update</th></tr>' +
      (items
        .map(
          (p) => `<tr>
          <td><img src="${esc(p.image_url || '/images/placeholder-saree.svg')}" alt=""></td>
          <td><strong>${esc(p.name)}</strong><br><span class="muted">${esc(p.fabric)} · ${esc(p.color)}</span></td>
          <td>${esc(p.sku)}</td>
          <td>${esc(p.category_name || '—')}</td>
          <td>${p.is_active ? pill('live') : pill('off')}</td>
          <td><b class="${p.stock_qty <= 2 ? 'low' : ''}">${p.stock_qty}</b></td>
          <td class="row-inline">
            <input class="stock-input" type="number" min="0" step="1" value="${p.stock_qty}" data-stock-qty="${p.id}" aria-label="New stock for ${esc(p.name)}">
            <input class="stock-note" maxlength="200" placeholder="Note (optional)" data-stock-note="${p.id}" aria-label="Note for ${esc(p.name)}">
            <button class="btn btn-outline" data-stock-save="${p.id}">Save</button>
          </td>
        </tr>`
        )
        .join('') || '<tr><td colspan="7" class="muted">No sarees match.</td></tr>');
    $('#stock-history').innerHTML =
      '<tr><th>When</th><th>Saree</th><th>Change</th><th>Note</th><th>By</th></tr>' +
      (history
        .map(
          (h) => `<tr><td>${fmtDate(h.created_at)}</td><td>${esc(h.product_name)} <span class="muted">(${esc(h.sku)})</span></td>
          <td>${h.old_qty} → <b>${h.new_qty}</b></td><td>${esc(h.note)}</td><td>${esc(h.changed_by)}</td></tr>`
        )
        .join('') || '<tr><td colspan="5" class="muted">No changes yet.</td></tr>');
  }

  $('#stock-table').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-stock-save]');
    if (!b) return;
    const id = b.dataset.stockSave;
    try {
      await api(`/products/${id}/stock`, {
        method: 'PATCH',
        body: { stock_qty: $(`[data-stock-qty="${id}"]`).value, note: $(`[data-stock-note="${id}"]`).value },
      });
      flash('Stock updated');
      loadStock();
    } catch (err) {
      flash(err.message);
    }
  });
  $('#stock-low').addEventListener('change', () => loadStock().catch((err) => flash(err.message)));
  $('#stock-search').addEventListener('input', () => {
    clearTimeout(stockTimer);
    stockTimer = setTimeout(() => loadStock().catch((err) => flash(err.message)), 300);
  });

  /* ---------- Staff access (admin) ---------- */
  let usersList = [];
  let editingUser = null;

  async function loadUsers() {
    usersList = await api('/users');
    $('#users-table').innerHTML =
      '<tr><th>Name</th><th>Username</th><th>Access</th><th>Status</th><th>Last login</th><th></th></tr>' +
      usersList
        .map(
          (u) => `<tr>
          <td><strong>${esc(u.display_name || '—')}</strong>${u.id === me.id ? ' <span class="muted">(you)</span>' : ''}</td>
          <td>${esc(u.username)}</td>
          <td>${pill(u.role)}</td>
          <td>${u.is_active ? pill('active') : pill('disabled')}</td>
          <td>${u.last_login_at ? fmtDate(u.last_login_at) : '<span class="muted">Never</span>'}</td>
          <td class="row-inline"><button class="btn btn-outline" data-edit-user="${u.id}">Edit</button>${
            u.id === me.id ? '' : `<button class="btn btn-outline" data-del-user="${u.id}">Delete</button>`
          }</td>
        </tr>`
        )
        .join('');
  }

  function openUser(u) {
    editingUser = u || null;
    const form = $('#user-form');
    form.reset();
    showError(form, null);
    $('#user-dialog-title').textContent = u ? `Edit ${u.username}` : 'Add user';
    form.username.disabled = Boolean(u);
    form.password.required = !u;
    $('#u-pass-label').textContent = u ? 'Reset password (leave blank to keep current)' : 'Password * (min 8 characters)';
    if (u) {
      form.display_name.value = u.display_name;
      form.username.value = u.username;
      form.role.value = u.role;
      form.is_active.checked = u.is_active;
    }
    $('#user-dialog').showModal();
  }

  $('#add-user').addEventListener('click', () => openUser());
  $('#users-table').addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit-user]');
    const del = e.target.closest('[data-del-user]');
    if (edit) openUser(usersList.find((u) => u.id === Number(edit.dataset.editUser)));
    if (del && confirm('Delete this user? They will no longer be able to log in.')) {
      await api(`/users/${del.dataset.delUser}`, { method: 'DELETE' }).catch((err) => flash(err.message));
      loadUsers();
    }
  });
  bindDialog($('#user-dialog'), async (form) => {
    const body = {
      display_name: form.display_name.value,
      role: form.role.value,
      is_active: form.is_active.checked,
    };
    if (form.password.value) body.password = form.password.value;
    if (editingUser) await api(`/users/${editingUser.id}`, { method: 'PUT', body });
    else await api('/users', { method: 'POST', body: { ...body, username: form.username.value } });
    flash('User saved');
    loadUsers();
  });

  /* ---------- Orders ---------- */
  let currentOrder = null;
  let orderTimer;

  async function loadOrders() {
    const params = new URLSearchParams();
    if ($('#order-status').value) params.set('status', $('#order-status').value);
    if ($('#order-search').value.trim()) params.set('q', $('#order-search').value.trim());
    const orders = await api(`/orders?${params}`);
    $('#orders-table').innerHTML =
      '<tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th></th></tr>' +
      (orders
        .map(
          (o) => `<tr>
          <td><strong>${esc(o.order_no)}</strong></td><td>${fmtDate(o.created_at)}</td>
          <td>${esc(o.customer_name)}<br><span class="muted">${esc(o.phone)}</span></td>
          <td>${o.item_count}</td><td>${inr(o.total)}</td><td>${pill(o.status)}</td><td>${pill(o.payment_status)}</td>
          <td><button class="btn btn-outline" data-order="${o.id}">Open</button></td>
        </tr>`
        )
        .join('') || '<tr><td colspan="8" class="muted">No orders found.</td></tr>');
  }

  async function openOrder(id) {
    currentOrder = await api(`/orders/${id}`);
    const o = currentOrder;
    const form = $('#order-form');
    showError(form, null);
    $('#od-no').textContent = o.order_no;
    $('#od-body').innerHTML = `
      <p><strong>${esc(o.customer_name)}</strong> · ${esc(o.phone)}<br>${esc(o.address)}, ${esc(o.city)} – ${esc(o.pincode)}</p>
      ${o.notes ? `<p class="muted">Notes: ${esc(o.notes)}</p>` : ''}
      <table class="table order-items"><tr><th>Saree</th><th>SKU</th><th>Qty</th><th>Price</th></tr>
        ${o.items.map((i) => `<tr><td>${esc(i.product_name)}</td><td>${esc(i.sku)}</td><td>${i.qty}</td><td>${inr(i.unit_price * i.qty)}</td></tr>`).join('')}
        <tr><th colspan="3">Total</th><th>${inr(o.total)}</th></tr>
      </table>`;
    ['status', 'payment_status', 'payment_ref', 'tracking_info'].forEach((k) => (form.elements[k].value = o[k] ?? ''));
    form.status.disabled = o.status === 'cancelled';
    const phone = o.phone.length === 10 ? `91${o.phone}` : o.phone;
    $('#od-wa').href = `https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${o.customer_name}, regarding your Abhinayam Silks order ${o.order_no}: `)}`;
    $('#order-dialog').showModal();
  }

  bindDialog($('#order-dialog'), async (form) => {
    const body = Object.fromEntries(new FormData(form));
    if (form.status.value === 'cancelled' && currentOrder.status !== 'cancelled' && !confirm('Cancel this order and restock its sarees?')) {
      throw new Error('Cancellation aborted');
    }
    await api(`/orders/${currentOrder.id}`, { method: 'PATCH', body });
    flash('Order updated');
    loadOrders();
  });

  $('#orders-table').addEventListener('click', (e) => {
    const b = e.target.closest('[data-order]');
    if (b) openOrder(b.dataset.order).catch((err) => flash(err.message));
  });
  $('#order-status').addEventListener('change', loadOrders);
  $('#order-search').addEventListener('input', () => {
    clearTimeout(orderTimer);
    orderTimer = setTimeout(loadOrders, 300);
  });

  /* ---------- Settings ---------- */
  const SETTING_FIELDS = [
    ['store_name', 'Store name'],
    ['tagline', 'Tagline'],
    ['whatsapp_number', 'WhatsApp number (with country code, e.g. 919876543210)'],
    ['phone_display', 'Phone number shown on website'],
    ['upi_id', 'UPI ID (e.g. name@okaxis)'],
    ['upi_payee_name', 'UPI payee name'],
    ['instagram_url', 'Instagram profile URL'],
    ['email', 'Email'],
    ['address', 'Store address', true],
    ['business_hours', 'Business hours'],
    ['about_text', 'About Us text', true],
    ['delivery_info', 'Delivery details', true],
    ['shipping_policy', 'Shipping policy', true],
    ['return_policy', 'Return & exchange policy', true],
  ];

  async function loadSettings() {
    const s = await api('/settings');
    $('#settings-form').innerHTML =
      '<div class="alert alert-error hidden" data-error></div>' +
      SETTING_FIELDS.map(
        ([key, label, long]) => `<div class="field"><label for="s-${key}">${esc(label)}</label>
          ${long ? `<textarea id="s-${key}" name="${key}" rows="4">${esc(s[key])}</textarea>` : `<input id="s-${key}" name="${key}" value="${esc(s[key])}">`}</div>`
      ).join('') +
      '<button class="btn" type="submit">Save settings</button>';
  }

  $('#settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    showError(form, null);
    try {
      await api('/settings', { method: 'PUT', body: Object.fromEntries(new FormData(form)) });
      flash('Settings saved – website updated');
    } catch (err) {
      showError(form, err);
    }
  });

  /* ---------- Account ---------- */
  $('#password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
      e.target.reset();
      flash('Password updated');
    } catch (err) {
      flash(err.message);
    }
  });

  /* ---------- Start ---------- */
  api('/me').then(showApp).catch(showLogin);
})();
