'use strict';

const Razorpay = require('razorpay');
const crypto = require('crypto');

class PaymentService {
  constructor(config) {
    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }
    
    this.razorpay = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });
    
    this.config = config;
  }

  /**
   * Create a Razorpay order
   * @param {Object} orderData - Order details
   * @param {number} orderData.amount - Amount in paise (e.g., 10000 for ₹100)
   * @param {string} orderData.orderId - Your internal order ID
   * @param {string} orderData.customerEmail - Customer email
   * @param {string} orderData.customerPhone - Customer phone
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder(orderData) {
    try {
      const order = await this.razorpay.orders.create({
        amount: orderData.amount, // in paise
        currency: 'INR',
        receipt: orderData.orderId,
        payment_capture: 1, // auto-capture
        notes: {
          orderId: orderData.orderId,
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.customerPhone,
        },
      });

      return order;
    } catch (error) {
      throw new Error(`Razorpay order creation failed: ${error.message}`);
    }
  }

  /**
   * Verify Razorpay payment signature
   * @param {string} paymentId - Razorpay payment ID
   * @param {string} orderId - Razorpay order ID
   * @param {string} signature - Razorpay signature from payment response
   * @returns {boolean} Payment verification result
   */
  verifyPaymentSignature(paymentId, orderId, signature) {
    const text = `${orderId}|${paymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', this.config.razorpayKeySecret)
      .update(text)
      .digest('hex');

    return generated_signature === signature;
  }

  /**
   * Fetch payment details from Razorpay
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Payment details
   */
  async fetchPayment(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  /**
   * Create refund for a payment
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} amount - Refund amount in paise (optional, full refund if not provided)
   * @returns {Promise<Object>} Refund details
   */
  async createRefund(paymentId, amount = null) {
    try {
      const refundData = { payment_id: paymentId };
      if (amount) {
        refundData.amount = amount;
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);
      return refund;
    } catch (error) {
      throw new Error(`Refund creation failed: ${error.message}`);
    }
  }

  /**
   * Generate payment link for WhatsApp sharing
   * @param {Object} orderData - Order details
   * @returns {Promise<Object>} Payment link object
   */
  async createPaymentLink(orderData) {
    try {
      const paymentLink = await this.razorpay.paymentLink.create({
        amount: orderData.amount,
        currency: 'INR',
        accept_partial: true,
        first_min_partial_amount: Math.floor(orderData.amount * 0.3), // 30% minimum
        expire_by: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
        reference_id: orderData.orderId,
        description: orderData.description || 'Saree Purchase',
        customer: {
          email: orderData.customerEmail,
          contact: orderData.customerPhone,
          name: orderData.customerName,
        },
        notify: {
          sms: true,
          email: true,
        },
        reminder_enable: true,
        notes: {
          orderId: orderData.orderId,
          products: orderData.products || '',
        },
        callback_url: `${this.config.publicBaseUrl}/api/payment/callback`,
        callback_method: 'get',
      });

      return paymentLink;
    } catch (error) {
      throw new Error(`Payment link creation failed: ${error.message}`);
    }
  }
}

module.exports = PaymentService;
