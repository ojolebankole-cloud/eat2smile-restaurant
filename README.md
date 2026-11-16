# Eat2smile Website

A responsive restaurant ordering website developed by KoleDev.

## Version 1.2.0
- Added a clear next-section arrow to the hero screen for guided home-page navigation.
- Updated the restaurant contact details and working links: email, WhatsApp, telephone, Instagram and Threads.
- Updated service availability to 24/7.
- Replaced the portfolio-fictional-concept footer copy with a KoleDev developer credit.
- Rebuilt the note form to prepare a real email in the visitor’s email app addressed to davidajulo4@gmail.com. The visitor must press Send in that app.
- Expanded checkout with customer details, delivery/pickup selection, optional instructions, input validation, an order reference and a WhatsApp order handoff to +2349163149653.
- Added rotating long-form snack quotes. Rotation pauses while the quote section is visible so visitors can read, and resumes while it is off-screen. Visitors can also select a quote manually.
- Preserved the existing menu, cart, local cart persistence, responsive layout, animations and image fallback.

## Run in Termux
Keep the project inside Termux private storage, not `/storage/emulated/0/Download`, because npm needs to create symbolic links.

```bash
cd ~/Eat2smile-v1.2.0/Eat2smile
npm install
npm run build
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:5173` in your phone browser. Keep Termux running while testing. Stop the server with `CTRL + C`.

## Live contact details configured
- Email: davidajulo4@gmail.com
- WhatsApp: +234 916 314 9653
- Telephone: +234 805 956 3897
- Instagram: @koled_45
- Threads: @koled_45
- Availability: 24 hours a day, 7 days a week

## Important operational notes
- The contact form uses a `mailto:` handoff. It opens the visitor’s configured email app with the message addressed to Eat2smile. It does not silently send email; the visitor must press Send. A server-side form service would be needed for direct website submission.
- Checkout opens WhatsApp with the order details. The visitor must press Send, and the order is not confirmed until Eat2smile replies. No payment is taken by the website. Delivery fees, item availability, preparation time and payment instructions are confirmed by the restaurant.
- Food photography uses remote Unsplash images and requires internet access. Failed menu images use category-matched Unsplash photography.
- No street address or delivery fee has been invented.

## Verification
Run `npm run build` after installing dependencies. A successful build verifies TypeScript compilation and production bundling. Test the WhatsApp and email handoffs on a device with WhatsApp and an email app configured before publishing.

## Version 1.4.0 checkout updates
- Checkout shows an itemised summary and subtotal before the customer sends the order.
- **Copy order text** copies the same reference and item details.
- **Download image** creates a PNG receipt locally in the browser.
- **Save as PDF** opens a print-ready receipt; choose **Save as PDF** in the browser/system print dialog.
- **Continue to WhatsApp** navigates to the Eat2smile WhatsApp number with the full order request prefilled. The customer must still tap Send in WhatsApp. The order remains unconfirmed until Eat2smile replies.
- Floating Instagram and WhatsApp shortcuts are available on every page.

No order is sent to a server, and no payment is processed by this frontend. Delivery fee and payment instructions are confirmed directly by Eat2smile.


## Version 1.4.0 changes
- The hero food feature is now a four-image swipe gallery. Swipe left/right on the image, use the arrow buttons, or tap a dot.
- Removed the fake `SCROLL TO GET HUNGRY` progress dash and `01 / 04` counter.
- Removed the illustrated SVG food fallback. Failed menu photos use category-matched Unsplash photography instead.
- Removed the explanatory paragraph directly below the Drop Us a Note heading.
- All photography is remote Unsplash content and needs an internet connection.


## Version 1.5 update
- Added a direct “Reach us through email” mailto link in the Drop Us a Note card.
- The green confirmation note remains conditional and appears only after the visitor submits the note form using “Open email to send”.
- Added directional image transitions, circular reveal, soft blur-to-sharp entrance, caption stagger, halo accent and responsive controls to the four-slide hero gallery.
- Respects `prefers-reduced-motion`.


