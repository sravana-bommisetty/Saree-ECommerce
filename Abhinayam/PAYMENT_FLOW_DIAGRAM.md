# 🔄 Payment Integration Flow Diagram

## Complete Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      CUSTOMER INITIATES PAYMENT                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Fill Payment Form   │
                    │  - Name              │
                    │  - Phone             │
                    │  - Email             │
                    │  - Amount            │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Choose Payment Method│
                    │  📱 UPI              │
                    │  💳 Card             │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
            ┌──────▶│ SendViaWhatsApp?     │
            │       └──────────┬───────────┘
            │                  │
            │ Yes              │ No
            │                  ▼
    ┌───────┴────────┐    ┌──────────────────────┐
    │ POST /api/     │    │ POST /api/           │
    │ payment/create │    │ payment/create       │
    └────────┬───────┘    └──────────┬───────────┘
             │                       │
             ▼                       ▼
    ┌──────────────────┐  ┌──────────────────────┐
    │ Create Razorpay  │  │ Create Razorpay      │
    │ Order & Link     │  │ Order                │
    └────────┬─────────┘  └──────────┬───────────┘
             │                       │
             ▼                       ▼
    ┌──────────────────┐  ┌──────────────────────┐
    │ Send Payment     │  │ Open Razorpay        │
    │ Link via WhatsApp│  │ Checkout Modal       │
    │ 📲✅            │  │ 💳 Secure Payment    │
    └────────┬─────────┘  └──────────┬───────────┘
             │                       │
             │                       ▼
             │            ┌──────────────────────┐
             │            │ Razorpay Processes   │
             │            │ Payment              │
             │            └──────────┬───────────┘
             │                       │
             │                       ▼
             │            ┌──────────────────────┐
             │            │ Return to Callback   │
             │            │ /api/payment/callback│
             │            └──────────┬───────────┘
             │                       │
             └───────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │ Verify Payment Signature │
              │ (Security Check)         │
              └──────────┬───────────────┘
                         │
                    ┌────┴────┐
                    │          │
              Valid │          │ Invalid
                    ▼          ▼
            ┌──────────────┐ ┌──────────────┐
            │ ✅ Payment   │ │ ❌ Payment   │
            │ Verified     │ │ Failed       │
            └──────┬───────┘ └──────┬───────┘
                   │                │
                   ▼                ▼
            ┌──────────────────┐ ┌─────────────┐
            │ Update Order:    │ │ Redirect to │
            │ Status = PAID ✅ │ │ /payment-   │
            └──────┬───────────┘ │ failed      │
                   │             └─────────────┘
                   ▼
            ┌──────────────────────────┐
            │ Send WhatsApp Confirmation│
            │ "✅ Payment Received!"    │
            │ + Tracking Link          │
            └──────┬───────────────────┘
                   │
                   ▼
            ┌──────────────────────────┐
            │ Generate Invoice         │
            │ (Invoice DB Entry)       │
            └──────┬───────────────────┘
                   │
                   ▼
            ┌──────────────────────────┐
            │ Redirect to Order Page   │
            │ /order-confirmation      │
            │ ?orderId=ORDER-xxxxx     │
            └──────────────────────────┘
                   │
                   ▼
            ┌──────────────────────────┐
            │ 🎉 SUCCESS 🎉            │
            │ Order Placed & Paid      │
            └──────────────────────────┘
```

---

## Database Transaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE OPERATIONS                      │
└─────────────────────────────────────────────────────────────┘

1️⃣ Payment Creation
   ├─ INSERT INTO orders (
   │  ├─ order_id
   │  ├─ customer_name, phone, email
   │  ├─ amount
   │  ├─ razorpay_order_id
   │  ├─ razorpay_payment_link_id
   │  └─ status = 'pending'
   │)
   └─ CREATE order_items (product_name, qty, price)

2️⃣ Payment Verification
   ├─ UPDATE orders
   │  ├─ SET status = 'paid'
   │  ├─ SET razorpay_payment_id = '...'
   │  └─ SET paid_at = NOW()
   │
   └─ INSERT INTO payment_transactions (
      ├─ order_id
      ├─ razorpay_payment_id
      ├─ amount
      ├─ method (upi|card)
      └─ status = 'completed'
   )

3️⃣ WhatsApp Notification Log
   └─ INSERT INTO whatsapp_notifications (
      ├─ order_id
      ├─ customer_phone
      ├─ message_type ('payment_link'|'confirmation'|'shipping')
      ├─ message_body
      └─ status = 'sent'
   )
```

---

## API Endpoint Sequence

```
Browser                    Node Server              Razorpay
   │                            │                      │
   │  1. POST /api/payment/create
   ├───────────────────────────►│                      │
   │  {order, customer, items}   │                      │
   │                             │  2. Create Order
   │                             ├─────────────────────►│
   │                             │  3. Order ID
   │◄────────────────────────────┤◄─────────────────────┤
   │  {orderId, keyId, amount}   │                      │
   │                             │                      │
   │  4. Open Checkout Modal     │                      │
   │  (if not WhatsApp mode)     │                      │
   │                             │                      │
   │ [Customer enters payment]   │                      │
   │        ↓                    │                      │
   │ 5. POST Razorpay Response  │                      │
   ├───────────────────────────►│  6. Verify Signature │
   │  {paymentId, signature}     ├─────────────────────►│
   │                             │  7. Payment Details  │
   │                             │◄─────────────────────┤
   │  8. Update Order Status     │                      │
   │◄────────────────────────────┤                      │
   │  ✅ Payment Verified        │                      │
   │                             │  9. Send WhatsApp
   │                             ├──────────►[Twilio]
   │  10. Redirect Success Page  │                      │
   ├────────────────────────────►│                      │
   │                             │                      │
```

