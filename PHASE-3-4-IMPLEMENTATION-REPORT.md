# Eat2Smile v1.7.0 — Phase 3 & Phase 4 Implementation Report

## Scope delivered

The existing React/Vite website remains the frontend. The project now contains Cloudflare Pages Functions, a D1 schema and migrations, ImageKit server-side image upload handler, account authentication, menu/customer management APIs and database-backed order flows. The existing design, cart, favourites, product catalogue, animations, contact links and social links were retained.

## Phase 3 — Backend Foundation

### Database and configuration
- Added `migrations/0001_initial.sql` with customers, sessions, menu items, orders, order lines, order status events, staff-role mapping and rate-limit attempt tables.
- Added `migrations/0002_seed_menu.sql`, seeding the 26 existing v1.6.0 menu products with their current descriptions, prices, tags and Unsplash image URLs.
- Added `wrangler.toml.example` with the `DB` D1 binding; ImageKit credentials are environment variables/secrets. It intentionally remains an example because the real Cloudflare D1 ID and existing Pages project configuration are account-specific.
- Kept all API routes same-origin under `/api/*` and Pages Functions in the repository root `functions/` folder.

### Customer authentication and profile
- Registration and login use PBKDF2-SHA-256 password hashing with 310,000 iterations and random salts.
- Session tokens are random, opaque values; only SHA-256 token digests are stored in D1.
- Sessions use Secure, HttpOnly, SameSite=Lax `__Host-` cookies with configurable expiry and server-side invalidation on logout.
- Added current-session, logout, profile-read and profile-update endpoints.
- Added per-IP application throttling for registration, login and public order tracking.
- Customer order access is scoped to the authenticated customer ID.

### Menu, customer and image management
- Public menu reads return only available D1 menu items.
- Admin/manager menu upsert and soft-disable endpoints are protected by server-side role checks.
- Admin/manager customer search and account deactivation endpoints are protected; deactivation revokes that customer's active sessions.
- Admin-only staff provisioning and revocation endpoints support admin, manager and kitchen roles. Kitchen staff are restricted to preparation/pickup-ready status changes.
- ImageKit upload endpoint is restricted to admin/manager roles, limits file size, permits JPEG/PNG/WebP/AVIF only, checks file signatures and returns a ImageKit HTTPS URL and saves it to the corresponding menu item in D1.
- Menu image URLs are served directly by ImageKit CDN.
- Added a one-time admin bootstrap endpoint protected by the `ADMIN_BOOTSTRAP_KEY` Cloudflare secret. The first staff member must first register a customer account; bootstrap maps that account email to a staff role. Remove/rotate the bootstrap secret after use.

## Phase 4 — Ordering System

- Checkout now requires a signed-in customer and submits to `POST /api/orders`; it no longer pretends a WhatsApp handoff is a database order.
- The server validates the cart, item availability, quantities, delivery/pickup selection and delivery address.
- Prices are loaded from D1 by item ID. The browser cannot set trusted prices, subtotal, delivery fee or total.
- Order, order lines and initial `New` status event are inserted in a D1 batch. A per-customer idempotency key prevents double-taps or safe retries from creating duplicate orders.
- The server generates a unique public reference in the form `ES-YYMMDD-<16 hex characters>` (64 random bits); internal UUIDs are separate.
- Added customer-only order history and order detail endpoints.
- Added status event history and customer order detail refresh every 15 seconds while the order detail view is open.
- Added public order tracking requiring the reference plus the last four digits of the saved phone number, with IP throttling.
- Added Order Again by loading the original item IDs/quantities and preparing a new cart; submitting again creates a new order, never reopens the previous one.
- Staff status transitions are validated by fulfillment type. Pickup path: New → Accepted → Cooking → Ready for Pickup → Delivered. Delivery path: New → Accepted → Cooking → On Delivery → Delivered. Cancellation is allowed before completion.

## Important operational choices

- Delivery fee remains zero/unconfigured because no delivery fee or zone rules were supplied. The site does not invent a delivery fee; the restaurant must confirm it.
- No payment gateway or payment processing was added. The restaurant confirms payment instructions outside the website.
- No street/pickup address, delivery ETA or driver GPS tracking was invented. Order tracking shows restaurant status events, not live courier location.
- Staff dashboard UI is not included; the protected staff APIs are groundwork for the separately scoped Phase 5 admin dashboard.
- Menu/customer management APIs are present, but a visual management dashboard is not part of these phases.

## Security notes and remaining production work

- Password accounts are functional, but email ownership verification and password-reset email are not implemented because no email-delivery provider/sender was selected or configured. Do not treat the email as verified; add a trusted delivery provider and verification/reset-token flow before relying on verified email identity or self-service account recovery.
- Staff authentication reuses the account session of a customer account whose email is mapped to `staff_users`. Role checks occur server-side. Keep bootstrap secret private and remove/rotate it after initial setup.
- Add Cloudflare edge rate-limiting rules for `/api/auth/*`, `/api/track` and `/api/orders` in addition to the D1 application-level limiter.
- Production deployment requires the real D1 resource and ImageKit credentials, correct Pages bindings, `APP_ORIGIN`, and the `ADMIN_BOOTSTRAP_KEY` secret.

## Verification performed in this environment

- Both SQL migrations executed successfully against a local SQLite test database.
- Verified 26 menu rows seeded, customer/order/order-line/status-event insertion, order total storage, reference + phone-suffix tracking lookup and foreign-key integrity.
- Strict TypeScript semantic check passed for all backend Functions using TypeScript 5.8.3 with DOM/DOM.Iterable libraries.
- Syntax transpilation passed for all 21 `.ts`/`.tsx` source and Function files.
- `npm ci` did not complete within the available environment timeout; the full React project `npm run build`, production bundle and live browser/Cloudflare deployment tests are therefore **not verified**.
- No live Cloudflare account resources or bindings were created from this environment. Follow `docs/PHASE-3-4-OPERATIONS.md` before deployment.


## ImageKit integration update (v1.7.1)

- Removed the Cloudflare R2 interface, binding and legacy `/media/*` proxy route.
- Replaced the manager-only image upload route with a server-to-server ImageKit Upload API integration using HTTP Basic authentication from the encrypted `IMAGEKIT_PRIVATE_KEY` secret.
- Added strict JPEG/PNG/WebP/AVIF MIME and file-signature validation, 5 MB default upload cap (10 MB maximum), menu-item existence validation, and ImageKit URL host/path validation.
- Upload requires `menuItemId`; after successful upload, the ImageKit HTTPS URL is saved to `menu_items.image_url` in D1.
- React account/checkout/order integration was checked against the current API routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/profile`, `/api/orders`, `/api/orders/:id`, and `/api/track` match the frontend request paths and payloads. The current React app does not contain an admin image-upload UI; the protected upload API is available for the future manager dashboard.
- Live ImageKit upload, Cloudflare deployment, D1 migration execution and production browser testing remain unverified from this local archive environment.
