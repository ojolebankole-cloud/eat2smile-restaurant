# Eat2Smile — Phases 3 & 4 backend operations

This project keeps the existing Cloudflare Pages frontend and adds same-origin Pages Functions at `/api/*`, Cloudflare D1 for relational data, and ImageKit for menu image storage and CDN delivery. No external paid vendor or payment gateway is introduced.

## Included

- D1 schema for customers, hashed sessions, menu items, orders, order lines, status history, staff roles and login throttling.
- PBKDF2-SHA-256 password hashing (310,000 iterations), random opaque session token, SHA-256 token digest at rest, HttpOnly/Secure/SameSite=Lax cookie, expiry and logout invalidation.
- Registration, login, logout, current-session and profile endpoints; per-IP login/register attempt throttling.
- Public available-menu endpoint; server-side menu CRUD is restricted to admin/manager.
- Order creation requires a customer session, validates delivery/pickup data and quantities, reloads current item prices from D1, calculates totals on the server, writes order/items/status event in a D1 batch, and returns a non-sequential public reference.
- Authenticated customer-only history and order detail endpoints; status history; repeat-order data can be loaded from order details and submitted as a new order.
- Public tracking requires the order reference and last four digits of the order phone number.
- Staff status updates enforce role checks server-side. Menu image upload is restricted to admin/manager, MIME checked, size limited, and uploaded server-to-server to ImageKit; the returned HTTPS URL is saved directly in `menu_items.image_url` in D1.

## Before deployment — required Cloudflare setup

1. In the existing Cloudflare account, open Workers & Pages → D1 SQL Database and create `eat2smile-db`. No R2 bucket is required. Create an ImageKit account and configure its URL endpoint, public key and private key.
2. In your local project, first compare the existing Pages project settings with `wrangler.toml.example`. Cloudflare recommends downloading the current Pages config (`npx wrangler pages download config`) before opting into a Wrangler config, because an active Wrangler file becomes the project configuration source of truth. Merge the D1 binding into that current config, or use the supplied example after confirming it matches the existing project settings.
3. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in the config you will use with the real D1 database ID. Do not invent an ID or commit secrets.
4. Apply the migrations to the intended database:

   ```sh
   npx wrangler d1 migrations apply eat2smile-db --remote --config wrangler.toml
   ```

   The migrations create the schema and seed the 26 current products from the existing v1.6.0 catalogue. Review the seeded menu in D1 before launch. For local testing, use `--local` instead of `--remote`.
5. Configure the Pages project bindings in Settings → Functions → Bindings: D1 variable `DB` → `eat2smile-db`. No R2 binding is used. Configure Preview and Production separately as intended. Redeploy after changing bindings. If you deploy with Wrangler config, ensure the bindings are represented there instead of relying on dashboard-only settings.
6. Set `IMAGEKIT_PUBLIC_KEY` and `IMAGEKIT_URL_ENDPOINT` as plain-text Production variables, and `IMAGEKIT_PRIVATE_KEY` as an encrypted secret. Use the same ImageKit account values you configured in the Cloudflare dashboard. Set `APP_ORIGIN` to the exact deployed site origin (scheme + hostname, no trailing slash). Set the Preview environment to its own preview origin and preferably a separate preview D1 database; do not accidentally point preview traffic at production data. Set `ADMIN_BOOTSTRAP_KEY` as a Cloudflare secret (never in source control). `SESSION_DAYS` and `MAX_UPLOAD_BYTES` are optional variables. The upload endpoint requires an existing menu item ID and an admin/manager session; it accepts JPEG, PNG, WebP and AVIF up to the configured size (5 MB default, 10 MB hard maximum), checks the file signature, uploads from the server using ImageKit Basic Auth, and updates that menu item’s `image_url` in D1.
7. Deploy through the connected Git integration or Wrangler Pages deployment. Direct Upload does not support Pages Functions.
8. Create your own customer account on the live site, then use the one-time-only bootstrap endpoint with the secret header to assign the first admin role to that account's email. Immediately rotate/remove the bootstrap secret after use. Endpoint: `POST /api/admin/bootstrap`, JSON `{ "email": "your-account-email", "role": "admin" }`, header `x-admin-bootstrap-key`.
## API map

