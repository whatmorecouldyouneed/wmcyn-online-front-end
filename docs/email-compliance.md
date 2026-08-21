# Email compliance

## Current state

WMCYN.online has **no transactional or marketing email service provider** integrated today.

- The only outbound email is Firebase Authentication's built-in **password reset email**
  (`sendPasswordResetEmail`, `src/contexts/AuthContext.tsx`), which is a transactional email
  managed entirely by Firebase/Google — there's no custom template in this repo to audit, and no
  provider-level unsubscribe requirement applies to a password-reset email.
- The newsletter signup (`pages/index.tsx`) writes the subscriber's email straight to a Firebase
  Realtime Database node (`emailList`) and a `localStorage` fallback if that write fails. Nothing
  in this repo actually **sends** newsletter emails yet — there's no campaign tool consuming that
  list. In other words: WMCYN collects newsletter signups today but has no email-sending
  infrastructure wired up to act on them.

## What this means for compliance requirements

Section 19/20 of the spec (marketing-email unsubscribe links, sender identification, a mailing
address in every marketing email, `/unsubscribe` route, List-Unsubscribe headers) is **not
applicable yet** — there's no marketing email being sent to apply those requirements to.

What was added in this change instead:
- A notice-at-collection sentence on the newsletter signup, linking to the Privacy Policy, and
  pointing people to the **Privacy Choices** page (`/privacy-choices`, request type "marketing
  opt-out") as the way to ask WMCYN not to email them, since there's no automated unsubscribe
  flow to offer instead.
- `consentVersion`/`source` fields added to the stored subscriber record, so if/when WMCYN adopts
  an ESP, existing records can be reconciled against the current consent model.

## Follow-up for whoever picks this up next

When WMCYN adopts a transactional/marketing ESP (Mailchimp, Klaviyo, SendGrid, Resend, etc.):
1. Prefer that provider's native unsubscribe/List-Unsubscribe support over building a custom one.
2. Every marketing email needs: a working one-click unsubscribe, accurate sender identification,
   a non-deceptive subject line, and WMCYN's valid postal mailing address (see
   `NEXT_PUBLIC_LEGAL_ADDRESS` in `docs/legal-review-required.md` — currently blank).
3. Unsubscribing should never require login, payment, or more than one step.
4. Keep transactional email (password resets, order confirmations) clearly separate from
   marketing email — don't let marketing content ride along in a transactional template.
