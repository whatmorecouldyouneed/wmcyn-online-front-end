# Friends & Family Custom Order System

## Existing architecture

The public site is a Next.js Pages Router application deployed as a static export to GitHub Pages. Production requests therefore go directly from the browser to the external Firebase Functions API in the sibling `wmcyn-backend-infra` repository.

- `/shop/friends-and-family` is an authenticated Shopify catalog, not a request form.
- The homepage already contains an unused `custom order` button.
- Customer identity uses Firebase Auth. Admin/founder access uses a separate Firebase app and role claims.
- Customer profile and inventory are served by the external API.
- Firestore and Cloud Storage are server-managed for protected domain data.
- Shopify remains authoritative only after a quote is accepted and commerce begins.
- Product sets, QR codes, AR sessions, claims, and inventory entitlements exist, but there is no authoritative `ProductInstance` or ownership-history model yet.
- The repository has no application email provider. Custom-order notification delivery therefore uses SMTP configured only in the backend environment.

## Proposed implementation

The canonical guest-capable intake route is `/friends-and-family`. The literal `/friends&family` path is retained as a compatibility alias where static hosting can resolve the encoded filename. The existing `/shop/friends-and-family` route remains the separate authenticated Shopify experience.

The homepage `custom order` button opens the intake route. Authenticated customers receive contact prefills from Firebase/profile data and may edit those values for the request. Guests use the same endpoint without creating an account.

The frontend submits one JSON request to `POST /v1/custom-orders`. It includes an idempotency key, request fields, and optional base64 image references. When a Firebase user is present, the existing API client attaches their ID token; the backend verifies it opportunistically and associates the UID.

## Data model

`custom_order_requests/{id}` is private and server-only. Each record contains:

- internal random document ID
- permanent sequential `WMCYN-CO-######` request number
- nullable authenticated user UID
- contact snapshot: name, normalized email, optional phone
- customer-submitted title and story
- validated product type plus optional custom type
- optional size
- requested quantity
- budget in integer cents plus selected budget option
- optional additional notes
- private reference-image object metadata
- lifecycle status, initially `REQUESTED`
- idempotency key and request fingerprint
- account status, source, creation/update timestamps
- notification status and retry metadata

The lifecycle supports `REQUESTED`, `REVIEWING`, `QUOTED`, `ACCEPTED`, `IN_PRODUCTION`, `READY`, `SHIPPED`, `DECLINED`, and `CANCELLED`.

The atomic counter lives at `counters/customOrders`. An idempotency guard lives at `custom_order_idempotency/{sha256(key)}` and is committed in the same Firestore transaction as the request and counter.

Customer-submitted title/story fields are never treated as WMCYN-verified product metadata. A future accepted request may hold internal links to a conceptual Product and one or more ProductInstances, but request creation does not create those records.

## API and server behavior

`POST /v1/custom-orders`:

1. applies a dedicated public rate limit
2. optionally verifies a Firebase bearer token
3. validates and normalizes every field
4. validates image count, declared MIME type, decoded size, and actual image bytes
5. atomically allocates the request number and stores the private request
6. writes reference images to the denied-by-default `custom-orders/` storage prefix
7. discovers founder recipients from server-only configuration and founder/admin role claims
8. sends the notification through backend-only SMTP configuration
9. records notification success or failure without rolling back a persisted request
10. returns only the request number, status, and timestamp

Notification retries run from a scheduled backend function. Public callers cannot read requests. Future founder request-management endpoints must use the existing founder/admin middleware.

## UI behavior

The mobile-first form collects:

- name, email, and optional phone
- customer-proposed product title
- description/story
- extensible product type
- size when applicable
- quantity, defaulting to one
- up to three optional image references
- `$50`, `$75`, `$100`, `$150`, `$200+`, or custom budget
- optional additional notes

The form states that the budget is not a quote or payment authorization. It explains WMCYN provenance, scarcity, history, culture, ownership, and AR without promising appreciation or resale value.

After successful persistence, the page shows `WE GOT YOU`, the request number, the 24-hour response expectation, and that nothing is made or charged until quote approval.

## Email behavior

Founder recipients are never shipped to the browser. The backend derives recipients from `CUSTOM_ORDER_FOUNDER_EMAILS` and, when available, Firebase users whose custom claims include `founder` or `admin`.

The subject follows `NEW CUSTOM ORDER — budget — type — title`. The body includes the request ID, contact details, account status, customer-submitted product fields, quantity, budget, notes, timestamp, and short-lived signed links to private reference images.

SMTP credentials are backend secrets/environment configuration. Failed email delivery updates notification state and is retried; it does not convert a successfully persisted request into a customer-visible submission failure.

## Security and privacy

- Firestore and Storage deny direct client access to custom-order data.
- The backend validates all input and decoded image content.
- Reference images remain private and are shared with founders only through expiring links.
- Guest intake is rate-limited and idempotent.
- Authentication associates a request but never proves physical ownership.
- Public request identifiers do not authorize request reads or writes.
- Request contact, budget, notes, and images must never enter public ProductSet, QR, or AR responses.
- Retention and deletion procedures must include custom-order records and images.

## Product claiming implications

Request IDs and future ProductInstance IDs remain distinct. A future ProductInstance requires a public identifier plus a separate high-entropy claim credential. Claiming requires an authenticated account and creates an ownership-history record rather than mutating a single owner field.

The original requester is not automatically the owner. Public AR content and private ownership controls remain separate. Existing QR claim policy, AR config, and inventory entitlement contracts should be reconciled before the full ProductInstance and OwnershipRecord model is introduced.

## Testing strategy

Backend tests cover normalization, required fields, email, budget, quantity, file type/size/count, request-number formatting, idempotency helpers, and notification rendering. Integration behavior is verified for guest and authenticated association, atomic IDs, duplicate retries, private uploads, and notification failure handling.

Frontend tests cover request validation, budget selection, conditional size behavior, file validation, API payload construction, and success/error states. Repository checks include backend tests/build/lint, frontend tests/lint/build, static export, and mobile browser validation.
