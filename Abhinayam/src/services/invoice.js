'use strict';

/**
 * Invoice Generation Service
 * Generates invoice/receipt data for orders
 */
class InvoiceService {
  constructor(config) {
    this.config = config;
  }

  /**
   * Generate invoice data for an order
   * @param {Object} orderData - Order details
   * @param {string} orderData.orderId - Order ID
   * @param {Object} orderData.customer - Customer details
   * @param {Array} orderData.items - Order items
   * @param {number} orderData.subtotal - Subtotal in INR
   * @param {number} orderData.tax - Tax amount (if applicable)
   * @param {number} orderData.total - Total amount in INR
   * @param {string} orderData.paymentMethod - Payment method
   * @param {string} orderData.paymentId - Payment ID (optional)
   * @returns {Object} Invoice data
   */
  generateInvoiceData(orderData) {
    const timestamp = new Date();
    
    return {
      invoiceNumber: this.generateInvoiceNumber(orderData.orderId),
      invoiceDate: timestamp.toLocaleDateString('en-IN'),
      invoiceTime: timestamp.toLocaleTimeString('en-IN'),
      orderId: orderData.orderId,
      
      shop: {
        name: 'Abhinayam Silks',
        address: 'Your Shop Address',
        phone: this.config.whatsappNumber,
        upiId: this.config.upiId,
        gstNumber: 'XXXX-XXXX-XXXX', // Optional: Add your GST number
      },
      
      customer: {
        name: orderData.customer.name,
        phone: orderData.customer.phone,
        email: orderData.customer.email,
        address: orderData.customer.address || 'Not provided',
      },
      
      items: orderData.items.map(item => ({
        description: item.name,
        quantity: item.quantity,
        pricePerUnit: item.price,
        total: item.price * item.quantity,
      })),
      
      summary: {
        subtotal: orderData.subtotal,
        tax: orderData.tax || 0,
        shipping: orderData.shipping || 0,
        total: orderData.total,
      },
      
      payment: {
        method: orderData.paymentMethod, // 'upi', 'card', 'bank_transfer'
        status: 'completed',
        paymentId: orderData.paymentId || null,
        transactionDate: timestamp.toISOString(),
      },
      
      notes: orderData.notes || 'Thank you for your purchase!',
    };
  }

