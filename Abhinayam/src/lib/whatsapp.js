'use strict';

const inr = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

function whatsappUrl(number, text) {
  const digits = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function upiUrl({ upiId, payeeName, amount, note }) {
  const params = new URLSearchParams({ pa: upiId, pn: payeeName, am: Number(amount).toFixed(2), cu: 'INR', tn: note });
  return `upi://pay?${params.toString()}`;
}

function orderMessage(order, items, upiId) {
  const lines = [
    `Hello Abhinayam Silks, I would like to place an order.`,
    ``,
    `Order No: ${order.order_no}`,
    ...items.map((i, n) => `${n + 1}. ${i.product_name} (${i.sku}) x ${i.qty} = ${inr(i.unit_price * i.qty)}`),
    `Total: ${inr(order.total)}`,
    ``,
    `Name: ${order.customer_name}`,
    `Phone: ${order.phone}`,
    `Address: ${order.address}, ${order.city} - ${order.pincode}`,
  ];
  if (order.notes) lines.push(`Notes: ${order.notes}`);
  lines.push('', `I will pay via UPI to ${upiId} and share the payment screenshot here.`);
  return lines.join('\n');
}

module.exports = { inr, whatsappUrl, upiUrl, orderMessage };
