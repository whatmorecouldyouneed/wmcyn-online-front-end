# Admin Interface Setup

`/admin` is for WMCYN founders and admins. Each person signs in with their own email and password. There is no shared admin password.

## How access works

1. Founders sign in on `/admin/login` with Firebase email/password on the backend project (`wmcyn-online-mobile`), not the project the public site uses for customer accounts.
2. The admin UI calls `GET /v1/profile/me` and only continues if the account has the `founder` or `admin` role.
3. Every admin API call sends `Authorization: Bearer <Firebase ID token>`. The backend (`requireFounderOrAdmin*` in `wmcyn-backend-infra/functions/src/middleware/adminAuth.ts`) checks the role again on every write.

Roles are granted only from the backend repo:

```bash
cd wmcyn-backend-infra/functions
npm run grant-founder -- --project wmcyn-online-mobile founder@example.com
```

That creates the account if needed and prints a one-time password setup link to send privately. Use `--revoke` to remove access. Founders can also use "forgot password" on the login page.

## Environment

```bash
NEXT_PUBLIC_API_BASE=https://us-central1-wmcyn-online-mobile.cloudfunctions.net/api

# firebase web config for the backend project (public values, not secrets)
NEXT_PUBLIC_BACKEND_FIREBASE_API_KEY=...
NEXT_PUBLIC_BACKEND_FIREBASE_AUTH_DOMAIN=wmcyn-online-mobile.firebaseapp.com
NEXT_PUBLIC_BACKEND_FIREBASE_PROJECT_ID=wmcyn-online-mobile
NEXT_PUBLIC_BACKEND_FIREBASE_APP_ID=...
```

If the `NEXT_PUBLIC_BACKEND_FIREBASE_*` values are omitted, admin sign-in reuses the site's `NEXT_PUBLIC_FIREBASE_*` config. The production deploy workflow sets them explicitly. Shared admin keys (`ADMIN_API_KEY`, `SYNC_CRON_KEY`) are server-to-server only and must never be put in a `NEXT_PUBLIC_*` variable.

## Features

- Product sets: create, edit, delete, view claims and remaining inventory.
- Landing pages: each product set can have a `slug`, which is served at `https://wmcyn.online/{slug}` with no frontend deploy.
- NFT markers: compile a `.mind` file in the browser and upload it for a product set.
- QR codes: generate per product set or AR session; they resolve through `https://wmcyn.online/qr?code=...`.
- AR sessions: create, edit, delete.

## API endpoints used

Admin (founder or admin token required):

- `GET /v1/profile/me`
- `POST /v1/productSets/create`, `PATCH /v1/productSets/:id`, `DELETE /v1/productSets/:id`
- `POST /v1/productSets/:id/nft-marker`
- `GET /v1/qrcodes?productSetId=`, `POST /v1/qrcodes/generate`, `DELETE /v1/qrcodes/:code`
- `GET /v1/ar-sessions`, `POST /v1/ar-sessions/create`, `PUT /v1/ar-sessions/:id`, `DELETE /v1/ar-sessions/:id`
- `GET|POST|PUT|DELETE /v1/marker-patterns`

Public:

- `GET /v1/productSets`, `GET /v1/productSets/:id`, `GET /v1/productSets/:id/stats`, `GET /v1/productSets/by-slug/:slug`
- `GET /v1/qrcodes/:code`, `GET /v1/qrcodes/:code/ar-config`
- `GET /api/ar-sessions/:id/data`

## Troubleshooting

- "this account does not have admin access": run `grant-founder` for that email, then sign in again.
- "admin sign-in is not configured": the backend Firebase config is missing from the build.
- A 401 on every call usually means the site is signed in to a different Firebase project than `NEXT_PUBLIC_API_BASE` verifies.
