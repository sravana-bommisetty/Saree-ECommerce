# 🛍️ Razorpay Payment Integration Guide

This guide walks you through setting up the payment system with Razorpay, UPI payments, WhatsApp notifications, and invoice generation.

## 📋 Table of Contents

1. [Setup](#setup)
2. [Configuration](#configuration)
3. [API Endpoints](#api-endpoints)
4. [Frontend Integration](#frontend-integration)
5. [Database Schema](#database-schema)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install
```

New dependencies added:
- `razorpay` - Payment gateway
- `twilio` - WhatsApp notifications

### 2. Create Razorpay Account

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Sign up and complete KYC
3. In Settings > API Keys, copy your:
   - **Key ID** (public)
   - **Key Secret** (keep private!)

### 3. Setup Twilio (Optional, for WhatsApp)

For automated WhatsApp messages:

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Create a new project
3. Enable WhatsApp sandbox
4. Copy credentials:
   - Account SID
   - Auth Token
   - WhatsApp From number (provided by Twilio)

---

## ⚙️ Configuration

### Update .env file

Copy from `.env.example` and add your credentials:

```env
# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here

# Twilio WhatsApp (Optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Environment Validation

The app will warn if payment credentials are not configured, but won't fail to start.

---

## 🔌 API Endpoints

### 1. Create Payment Order

**Endpoint:** `POST /api/payment/create`

**Request:**
```json
{
  "orderId": "ORDER-12345",
  "amount": 999.99,
  "customer": {
    "name": "Rajesh Kumar",
    "phone": "9876543210",
    "email": "rajesh@example.com"
  },
  "items": [
    {
      "name": "Beautiful Saree",
      "quantity": 1,
      "price": 999.99
    }
  ],
  "sendViaWhatsApp": true
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "ORDER-12345",
  "razorpayOrderId": "order_IluGWxBm9U8zJ8",
  "paymentLinkId": "plink_IL3HfxJAKGr9p6",
  "paymentLink": "https://rzp.io/l/abcd1234",
  "keyId": "rzp_test_xxxxxx",
  "amount": 99999
}
```

---

### 2. Verify Payment

**Endpoint:** `POST /api/payment/verify`

After successful payment on frontend, verify with Razorpay signature:

**Request:**
```json
{
  "orderId": "ORDER-12345",
  "paymentId": "pay_IluHpyUkAkRZeE",
  "signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "orderId": "ORDER-12345",
  "paymentId": "pay_IluHpyUkAkRZeE",
  "amount": 999.99
}
```

---

### 3. Check Payment Status

**Endpoint:** `GET /api/payment/status/:orderId`

**Response:**
```json
{
  "orderId": "ORDER-12345",
  "status": "paid",
  "amount": 999.99,
  "paymentId": "pay_IluHpyUkAkRZeE",
  "paidAt": "2024-11-05T03:30:00Z",
  "createdAt": "2024-11-05T03:15:00Z"
}
```

---

### 4. Payment Callback

**Endpoint:** `GET /api/payment/callback`

Razorpay redirects here after payment link completion.

Query parameters:
- `razorpay_payment_link_id`
- `razorpay_payment_id`
- `razorpay_signature`

Redirects to:
- `/payment-success?orderId=ORDER-12345` ✅
- `/payment-failed` ❌

---

## 🎨 Frontend Integration

### Payment Form

Access the pre-built payment form:

```
http://localhost:3000/payment.html
```

**Features:**
- ✅ UPI & Card payment options
- ✅ WhatsApp notification checkbox
- ✅ Real-time validation
- ✅ Razorpay checkout integration
- ✅ Security badges

### Custom Integration

Embed payment in your own form:

```html
<script>
  // Create payment order
  const response = await fetch('/api/payment/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: 'ORDER-123',
      amount: 999.99,
      customer: {
        name: 'John Doe',
        phone: '9876543210',
        email: 'john@example.com'
      },
      items: [{ name: 'Saree', quantity: 1, price: 999.99 }],
      sendViaWhatsApp: true
    })
  });

  const payment = await response.json();

  // Open Razorpay checkout
  const rzp = new Razorpay({
    key: payment.keyId,
    amount: payment.amount,
    order_id: payment.razorpayOrderId,
    handler: function(response) {
      // Verify payment
      fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: payment.orderId,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature
        })
      });
    }
  });

  rzp.open();
</script>

<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

---

## 📊 Database Schema

### Orders Table

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) UNIQUE,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  amount DECIMAL(10, 2),
  status VARCHAR(50),                    -- pending, paid, shipped, delivered
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_payment_link_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP
);
```

### Order Items Table

```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) REFERENCES orders(order_id),
  product_name VARCHAR(255),
  quantity INTEGER,
  price_per_unit DECIMAL(10, 2),
  total DECIMAL(10, 2)
);
```

### Payment Transactions Table

```sql
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) REFERENCES orders(order_id),
  razorpay_payment_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2),
  status VARCHAR(50),
  method VARCHAR(50),                    -- upi, card, netbanking
  created_at TIMESTAMP DEFAULT NOW()
);
```

### WhatsApp Notifications Log

```sql
CREATE TABLE whatsapp_notifications (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255),
  customer_phone VARCHAR(20),
  message_type VARCHAR(50),              -- payment_link, confirmation, shipping
  status VARCHAR(50),                    -- sent, failed
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧪 Testing

### Test with Razorpay Test Credentials

Use these for testing without actual payments:

**Test UPI IDs:**
```
success@razorpay
```

**Test Cards:**
```
4111 1111 1111 1111   (Visa - Success)
5555 5555 5555 4444   (MasterCard - Success)
```

### Manual Testing

1. Go to `http://localhost:3000/payment.html`
2. Fill in test details:
   ```
   Name: Test User
   Phone: 9876543210
   Email: test@example.com
   ```
3. Select UPI or Card
4. Click "Proceed to Payment"
5. Complete test payment
6. Check order status: `/api/payment/status/ORDER-xxxxx`

### Database Check

```sql
-- See all orders
SELECT * FROM orders ORDER BY created_at DESC;

-- Check payment transactions
SELECT * FROM payment_transactions ORDER BY created_at DESC;

-- Check WhatsApp notifications
SELECT * FROM whatsapp_notifications ORDER BY created_at DESC;
```

---

## 🛠️ Usage Examples

### Example 1: Send Payment Link via WhatsApp

```javascript
// 1. Create order and send WhatsApp link
await fetch('/api/payment/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: 'ORDER-' + Date.now(),
    amount: 2999.99,
    customer: {
      name: 'Priya Sharma',
      phone: '+919876543210',
      email: 'priya@example.com'
    },
    items: [
      { name: 'Silk Saree', quantity: 2, price: 1499.99 }
    ],
    sendViaWhatsApp: true  // ✅ Send via WhatsApp
  })
});

// Customer receives WhatsApp message with payment link
// They click link to pay directly
```

---

### Example 2: Programmatic Payment Verification

```javascript
// Backend: Verify payment for order
const verifyPayment = async (orderId, paymentId, signature) => {
  try {
    const response = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, paymentId, signature })
    });

    const result = await response.json();
    
    if (result.success) {
      // ✅ Payment verified
      // Update order, send confirmation, etc.
      await updateOrderStatus(orderId, 'paid');
      await sendConfirmationEmail(orderId);
    }
  } catch (error) {
    console.error('Payment verification failed:', error);
  }
};
```

---

### Example 3: Invoice Generation

```javascript
const { InvoiceService } = require('./services/invoice');

const invoiceService = new InvoiceService(config);

// Generate invoice data
const invoiceData = invoiceService.generateInvoiceData({
  orderId: 'ORDER-12345',
  customer: {
    name: 'Rajesh Kumar',
    phone: '9876543210',
    email: 'rajesh@example.com',
    address: 'Bangalore, India'
  },
  items: [
    { name: 'Silk Saree', quantity: 1, price: 2999.99, total: 2999.99 }
  ],
  subtotal: 2999.99,
  tax: 0,
  total: 2999.99,
  paymentMethod: 'upi',
  paymentId: 'pay_12345'
});

// Format for WhatsApp
const whatsappMessage = invoiceService.formatForWhatsApp(invoiceData);
console.log(whatsappMessage);

// Format as HTML
const htmlInvoice = invoiceService.formatAsHTML(invoiceData);
```

---

## 🚨 Troubleshooting

### Issue: Razorpay credentials not working

**Solution:**
1. Check `.env` has correct credentials
2. Verify Key ID is public, Key Secret is private
3. Check credentials in Razorpay Dashboard > Settings > API Keys
4. Try in Test mode first

---

### Issue: WhatsApp messages not sending

**Solution:**
1. Check Twilio credentials in `.env`
2. Verify phone number format (must be 10 digits for India)
3. Check Twilio console for errors
4. Note: Twilio test environment has restrictions

---

### Issue: Payment verification fails

**Solution:**
1. Ensure signature matches order
2. Check order exists in database
3. Verify razorpay_order_id is correct
4. Use same secret key for signing

---

### Issue: CORS errors

**Solution:**
```javascript
// Already configured in app.js, but if needed:
app.use(cors({
  origin: process.env.PUBLIC_BASE_URL,
  credentials: true
}));
```

---

## 📱 WhatsApp Auto-Response

When a customer messages "I want to buy" or "What is the UPI ID?":

**Automatic Response Example:**
```
Hi Priya! 👋

Our UPI ID: abhinayamsilks@upi

For pricing details, please share:
1️⃣ The saree you're interested in
2️⃣ Your location for shipping

Free shipping on orders above ₹500! 🚚
```

---

## 🔒 Security Checklist

- ✅ Never commit `.env` with real credentials
- ✅ Use HTTPS in production
- ✅ Verify all payment signatures
- ✅ Store payment IDs, never store card data
- ✅ Log all transactions for audit trail
- ✅ Rate-limit payment endpoints
- ✅ Implement CSRF protection (Express already has this)

---

## 📞 Support

- **Razorpay Docs:** https://razorpay.com/docs
- **Twilio Docs:** https://www.twilio.com/docs
- **GitHub Issues:** Report bugs and request features

---

## 🎉 Next Steps

1. ✅ Integrate payment link into product pages
2. ✅ Add order tracking dashboard
3. ✅ Implement email receipts
4. ✅ Add refund management
5. ✅ Create admin analytics dashboard

---

**Happy selling! 🛍️✨**
