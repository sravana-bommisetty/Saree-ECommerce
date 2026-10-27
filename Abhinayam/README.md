# Abhinayam Silks – Website

Elegant, mobile-friendly saree catalogue with **WhatsApp ordering**, **UPI payments**, and an **admin panel**. Shop owners can manage sarees, prices, stock, orders, and page content themselves, without a developer.

| Area | What you get |
|---|---|
| Design | Maroon, gold, and ivory theme. Playfair Display and Poppins fonts. Fully responsive. Brand logo in the header and footer. |
| Pages | Home · Shop Sarees · Categories · Saree detail · About Us · Contact Us · Shipping & Return Policy · My Bag |
| Catalogue | Photos (multiple per saree), name, price and MRP, fabric, colour, description, stock availability ("Only 2 left", "Sold out") |
| Search and filters | Free-text search plus category, fabric, colour, price range, in-stock only, sort, and pagination |
| WhatsApp | "Enquire" button on every saree, a floating chat button, and orders sent as a pre-filled WhatsApp message |
| Payments | UPI deep link ("Pay with UPI app") and a scannable UPI QR code with the exact amount and order number |
| Admin panel (`/admin`) | Upload photos, add, edit, or hide sarees, update stock inline, manage categories, view and update orders (status, payment, UTR, tracking), edit contact, UPI, Instagram, and policy text, manage staff access, change password |
| Staff portal (`/staff`) | Separate staff login. Staff see only the **Stock** tab: search, low-stock filter, update quantities with a note, and view the change history |
| Google visibility | Unique titles and meta descriptions, canonical URLs, Open Graph tags, `schema.org/Product` JSON-LD on every saree, auto-generated `/sitemap.xml`, and `/robots.txt` |
| Instagram | Links in the footer, home page, About, and Contact (URL editable in Settings) |

---

## 1. Run it together on GitHub (Codespaces – recommended)

Anyone with access to this repository can run, view, and edit the site in the browser. Nothing needs to be installed.

1. On GitHub, open the repo and click **Code → Codespaces → ⋯ → New with options**.
2. Under **Dev container configuration**, choose **Abhinayam Silks website** and click **Create codespace**.
3. The container installs everything, creates `.env` from `.env.example`, and starts the server with auto-reload (`npm run dev`). The website opens automatically on port **3000**.
4. **Share with other people:** open the **Ports** tab, right-click port 3000, and choose **Port visibility → Private to Organization** or **Public**. Then send them the forwarded URL. You can also do this from the CLI:
   ```bash
   gh codespace ports visibility 3000:public -c <codespace-name>
   ```
5. Each developer works in their own codespace and branch, then opens a Pull Request. CI (`.github/workflows/abhinayam-ci.yml`) runs the tests on every PR.

> Each codespace has its own database and uploads. Product data you add in one codespace is not shared with others. For one shared live site, deploy it as described in section 4.

## 2. Run locally

Requires **Node.js 22.13+** (uses the built-in `node:sqlite`, so no database server or native build is needed).

```bash
cd Abhinayam
cp .env.example .env        # Windows: copy .env.example .env
npm install
npm run dev                 # http://localhost:3000   admin: http://localhost:3000/admin   staff: http://localhost:3000/staff
```

Default admin login comes from `.env` (`admin` / `ChangeMe@123`). **Change it after the first login** (Admin → Account).

To let others on the same Wi-Fi or LAN open it, share `http://<your-ip>:3000`.

## 3. Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | Use `production` for live (secure cookies, HSTS, required secrets) |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Public site URL used in the sitemap, canonical, and Open Graph links |
| `DB_FILE` | `data/abhinayam.db` | SQLite database file |
| `UPLOAD_DIR` | `uploads` | Where product photos are stored |
| `SESSION_SECRET` | random (dev only) | **Required in production.** Long random string |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `ChangeMe@123` (dev) | First admin, created automatically only if no admin exists |
| `WHATSAPP_NUMBER` | `919999999999` | Initial WhatsApp number with country code (editable in Admin → Settings) |
| `UPI_ID` / `UPI_PAYEE_NAME` | `abhinayamsilks@upi` / `Abhinayam Silks` | Initial UPI details (editable in Admin) |
| `INSTAGRAM_URL` | `https://www.instagram.com/abhinayamsilks` | Initial Instagram link (editable in Admin) |

Add more admins with `npm run create-admin -- <username> <password>`, or staff with `npm run create-admin -- <username> <password> staff`. Usually it's easier to use **Admin → Staff access**.

## 4. Going live

```bash
cd Abhinayam
cp .env.example .env   # set NODE_ENV=production, SESSION_SECRET, ADMIN_PASSWORD, PUBLIC_BASE_URL=https://your-domain
docker compose up -d --build
```

The database and photos are kept in Docker volumes (`abhinayam-data`, `abhinayam-uploads`). Back them up regularly. The container works on any VM, Google Cloud Run (add a persistent volume), Render, Railway, and similar hosts. Serve it over HTTPS.

**Google search:** after going live, add the domain in [Google Search Console](https://search.google.com/search-console), submit `https://your-domain/sitemap.xml`, and create a Google Business Profile that links to the site.

## 5. Day-to-day management (no developer needed)

| Task | Where |
|---|---|
| Add a new saree with photos | Admin → Sarees → **+ Add saree** |
| Change price, MRP, or description | Admin → Sarees → **Edit** |
| Update stock | Admin or staff → **Stock** → type the new quantity and an optional note → **Save** (every change is logged with who made it) |
| Give a staff member stock-only access | Admin → **Staff access** → **+ Add user** → Access level **Staff**, then share the link `https://your-domain/staff` |
| Remove someone's access | Admin → Staff access → **Edit** → untick **Active** (they're logged out immediately), or **Delete** |
| Reset a staff password | Admin → Staff access → **Edit** → enter a new password |
| Hide a saree temporarily | Edit → untick **Visible on website** |
| Show a saree on the home page | Edit → tick **Featured on home page** |
| Confirm payment or ship an order | Admin → Orders → **Open** → set status, payment, UTR, tracking. **WhatsApp customer** button included |
| Change WhatsApp, UPI, Instagram, address, About text, or policies | Admin → Website settings |
| Replace the logo | Replace `public/images/logo.svg` (and `favicon.svg`) with your brand files |