## Version 1.6.0 — Phase 1 and Phase 2

### Phase 1: Website interactive enhancements
- Adding a menu item displays a snackbar with the item name, a **View Cart** action and a three-second auto-dismiss. A new add replaces the previous snackbar timer rather than stacking notifications.
- A floating cart appears after the visitor scrolls down, with the current item quantity and live subtotal. It opens the existing cart drawer and respects mobile safe-area spacing.
- The main accent colour rotates through Tomato Red (`#E63946`), Mango Orange (`#FF8C00`), the original Eat2Smile orange (`#ff6b00`), Golden Yellow (`#FFC300`) and Chocolate Brown (`#6F1D1D`) every six seconds. The colour transition is smooth; foreground contrast is adjusted for the yellow interval.

### Phase 2: Food likes and favourites
- Each food card has a heart toggle and a personal saved-state indicator. The product quick-view also has a favourite toggle.
- The menu includes a **Favourites** filter and a live count of saved meals. Removing the last saved meal shows a helpful empty state.
- Favourites persist in this browser using `localStorage`, just like the existing cart. They do not synchronise across devices and the displayed 0/1 indicator is the current visitor's own saved state, not a public/global like count. Global popularity counts require a backend and database and are intentionally not simulated in this frontend-only phase.

### Verification status
- TSX/TypeScript syntax transpilation passed with the available global TypeScript compiler.
- `npm ci` could not finish because requests to `registry.npmjs.org` failed with `EAI_AGAIN` in this environment. Therefore the full TypeScript project build, production bundle and live browser interaction test remain **unverified**.
- Before deployment, run `npm ci` and `npm run build` in an internet-connected environment, then manually test the snackbar timer, cart totals, scroll visibility, colour rotation, favourites persistence and mobile layout.

**Historical v1.6 note:** No backend/database was added in that earlier UI-only phase. v1.7 later introduced D1 and APIs; v1.8 now replaces customer checkout authentication with guest orders.

## Version 1.7.0 — Phase 3 and Phase 4 backend (historical; superseded by v1.8.0)

The v1.7 implementation added same-origin Cloudflare Pages Functions (`/api/*`), D1 migrations and seeded menu data, ImageKit image upload integration, customer registration/login/session/profile APIs, protected staff menu/customer/order APIs, and database-backed checkout. The customer-authentication part was retired in v1.8.0; the historical details below are superseded by the v1.8 section.

### Cloudflare resources required before launch

- D1 database: `eat2smile-db` (apply `migrations/0001_initial.sql` and `migrations/0002_seed_menu.sql` through Wrangler migrations).
- ImageKit account with a URL endpoint, public key and private key.
- Pages binding: `DB` → D1 database. No R2 binding is required.
- Pages variable: `APP_ORIGIN` set to the exact live site origin.
- Pages secret: `ADMIN_BOOTSTRAP_KEY`, used once to grant the first staff role and then rotated/removed.
- Use the `wrangler.toml.example` only after merging it with the existing Pages project configuration and inserting the real D1 database ID. Never commit secrets.

Read `docs/PHASE-3-4-OPERATIONS.md` for deployment steps, API routes, role setup, security boundaries and operational rules.

### Checkout and operational rules

- **Historical v1.7 behaviour only:** customer sign-in was required. This was replaced in v1.8.0 by guest checkout; see the Phase 1–3 section below.
- Successful submission saves an order and returns a server-generated reference. The order begins as `New` and is not considered accepted until restaurant staff changes its status.
- Delivery fee is not configured; no fee is invented. The restaurant confirms it. No payment is processed online.
- Order tracking reports restaurant status updates, not live GPS tracking.

### Authentication limitation

The v1.7 customer registration/login implementation is retired in v1.8.0. Staff use the separate administrator authentication system; customers order as guests.

### Verification status

SQLite migrations and data-flow checks passed; backend TypeScript semantic checking and TS/TSX syntax transpilation passed. The package installation timed out in this environment, so the full `npm run build`, live browser tests and live Cloudflare deployment remain unverified. Do not deploy until the real D1 binding and secrets are configured.

