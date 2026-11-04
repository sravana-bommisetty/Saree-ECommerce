# ✅ New Pricing System Guide

**Status:** Implementation complete and tested ✅

---

## 📋 How It Works

### **The Flow:**

You set **Original MRP** → System calculates **Sale Price** using discounts

```
MRP: ₹100
Category Discount: 10%
Product Discount: 5%
Total Discount: 15%

Sale Price = 100 × (1 - 15/100) = ₹85

Customer pays ₹85, sees ~~₹100~~ ₹85 with "15% OFF" badge
```

---

## 🔧 Admin Portal - Adding Products

### **Step-by-Step:**

1. Go to **Admin** → **Products** → **Add saree**

2. Fill in basic details:
   - Name
   - SKU
   - Category (this has its own discount %)
   - Fabric, Color, Stock, etc.

3. **Enter the ORIGINAL MRP** (required):
   - Label: "Original MRP (₹) *"
   - This is the full price before any discounts
   - Example: ₹2,000

4. **Set Product Discount (optional)**:
   - Label: "Product Discount (%) – Added to category discount"
   - This is EXTRA discount on top of category discount
   - Example: 5%

5. **Sale Price AUTO-CALCULATES**:
   - Label: "Sale Price (₹) – Auto-calculated from MRP and discount"
   - This field is READ-ONLY
   - Shows what customer actually pays
   - Example: ₹2,000 × (1 - category% + product%) = final sale price

### **Example Walkthrough:**

| Field | Value | Notes |
|-------|-------|-------|
| Name | Maroon Kanjivaram Silk | Product name |
| Category | Kanjivaram Silk | Has 10% category discount |
| Original MRP | ₹2,000 | You enter this |
| Product Discount | 5% | You enter this (optional) |
| Category Discount | 10% | Auto-loaded from category |
| **Total Discount** | **15%** | 10% + 5% |
| **Sale Price** | **₹1,700** | Auto-calculated |
| **On Website Shows** | **~~₹2,000~~ ₹1,700** | With "15% OFF" badge |

---

## 🏷️ Category Discounts

**Categories are set with their own discount % that applies to ALL products in that category.**

### **To Set Category Discount:**

1. Go to **Admin** → **Categories** → Edit category

2. Set **Discount (%)** field
   - This discount applies to ALL products in this category
   - Example: Kanjivaram category has 10% discount

3. Save

### **How It's Applied:**

When you add a product:
- Category Discount is **automatically loaded** from the category
- Shows in the form (read-only)
- Combined with Product Discount to calculate Sale Price

---

## 📊 Discount Calculation Formula

**Sale Price = MRP × (1 - (Category Discount + Product Discount) / 100)**

### **Examples:**

**Example 1: Only Category Discount**
```
MRP: ₹1,000
Category Discount: 20%
Product Discount: 0%

Sale Price = 1,000 × (1 - 20/100) = ₹800
Display: ~~₹1,000~~ ₹800 [20% OFF]
```

**Example 2: Both Discounts**
```
MRP: ₹1,000
Category Discount: 10%
Product Discount: 5%

Sale Price = 1,000 × (1 - 15/100) = ₹850
Display: ~~₹1,000~~ ₹850 [15% OFF]
```

**Example 3: No Discounts**
```
MRP: ₹1,000
Category Discount: 0%
Product Discount: 0%

Sale Price = 1,000 × (1 - 0/100) = ₹1,000
Display: ₹1,000 (no strikethrough, no badge)
```

---

## 🏠 Homepage Display

### **Product Cards Show:**

```
┌─────────────────────┐
│  [Product Image]    │
│  15% OFF ⬜        │  ← Discount Badge (bottom-right)
├─────────────────────┤
│ Product Name        │
│ Fabric · Color      │
│ ~~₹2,000 ₹1,700    │  ← Strikethrough MRP + Sale Price
│                     │
│ [Add to Bag] [...] │
└─────────────────────┘
```

**Discount Badge:**
- Shows total discount % (category + product)
- Red background for visibility
- Only shows if discount > 0%

