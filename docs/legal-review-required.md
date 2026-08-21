# Legal review required

Unresolved decisions from the legal/privacy implementation that need founder and/or attorney
sign-off before this content should be treated as final. Nothing below was invented — each item
is either left blank in config or written as honest, hedged copy pending your input.

## Blocking before production (config is currently blank)

- [ ] `NEXT_PUBLIC_LEGAL_ENTITY_NAME` — WMCYN's registered legal entity name (`.env.example`,
      `src/config/site.ts`). Until set, the footer/legal pages omit an entity name rather than
      guess one.
- [ ] `NEXT_PUBLIC_PRIVACY_EMAIL` — the email address privacy/data-rights requests should go to.
      Until set, legal pages show "our contact email is being finalized" and the footer's
      "contact" link falls back to `/privacy-choices`.
- [ ] `NEXT_PUBLIC_LEGAL_ADDRESS` — WMCYN's mailing address for legal notices.

## Content flagged `requiresLegalReview: true` in `src/content/legal/*`

- **Privacy Policy — data retention** (`privacy.ts`): exact retention windows per data category
  haven't been set; current copy is directional ("as long as your account is active").
- **Privacy Policy — international data transfers** (`privacy.ts`): no formal review of
  cross-border transfer mechanisms for Firebase/Shopify has been done.
- **Terms — limitation of liability** (`terms.ts`): contains only modest, non-aggressive
  boilerplate. No arbitration clause, class-action waiver, or liability cap was written —
  intentionally, per the instruction not to invent these.
- **Terms — indemnification**: intentionally **omitted entirely**, not just flagged — the spec
  said only to include it "if approved," and it wasn't, so there's no indemnification section at
  all right now.
- **Terms — governing law / dispute resolution** (`terms.ts`): no jurisdiction or dispute
  process has been specified. Needs a decision before this is legally meaningful.
- **Shipping & Returns** (`shippingReturns.ts`): processing/shipping timelines, lost/damaged
  package claims process, return/exchange window, and refund timing are all unset — WMCYN hasn't
  published fixed policies for these yet. Current copy tells visitors to contact WMCYN directly
  rather than stating a number that isn't real.

## Infrastructure follow-ups

- **CSP is not enforced on the production (GitHub Pages static export) deployment.** Full
  security headers, including CSP, are defined in `next.config.ts` for the `next start` path,
  but that path doesn't run in production — static export can only get a CSP via a `<meta>` tag,
  and a wrong CSP could break the AR camera (mind-ar/three.js from jsdelivr), Firebase, or
  Shopify flows with no report-only phase available on this host to catch it safely first. Per
  your direction, this was left unenforced on the live site rather than risk that. Follow-up
  options: move to a host with edge/header support (Vercel, Cloudflare Pages), or carefully
  build and stage a meta-tag CSP with real testing once that's feasible.
- **No transactional/marketing email provider exists** — see `docs/email-compliance.md`.
- **Pre-existing security issue, found during this audit, not caused by it**: `.env.example`/
  `.env.local` contain real plaintext secrets (Firebase keys, Shopify storefront token, and a
  plaintext admin username/password gating `/admin/*`). This should be rotated and moved out of
  version control — flagging here since it's adjacent to this ticket's data-security concerns,
  but the actual fix (rotating credentials, moving to a secrets manager) is a decision for
  whoever owns infra/security, not something this change touches.
- **AR camera / MindAR data handling**: the privacy policy states camera video is processed
  client-side and not uploaded, based on reading the AR component code (no upload call found for
  the live camera feed). Worth a final human sanity-check given how central AR is to the product.

## Explicitly NOT implemented, by design

- No arbitration agreement, class-action waiver, or jurisdiction clause (Terms).
- No indemnification section (Terms) — spec said only to add "if approved."
- No enforced CSP on the production static-export deployment (see above).
- No general contact form was built — one didn't exist before this change and adding one wasn't
  in scope; only the Privacy Choices form (a specific, narrower need) was added.
