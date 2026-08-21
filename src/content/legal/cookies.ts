import type { LegalDocument } from '@/components/legal/types';

const EFFECTIVE_DATE = 'August 21, 2026';

export const cookiesDocument: LegalDocument = {
  title: 'cookie policy',
  description: 'What cookies and similar technologies WMCYN uses, and how to control them.',
  path: '/cookies',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: EFFECTIVE_DATE,
  intro: [
    'This policy lists the cookies and browser storage WMCYN actually uses today. We only name a category or technology here if it’s really running on this site — nothing is listed "just in case."',
    'You can change your choices at any time using "cookie settings" in the site footer.',
  ],
  sections: [
    {
      id: 'strictly-necessary',
      heading: 'strictly necessary',
      body: [
        'These are required for the site to function and can’t be turned off:',
        {
          list: [
            'wmcyn_privacy_preferences (cookie, ~12 months) — remembers your cookie consent choices.',
            'shopify_cart (browser local storage) — remembers items in your cart between visits.',
            'Firebase Authentication session data (browser storage) — keeps you signed in to your account.',
            'admin_session (session storage) — internal admin login session; only relevant to WMCYN staff on admin pages.',
          ],
        },
      ],
    },
    {
      id: 'analytics',
      heading: 'analytics',
      body: [
        'If you consent, we use Firebase Analytics (built on Google Analytics) to understand aggregate site usage. This sets Google Analytics cookies (typically named things like _ga and _ga_*) and does not run until you accept analytics through the cookie banner or preferences panel.',
      ],
    },
    {
      id: 'marketing',
      heading: 'marketing',
      body: [
        'WMCYN does not currently use marketing or advertising cookies, pixels, or retargeting technology. If that changes, we’ll add a real marketing category here and to the consent controls before any such technology runs.',
      ],
    },
    {
      id: 'preferences',
      heading: 'preferences',
      body: [
        'WMCYN does not currently set optional "preferences" cookies (like remembered UI settings) beyond your consent choice itself.',
      ],
    },
    {
      id: 'managing-choices',
      heading: 'how to manage your choices',
      body: [
        'Use the "cookie settings" control in the site footer at any time to accept, reject, or customize non-essential technologies. Rejecting non-essential technologies does not limit your ability to browse or shop on wmcyn.online.',
        'Your browser also lets you block or delete cookies directly, and WMCYN honors the Global Privacy Control signal — see our Privacy Policy for details.',
      ],
    },
    {
      id: 'changes',
      heading: 'changes to this policy',
      body: [
        'If we add a new non-essential technology, we’ll update this policy and the consent options before it runs.',
      ],
    },
  ],
};
