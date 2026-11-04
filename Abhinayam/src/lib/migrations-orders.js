/**
 * Database schema for payment orders
 * Run this migration to set up the orders table
 */

const createOrdersTableSQL = `
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_payment_link_id VARCHAR(255),
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);

-- Order items table to store what was ordered
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id VARCHAR(255),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Payments tracking table for detailed payment history
CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  razorpay_payment_id VARCHAR(255) NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50),
  method VARCHAR(50),
  payment_at TIMESTAMP,
  refund_amount DECIMAL(10, 2),
  refunded_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_razorpay_id ON payment_transactions(razorpay_payment_id);

-- WhatsApp notifications log
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255),
  customer_phone VARCHAR(20),
  message_type VARCHAR(50),
  message_body TEXT,
  twilio_sid VARCHAR(255),
  status VARCHAR(50),
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_order_id ON whatsapp_notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_customer_phone ON whatsapp_notifications(customer_phone);
`;

/**
 * Run migration
 */
async function runOrdersMigration(db) {
  try {
    await db.query(createOrdersTableSQL);
    console.log('✅ Orders tables created successfully');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Orders tables already exist');
    } else {
      throw error;
    }
  }
}

module.exports = {
  createOrdersTableSQL,
  runOrdersMigration,
};