---

## WhatsApp Message Flow

```
┌────────────────────────────────────────────────────────────┐
│               WHATSAPP NOTIFICATION WORKFLOW               │
└────────────────────────────────────────────────────────────┘

STEP 1: Payment Creation
   └─► WhatsApp Service
       └─► formatPhoneNumber('+919876543210')
           └─► 'whatsapp:+919876543210'
               └─► Send Payment Link
                   └─► 📲 "Click to pay: https://rzp.io/..."

STEP 2: Payment Confirmation
   └─► Verify Payment Signature
       └─► WhatsApp Service
           └─► Send Confirmation
               └─► ✅ "Payment Received!"
                   + Tracking Link

STEP 3: Auto-Response to Inquiry
   └─► Detect Keywords:
       ├─► "upi", "pay" → Send UPI ID
       ├─► "price", "cost" → Ask for product details
       └─► "shipping" → Free shipping info

STEP 4: Order Shipped
   └─► WhatsApp Service
       └─► Send Shipping Notification
           └─► 📦 "Your saree is on the way!"
               + Tracking Number
```

---

## Security Flow

```
┌──────────────────────────────────────────────────────────┐
│               PAYMENT SECURITY CHECKS                   │
└──────────────────────────────────────────────────────────┘

1. SIGNATURE VERIFICATION
   ┌─ Razorpay sends payment data
   │
   ├─ Calculate HMAC-SHA256(
   │   ├─ Data: "order_id|payment_id"
   │   └─ Key: RAZORPAY_KEY_SECRET
   │)
   │
   └─ Compare with provided signature
      ├─ Match → ✅ Valid Payment
      └─ No Match → ❌ Reject

2. PHONE NUMBER VALIDATION
   ├─ Check format (10 digits for India)
   ├─ Add country code if missing
   └─ Verify with customer

3. ORDER VERIFICATION
   ├─ Check order exists in DB
   ├─ Verify amount matches
   └─ Prevent double payment

4. SSL/TLS
   ├─ All data encrypted in transit
   └─ HTTPS only in production

5. AUDIT TRAIL
   ├─ Log all transactions
   ├─ Store payment IDs (not card data)
   └─ Enable payment history tracking
```

---

## Testing Flow

```
🧪 TEST SCENARIO

1. Go to http://localhost:3000/payment.html

2. Fill Form:
   Name: "Test User"
   Phone: "9876543210"
   Email: "test@example.com"

3. Select "UPI" Payment Method

4. Click "Proceed to Payment"

5. Razorpay Modal Opens
   ├─ Select "Test" mode (if available)
   └─ Enter "success@razorpay"

6. System Processes:
   ✅ Creates order in DB
   ✅ Sends WhatsApp link (if configured)
   ✅ Verifies payment signature
   ✅ Updates order status to PAID
   ✅ Sends confirmation WhatsApp
   ✅ Creates invoice

7. Verify in Database:
   SELECT * FROM orders WHERE status = 'paid';

8. Check WhatsApp Log:
   SELECT * FROM whatsapp_notifications;

✅ Test Complete!
```

---

## File Structure

```
Abhinayam/
├── src/
│   ├── services/
│   │   ├── payment.js                 🔴 Razorpay API
│   │   ├── whatsapp-notifications.js  📱 WhatsApp Service
│   │   └── invoice.js                 📄 Invoice Generation
│   │
│   ├── routes/
│   │   └── payment.js                 🔌 Payment Endpoints
│   │
│   ├── lib/
│   │   └── migrations-orders.js       🗄️ Database Schema
│   │
│   └── app.js                         (Modified - integrated payment)
│
├── public/
│   └── payment.html                   🎨 Payment Form UI
│
├── .env.example                       ⚙️ Configuration Template
│
├── package.json                       📦 Dependencies
│
└── PAYMENT_INTEGRATION.md             📚 Full Documentation
```

---

## Environment Variables

```env
# ✅ REQUIRED - Get from Razorpay Dashboard
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx

# 📱 OPTIONAL - Get from Twilio for WhatsApp notifications
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# 💬 EXISTING - Your business info
WHATSAPP_NUMBER=+919999999999
UPI_ID=abhinayamsilks@upi
```

---

## Key Concepts

```
📌 ORDER ID:        Unique order identifier (e.g., "ORDER-1699167000123")
💳 RAZORPAY ID:     Razorpay's order ID (returned from API)
🔐 SIGNATURE:       HMAC-SHA256 hash for verification
✅ PAYMENT ID:      Razorpay payment ID after successful payment
📱 PHONE NUMBER:    Must be 10 digits (India) or with country code
💰 AMOUNT:          Always in PAISE (multiply by 100 for display)
📲 TWILIO:          Third-party service for WhatsApp API
🔗 PAYMENT LINK:    Short URL to share via WhatsApp
```

---

## Troubleshooting Quick Map

```
❌ "RAZORPAY_KEY_ID not found"
   → Add RAZORPAY_KEY_ID to .env

❌ "Payment verification failed"
   → Check RAZORPAY_KEY_SECRET is correct
   → Verify order exists in database

❌ "WhatsApp message not sent"
   → Check Twilio credentials
   → Verify phone number format

❌ "Order not created"
   → Check database migrations ran
   → Check database connection

❌ "Signature invalid"
   → Don't use test signatures in production
   → Verify payment amount matches
```

---

**Created:** 2024-11-05  
**Branch:** feature/razorpay-payment-integration  
**Status:** ✅ Ready to Use
