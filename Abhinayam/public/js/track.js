'use strict';

const form = document.querySelector('#track-form');
const orderInput = form.elements.order_no;
const errorMessage = document.querySelector('#track-error');
const result = document.querySelector('#track-result');
const trackingInfo = document.querySelector('#track-info');
const trackingLink = document.querySelector('#track-link');

const statusLabels = {
  new: 'Order received',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

orderInput.addEventListener('input', () => { orderInput.value = orderInput.value.toUpperCase(); });

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  errorMessage.hidden = true;
  result.hidden = true;
  trackingLink.hidden = true;
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;

  try {
    const data = await window.AB.api('/api/orders/track', {
      method: 'POST',
      body: JSON.stringify({ order_no: orderInput.value, phone: form.elements.phone.value }),
    });
    const order = data.order;
    const details = String(order.tracking_info || '').trim();

    document.querySelector('#track-order-number').textContent = order.order_no;
    document.querySelector('#track-status').textContent = statusLabels[order.status] || 'Processing';
    document.querySelector('#track-info-row').hidden = !details;
    document.querySelector('#track-pending').hidden = Boolean(details);
    trackingInfo.textContent = details;

    const urlMatch = details.match(/https?:\/\/[^\s<>"']+/i);
    if (urlMatch) {
      try {
        const url = new URL(urlMatch[0]);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          trackingLink.href = url.href;
          trackingLink.hidden = false;
        }
      } catch {}
    }
    result.hidden = false;
  } catch (error) {
    errorMessage.textContent = error.message || 'Unable to find that order. Check your details and try again.';
    errorMessage.hidden = false;
  } finally {
    submitButton.disabled = false;
  }
});