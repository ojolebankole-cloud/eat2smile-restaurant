# Eat2Smile v1.11.0 — Phase 2 Business Analytics & Data Analysis

## Scope

This release continues from the supplied v1.10.0 Phase 1 Admin Dashboard archive. Work was performed in a separate extracted copy. The supplied v1.10.0 archive was not modified. Phase 2 adds an owner-facing Business Analytics area and expands first-party event collection. Existing guest checkout, menu management, admin authentication, order management and content-management source were retained.

## Implemented

### Owner analytics workspace

- Added a dedicated **Business analytics** tab to `/admin`.
- Added reporting windows: Today, 7 days, 30 days, 90 days and 12 months.
- Added CSV export of summary, trend, product, page, source, device, country, payment and order-status datasets.
- Added visitor and session metrics, returning visitors, five-minute active-browser estimate, page views and order metrics.
- Added separate delivered order value and confirmed paid revenue so unconfirmed payment is not silently counted as collected money.
- Added average paid order value, paid orders, pending/unconfirmed payment count, all-time orders and all-time confirmed revenue.
- Added checkout-to-order submitted session conversion estimate.
- Added order status distribution, daily/monthly revenue trend, top-selling products, product views, popular categories, top pages, traffic sources, device breakdown, country breakdown and payment-method/payment-status breakdown.
- Retained the Phase 1 dashboard overview and its headline cards.

### First-party event tracking

- Expanded analytics events to `page_view`, `product_view`, `add_to_cart`, `checkout_started`, `order_submitted`, `search` and `category_view`.
- Added random browser visitor ID and 30-minute session ID.
- Added event metadata for product ID/name/category and aggregate cart value/item count; search stores only search-length, not the search text.
- Excludes `/admin`, `/orders` and `/api` from public page-view collection.
- Does not collect customer name, phone, email, delivery address, full referrer URL or raw IP in the analytics event table.
- Uses a hashed IP-derived rate-limit key, same-origin validation and a rate limit for the analytics beacon.
- Tracking failures are non-blocking and must not interrupt checkout.

### Database

- Added additive migration `0005_business_analytics.sql` with session and JSON event-data columns and supporting indexes.
- Existing event rows remain valid; old rows without session IDs are excluded from session counts rather than being treated as one shared session.
- Existing menu, customer, order and order-item data is not deleted or rebuilt.

## Metric definitions and caveats

- **Unique visitors** are distinct random first-party browser identifiers with page-view events in the selected period. Clearing browser storage, using another browser/device, or privacy restrictions can cause one person to appear as a new visitor.
- **Returning visitors** are selected-period page-view visitors whose browser identifier also had an earlier page view before the selected period. This is browser-level, not verified human identity.
- **Active visitors** means distinct browser identifiers with any analytics event in the last five minutes. It is an estimate of recent browser activity, not a guaranteed live-person count.
- **Sessions** use a browser-generated session ID that expires after 30 minutes. Sessions are not cross-device identities.
- **Page views** count only `page_view` events, not product/cart/search events.
- **Delivered order value** counts delivered orders regardless of payment confirmation.
- **Confirmed revenue** counts delivered orders whose `payment_status` is `Paid`. This avoids claiming that WhatsApp/direct or otherwise unconfirmed payment has been received.
- **Average paid order value** is calculated from delivered orders marked `Paid`.
- **Product quantity sold** is based on delivered order lines; the product revenue figure includes only line totals from orders marked `Paid`.
- **Checkout-to-order conversion** compares sessions that fired `order_submitted` with sessions that fired `checkout_started`. It is directional and approximate: browser storage resets, blocked tracking, retries and cross-device behavior can affect it. It is not a financial reconciliation measure.
- Traffic-source reporting stores only the referring hostname, not the full URL or query string. Direct/unknown traffic is grouped together.
- Country is based on Cloudflare's two-letter country header when available.

## Verification performed

| Check | Result |
|---|---|
| Sequential SQLite migrations 0001–0005 | Passed |
| Existing seed menu retained | 26 items retained in migration test |
| Analytics schema migration | Passed |
| Analytics SQL statements | 16 statements executed against a local SQLite fixture |
| TypeScript/TSX syntax transpilation | 33 files, zero syntax diagnostics |
| Full dependency-aware TypeScript check | Not run; package dependency tree in supplied archive is incomplete |
| Full Vite production build | Deferred by user until final production stage |
| Browser/UI interaction testing | Deferred by user until final production stage |
| Remote D1 migration | Not applied; production migrations are deferred |
| Cloudflare deployment/live data | Not performed |

## Important operational notes

1. Analytics starts collecting from the moment the updated site and migration are deployed. It does not reconstruct historic page views, sessions, searches or cart events that were never collected.
2. The new migration must be applied to the intended D1 database before the updated analytics endpoint can read/write the new columns. It has only been tested locally in this work.
3. Revenue is deliberately conservative: existing orders that have `Unconfirmed` payment status are not retroactively treated as paid. The owner must reconcile historical payments if accurate historical confirmed revenue is required.
4. Analytics is first-party operational reporting, not a replacement for audited accounting, payment-provider settlement reports, or a consent-managed advertising attribution platform.
5. The CSV export contains the datasets currently loaded for the selected reporting window. It does not include personal customer data.

## Deferred production checks

As requested, do not run these as part of this phase:

- Full production build.
- Browser testing.
- Remote D1 migration (including migration 0005).
- Cloudflare deployment.

## Release status

Phase 2 source implementation and local schema/query/syntax checks are complete. It is **not production-verified** until the deferred build, browser, remote migration and deployment checks are completed.
