-- Sample data so the site looks complete on first run.
-- Only applied when the categories table is empty. Replace via the admin panel.

INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('Kanjivaram Silk', 'kanjivaram-silk', 'Temple-border pure silk sarees woven in Kanchipuram.', 1),
  ('Banarasi Silk',   'banarasi-silk',   'Rich zari brocade sarees from Varanasi.', 2),
  ('Soft Silk',       'soft-silk',       'Lightweight, easy-drape silks for every occasion.', 3),
  ('Tussar Silk',     'tussar-silk',     'Textured natural silks with earthy elegance.', 4),
  ('Cotton Silk',     'cotton-silk',     'Breathable cotton-silk blends for daily grace.', 5);

INSERT INTO products (sku, name, slug, category_id, fabric, color, price, mrp, description, stock_qty, is_featured) VALUES
  ('AB-KJ-001', 'Maroon Kanjivaram with Gold Zari', 'maroon-kanjivaram-gold-zari',
   (SELECT id FROM categories WHERE slug='kanjivaram-silk'), 'Pure Silk', 'Maroon', 18500, 21000,
   'Classic maroon Kanjivaram with a contrast gold zari temple border and rich pallu. Comes with an unstitched blouse piece.', 3, 1),
  ('AB-KJ-002', 'Bottle Green Kanjivaram Bridal', 'bottle-green-kanjivaram-bridal',
   (SELECT id FROM categories WHERE slug='kanjivaram-silk'), 'Pure Silk', 'Green', 24900, NULL,
   'Bridal Kanjivaram in deep bottle green with intricate korvai border and heavy zari pallu.', 1, 1),
  ('AB-BN-001', 'Royal Blue Banarasi Brocade', 'royal-blue-banarasi-brocade',
   (SELECT id FROM categories WHERE slug='banarasi-silk'), 'Banarasi Silk', 'Blue', 14200, 16000,
   'Royal blue Banarasi with all-over floral butta and a broad brocade border.', 4, 1),
  ('AB-SS-001', 'Peach Soft Silk with Silver Zari', 'peach-soft-silk-silver-zari',
   (SELECT id FROM categories WHERE slug='soft-silk'), 'Soft Silk', 'Peach', 6800, NULL,
   'Feather-light peach soft silk with delicate silver zari motifs – ideal for festive day wear.', 6, 0),
  ('AB-TS-001', 'Mustard Tussar with Kalamkari Pallu', 'mustard-tussar-kalamkari',
   (SELECT id FROM categories WHERE slug='tussar-silk'), 'Tussar Silk', 'Yellow', 5400, 6000,
   'Natural mustard tussar paired with a hand-painted Kalamkari pallu.', 0, 0),
  ('AB-CS-001', 'Pink Cotton Silk Daily Wear', 'pink-cotton-silk-daily',
   (SELECT id FROM categories WHERE slug='cotton-silk'), 'Cotton Silk', 'Pink', 2450, NULL,
   'Soft pink cotton-silk with a thin zari border. Comfortable for office and daily wear.', 10, 0);

INSERT INTO product_images (product_id, url, alt, sort_order)
  SELECT id, '/images/placeholder-saree.svg', name, 0 FROM products;
