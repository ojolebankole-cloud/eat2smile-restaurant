# Phase 6–7 operations notes

## Admin recovery

`POST /api/admin/security/recover` is an emergency owner recovery endpoint. The request must be same-origin and include `x-admin-bootstrap-key` with the Cloudflare Pages secret `ADMIN_BOOTSTRAP_KEY`. JSON body: `{"email":"owner@example.com","newPassword":"A-long-unique-password-123"}`. Use this only from a trusted administrative environment; do not place the key in client-side code, public documentation, browser storage or a normal website form. The endpoint is rate limited and revokes all owner sessions.

## D1 backup and restore

The supplied `wrangler.toml.example` names the database `eat2smile-db`, but its `database_id` is a placeholder. Confirm the actual production database binding and ID in the owner's Cloudflare environment before using Wrangler.

Before applying migration 0008 or deploying any new code, export the remote D1 database and retain an encrypted copy outside the Cloudflare account:

```sh
mkdir -p backups
npx wrangler d1 export eat2smile-db --remote --output ./backups/eat2smile-pre-phase6.sql
```

Do not commit backups, secrets, customer information or exports to GitHub. Test import/restore only into a separate staging D1 database first. Never test a restore against production. Keep a dated backup before each migration and major bulk operation. Confirm recovery contacts and Cloudflare account access are current.

No remote export, restore or migration was performed during this source implementation.