**How ordering works**

1. The customer adds sarees to the bag.
2. They enter their details and press **Place order on WhatsApp**.
3. The order is saved and stock is reserved.
4. WhatsApp opens with the full order message.
5. The customer pays with the UPI QR code or link and sends the screenshot.
6. You mark the order **paid** and **shipped** in Admin.

Cancelling an order returns its stock automatically.

## 6. Project structure

```
Abhinayam/
├── db/schema.sql          # Database schema (tables: categories, products, product_images, orders, order_items, admins, stock_log, settings)
├── db/seed.sql            # Sample sarees and categories (only loaded into an empty DB)
├── src/
│   ├── server.js          # Entry point
│   ├── app.js             # Express app: security headers, sessions, routes, errors
│   ├── config.js          # Env-based configuration (12-factor)
│   ├── db.js              # SQLite connection + transactions
│   ├── auth.js            # scrypt password hashing, admin session guard
│   ├── uploads.js         # Image upload (JPG/PNG/WEBP, 5 MB, max 8)
│   ├── seo.js             # sitemap.xml, robots.txt, server-rendered product SEO
│   ├── lib/               # validation + WhatsApp/UPI link builders
│   ├── services/          # catalog, orders, settings (business logic)
│   └── routes/            # public API (/api) and admin API (/api/admin)
├── public/                # Website pages, CSS, JS, images, admin panel
├── test/                  # node:test unit + HTTP integration tests
├── Dockerfile, docker-compose.yml
└── .env.example
```

### Database schema (summary)

```
categories(id, name UNIQUE, slug UNIQUE, description, image_url, sort_order, created_at)
products(id, sku UNIQUE, name, slug UNIQUE, category_id→categories, fabric, color, price, mrp,
         description, stock_qty ≥ 0, is_featured, is_active, created_at, updated_at)
product_images(id, product_id→products ON DELETE CASCADE, url, alt, sort_order)
orders(id, order_no UNIQUE, customer_name, phone, address, city, pincode, notes, total,
       status[new|confirmed|shipped|delivered|cancelled], payment_status[pending|paid|refunded],
       payment_ref, tracking_info, created_at, updated_at)
order_items(id, order_id→orders, product_id→products ON DELETE SET NULL, product_name, sku, unit_price, qty)
admins(id, username UNIQUE, password_hash, role[admin|staff], display_name, is_active, last_login_at, created_at)
stock_log(id, product_id→products ON DELETE SET NULL, sku, product_name, old_qty, new_qty, note, changed_by, created_at)
settings(key PRIMARY KEY, value)      -- WhatsApp, UPI, Instagram, address, About, policies…
```

New columns are added to existing databases automatically on startup (`migrate()` in `src/db.js`).

### Roles

| | Admin | Staff |
|---|---|---|
| Stock tab: view stock, update quantity with note, see change history | ✅ | ✅ |
| Change own password | ✅ | ❌ (an admin resets it under Staff access) |
| Dashboard, Sarees (prices, photos), Categories, Orders, Website settings | ✅ | ❌ |
| Staff access: add, edit, deactivate, or delete users | ✅ | ❌ |

The server enforces permissions on every request, not just in the menu. Admins log in at **`/admin`** and staff at **`/staff`**. Each login page accepts only its own role, and a signed-in user who opens the other portal is redirected to their own. Admins can't remove their own admin access, and the shop always keeps at least one active admin.

### API

Public: `GET /api/settings`, `GET /api/categories`, `GET /api/products?q=&category=&fabric=&color=&minPrice=&maxPrice=&inStock=1&sort=&page=&limit=`, `GET /api/products/filters`, `GET /api/products/:slug`, `POST /api/orders` (rate-limited).

Admin and staff (session cookie and `X-Requested-With: fetch` header): `POST /api/admin/login` (`{username, password, portal: "admin"|"staff"}`; defaults to `admin`), `POST /api/admin/logout`, `GET /api/admin/me`, `GET /api/admin/stock?q=&lowStock=`, `GET /api/admin/stock/history?productId=&limit=`, `PATCH /api/admin/products/:id/stock` (`{stock_qty, note}`).

Admin only: `POST /api/admin/password`, `GET /api/admin/stats`, `GET|PUT /api/admin/settings`, CRUD `/api/admin/categories`, `/api/admin/products` (multipart `images`), `DELETE /api/admin/images/:id`, `GET|PATCH /api/admin/orders/:id`, CRUD `/api/admin/users`. Staff get `403` on these.

## 7. Tests

```bash
npm test     # unit + integration tests with coverage (node:test, in-memory DB)
```

## 8. Security notes

- Passwords are hashed with scrypt. Login is rate-limited, and the session cookie is httpOnly, SameSite=Lax, and Secure in production.
- Admin write requests need a custom header (CSRF protection). A strict Content-Security-Policy is applied with Helmet.
- Uploads accept only JPG, PNG, or WEBP images (max 5 MB) and get random file names.
- Never commit `.env`. Use a strong `SESSION_SECRET` and admin password in production.