  /**
   * Generate a unique invoice number
   * @param {string} orderId - Order ID
   * @returns {string} Invoice number
   */
  generateInvoiceNumber(orderId) {
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${orderId}-${timestamp}`;
  }

  /**
   * Format invoice for WhatsApp message
   * @param {Object} invoiceData - Invoice data from generateInvoiceData
   * @returns {string} Formatted invoice message
   */
  formatForWhatsApp(invoiceData) {
    const items = invoiceData.items
      .map((item, i) => `${i + 1}. ${item.description}\n   Qty: ${item.quantity} × ₹${item.pricePerUnit} = ₹${item.total}`)
      .join('\n');

    return `
📄 *Invoice*

Invoice #: ${invoiceData.invoiceNumber}
Date: ${invoiceData.invoiceDate}
Order ID: ${invoiceData.orderId}

👤 *Customer Details*
Name: ${invoiceData.customer.name}
Phone: ${invoiceData.customer.phone}
Email: ${invoiceData.customer.email}

📦 *Items Purchased*
${items}

💰 *Payment Summary*
Subtotal: ₹${invoiceData.summary.subtotal}
Tax: ₹${invoiceData.summary.tax}
Shipping: ₹${invoiceData.summary.shipping}
━━━━━━━━━━━━━━
Total: ₹${invoiceData.summary.total}

💳 Payment Method: ${invoiceData.payment.method.toUpperCase()}
Status: ${invoiceData.payment.status.toUpperCase()}

Thank you for shopping with Abhinayam Silks! 🙏
    `.trim();
  }

  /**
   * Format invoice as HTML
   * @param {Object} invoiceData - Invoice data from generateInvoiceData
   * @returns {string} HTML invoice
   */
  formatAsHTML(invoiceData) {
    const itemsHtml = invoiceData.items
      .map(item => `
        <tr>
          <td>${item.description}</td>
          <td align="center">${item.quantity}</td>
          <td align="right">₹${item.pricePerUnit}</td>
          <td align="right">₹${item.total}</td>
        </tr>
      `)
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; }
    .header { text-align: center; border-bottom: 2px solid #8B4513; padding-bottom: 20px; }
    .header h1 { color: #8B4513; margin: 0; }
    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .section-title { font-weight: bold; color: #8B4513; margin-top: 20px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #8B4513; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    .summary { float: right; width: 300px; }
    .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .summary-row.total { font-weight: bold; font-size: 18px; color: #8B4513; border-top: 2px solid #8B4513; }
    .footer { text-align: center; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛍️ ${invoiceData.shop.name}</h1>
      <p>${invoiceData.shop.address}</p>
      <p>📞 ${invoiceData.shop.phone} | 💳 ${invoiceData.shop.upiId}</p>
    </div>

    <div style="margin: 20px 0;">
      <div style="float: right; text-align: right;">
        <p><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</p>
        <p><strong>Date:</strong> ${invoiceData.invoiceDate}</p>
        <p><strong>Order ID:</strong> ${invoiceData.orderId}</p>
      </div>
      <div>
        <p class="section-title">Bill To:</p>
        <p><strong>${invoiceData.customer.name}</strong></p>
        <p>📞 ${invoiceData.customer.phone}</p>
        <p>📧 ${invoiceData.customer.email}</p>
        <p>📍 ${invoiceData.customer.address}</p>
      </div>
      <div style="clear: both;"></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th align="center">Quantity</th>
          <th align="right">Price</th>
          <th align="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-row">
        <span>Subtotal:</span>
        <span>₹${invoiceData.summary.subtotal}</span>
      </div>
      ${invoiceData.summary.tax > 0 ? `
      <div class="summary-row">
        <span>Tax (GST):</span>
        <span>₹${invoiceData.summary.tax}</span>
      </div>
      ` : ''}
      ${invoiceData.summary.shipping > 0 ? `
      <div class="summary-row">
        <span>Shipping:</span>
        <span>₹${invoiceData.summary.shipping}</span>
      </div>
      ` : ''}
      <div class="summary-row total">
        <span>TOTAL:</span>
        <span>₹${invoiceData.summary.total}</span>
      </div>
    </div>

    <div style="clear: both; margin-top: 30px;">
      <p class="section-title">Payment Information</p>
      <p><strong>Method:</strong> ${invoiceData.payment.method.toUpperCase()}</p>
      <p><strong>Status:</strong> ${invoiceData.payment.status.toUpperCase()}</p>
      ${invoiceData.payment.paymentId ? `<p><strong>Transaction ID:</strong> ${invoiceData.payment.paymentId}</p>` : ''}
    </div>

    <div class="footer">
      <p>${invoiceData.notes}</p>
      <p style="font-size: 12px; color: #999;">Generated on ${invoiceData.invoiceDate} at ${invoiceData.invoiceTime}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate PDF (returns data for PDF generation)
   * Note: Actual PDF generation would need a library like 'pdfkit' or 'puppeteer'
   * @param {Object} invoiceData - Invoice data
   * @returns {Object} Data ready for PDF generation
   */
  getPDFData(invoiceData) {
    return {
      content: [
        {
          columns: [
            {
              text: `${invoiceData.shop.name}`,
              fontSize: 20,
              bold: true,
              color: '8B4513',
            },
            {
              text: [
                { text: `Invoice #: ${invoiceData.invoiceNumber}\n`, bold: true },
                `Date: ${invoiceData.invoiceDate}\n`,
                `Order ID: ${invoiceData.orderId}`,
              ],
              alignment: 'right',
            },
          ],
        },
        { text: '\n' },
        {
          columns: [
            {
              text: [
                { text: 'Shop Details\n', bold: true, color: '8B4513' },
                `${invoiceData.shop.address}\n`,
                `📞 ${invoiceData.shop.phone}\n`,
                `💳 UPI: ${invoiceData.shop.upiId}`,
              ],
            },
            {
              text: [
                { text: 'Bill To\n', bold: true, color: '8B4513' },
                `${invoiceData.customer.name}\n`,
                `📞 ${invoiceData.customer.phone}\n`,
                `📧 ${invoiceData.customer.email}\n`,
                `📍 ${invoiceData.customer.address}`,
              ],
              alignment: 'right',
            },
          ],
        },
        { text: '\n\n' },
        {
          text: 'Items',
          fontSize: 12,
          bold: true,
          color: '8B4513',
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 80, 80, 80],
            body: [
              [
                { text: 'Description', bold: true },
                { text: 'Qty', bold: true, alignment: 'center' },
                { text: 'Price', bold: true, alignment: 'right' },
                { text: 'Total', bold: true, alignment: 'right' },
              ],
              ...invoiceData.items.map(item => [
                item.description,
                { text: item.quantity, alignment: 'center' },
                { text: `₹${item.pricePerUnit}`, alignment: 'right' },
                { text: `₹${item.total}`, alignment: 'right' },
              ]),
            ],
          },
        },
        { text: '\n' },
        {
          columns: [
            { text: '' },
            {
              table: {
                widths: [150, 80],
                body: [
                  [
                    { text: 'Subtotal:', alignment: 'right' },
                    { text: `₹${invoiceData.summary.subtotal}`, alignment: 'right' },
                  ],
                  ...(invoiceData.summary.tax > 0 ? [[
                    { text: 'Tax (GST):', alignment: 'right' },
                    { text: `₹${invoiceData.summary.tax}`, alignment: 'right' },
                  ]] : []),
                  ...(invoiceData.summary.shipping > 0 ? [[
                    { text: 'Shipping:', alignment: 'right' },
                    { text: `₹${invoiceData.summary.shipping}`, alignment: 'right' },
                  ]] : []),
                  [
                    { text: 'TOTAL:', bold: true, alignment: 'right', color: '8B4513' },
                    { text: `₹${invoiceData.summary.total}`, bold: true, alignment: 'right', color: '8B4513' },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
        },
        { text: '\n' },
        {
          text: 'Payment Information',
          fontSize: 12,
          bold: true,
          color: '8B4513',
        },
        {
          text: `Method: ${invoiceData.payment.method.toUpperCase()} | Status: ${invoiceData.payment.status.toUpperCase()}`,
          fontSize: 10,
        },
        { text: '\n\n' },
        {
          text: invoiceData.notes,
          alignment: 'center',
          italics: true,
        },
      ],
      styles: {
        header: { fontSize: 20, bold: true, color: '8B4513' },
        subheader: { fontSize: 14, bold: true, color: '8B4513', margin: [0, 10, 0, 5] },
        tableHeader: { bold: true, color: 'white', fillColor: '8B4513' },
      },
    };
  }
}

module.exports = InvoiceService;
