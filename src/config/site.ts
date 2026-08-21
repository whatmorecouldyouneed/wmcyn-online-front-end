// central site/legal config — canonical URL, contact info, and social links used across
// the legal pages, footer, and metadata. legalEntityName/privacyEmail/legalAddress are
// intentionally blank until WMCYN provides real values — see docs/legal-review-required.md.
export const siteConfig = {
  name: 'WMCYN',
  url: 'https://wmcyn.online',

  legalEntityName: process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME || '',
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || '',
  legalAddress: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || '',

  social: {
    instagram: 'https://instagram.com/whatmorecouldyouneed',
    youtube: 'https://youtube.com/@whatmorecouldyouneed',
    tiktok: 'https://tiktok.com/@whatmorecouldyouneed',
    twitch: 'https://twitch.tv/whatmorecouldyouneed',
  },

  policies: {
    privacy: '/privacy',
    terms: '/terms',
    cookies: '/cookies',
    privacyChoices: '/privacy-choices',
    accessibility: '/accessibility',
    shippingReturns: '/shipping-returns',
  },
} as const;

export function privacyEmailHref(): string | null {
  return siteConfig.privacyEmail ? `mailto:${siteConfig.privacyEmail}` : null;
}
