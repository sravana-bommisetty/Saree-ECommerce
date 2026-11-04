#!/usr/bin/env bash

# 🚀 Quick Start Guide for Payment Integration
# Copy & paste these commands to get started

echo "==============================================="
echo "  🛍️  Razorpay Payment Integration Setup"
echo "==============================================="
echo ""

# Step 1: Navigate to project
echo "📂 Step 1: Navigate to project"
echo "$ cd Abhinayam"
echo ""

# Step 2: Install dependencies
echo "📦 Step 2: Install dependencies"
echo "$ npm install"
echo ""

# Step 3: Setup environment
echo "⚙️  Step 3: Configure environment variables"
echo "$ cp .env.example .env"
echo ""
echo "Then add these to .env:"
echo ""
echo "  RAZORPAY_KEY_ID=rzp_test_xxxxxx"
echo "  RAZORPAY_KEY_SECRET=xxxxx"
echo ""
echo "Optional (for WhatsApp):"
echo "  TWILIO_ACCOUNT_SID=ACxxxxx"
echo "  TWILIO_AUTH_TOKEN=xxxxx"  
echo "  TWILIO_WHATSAPP_FROM=whatsapp:+14155238886"
echo ""

# Step 4: Start server
echo "▶️  Step 4: Start development server"
echo "$ npm run dev"
echo ""

# Step 5: Access payment form
echo "🌐 Step 5: Open payment form in browser"
echo "   → http://localhost:3000/payment.html"
echo ""

# Step 6: Test payment
echo "🧪 Step 6: Test with Razorpay test credentials"
echo "   Method: UPI"
echo "   UPI ID: success@razorpay"
echo ""
echo "   Method: Card"
echo "   Card: 4111 1111 1111 1111"
echo "   CVV: 123"
echo "   Expiry: 12/28"
echo ""

# Step 7: Check database
echo "🗄️  Step 7: Verify order in database"
echo "   SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;"
echo ""

# Step 8: Review documentation
echo "📚 Step 8: Full documentation"
echo "   → See: Abhinayam/PAYMENT_INTEGRATION.md"
echo ""

echo "==============================================="
echo "✅ Setup complete! Questions? Check docs! 🎉"
echo "==============================================="
