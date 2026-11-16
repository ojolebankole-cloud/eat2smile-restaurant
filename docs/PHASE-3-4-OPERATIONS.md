# Eat2Smile v1.8.0 — Deployment and operations

This document supersedes the v1.7 customer-account deployment notes. Customer registration and sign-in are retired. Guests can place orders. Staff authentication is separate.

## Architecture

- React 18 + TypeScript + Vite frontend.
- Cloudflare Pages hosting and Pages Functions under `/api/*`.
- Cloudflare D1 for menu, orders, order items, status events and admin sessions.
- ImageKit for menu image uploads and CDN delivery.
- Flutterwave Standard hosted checkout for online payments, plus owner-coordinated WhatsApp payment. Flutterwave secrets and remote webhook configuration are required before live use.

## Public routes

- `/` — Home
- `/menu` — Menu
- `/order` — Guest ordering
- `/about` — About Eat2Smile
- `/find-us` — Abuja location and directions entry point
- `/contact` — Contact details and enquiry handoff
- `/orders` — Guest order history/recovery (noindex)
- `/admin` — Private staff login (noindex; disallowed in robots.txt)

The individual HTML entry files are built by Vite and use route-specific title, description and canonical metadata. Cloudflare Pages clean URLs serve `menu.html` as `/menu`, etc. Confirm this behaviour in the deployed Pages project after publishing.

## Phase 1 — Foundation and deployment verification

The project includes `wrangler.toml.example`, not an active `wrangler.toml`. It contains a placeholder D1 database ID. Do not deploy the placeholder.

1. In Cloudflare Pages, inspect the existing project and current build settings. Expected build command: `npm run build`; output directory: `dist`.
2. Create or identify the intended D1 database. The expected binding name is `DB` and the sample database name is `eat2smile-db`.
3. Download the current Pages configuration before opting into Wrangler configuration. Merge the D1 binding into the current project settings; do not replace existing project settings blindly.
4. Configure the Pages Functions D1 binding `DB` for Preview and Production intentionally. Use a separate Preview database if possible.
5. Configure `APP_ORIGIN` to the exact origin for each environment (scheme + hostname, no trailing slash).
6. Configure ImageKit values: `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_URL_ENDPOINT`, and encrypted secret `IMAGEKIT_PRIVATE_KEY`.
7. Configure `ADMIN_BOOTSTRAP_KEY` as an encrypted Cloudflare secret. Optional: `ADMIN_SESSION_DAYS` (default 7), `MAX_UPLOAD_BYTES` (default 5 MB, maximum 10 MB).
8. Do not put private keys or bootstrap secrets in Git, `.env` committed files, frontend variables or this repository.

The D1 migration directory is ordered:

- `0001_initial.sql` — original relational schema.
- `0002_seed_menu.sql` — 26 menu records.
- `0003_guest_orders_admin_auth.sql` — guest access-token column/key table and separate admin user/session tables. It is additive; it does not delete old customer or order rows.
- `0004_admin_dashboard.sql` — menu/dashboard fields, payment method/status fields and content tables.
- `0005_business_analytics.sql` — session-aware analytics event fields and indexes.
- `0006_flutterwave_payments.sql` — customer email field and payment transaction ledger. Additive; existing orders are preserved.

Apply pending migrations only after verifying the target database:

```sh
npx wrangler d1 migrations apply eat2smile-db --remote --config wrangler.toml
```

The command assumes that you have created a real `wrangler.toml` based on the current Pages project configuration and replaced the sample D1 ID. Never run it with the placeholder ID.

## Phase 2 — Guest ordering and admin authentication

### Guest checkout

`POST /api/orders` accepts:

```json
{
  "items": [{"id":"menu-item-id","quantity":2}],
  "idempotencyKey":"client-generated-uuid-v4",
  "accessToken":"client-generated-256-bit-base64url-token",
  "orderType":"Delivery",
  "name":"Customer name",
  "phone":"Full phone number",
  "address":"Delivery address",
  "instructions":"Optional notes"
}
```