- `POST /api/auth/register` `{name,email,phone,password}`
- `POST /api/auth/login` `{email,password}`
- `POST /api/auth/logout`; `GET /api/auth/me`
- `GET /api/profile`; `PATCH /api/profile` `{name,phone}`
- `GET /api/menu`
- `POST /api/orders` `{items:[{id,quantity}],idempotencyKey,orderType:'Delivery'|'Pickup',address?,instructions?}`
- `GET /api/orders`; `GET /api/orders/:id`
- `POST /api/track` `{reference,phone}` (phone value may be the full phone; server compares last four digits)
- `POST /api/admin/menu`; `DELETE /api/admin/menu?id=...`
- `GET /api/admin/staff`; `POST /api/admin/staff` `{email,role}`; `DELETE /api/admin/staff?email=...` (admin only)
- `GET /api/admin/customers?q=...`; `PATCH /api/admin/customers` `{id,active}` (admin/manager)
- `POST /api/admin/media` multipart field `file`
- `GET /api/admin/orders`; `GET /api/admin/orders/:id`; `PATCH /api/admin/orders/:id` `{status,note?}`

## Order and money rules

- All amounts are integer Nigerian naira. The client never supplies trusted prices or totals.
- Delivery fee remains `0`/unconfigured because the restaurant has not supplied a fee or delivery-zone rules. The customer sees that it is confirmed by the restaurant. No payment is collected.
- New orders begin at `New`. Allowed status vocabulary: New, Accepted, Cooking, Ready for Pickup, On Delivery, Delivered, Cancelled. Transitions are validated by fulfillment type (pickup: New → Accepted → Cooking → Ready for Pickup → Delivered; delivery: New → Accepted → Cooking → On Delivery → Delivered), with cancellation allowed before completion. Terminal Delivered/Cancelled orders cannot be transitioned again.
- The public reference is generated server-side using date plus 64 bits of cryptographically random bytes; internal IDs are UUIDs and are never used as the public tracking credential. Tracking attempts are throttled per source IP.

## Security boundaries and limitations to resolve before a public launch

- Authentication currently uses password accounts without email verification or password-reset email. Do not describe an account as email-verified. Add a trusted email delivery provider and verification/reset-token flow before relying on email as a verified identity or enabling self-service recovery.
- Staff access is a role mapping to an existing customer account. Bootstrap requires a Cloudflare secret. Keep the bootstrap secret private and rotate/remove it after initial setup. Staff role changes are not exposed publicly.
- Customer tracking reveals limited status and totals only after matching a 64-bit random reference and phone suffix. Customer order detail/history remains session-protected.
- Cloudflare rate limiting rules should additionally be configured at the edge for `/api/auth/*`, `/api/track`, and order creation. D1 attempt rows provide an application-level fallback but are not a substitute for edge abuse controls.
- Use a custom domain and HTTPS in production. The `__Host-` cookie requires Secure and a root path.
- No live D1 account bindings, Cloudflare deployment, browser test, production penetration test or actual email delivery can be performed from this archive-editing environment. The code is prepared, but the Cloudflare resource creation/binding/deployment steps above remain necessary.


## ImageKit menu image upload

`POST /api/admin/media` accepts `multipart/form-data` with `file` and `menuItemId`. It requires an authenticated admin/manager customer session and same-origin request. The private API key is used only in the Pages Function to call ImageKit's Upload API over HTTPS; it is never returned to the browser. The successful response includes `url` and `fileId`, and the same `url` is written to the matching `menu_items.image_url` row. The public menu API then serves that URL to the React website. The legacy `/media/*` R2 proxy and `IMAGES` binding have been removed.

ImageKit credentials are environment configuration, not source-code values. Keep `IMAGEKIT_PRIVATE_KEY` as an encrypted Cloudflare secret; do not commit it to GitHub or place it in any `VITE_*` variable.
