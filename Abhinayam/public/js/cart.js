(function () {
  'use strict';
  const { api, cart, inr, escapeHtml, $ } = window.AB;

  const list = $('#cart-items');
  const form = $('#order-form');
  const errorBox = $('#form-error');

  function render() {
    const items = cart.items();
    list.innerHTML = items.length
      ? items
          .map(
            (i) => `
        <div class="cart-item">
          <a href="/saree/${encodeURIComponent(i.slug)}"><img src="${escapeHtml(i.image || '/images/placeholder-saree.svg')}" alt="${escapeHtml(i.name)}"></a>
          <div>
            <a href="/saree/${encodeURIComponent(i.slug)}"><strong>${escapeHtml(i.name)}</strong></a>
            <div class="muted">${inr(i.price)}</div>
            <div class="qty" aria-label="Quantity">
              <button data-dec="${i.id}" aria-label="Decrease">−</button><span>${i.qty}</span><button data-inc="${i.id}" aria-label="Increase">+</button>
            </div>
          </div>
          <div class="center"><div class="price">${inr(i.price * i.qty)}</div><button class="link-btn" data-remove="${i.id}">Remove</button></div>
        </div>`
          )
          .join('')
      : '<p class="empty">Your bag is empty. <a href="/shop">Shop sarees</a></p>';
    $('#cart-total').textContent = inr(cart.total());
    $('#place-order').disabled = !items.length;
  }

  list.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const item = (id) => cart.items().find((i) => i.id === Number(id));
    if (t.dataset.inc) cart.setQty(Number(t.dataset.inc), item(t.dataset.inc).qty + 1);
    if (t.dataset.dec) cart.setQty(Number(t.dataset.dec), item(t.dataset.dec).qty - 1);
    if (t.dataset.remove) cart.remove(Number(t.dataset.remove));
    render();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const btn = $('#place-order');
    btn.disabled = true;
    btn.textContent = 'Placing order…';
    // Open the WhatsApp tab synchronously so popup blockers allow it, then point it at the order message.
    const waWindow = window.open('', '_blank');
    try {
      const customer = Object.fromEntries(new FormData(form));
      const res = await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ customer, items: cart.items().map((i) => ({ productId: i.id, qty: i.qty })) }),
      });
      cart.clear();
      $('#checkout').classList.add('hidden');
      $('#success').classList.remove('hidden');
      $('#order-no').textContent = res.order.order_no;
      $('#order-total').textContent = inr(res.order.total);
      $('#wa-link').href = res.whatsappUrl;
      $('#upi-link').href = res.upiUrl;
      $('#upi-qr').src = res.upiQr;
      if (waWindow) waWindow.location.href = res.whatsappUrl;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (waWindow) waWindow.close();
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Place order on WhatsApp';
    }
  });

  render();
})();