- The client sends product IDs and quantities only. The server reloads prices and availability from D1 and calculates the subtotal.
- The guest access token is generated in the browser. Only its SHA-256 digest is saved in D1.
- The token is returned after successful order creation and stored in the browser's local storage. It acts as a private bearer credential for order history/details. Protect it like a password; any person with the token can view that order.
- `POST /api/orders/history` accepts `{ "tokens": ["..."] }` and returns the matching guest orders. If an old customer session cookie still exists, it also returns that customer's legacy order rows.
- `GET /api/orders/:id` accepts `Authorization: Bearer <order-access-token>` for guest order details. Existing authenticated legacy sessions remain readable for migration compatibility, but no new customer sessions can be created.
- `POST /api/orders/recover` accepts `{ "reference": "ES-...", "phone": "full phone number" }`. It checks the reference plus the final ten phone digits, rate-limits recovery attempts, and issues a fresh token. It can recover legacy orders individually; recovery updates that order's access-token digest.
- `POST /api/track` requires the order reference and full phone number (not only the last four digits) and is rate-limited per IP.
- Existing `customers`, `orders`, `order_items` and `order_status_events` data are retained. Guest orders use a synthetic, non-login customer row to satisfy the original `orders.customer_id` foreign key; customer authentication endpoints are retired.
- Legacy account history is not automatically bulk-converted to a guest identity. Customers recover each old order using its order reference and full phone number. Once recovered, it appears in the local guest history list.

### Admin bootstrap and login

Admin access is independent of customer records:

- `POST /api/admin/auth/bootstrap` — one-time first-admin creation. Requires `x-admin-bootstrap-key` matching the Cloudflare `ADMIN_BOOTSTRAP_KEY` secret and JSON `{ "email": "...", "password": "at-least-14-characters" }`. It refuses to run if an admin already exists.
- `POST /api/admin/auth/login` — `{ "email": "...", "password": "..." }`; sets a Secure, HttpOnly, SameSite=Lax `__Host-es_admin` cookie.
- `GET /api/admin/auth/me` — current admin identity.
- `POST /api/admin/auth/logout` — invalidates the current admin session.
- `/admin` — admin sign-in and recent order status management page.

Example bootstrap request (run from a trusted terminal; do not paste the secret into a public chat or source file):

```sh
curl -X POST 'https://YOUR-PRODUCTION-HOST/api/admin/auth/bootstrap' \
  -H 'content-type: application/json' \
  -H 'x-admin-bootstrap-key: YOUR_SECRET_VALUE' \
  --data '{"email":"YOUR_ADMIN_EMAIL","password":"USE_A_UNIQUE_PASSWORD_AT_LEAST_14_CHARACTERS"}'
```

After bootstrap succeeds, rotate or remove `ADMIN_BOOTSTRAP_KEY` in Cloudflare. Store the admin password in a password manager. The first-admin bootstrap endpoint must never be exposed with a weak secret.

### Protected admin APIs

- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id` with `{ "status": "Accepted", "note": "optional" }`
- `POST /api/admin/menu`; `DELETE /api/admin/menu?id=...`
- `POST /api/admin/media` multipart fields `file` and `menuItemId`
- `GET /api/admin/staff`; `POST /api/admin/staff` to update an existing admin role; `DELETE /api/admin/staff?email=...`
- `GET /api/admin/customers?q=...`; `PATCH /api/admin/customers` for legacy customer records

All mutation endpoints enforce same-origin checks and role checks in Pages Functions. The kitchen role is limited to allowed preparation/pickup-ready transitions.

## Phase 3 — SEO and public identity

- `public/robots.txt` permits public crawling and disallows `/admin`, `/api/` and `/orders`.
- `public/sitemap.xml` lists Home, Menu, Order, About, Find Us and Contact. Private/history routes are intentionally excluded.
- Home includes WebSite and Restaurant JSON-LD. Business locality is Abuja, FCT, Nigeria. WhatsApp, Instagram, telephone, email and 24/7 hours are based on details already present in the supplied source.
- The supplied ZIP did not contain a confirmed street address, Google Maps pin or official logo file. The Find Us page uses Abuja as the locality and links to a general Abuja map search; it does not fabricate a street address or exact directions. The favicon is a provisional site icon, not the approved brand logo.
- Replace the Pages hostname with the chosen custom domain consistently in canonical URLs, sitemap, structured data, Search Console and `APP_ORIGIN` when a custom domain is configured.
- Google decides whether and how to display the business panel, favicon and sitelinks. Structured data and sitemap submission do not guarantee a particular Google result layout.

## Phase 3 — Flutterwave and WhatsApp payments

- Online: `POST /api/payments/flutterwave/initiate` creates a server-calculated hosted checkout session. The browser is redirected to Flutterwave Standard checkout.
- Callback: `/order?payment_callback=1` sends the Flutterwave transaction ID and reference to `POST /api/payments/flutterwave/verify`. A redirect alone never marks an order paid.
- Webhook: configure `POST /api/payments/flutterwave/webhook` in Flutterwave Dashboard → Settings → Webhooks. The handler checks `verif-hash` and re-verifies transaction details with Flutterwave before updating D1.
- Required encrypted Pages secrets: `FLW_SECRET_KEY` and `FLW_SECRET_HASH`. Use TEST keys for sandbox first. `APP_ORIGIN` must match the actual public site origin.
- Online checkout requires a valid customer email for Flutterwave receipt/customer data. WhatsApp checkout does not require an email.
- Admin payment status for Online orders is read-only and controlled by verified Flutterwave transactions. Admin/manager can manually update payment status only for WhatsApp orders.
- Direct-payment WhatsApp messages include the server-generated order reference and itemised summary. The order remains Unconfirmed until the owner confirms receipt.
- Delivery fee is unconfigured and remains zero in the order record; the restaurant must confirm it. Online checkout charges the server-calculated order total, so implement a trusted delivery-fee rule before charging delivery fees online.
- Orders begin at `New`. Staff still manage fulfilment separately from payment status. Order tracking is not live GPS tracking.
- Follow `docs/PHASE-3-PAYMENTS-IMPLEMENTATION-REPORT.md` for secret setup, webhook setup and mandatory sandbox test cases. The code is not live-ready until those tests, migration and deployment checks pass.

## Verification record and limitations

Verified from the supplied source and local tools:

- Existing React/Vite/TypeScript + Pages Functions + D1 + ImageKit structure inspected.
- SQL migrations `0001`, `0002`, `0003` executed sequentially in local SQLite; 26 menu rows and new admin/guest tables confirmed.
- Backend Functions passed strict TypeScript semantic checking using the available global TypeScript compiler.
- All frontend and backend `.ts`/`.tsx` files passed TypeScript syntax transpilation.

Not verified:

- `npm ci` and `npm run build`: npm registry requests failed with DNS `EAI_AGAIN`, leaving incomplete `node_modules`; do not treat this source syntax check as a successful production build.
- Browser/device tests, Cloudflare D1 remote migration, Pages bindings, admin cookie behaviour on the live domain, ImageKit upload, payment processing, production security testing and live Google crawling/indexing.
- The real D1 ID is not present in the ZIP. The provided Wrangler config remains an example.


## Phase 4–6 — SEO, business identity and quality (v1.9.0)

The current source release adds:
- Unique public-page titles/descriptions, canonical URLs, Open Graph/Twitter metadata and route-level WebPage JSON-LD.
- Homepage WebSite, Organization and Restaurant JSON-LD.
- Public sitemap entries for Home, Menu, Order, About, Find Us and Contact.
- `robots.txt` disallows `/api/` only. `/admin` and `/orders` are intentionally crawlable so crawlers can read their `noindex` meta and HTTP `X-Robots-Tag` directives.
- Find Us landmark text and Google Maps search for opposite Redeemed Christian Church of God, Iddo Sarki.
- Image loading hints, keyboard skip link, focus visibility and accessible navigation/form labels.

The Pages hostname is still the canonical hostname. Update all canonical/sitemap/JSON-LD references together if a custom domain is configured.

Business data retained from the existing site (WhatsApp, phone, email, Instagram, Threads and 24/7 hours) must be owner-confirmed before Google Business Profile setup. The landmark is not a verified street address or map pin. The archive did not contain the approved logo; favicon and share photo remain provisional.

See `docs/PHASE-4-6-IMPLEMENTATION-REPORT.md` for the verification table and remaining pre-production tasks. The production build, live Pages response headers, browser checks, Lighthouse/Core Web Vitals, Google Business Profile verification and Search Console submission are still outstanding.