**Price Line:**
- Shows original MRP with strikethrough
- Shows sale price in bold
- Format: ~~MRP~~ SalePrice

---

## ✨ Product Detail Page

On `/saree/{product-slug}`:

```
Product Name
Fabric & Details

~~₹2,000~~  ₹1,700

Discount: 15% off
(10% category + 5% product)

[Add to Cart] [Enquire]
```

Breakdown shows:
- Total discount %
- How much is from category
- How much is from product

---

## 🔄 When to Use Product Discount

### **Use CATEGORY discount for:**
- Store-wide promotions
- Seasonal sales (entire category on sale)
- Discount that applies to many products

### **Use PRODUCT discount for:**
- Individual product discounts
- Clearance items
- Special offers on specific products
- Extra discount on top of category discount

---

## 📝 Important Notes

### **Validation Rules:**

✅ MRP is **required** (must be > 0)
✅ Discounts must be **0-100%**
✅ Total discount cannot be **100% or more** (won't calculate)
✅ Sale Price is **auto-calculated and read-only**
✅ Sale Price must always be **less than MRP**

### **Edge Cases:**

| Scenario | Result |
|----------|--------|
| MRP: ₹100, Discount: 100% | Sale Price: Cannot calculate (error) |
| MRP: ₹100, Discount: 90% | Sale Price: ₹10 (valid) |
| MRP: ₹0 | Sale Price: Error (MRP required) |
| No discount set | Sale Price = MRP (no strikethrough on website) |

---

## 🧪 Testing the System

### **Test Case 1: Category Discount Only**
1. Create category "Test" with 20% discount
2. Add product with MRP ₹1,000 to "Test" category
3. Product Discount: leave blank (0)
4. Sale Price should auto-calculate: ₹800
5. Website should show: ~~₹1,000~~ ₹800 [20% OFF]

### **Test Case 2: Both Discounts**
1. Use "Test" category (20% discount)
2. Add product with MRP ₹1,000
3. Product Discount: 10%
4. Sale Price should auto-calculate: ₹700
5. Website should show: ~~₹1,000~~ ₹700 [30% OFF]

### **Test Case 3: No Discount**
1. Create category "Full Price" with 0% discount
2. Add product with MRP ₹1,000 to "Full Price"
3. Product Discount: 0%
4. Sale Price should be: ₹1,000
5. Website should show: ₹1,000 (no badge, no strikethrough)

---

## ❌ Common Mistakes to Avoid

| Mistake | Problem | Fix |
|---------|---------|-----|
| Forgetting to set MRP | Sale Price won't calculate | Always enter Original MRP first |
| Setting discount > 100% | System rejects it | Keep discount between 0-100% |
| Changing MRP after setting product | Sale Price updates | That's normal - recalculates automatically |
| Setting discount on product without category | Works but confusing | Better to use category discount for base discount |

---

## 📞 FAQ

**Q: If I change category discount, do existing products update?**
A: NO. Existing product discounts stay the same. New products added to that category will use the new discount.

**Q: Can I override category discount for a specific product?**
A: YES! Use Product Discount field to add extra discount on top of category discount.

**Q: Why is Sale Price read-only?**
A: To prevent manual errors. It's always calculated correctly from MRP and discounts.

**Q: Can I set discount to 99.99%?**
A: YES. Formula works up to 99.99%. At 100%, calculation fails (division error).

**Q: What if I enter MRP but no discount?**
A: Sale Price = MRP. No strikethrough shown on website. Product shows regular price.

---

## 🎯 Summary

**Old system (removed):** Rate Price input → MRP calculated ❌
**New system (active):** MRP input → Sale Price calculated ✅

- Enter **Original MRP** (what product originally costs)
- Set **Category Discount %** (applies to all products in category)
- Set **Product Discount %** (extra discount on this specific product)
- **Sale Price auto-calculates** (what customer pays)
- **Website displays:** ~~MRP~~ SalePrice + Discount Badge

---

**All features tested and working!** ✅
