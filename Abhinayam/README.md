# Abhinayam Silks | Online Saree Store

## Client Presentation

### A digital storefront for Abhinayam Silks

Abhinayam Silks brings its saree collection online through a polished, mobile-friendly shopping experience. Customers can discover products by category, explore detailed photos and product information, check availability, and place an order from their phone or computer.

The experience combines convenient online browsing with the personal service of WhatsApp, while giving the shop team a dedicated portal to manage the catalogue, stock, and orders.

### The customer experience

| Discover | Choose | Order | Connect |
|---|---|---|---|
| Browse sarees by category, fabric, colour, price, or availability. | View product photos, descriptions, pricing, and stock status. | Add selections to a shopping bag and submit delivery details. | Pay through UPI and contact the shop through a prepared WhatsApp message. |

Customers can also visit the About, Contact, and Shipping & Returns pages, or use WhatsApp to ask questions and get personal assistance.

### Tools for the shop team

- **Manage the collection:** add and update sarees, photos, prices, descriptions, categories, and visibility.
- **Keep stock current:** update quantities and review a history of stock changes.
- **Process orders:** review customer orders, update fulfilment and payment status, and record payment references or tracking details.
- **Manage the storefront:** update shop contact details, UPI information, Instagram links, and policy content.
- **Delegate stock work:** provide staff with a separate, stock-only login while keeping administrative controls restricted to admins.

### How ordering and payment work

1. The customer chooses sarees and submits their contact and delivery details.
2. The order is recorded, and the selected stock is reserved.
3. The customer pays using the displayed UPI link or QR code.
4. The customer opens a prepared WhatsApp message, sends it to the shop, and shares payment confirmation.
5. The shop team verifies payment and updates the order before fulfilment.

Customers can later use **Track Order** with their order number and checkout phone number to see the fulfilment status and any courier details entered by the shop. If a tracking URL is provided, the page links to the courier's tracking site; live carrier updates are not integrated.

**Payment and order confirmation are handled by the shop team.** The site does not automatically collect or verify payments, send WhatsApp messages, or issue refunds. The customer must send the prepared WhatsApp message themselves.

### At a glance

- Online storefront for saree discovery and ordering
- Searchable catalogue with product details, photos, pricing, and stock status
- Mobile-friendly customer pages and shopping bag
- UPI payment link and QR code
- WhatsApp enquiries and order follow-up
- Order status and courier link lookup using the order number and checkout phone
- Separate admin and stock-only staff access
- Order, inventory, and shop-content management

The detailed setup, hosting, operational notes, and technical reference are preserved below for the implementation and support team.

<details>
<summary>Developer reference: setup, deployment, and technical details</summary>

---

## 1. Requirements and architecture

- Node.js **22.13 or newer** and npm; the Docker image uses Node.js 24 Alpine.
- A PostgreSQL database with permission to create tables, indexes, and apply the included schema changes. Both development and production use PostgreSQL; SQLite is not a supported runtime.
- S3-compatible object storage for new photo uploads. PostgreSQL stores image URLs, not image bytes.
- WhatsApp and a valid UPI account for manual order/payment confirmation.

The browser loads static pages and calls `/api`. Express handles catalogue queries and order creation; authenticated admin/staff requests use `/api/admin`. Startup connects to PostgreSQL, applies `db/schema-postgres.sql`, inserts missing settings, and optionally creates the first admin before listening.

This checkout does not include a Codespaces/devcontainer configuration or a CI workflow. If using Codespaces, configure it separately and follow the local setup below. Apps pointing at the same database share catalogue, settings, users, and orders; browser bags remain local to each browser/origin.

## 2. Run locally

From the repository root, copy the environment template and install dependencies:

```bash
cd Abhinayam
cp .env.example .env
npm ci
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Do not overwrite an existing private environment file.

Before starting, set `DATABASE_URL`, replace the template `SESSION_SECRET`, and set an explicit `ADMIN_PASSWORD` if this database has no admin. The default username is `admin`, but **there is no default admin password**; the template leaves it blank. Passwords must be at least eight characters; use a strong unique password. Configure image storage using section 3.

```bash
npm run dev
```

Open `http://localhost:3000`, `/admin/` for admins, and `/staff` for stock-only staff. Tables are initialized automatically; no sample categories or sarees are inserted. Use Admin to add your catalogue and review the placeholder contact/policy settings. Change the bootstrap password under **Admin > Account**, then remove it from the environment; changing bootstrap variables does not reset an existing account.

`npm start` runs without watch mode. Both commands load `.env` if present. `npm run dev` watches server files; refresh the browser after changing static HTML/CSS/JavaScript.

To let others on the same Wi-Fi or LAN open it, share `http://<your-ip>:3000`.

## 3. Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | non-production if unset | Set `production` for HTTPS deployments (secure cookies, HSTS, required session secret) |
| `PUBLIC_BASE_URL` | `RENDER_EXTERNAL_URL`, then `http://localhost:<PORT>` | Public URL used in sitemap/product SEO; explicitly set this for a custom domain |
| `DATABASE_URL` | required | PostgreSQL connection string; use `sslmode=verify-full` for hosted databases requiring verified TLS |
| `UPLOAD_DIR` | `uploads` | Directory served at `/uploads`, relative to the app folder; the current uploader does not write new files here |
| `SESSION_SECRET` | random (dev only) | **Required in production.** Long random string |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / empty | Optional first-admin bootstrap; requires an explicit password and no existing admin |
| `WHATSAPP_NUMBER` | `919999999999` | Initial WhatsApp number with country code (editable in Admin → Settings) |
| `UPI_ID` / `UPI_PAYEE_NAME` | `abhinayamsilks@upi` / `Abhinayam Silks` | Initial UPI details (editable in Admin) |
| `INSTAGRAM_URL` | `https://www.instagram.com/abhinayamsilks` | Initial Instagram link (editable in Admin) |
| `AWS_BUCKET_NAME` | unset | Enables S3 uploads; bucket must already exist |
| `AWS_ENDPOINT_URL_S3` | unset | S3-compatible endpoint used for uploads and public URLs; configure it without a trailing slash |
| `AWS_REGION` | `us-east-2` | Region used by the S3 client |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | unset | Private object-storage credentials with upload/delete permissions |
| `TEST_DATABASE_URL` | unset | Optional disposable database for PostgreSQL integration tests; not loaded automatically from `.env` by the test script |

Shop defaults are inserted only when their settings keys are missing. Change existing shop details through **Admin > Website settings**, not by changing bootstrap environment variables. Displayed phone and WhatsApp recipient are separate settings.

Prefer **Admin > Staff access** to create additional admins or staff. The CLI also supports `npm run create-admin -- <username> <password> [admin|staff]`, but a password passed on the command line may appear in shell history or process listings.

### Image storage

Set all five `AWS_*` settings above in your private environment or hosting dashboard. The uploader uses an S3-compatible client with path-style access and returns public image URLs in the form `https://<endpoint>/<bucket>/<generated-name>`. The endpoint must support anonymous image reads; this app does not generate signed download URLs. Uploads allow JPG, PNG, or WEBP MIME types, up to **5 MB per file** and **8 files per request**, and use generated names.

**Important:** without S3 configuration, Multer currently holds uploads in memory without saving them to `UPLOAD_DIR`; returned local URLs will not point to new files. Existing files in `/uploads` can be served, but new local uploads are not implemented. Configure object storage rather than relying on a disk volume alone.

The image Content Security Policy in `src/app.js` currently allows one specific Neon storage host. If using another endpoint, update `imgSrc` to allow your exact public image host; otherwise the browser blocks the images. Verify uploads and public image access before deployment. Local images are not automatically migrated to the bucket.

## 4. Going live

### Free Render preview with Neon

