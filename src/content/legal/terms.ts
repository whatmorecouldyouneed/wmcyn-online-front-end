import type { LegalDocument } from '@/components/legal/types';

const EFFECTIVE_DATE = 'August 21, 2026';

export const termsDocument: LegalDocument = {
  title: 'terms of use',
  description: 'The terms that govern your use of wmcyn.online.',
  path: '/terms',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: EFFECTIVE_DATE,
  intro: [
    'These terms govern your use of wmcyn.online, including our shop, accounts, and AR/XR experiences. By using the site, you agree to them.',
  ],
  sections: [
    {
      id: 'acceptance',
      heading: 'acceptance of terms',
      body: [
        'By accessing or using wmcyn.online, you agree to be bound by these terms and by our Privacy Policy. If you don’t agree, please don’t use the site.',
      ],
    },
    {
      id: 'eligibility',
      heading: 'eligibility',
      body: [
        'WMCYN.online is not directed at children under 13, and you must be at least 13 years old to use it. If you’re under the age of majority in your jurisdiction, you should review these terms with a parent or guardian.',
      ],
    },
    {
      id: 'accounts',
      heading: 'accounts and account security',
      body: [
        'Some features (like the friends & family shop and your dashboard) require an account, created through Firebase Authentication with an email/password or Google sign-in.',
        'You’re responsible for keeping your login credentials confidential and for all activity under your account. Tell us right away if you suspect unauthorized access.',
      ],
    },
    {
      id: 'prohibited-conduct',
      heading: 'prohibited conduct',
      body: [
        'When using WMCYN, you agree not to:',
        {
          list: [
            'violate any applicable law or regulation',
            'attempt to gain unauthorized access to any account, system, or data',
            'interfere with or disrupt the site, including AR experiences or checkout',
            'scrape, reverse-engineer, or misuse our AR markers, 3D assets, or product data',
            'impersonate WMCYN, our staff, or another person',
            'use the site to transmit malware or harmful code',
          ],
        },
      ],
    },
    {
      id: 'intellectual-property',
      heading: 'intellectual property',
      body: [
        'WMCYN, our logos, product designs, AR markers and models, photography, and site content are owned by WMCYN or our licensors and protected by intellectual property law. Using the site doesn’t grant you any rights to that content beyond what’s needed to browse and shop normally.',
        '"WMCYN" and our associated marks may not be used without our prior written permission.',
      ],
    },
    {
      id: 'user-generated-content',
      heading: 'user-generated content and AR sharing',
      body: [
        'Some AR experiences let you generate and share a captured image (an AR "moment") through your device’s native share sheet or Instagram Stories. That capture is created on your device — sharing it is your choice, and you’re responsible for what you choose to share and where.',
        'If you send us feedback, product photos, or other content directly (for example, through a privacy or support request), you grant WMCYN a non-exclusive license to use that specific submission to respond to you and operate the service. We do not claim ownership of content you create.',
      ],
    },
    {
      id: 'purchases',
      heading: 'purchases through the shop',
      body: [
        'Products are sold through our Shopify-powered shop. Prices, availability, and product details are as shown at checkout and may change without notice. Placing an order is an offer to purchase, which we may accept or decline (for example, if an item sells out or pricing displays incorrectly).',
        'Payment is processed by Shopify and its payment provider(s), not directly by WMCYN.',
      ],
    },
    {
      id: 'limited-editions',
      heading: 'limited and 1-of-1 releases',
      body: [
        'Some products are released as limited runs, made-to-order, or one-of-a-kind ("1 of 1") pieces, as noted on the relevant product page. Scarcity claims on a product page reflect the actual quantity produced for that release.',
      ],
    },
    {
      id: 'ar-experiences',
      heading: 'AR/XR experiences and experimental features',
      body: [
        'Our AR/XR features are provided "as is" and may be experimental, may require camera access, and may not work identically across all devices, browsers, or lighting conditions. We may modify, limit, or discontinue an AR/XR feature at any time.',
      ],
    },
    {
      id: 'third-party-services',
      heading: 'third-party links and services',
      body: [
        'The site links to or integrates with third-party services we don’t control, including Shopify, Firebase/Google, and social platforms like Instagram, YouTube, TikTok, and Twitch. Your use of those services is governed by their own terms and privacy policies.',
      ],
    },
    {
      id: 'creator-content',
      heading: 'creator and interview content',
      body: [
        'From time to time, WMCYN may feature interviews, performances, recordings, or likenesses of creators and collaborators. Acceptance of these terms by a site visitor does not, by itself, grant WMCYN rights to commercialize any individual creator’s interview, voice, likeness, or performance — those rights are governed by separate agreements directly with the individuals involved, outside of this website.',
      ],
    },
    {
      id: 'termination',
      heading: 'termination and suspension',
      body: [
        'We may suspend or terminate your access to an account or the site if we reasonably believe you’ve violated these terms or created risk or legal exposure for WMCYN. You may stop using the site, or request account deletion, at any time.',
      ],
    },
    {
      id: 'disclaimers',
      heading: 'disclaimers',
      body: [
        'The site, including AR/XR features and product availability, is provided "as is" and "as available" without warranties of any kind, to the fullest extent permitted by law. We don’t guarantee the site will be uninterrupted, error-free, or compatible with every device.',
      ],
    },
    {
      id: 'liability',
      heading: 'limitation of liability',
      requiresLegalReview: true,
      body: [
        'To the fullest extent permitted by law, WMCYN will not be liable for indirect, incidental, or consequential damages arising from your use of the site.',
        'The specific scope, dollar caps, and carve-outs for this section have not yet been reviewed by an attorney and should be treated as placeholder-strength boilerplate until that review happens — we have intentionally not added an arbitration clause, class-action waiver, or other aggressive liability terms without that review.',
      ],
    },
    {
      id: 'changes-to-service',
      heading: 'changes to the service',
      body: [
        'We may add, change, or remove features of the site, including products, AR experiences, and pricing, at any time.',
      ],
    },
    {
      id: 'changes-to-terms',
      heading: 'changes to these terms',
      body: [
        'We may update these terms from time to time. We’ll update the "last updated" date above; continued use of the site after an update means you accept the revised terms.',
      ],
    },
    {
      id: 'governing-law',
      heading: 'governing law and disputes',
      requiresLegalReview: true,
      body: [
        'WMCYN has not yet finalized a governing-law or dispute-resolution clause for these terms. That decision requires attorney and founder sign-off and will be added here once confirmed.',
      ],
    },
  ],
};
