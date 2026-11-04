'use strict';

const twilio = require('twilio');

class WhatsAppService {
  constructor(config) {
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      console.warn('Twilio credentials not configured. WhatsApp notifications disabled.');
      this.enabled = false;
      return;
    }

    this.client = twilio(config.twilioAccountSid, config.twilioAuthToken);
    this.from = config.twilioWhatsappFrom || 'whatsapp:+14155238886';
    this.enabled = true;
  }

  /**
   * Format phone number to E.164 format (required by Twilio)
   * @param {string} phone - Phone number (with or without country code)
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove non-digits
    const digits = phone.replace(/\D/g, '');
    
    // If starts with 0, assume India and prepend 91
    if (digits.startsWith('0')) {
      return `whatsapp:+91${digits.substring(1)}`;
    }
    
    // If 10 digits, assume India
    if (digits.length === 10) {
      return `whatsapp:+91${digits}`;
    }
    
    // Otherwise assume complete phone number with country code
    return `whatsapp:+${digits}`;
  }

  /**
   * Send payment link via WhatsApp
   * @param {Object} messageData - Message details
   * @param {string} messageData.customerPhone - Customer phone number
   * @param {string} messageData.paymentLink - Payment link URL
   * @param {string} messageData.orderId - Order ID
   * @param {number} messageData.amount - Order amount in INR
   * @param {string} messageData.productDescription - Product details (optional)
   * @returns {Promise<Object>} Twilio message response
   */
  async sendPaymentLink(messageData) {
    if (!this.enabled) {
      console.warn('WhatsApp service not enabled. Message not sent.');
      return null;
    }

    const to = this.formatPhoneNumber(messageData.customerPhone);
    const message = `
🛍️ *Your Payment Link*

Order ID: ${messageData.orderId}
Amount: ₹${messageData.amount}
${messageData.productDescription ? `\nProduct: ${messageData.productDescription}` : ''}

👉 Click to Pay: ${messageData.paymentLink}

This link expires in 7 days.
Thank you for shopping with us! 🙏
    `.trim();

    return this.sendMessage(to, message);
  }

  /**
   * Send payment confirmation message
   * @param {Object} messageData - Message details
   * @param {string} messageData.customerPhone - Customer phone number
   * @param {string} messageData.orderId - Order ID
   * @param {number} messageData.amount - Amount paid in INR
   * @param {string} messageData.trackingUrl - Order tracking URL (optional)
   * @returns {Promise<Object>} Twilio message response
   */
  async sendPaymentConfirmation(messageData) {
    if (!this.enabled) {
      console.warn('WhatsApp service not enabled. Message not sent.');
      return null;
    }

    const to = this.formatPhoneNumber(messageData.customerPhone);
    const message = `
✅ *Payment Received!*

Order ID: ${messageData.orderId}
Amount Paid: ₹${messageData.amount}
Status: Confirmed

${messageData.trackingUrl ? `\n📦 Track Order: ${messageData.trackingUrl}` : ''}

We'll ship your saree soon! 🚚
Thank you for your purchase! 🎉
    `.trim();

    return this.sendMessage(to, message);
  }

  /**
   * Send order shipping notification
   * @param {Object} messageData - Message details
   * @param {string} messageData.customerPhone - Customer phone number
   * @param {string} messageData.orderId - Order ID
   * @param {string} messageData.trackingNumber - Shipping tracking number
   * @param {string} messageData.trackingUrl - Tracking URL (optional)
   * @returns {Promise<Object>} Twilio message response
   */
  async sendShippingNotification(messageData) {
    if (!this.enabled) {
      console.warn('WhatsApp service not enabled. Message not sent.');
      return null;
    }

    const to = this.formatPhoneNumber(messageData.customerPhone);
    const message = `
📦 *Your Order Has Shipped!*

Order ID: ${messageData.orderId}
Tracking Number: ${messageData.trackingNumber}

${messageData.trackingUrl ? `Track here: ${messageData.trackingUrl}` : 'Check your email for tracking details.'}

Your beautiful saree is on the way! 🎁
    `.trim();

    return this.sendMessage(to, message);
  }

  /**
   * Send custom message
   * @param {string} customerPhone - Customer phone number
   * @param {string} message - Message content
   * @returns {Promise<Object>} Twilio message response
   */
  async sendMessage(phoneOrTo, message) {
    if (!this.enabled) {
      console.warn('WhatsApp service not enabled. Message not sent.');
      return null;
    }

    try {
      // Handle both phone number and already formatted 'to' parameter
      const to = typeof phoneOrTo === 'string' && !phoneOrTo.startsWith('whatsapp:')
        ? this.formatPhoneNumber(phoneOrTo)
        : phoneOrTo;

      const response = await this.client.messages.create({
        from: this.from,
        to: to,
        body: message,
      });

      return response;
    } catch (error) {
      console.error('WhatsApp message send failed:', error);
      throw new Error(`WhatsApp message failed: ${error.message}`);
    }
  }

  /**
   * Send automated response to customer inquiry
   * @param {Object} messageData - Message details
   * @param {string} messageData.customerPhone - Customer phone number
   * @param {string} messageData.customerName - Customer name
   * @param {string} messageData.inquiry - Customer's inquiry
   * @param {string} messageData.upiId - Shop UPI ID
   * @returns {Promise<Object>} Twilio message response
   */
  async sendAutoResponse(messageData) {
    if (!this.enabled) {
      console.warn('WhatsApp service not enabled. Message not sent.');
      return null;
    }

    const to = this.formatPhoneNumber(messageData.customerPhone);
    
    // Generate auto-response based on inquiry
    let response = `Hi ${messageData.customerName}! 👋\n\n`;
    
    if (messageData.inquiry.toLowerCase().includes('upi') || 
        messageData.inquiry.toLowerCase().includes('pay')) {
      response += `Our UPI ID: ${messageData.upiId}\n\n`;
    }
    
    if (messageData.inquiry.toLowerCase().includes('price') || 
        messageData.inquiry.toLowerCase().includes('cost')) {
      response += `Please visit our website or send us a photo of the saree you're interested in. We'll send you the pricing details.\n\n`;
    }
    
    if (messageData.inquiry.toLowerCase().includes('shipping') || 
        messageData.inquiry.toLowerCase().includes('delivery')) {
      response += `We ship Pan-India within 3-5 business days. Shipping is FREE for orders above ₹500!\n\n`;
    }
    
    response += `For detailed assistance, please share:\n1️⃣ The saree you're interested in\n2️⃣ Your location for shipping\n\nThank you! 🙏`;

    return this.sendMessage(to, response);
  }
}

module.exports = WhatsAppService;