The repository-root `render.yaml` deploys the existing Docker app on Render's **Free** web service plan and connects to your existing Neon database. It does not create a Render database or a paid disk. The app uses Render's assigned HTTPS URL automatically unless you set `PUBLIC_BASE_URL` for a custom domain.

**Storage:** S3-compatible uploads are implemented, but the root blueprint does not supply their environment variables. Add the `AWS_*` settings in Render separately and check the image CSP before uploading. Render Free has ephemeral local storage; use the external bucket for durable images. The Docker build excludes local uploads and private environment files.

1. Rotate any database credentials previously shared in chat and change the default admin password through Admin > Account before making the site public.
2. Push the latest code, including the root `render.yaml`, to your GitHub repository. Never commit private environment files. Render builds the pushed branch, not uncommitted local changes.
3. Sign up at https://dashboard.render.com using GitHub. Choose the **Hobby** workspace and **New > Blueprint**, then select this repository and the branch containing your changes. The Blueprint path is `render.yaml` at the repository root.
4. Confirm the web service compute plan is **Free**. Free services can run without a payment method, but Render can request account verification. If your account requires a card, stop rather than entering one or selecting a paid plan.
5. At the `DATABASE_URL` prompt, paste the pooled connection string privately from Neon. Keep `sslmode=verify-full` and any other required connection parameters. Do not paste credentials into chat or commit them. The Blueprint generates a separate `SESSION_SECRET` automatically.
6. Add object-storage settings, deploy, and open the HTTPS URL shown by Render. Check `/healthz`, storefront images, checkout, and `/admin/`. With an existing Neon admin, leave bootstrap credentials unset; for a new database, set a strong `ADMIN_PASSWORD` temporarily to create the first account. The same database is shared by local and hosted apps when they use the same connection string, so edits affect both.

Free services sleep after 15 minutes without inbound traffic and can take around a minute to wake up. Admin sessions are in memory, so a restart or idle shutdown logs users out. Free-tier usage limits can suspend the site or disable builds; this is not an always-on production hosting plan. A custom domain registration is separate; the assigned `onrender.com` address is sufficient for a free preview.

