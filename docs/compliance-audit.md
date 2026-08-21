# Compliance audit — WMCYN.ONLINE

Internal reference for the legal/privacy layer added in this change. Not intended for public
publication. Reflects the state of the repo as of 2026-08-21.

## Architecture

- Next.js 15.0.2, **Pages Router** (root `pages/` — `src/pages/` is a stale duplicate Next.js
  never reads since root `pages/` exists; new routes must go in root `pages/`).
- TypeScript, SCSS Modules, plain React Context for state (no Redux/Zustand).
- **Production deploys as a static export to GitHub Pages** (`output: 'export'` when
  `NEXT_STATIC_EXPORT=true`, see `.github/workflows/deploy.yml`). This means Next's
  `headers()`/`redirects()` APIs and `pages/api/*` routes do **not** run in production —
  everything privacy-critical had to be built as client-side code or static files.
- No shared Footer/Header/Layout component existed before this change — every page built its
  own header inline. Added `src/components/Footer.tsx`, wired into `pages/_app.tsx`.

## Data processors actually integrated

- **Firebase (Google)** — Authentication, Firestore, Realtime Database (`src/utils/lib/firebase.ts`).
  Used for account login/signup, the newsletter email list (`emailList`), and now privacy
  requests (`privacyRequests`).
- **Firebase Analytics (Google Analytics 4)** — measurement ID `G-PHLD7CBMC7`. Previously
  auto-initialized on every page load with no consent gate. Now gated: `initAnalytics()` in
  `src/utils/lib/firebase.ts` only runs when the visitor has consented to analytics (see
  `src/components/privacy/PrivacyProvider.tsx`).
- **Shopify Storefront API** (`shopify-buy`) — product catalog and cart; checkout redirects to
  Shopify's own hosted checkout, so WMCYN does not handle payment card data directly.

## Confirmed absent (do not claim otherwise in the policy)

GTM, Meta/TikTok/Google Ads/Pinterest/Snapchat/Twitter pixels, PostHog/Mixpanel/Segment/
Plausible/Amplitude, Sentry/Bugsnag/LogRocket/Rollbar, FullStory/Hotjar/Clarity session replay,
chat widgets (Intercom/Crisp/Drift), Twilio/SMS, giveaways/sweepstakes, a dedicated email
marketing platform, and any direct `document.cookie` writes by app code.

## Cookies / browser storage

| Name | Mechanism | Category | Set by |
|---|---|---|---|
| `wmcyn_privacy_preferences` | cookie, ~12mo | necessary | new consent system |
| `shopify_cart` | localStorage | necessary | `src/contexts/CartContext.tsx` |
| `wmcyn-emails` | localStorage | necessary (fallback) | `pages/index.tsx` newsletter fallback |
| `instagram_share_data` | localStorage | necessary | `src/utils/instagramSharing.ts` |
| `admin_session` | sessionStorage | necessary (staff only) | `src/contexts/AdminAuthContext.tsx` |
| `googleSignInError` | sessionStorage | necessary | `src/contexts/AuthContext.tsx` |
| `eruda` | localStorage (read) | necessary (debug flag) | `pages/_app.tsx` |
| Firebase Auth session data | browser storage/IndexedDB | necessary | Firebase SDK |
| Google Analytics (`_ga`, `_ga_*`) | cookies | analytics — **consent-gated** | Firebase Analytics SDK, only after consent |

## Tracking behavior before/after consent

- **Before any consent decision**: only necessary technologies run (auth, cart, consent cookie
  itself). Firebase Analytics does not initialize.
- **After "Accept All" or enabling analytics in preferences**: `initAnalytics()` runs, GA4 begins
  collecting its standard automatic events (page_view, session_start, etc.). No custom
  `logEvent()` calls exist in the codebase.
- **After "Reject Non-Essential"**: no change — analytics stays off, persists across reload via
  the consent cookie.
- **Global Privacy Control**: if detected on first visit with no stored preference, analytics is
  auto-set to off (source `gpc`) without showing the banner; the visitor can still opt in later
  via Cookie Settings.

## Forms audited

- **Newsletter signup** (`pages/index.tsx`, `NewsletterModal`) — collects email only (+ implicit
  timestamp/user agent). Added a notice-at-collection sentence linking to `/privacy` and
  `/privacy-choices`, and `consentVersion`/`source` fields on the stored record.
- **Privacy Choices form** (`pages/privacy-choices.tsx`) — new; collects request type, email,
  optional description; writes directly to Firebase RTDB (`privacyRequests`) client-side, since
  `pages/api/*` routes don't run in the static-export production build.
- **No general contact form exists.** Not added in this change — out of scope; flagged for
  WMCYN to decide whether one should be built.
- **Login/signup** (`pages/login.tsx`) — Firebase Auth email/password + Google; unchanged.

## AR/XR camera access

Camera access is consistently gated behind an explicit user tap across all AR entry points
(`ARCamera.tsx`, `dyvsco-star-tee.tsx`, `ar/[code].tsx`, product landing pages) — never
requested on page load. Added a short contextual sentence near the home page's "tap to open
camera scanner" button, matching the explanatory copy already present on the dedicated product
AR pages. Camera video is processed client-side (MindAR/AR.js); no code path uploads the live
feed to a WMCYN server. AR "moment" captures are generated client-side and shared via the native
share sheet / Instagram at the user's choice, not stored server-side.

## Security note found during this audit (outside this ticket's scope)

`.env.example` and `.env.local` contain **real, non-placeholder secrets committed in plaintext**:
a live Firebase API key/measurement ID, a Shopify storefront access token, and a plaintext admin
username/password (`NEXT_PUBLIC_ADMIN_USERNAME`/`NEXT_PUBLIC_ADMIN_PASSWORD`) used to gate
`/admin/*`. This was not introduced by this change and rotating/removing these is a business
decision outside this ticket's scope, but it's a real exposure if this repository is or becomes
public — flagged in `docs/legal-review-required.md` for prompt follow-up.
