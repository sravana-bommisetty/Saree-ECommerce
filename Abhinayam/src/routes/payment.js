'use strict';

const express = require('express');
const PaymentService = require('../services/payment');
const WhatsAppService = require('../services/whatsapp-notifications');
const InvoiceService = require('../services/invoice');

/**
 * Payment routes handler
 * POST /api/payment/create - Create payment order
 * POST /api/payment/verify - Verify payment
 * GET /api/payment/callback - Payment callback
 * GET /api/payment/status/:orderId - Check payment status
 */
function paymentRoutes(db, config) {
  const router = express.Router();
  
  const paymentService = new PaymentService({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  });
  
  const whatsappService = new WhatsAppService({
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
  });
  
  const invoiceService = new InvoiceService({
    whatsappNumber: process.env.WHATSAPP_NUMBER,
    upiId: process.env.UPI_ID,
  });

  /**
   * POST /api/payment/create
   * Create a new payment order and optionally send payment link via WhatsApp
   * Body: {
   *   orderId: string,
   *   amount: number (in INR),
   *   customer: { name, phone, email },
   *   items: [{ name, quantity, price }],
   *   sendViaWhatsApp: boolean (optional)
   * }
   */
  router.post('/create', async (req, res) => {
    try {
      const {
        orderId,
        amount,
        customer,
        items = [],
        sendViaWhatsApp = true,
      } = req.body;

      // Validate input
      if (!orderId || !amount || !customer || !customer.phone) {
        return res.status(400).json({
          error: 'Missing required fields: orderId, amount, customer.phone',
        });
      }

      // Convert amount from INR to paise
      const amountInPaise = Math.round(amount * 100);

      // Create Razorpay order
      const razorpayOrder = await paymentService.createOrder({
        amount: amountInPaise,
        orderId,
        customerEmail: customer.email,
        customerPhone: customer.phone,
      });

      // Also create a payment link for easier sharing
      const paymentLink = await paymentService.createPaymentLink({
        amount: amountInPaise,
        orderId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        description: `Saree Purchase - Order ${orderId}`,
        products: items.map(i => `${i.name} (${i.quantity})`).join(', '),
        publicBaseUrl: process.env.PUBLIC_BASE_URL,
      });

      // Store order in database
      await db.query(
        `INSERT INTO orders (order_id, customer_name, customer_phone, customer_email, 
         amount, status, razorpay_order_id, razorpay_payment_link_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (order_id) DO UPDATE SET
         status = EXCLUDED.status,
         razorpay_order_id = EXCLUDED.razorpay_order_id,
         razorpay_payment_link_id = EXCLUDED.razorpay_payment_link_id`,
        [
          orderId,
          customer.name,
          customer.phone,
          customer.email,
          amount,
          'pending',
          razorpayOrder.id,
          paymentLink.id,
        ]
      );

      // Send payment link via WhatsApp if requested
      if (sendViaWhatsApp && whatsappService.enabled) {
        try {
          await whatsappService.sendPaymentLink({
            customerPhone: customer.phone,
            paymentLink: paymentLink.short_url,
            orderId,
            amount,
            productDescription: items.map(i => i.name).join(', ') || undefined,
          });
        } catch (whatsappError) {
          console.error('WhatsApp message failed:', whatsappError);
          // Don't fail the payment creation if WhatsApp fails
        }
      }

      res.json({
        success: true,
        orderId,
        razorpayOrderId: razorpayOrder.id,
        paymentLinkId: paymentLink.id,
        paymentLink: paymentLink.short_url,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: amountInPaise,
        customer,
      });
    } catch (error) {
      console.error('Payment creation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/payment/verify
   * Verify payment signature after successful payment
   * Body: {
   *   orderId: string,
   *   paymentId: string (from Razorpay),
   *   signature: string (from Razorpay)
   * }
   */
  router.post('/verify', async (req, res) => {
    try {
      const { orderId, paymentId, signature } = req.body;

      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({
          error: 'Missing required fields: orderId, paymentId, signature',
        });
      }

      // Get order from database to get razorpay_order_id
      const result = await db.query(
        'SELECT * FROM orders WHERE order_id = $1',
        [orderId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = result.rows[0];
      const razorpayOrderId = order.razorpay_order_id;

      // Verify signature
      const isSignatureValid = paymentService.verifyPaymentSignature(
        paymentId,
        razorpayOrderId,
        signature
      );

      if (!isSignatureValid) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }

      // Fetch payment details from Razorpay
      const paymentDetails = await paymentService.fetchPayment(paymentId);

      // Update order status
      await db.query(
        `UPDATE orders SET status = $1, razorpay_payment_id = $2, paid_at = NOW()
         WHERE order_id = $3`,
        ['paid', paymentId, orderId]
      );

      // Send confirmation via WhatsApp
      if (whatsappService.enabled) {
        try {
          await whatsappService.sendPaymentConfirmation({
            customerPhone: order.customer_phone,
            orderId,
            amount: order.amount,
            trackingUrl: `${process.env.PUBLIC_BASE_URL}/order/${orderId}`,
          });
        } catch (whatsappError) {
          console.error('WhatsApp confirmation failed:', whatsappError);
        }
      }

      res.json({
        success: true,
        message: 'Payment verified successfully',
        orderId,
        paymentId,
        amount: paymentDetails.amount / 100,
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/payment/status/:orderId
   * Check payment status for an order
   */
  router.get('/status/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;

      const result = await db.query(
        'SELECT order_id, status, amount, razorpay_payment_id, paid_at, created_at FROM orders WHERE order_id = $1',
        [orderId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = result.rows[0];

      res.json({
        orderId: order.order_id,
        status: order.status,
        amount: order.amount,
        paymentId: order.razorpay_payment_id,
        paidAt: order.paid_at,
        createdAt: order.created_at,
      });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/payment/callback
   * Razorpay callback for payment link completion
   */
  router.get('/callback', async (req, res) => {
    try {
      const { razorpay_payment_link_id, razorpay_payment_id, razorpay_signature } = req.query;

      if (!razorpay_payment_id || !razorpay_signature) {
        return res.redirect('/payment-failed');
      }

      // Find order by payment link ID
      const result = await db.query(
        'SELECT * FROM orders WHERE razorpay_payment_link_id = $1',
        [razorpay_payment_link_id]
      );

      if (result.rows.length === 0) {
        return res.redirect('/payment-failed');
      }

      const order = result.rows[0];

      // Verify payment signature
      const isSignatureValid = paymentService.verifyPaymentSignature(
        razorpay_payment_id,
        order.razorpay_order_id,
        razorpay_signature
      );

      if (!isSignatureValid) {
        return res.redirect('/payment-failed');
      }

      // Update order
      await db.query(
        `UPDATE orders SET status = $1, razorpay_payment_id = $2, paid_at = NOW()
         WHERE order_id = $3`,
        ['paid', razorpay_payment_id, order.order_id]
      );

      // Send WhatsApp confirmation
      if (whatsappService.enabled) {
        try {
          await whatsappService.sendPaymentConfirmation({
            customerPhone: order.customer_phone,
            orderId: order.order_id,
            amount: order.amount,
            trackingUrl: `${process.env.PUBLIC_BASE_URL}/order/${order.order_id}`,
          });
        } catch (whatsappError) {
          console.error('WhatsApp confirmation failed:', whatsappError);
        }
      }

      res.redirect(`/payment-success?orderId=${order.order_id}`);
    } catch (error) {
      console.error('Callback error:', error);
      res.redirect('/payment-failed');
    }
  });

  return router;
}

module.exports = { paymentRoutes };