Official references: [Render Free limitations](https://render.com/docs/free) and [Blueprint fields](https://render.com/docs/blueprint-spec). The separate `Abhinayam/render.yaml` targets a paid `standard` Node service and is not the free blueprint above; use the repository-root file and review plans/settings before deployment.

### Local Docker and production hosts

```bash
cd Abhinayam
cp .env.example .env   # skip if already configured; set PostgreSQL and storage credentials privately
docker compose up -d --build
```

Compose exposes port 3000, uses an external PostgreSQL database, and forces `NODE_ENV=development` so cookies work over local HTTP. It also contains a machine-specific Neon DNS/IP override in `extra_hosts`; remove or adapt it for your own database/network rather than assuming that address is stable.

The upload volume serves existing local files only; new uploads still require S3. The data volume is not a PostgreSQL database. Back up the external database and image bucket independently.

For production, build/run the Docker image behind HTTPS with `NODE_ENV=production`, a strong `SESSION_SECRET`, and your public URL. If using Compose, change its explicit `NODE_ENV` override; changing `.env` alone is insufficient. The Docker entry point runs `node src/server.js` directly, so inject runtime environment variables through the host/container; it does not load `.env` itself.

### PostgreSQL startup errors

An error near `OR` usually means an older image is running SQLite SQL such as `INSERT OR IGNORE`. After updating the code, rebuild from this directory:

```bash
docker compose up -d --build --force-recreate web
docker compose logs -f web
```

Do not delete Docker volumes to fix SQL errors. Startup now awaits schema, settings, and admin initialization before listening.

The `pg` SSL warning is separate from SQL failures. In your private `.env`, change `sslmode=require` (or `prefer`/`verify-ca`) to `sslmode=verify-full` to explicitly preserve full certificate and hostname verification. Do not disable certificate checks to silence the warning.

Run the PostgreSQL regression checks with `npm run test:postgres`. Set `TEST_DATABASE_URL` to a disposable PostgreSQL database to also run integration checks; they create and remove an isolated schema and require schema-creation permission. Without it, integration checks are skipped. The older `npm test` suite still assumes SQLite and requires migration.

**Google search:** after going live, add the domain in [Google Search Console](https://search.google.com/search-console), submit `https://your-domain/sitemap.xml`, and create a Google Business Profile that links to the site.

## 5. Day-to-day management (no developer needed)

| Task | Where |
|---|---|
| Add a new saree with photos | Admin → Sarees → **+ Add saree** |
| Change price, MRP, or description | Admin → Sarees → **Edit** |
| Set product/category discounts | Admin → Sarees or Categories → **Edit**; verify the resulting sale price before saving |
| Update stock | Admin or staff → **Stock** → type the new quantity and an optional note → **Save** (every change is logged with who made it) |
| Give a staff member stock-only access | Admin → **Staff access** → **+ Add user** → Access level **Staff**, then share the link `https://your-domain/staff` |
| Remove someone's access | Admin → Staff access → **Edit** → untick **Active** (they're logged out immediately), or **Delete** |
| Reset a staff password | Admin → Staff access → **Edit** → enter a new password |
| Hide a saree temporarily | Edit → untick **Visible on website** |
| Show a saree on the home page | Edit → tick **Featured on home page** |
| Confirm payment or ship an order | Admin → Orders → **Open** → set status, payment, UTR, courier, tracking number, and full tracking URL. **WhatsApp customer** button included |
| Change WhatsApp, UPI, Instagram, address, About text, or policies | Admin → Website settings |
| Replace the logo | Update `public/images/abhinayam-logo.jpeg` and keep its storefront and favicon references in sync |

**Deletion warning:** deleting a category deletes every product and product-image record in that category. Past order lines keep their saved names/prices, but deleted products cannot be restocked later. Category deletion does not clean up the corresponding objects in storage. Prefer hiding products when you need a reversible change.

The product form calculates sale price from `MRP * (1 - (category discount + product discount) / 100)` and rounds its saved preview to whole rupees. The order API uses the stored product price, never a customer-supplied total. Keep combined discounts below 100%; category-wide repricing needs repair before it can be relied on.

**How ordering works**

1. The customer adds sarees to the bag.
2. They enter their delivery details and press **Continue to payment**.
3. The order is saved and stock is reserved.
4. The same page displays the UPI QR code, payment link, and order total; there is no automatic WhatsApp redirect.
5. The customer pays, clicks **Send order on WhatsApp**, taps **Send** in WhatsApp, and shares the payment screenshot. The link prefills the message; the website does not send it automatically or verify payment.
6. You mark the order **paid** and **shipped** in Admin.

Cancelling an order returns its stock automatically.

Orders accept at most **20 line entries** and **10 pieces per saree** after duplicate items are merged. Stock is checked and reserved inside a PostgreSQL transaction with row locks. Cancellation restocks once and cannot be reversed; refunds/payment status must be managed separately. Unpaid reservations have no automatic expiry, so cancel abandoned orders manually.

The bag is stored in browser `localStorage` under `abhinayam_cart`, without a customer login. Product quantity defaults to one and represents the next addition, not the current bag count. It persists per browser/origin until cleared or checkout succeeds. The payment screen is populated from the order response and is not restored after a refresh; there is no customer order-history/payment-resume page. The separate Track Order page verifies the order number against the checkout phone and returns only order status and courier details.

## 6. Project structure

```
Abhinayam/
├── db/schema-postgres.sql # PostgreSQL schema (categories, products, product_images, orders, order_items, admins, stock_log, settings)
├── src/
│   ├── server.js          # Entry point
│   ├── app.js             # Express app: security headers, sessions, routes, errors
│   ├── config.js          # Env-based configuration (12-factor)
│   ├── db.js              # PostgreSQL pool, schema initialization + transactions
│   ├── auth.js            # Admin bootstrap, authentication, session/role guards
│   ├── uploads.js         # S3-compatible image uploads/deletion (memory-based intake)
│   ├── seo.js             # sitemap.xml, robots.txt, server-rendered product SEO
│   ├── lib/               # validation + WhatsApp/UPI link builders
│   ├── services/          # catalog, orders, settings, users (business logic)
│   └── routes/            # public API (/api) and admin API (/api/admin)
├── public/                # Website pages, CSS, JS, images, admin panel
├── scripts/create-admin.js # CLI for admin/staff account creation
├── test/                  # PostgreSQL regressions plus legacy SQLite tests
├── Dockerfile, docker-compose.yml
└── .env.example
```

The repository-root `render.yaml` is the free Docker blueprint. Alternate adapters `src/db-pg.js` and `src/db.js.postgres` are not imported by the runtime; the active implementation is `src/db.js`.

### Database schema (summary)

```
categories(id, name UNIQUE, slug UNIQUE, description, image_url, discount, sort_order, created_at)
products(id, sku UNIQUE, name, slug UNIQUE, category_id→categories, fabric, color, price, mrp,
         discount, description, stock_qty ≥ 0, is_featured, is_active, created_at, updated_at)
product_images(id, product_id→products ON DELETE CASCADE, url, alt, sort_order)
orders(id, order_no UNIQUE, customer_name, phone, address, city, pincode, notes, total,
       status[new|confirmed|shipped|delivered|cancelled], payment_status[pending|paid|refunded],
       payment_ref, tracking_info, created_at, updated_at)
order_items(id, order_id→orders, product_id→products ON DELETE SET NULL, product_name, sku, unit_price, qty)
admins(id, username UNIQUE, password_hash, role[admin|staff], display_name, is_active, last_login_at, created_at)
stock_log(id, product_id→products ON DELETE SET NULL, sku, product_name, old_qty, new_qty, note, changed_by, created_at)
settings(key PRIMARY KEY, value)      -- WhatsApp, UPI, Instagram, address, About, policies…
```

Startup applies the idempotent SQL schema through `db.__init()`. The included SQL migration blocks add missing discount columns; there is no general-purpose `migrate()` function or guarantee that every older schema version upgrades automatically.

### Roles

| | Admin | Staff |
|---|---|---|
| Stock tab: view stock, update quantity with note, see change history | ✅ | ✅ |
| Change own password | ✅ | ❌ (an admin resets it under Staff access) |
| Dashboard, Sarees (prices, photos), Categories, Orders, Website settings | ✅ | ❌ |
| Staff access: add, edit, deactivate, or delete users | ✅ | ❌ |

The server enforces permissions on every request, not just in the menu. Admins log in at **`/admin`** and staff at **`/staff`**. Each login page accepts only its own role, and a signed-in user who opens the other portal is redirected to their own. Admins can't remove their own admin access, and the shop always keeps at least one active admin.

### API

Public: `GET /api/settings`, `GET /api/categories`, `GET /api/products?q=&category=&fabric=&color=&minPrice=&maxPrice=&inStock=1&sort=&page=&limit=`, `GET /api/products/filters`, `GET /api/products/:slug`, `POST /api/orders` (rate-limited), `POST /api/orders/track` (`{order_no, phone}`, rate-limited; returns status and courier details only).

Admin and staff (session cookie and `X-Requested-With: fetch` header): `POST /api/admin/login` (`{username, password, portal: "admin"|"staff"}`; defaults to `admin`), `POST /api/admin/logout`, `GET /api/admin/me`, `GET /api/admin/stock?q=&lowStock=`, `GET /api/admin/stock/history?productId=&limit=`, `PATCH /api/admin/products/:id/stock` (`{stock_qty, note}`).

Admin only: `POST /api/admin/password`, `GET /api/admin/stats`, `GET|PUT /api/admin/settings`, category/product/user create-list-update-delete endpoints, `DELETE /api/admin/images/:id`, `GET /api/admin/orders`, and `GET|PATCH /api/admin/orders/:id`. Updates to categories/products/users use `PUT`, not `PATCH`. Staff get `403` on these.

Products use multipart field `images`; categories use `image`. Product create/update requires full product fields, including name, SKU, and price; it is not a partial price-update API. Order updates accept `status`, `payment_status`, `payment_ref`, and `tracking_info`.

`POST /api/orders` accepts `{ customer: { name, phone, address, city, pincode, notes }, items: [{ productId, qty }] }` and returns HTTP 201 with `{ order: { order_no, total, items }, whatsappUrl, upiUrl, upiQr }`. Pincode must contain six digits. Orders are limited to 20 requests per IP per 15 minutes; login is limited to 10 per IP per 15 minutes. `/healthz` reports that the HTTP process is running; it does not query PostgreSQL on every request.

## 7. Tests

```bash
npm run test:postgres
```

The PostgreSQL regression suite runs without a database for its configuration and adapter checks. Set `TEST_DATABASE_URL` to a disposable PostgreSQL database to enable integration checks in an isolated schema; schema-creation permission is required. Without this variable, integration checks are skipped.

`npm test` still contains legacy SQLite-based tests and is not a passing PostgreSQL validation gate. Do not run integration checks against a live shop database.

Run `npm ci` before testing. A missing `@aws-sdk/client-s3` error means installed dependencies are incomplete/out of date; do not remove the dependency to work around it. The current offline adapter test also expects schema application as its first query, while initialization now performs `SELECT 1` first; that assertion needs updating before this suite can be considered a reliable passing gate.

## 8. Security notes

- Passwords are hashed with scrypt. Login is rate-limited, and the session cookie is httpOnly, SameSite=Lax, Secure in production, and expires after eight hours.
- Sessions use Express's in-memory default store. Restarts log users out, and sessions are not shared between multiple instances. Add a shared production session store before scaling.
- Admin write requests require `X-Requested-With: fetch` to block ordinary cross-site form posts; role checks run server-side. Helmet supplies security headers and a restricted Content Security Policy.
- Upload checks use declared MIME type and size, not file-content inspection or malware scanning. Do not describe them as verified image content.
- Never commit `.env`. Use a strong `SESSION_SECRET` and admin password in production.
- The environment template contains a placeholder session secret; replace it. Any database or storage credentials exposed publicly should be rotated through their provider.

## 9. Current limitations and release checks

- **Mobile shop filters:** the drawer's `::before` overlay sits above its controls and intercepts input/close/apply clicks. Fix its stacking/placement before release.
- **Shared header:** navigation labels wrap into multiple lines around 920–1100 px. Adjust the responsive breakpoint or header spacing before release.
- **Payments/WhatsApp:** confirmation is manual. There is no payment webhook, automatic WhatsApp send, receipt upload, automatic refund, customer login, or reservation timeout.
- **Category repricing:** the admin handler queries by category ID where the catalogue expects a slug, then attempts price-only updates against a full-product API. Do not assume changing a category discount updates all stored product prices; edit and verify products individually.
- **Storage/SEO:** new local uploads are unsupported. Product Open Graph/JSON-LD image builders prepend the site URL even to absolute storage URLs, producing invalid external-image URLs. Fix this before relying on social/search previews.
- **Sitemap:** only the first 100 active products are included. Add pagination if the catalogue grows beyond that limit.
- **Editable content:** environment values seed missing settings only. Some promotional/header copy and page metadata remain hardcoded; website settings do not rebrand every page automatically.
- **Tests:** the old SQLite suite requires migration, the PostgreSQL adapter assertion needs updating, and automated browser-layout tests are not checked in. Verify fresh setup, roles, image uploads, checkout, cancellation, and mobile/desktop layouts before a public release.

</details>