## Version 1.8.0 — Foundation, guest ordering and multi-page website

### Phase 1 — Foundation verification
- Preserved the supplied v1.7.1 source in a separate untouched backup before editing.
- Verified the React/Vite/TypeScript + Cloudflare Pages Functions + D1 + ImageKit architecture and both existing migrations.
- Added a third additive D1 migration. It does not drop or rewrite existing customer/order rows.
- The complete production build could not be run because `npm ci` could not download packages from `registry.npmjs.org` (`EAI_AGAIN`). Backend semantic checks, source syntax transpilation and SQLite migration checks were completed instead.
- No live Cloudflare account, D1 binding, secret or deployment can be verified from this archive-only environment.

### Phase 2 — Guest-first ordering
- Customer registration, login, logout and profile endpoints are retired; customer-facing sign-in/registration UI has been removed.
- Checkout accepts guest name, full phone number, delivery/pickup choice and delivery address where required. Prices and totals are still recalculated from D1 on the server.
- Each new guest order receives a client-generated 256-bit private access token. Only its SHA-256 digest is stored in D1. The token is stored in the current browser's local storage after successful checkout.
- Guest order history and details are available on that browser. A customer can recover an individual order on another device with the order reference and full phone number; recovery is rate-limited and issues a fresh private access token.
- Existing customer/order rows are retained. Older orders can be recovered one at a time; no existing order rows are deleted.
- A separate administrator authentication system uses `admin_users`, `admin_sessions`, a Secure/HttpOnly cookie, PBKDF2 password hashing and a one-time bootstrap secret. The `/admin` page provides sign-in and recent order status management.

### Phase 3 — Individual website pages
- Added separate crawlable HTML entry points for `/`, `/menu`, `/order`, `/about`, `/find-us`, `/contact`, `/orders` and `/admin`.
- The public navigation now links to Home, Menu, Order, About Us, Find Us and Contact. Customer sign-in and registration are absent.
- Added route-specific titles, descriptions, canonical URLs, Open Graph metadata and page indexing rules. Order History and Admin are noindex; the sitemap lists only public marketing/menu/order pages.
- Added WebSite and Restaurant structured data with the Abuja/FCT/NG locality, project contact details and opening-hours information already present in the source.
- Added a favicon mark. It is a provisional site icon, not a supplied official Eat2Smile logo.

### Remaining external setup / limitations
- The source contains Abuja, Nigeria but no exact street address or verified Google Maps pin. The Find Us page does not invent one; it links to a general Abuja map search. Supply the actual address/pin before publishing a precise directions page or claiming a verified storefront location.
- The ZIP did not include an official logo or original social-share artwork. The favicon is provisional; replace it with the approved brand assets when provided.
- No online payment gateway is configured. Checkout records orders only; the restaurant confirms payment and any delivery fee separately. Do not advertise online payment until a provider and credentials are configured.
- The Cloudflare D1 database ID is still a placeholder in `wrangler.toml.example`. Apply migration `0003_guest_orders_admin_auth.sql` to the intended D1 database before deploying the new code.
- Configure `ADMIN_BOOTSTRAP_KEY` as a Cloudflare secret, then bootstrap the first admin using the documented endpoint. Remove/rotate the bootstrap secret immediately after successful setup.
- The actual Cloudflare Pages deployment, D1 bindings, ImageKit secrets, production browser testing and live Google indexing were not performed here.


## Phase 3 — Payments

Checkout offers Flutterwave hosted online payment and WhatsApp-coordinated direct payment. See `docs/PHASE-3-PAYMENTS-IMPLEMENTATION-REPORT.md` for the data model, security flow, account setup and required pre-production tests. Configure `FLW_SECRET_KEY` and `FLW_SECRET_HASH` as encrypted Cloudflare Pages secrets; never place them in frontend code or committed variables. Apply migration `0006_flutterwave_payments.sql` to the intended D1 database only after backup and confirmation. The Flutterwave webhook endpoint is `/api/payments/flutterwave/webhook`.
