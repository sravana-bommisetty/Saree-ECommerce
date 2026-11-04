# 📲 Automated WhatsApp Replies + UPI — Free Setup Guide

**Goal:** When a customer messages your shop (e.g. *"I want to buy this saree, what's your UPI id?"*), they get an **instant automatic reply** with your UPI ID and next steps — **without you having to type anything**.

**Cost:** ₹0. No Razorpay, no Twilio, no coding. Just the free **WhatsApp Business** app from Meta.

---

## Why this (and not code)?

Your website already sends customers *into* WhatsApp (floating chat button, "Enquire on WhatsApp", pre-filled order messages, UPI QR code). ✅

But a website **cannot reply** to messages people send to your WhatsApp number — only the WhatsApp app on your phone can. The free **WhatsApp Business** app has three built-in automation tools that do exactly what you want:

| Tool | What it does | Best for |
|------|--------------|----------|
| **Greeting message** | Auto-sent the first time someone messages you (or after 14 days) | First-time "Hi, is this saree available?" |
| **Away message** | Auto-sent when you're offline / outside business hours | Nights, busy times |
| **Quick replies** | Saved replies you send with a short code like `/upi` | Fast manual answers during the day |

---

## Step 1 — Install WhatsApp Business

1. On your phone, open **Play Store** (Android) or **App Store** (iPhone).
2. Search **"WhatsApp Business"** → Install.
3. Register with your **shop's phone number**.
   - 💡 If this number already uses normal WhatsApp, the app offers to **move your chats** over. You can only have one WhatsApp (personal **or** business) per number — most shops switch the business number to WhatsApp Business.
4. Fill your **Business Profile**: shop name (*Abhinayam Silks*), category (*Shopping & Retail*), address, hours, website.

---

## Step 2 — Set the Greeting Message (first-contact auto-reply)

This fires automatically the moment a new customer messages you.

1. Open **WhatsApp Business** → tap **⋮ / Settings**.
2. Go to **Business tools → Greeting message**.
3. Turn it **ON**.
4. Paste this message (edit the UPI ID to your real one):

```
Namaste 🙏 Welcome to Abhinayam Silks!

Thank you for messaging us. Here's how to order:

💳 UPI ID: abhinayamsilks@upi
   (Name: Abhinayam Silks)

🛍️ To buy a saree:
1. Send us the saree photo or code you like
2. We'll confirm price + availability
3. Pay to the UPI ID above
4. Share the payment screenshot here
5. We ship within 2–3 days 🚚

Browse all sarees: https://your-website-link.com

We'll reply personally very soon! 😊
```

5. Set **Recipients → Everyone**. Save.

---

## Step 3 — Set the Away Message (after-hours auto-reply)

This fires when you're not available, so customers still get the UPI ID instantly at 11 PM.

1. **Business tools → Away message** → turn **ON**.
2. Paste:

```
Thanks for your message! 🙏 We're away right now but will reply soon.

Meanwhile, to order quickly:
💳 UPI ID: abhinayamsilks@upi (Abhinayam Silks)

Send the saree you like + your address, pay to the UPI above, and share the screenshot. We'll confirm as soon as we're back! 😊
```

3. **Schedule** → choose one:
   - **Always send** — simplest (replies even if you're online elsewhere), **or**
   - **Outside of business hours** — set your shop hours (e.g. 10 AM–8 PM) so it only auto-replies at night.
4. **Recipients → Everyone**. Save.

> 💡 Many small shops use the **Greeting message** for first contact and an **Away message set to "Outside business hours"**. That way every message gets an instant UPI reply, day or night.

---

## Step 4 — Add Quick Replies (fast manual answers during the day)

For when you're online and want to answer common questions with one tap.

1. **Business tools → Quick replies → Add (➕)**.
2. Create these:

| Shortcut | Message |
|----------|---------|
| `/upi` | `💳 Our UPI ID: abhinayamsilks@upi (Abhinayam Silks). Please pay and share the screenshot here 🙏` |
| `/ship` | `🚚 We ship across India in 4–7 days. Free shipping above ₹5,000. Dispatch in 2–3 days after payment.` |
| `/price` | `Please share the saree photo or product code and we'll send you the exact price 😊` |
| `/thanks` | `Thank you so much! 🙏 Your order is confirmed and will be dispatched soon. We'll share tracking here.` |

3. To use: in any chat, type the shortcut (e.g. `/upi`) and it expands into the full message.

---

## Step 5 — Make the UPI ID match your website

Keep your shop's details identical everywhere so nothing confuses customers:

1. Open your website **Admin → Settings**.
2. Confirm **UPI ID** and **UPI Payee Name** match what you put in the messages above.
   - These power the UPI link + QR code your website already generates at checkout.
3. Confirm the **WhatsApp number** is the same number you installed WhatsApp Business on.

---

## How a real order now flows (fully automated first reply)

```
Customer taps "Enquire on WhatsApp" on your site
        │
        ▼
Their WhatsApp opens with a pre-filled message to your shop
        │
        ▼
They hit send  ──►  📲 Greeting/Away message auto-replies INSTANTLY
                     with your UPI ID + steps (you typed nothing!)
        │
        ▼
Customer pays to your UPI ID and sends the screenshot
        │
        ▼
You confirm with a Quick Reply (/thanks) and ship 🚚
```

---

## ✅ Quick checklist

- [ ] Installed **WhatsApp Business** on the shop number
- [ ] **Greeting message** ON — contains UPI ID
- [ ] **Away message** ON — contains UPI ID (Always, or Outside business hours)
- [ ] **Quick replies** added (`/upi`, `/ship`, `/price`, `/thanks`)
- [ ] Website **Admin → Settings** UPI ID matches the messages
- [ ] Sent a test message from another phone to confirm the auto-reply arrives

---

## Later, if orders grow 📈

When you're handling many orders a day and manual confirmation gets tiring, that's the time to consider **Razorpay** (≈2.36% per payment) for **automatic payment confirmation and tracking**. You don't need it now — plain UPI + these auto-replies cost ₹0 and work great for getting started.

---

*Everything on your website side (WhatsApp buttons, UPI link, UPI QR code) is already built and needs no changes — this guide only sets up the free auto-reply on your phone.*
