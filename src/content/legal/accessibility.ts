import type { LegalDocument } from '@/components/legal/types';

const EFFECTIVE_DATE = 'August 21, 2026';

export const accessibilityDocument: LegalDocument = {
  title: 'accessibility statement',
  description: "WMCYN's accessibility commitment and how to report an issue.",
  path: '/accessibility',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: EFFECTIVE_DATE,
  sections: [
    {
      id: 'commitment',
      heading: 'our commitment',
      body: [
        'WMCYN is working toward conformance with the Web Content Accessibility Guidelines (WCAG) 2.2, Level AA. Accessibility is an ongoing effort, not a one-time fix, and we expect to keep improving as the site evolves.',
      ],
    },
    {
      id: 'measures',
      heading: 'measures we have taken',
      body: [
        {
          list: [
            'a "skip to main content" link at the start of every page',
            'a keyboard-accessible, screen-reader-friendly cookie consent banner and preferences dialog, with focus trapping, Escape-to-close, and focus restored to the control you opened it from',
            'visible focus states on interactive controls',
            'camera and other sensitive device permissions are requested only after an explicit action, with contextual explanation of why access is needed',
            'reduced-motion support for users who prefer fewer animations',
            'legal and policy pages use plain semantic HTML, a logical heading hierarchy, and a constrained line width for readability',
          ],
        },
      ],
    },
    {
      id: 'known-limitations',
      heading: 'known limitations',
      body: [
        'Parts of the site — particularly pages and features that predate this accessibility pass, and our AR/XR camera experiences, which are inherently visual and device-dependent — may not yet fully conform to WCAG 2.2 AA. We’re addressing issues as we find them.',
      ],
    },
    {
      id: 'compatibility',
      heading: 'compatibility',
      body: [
        'WMCYN.online is built to work with modern browsers and assistive technologies. If something doesn’t work well with the specific browser or assistive technology you use, please let us know.',
      ],
    },
    {
      id: 'feedback',
      heading: 'feedback',
      body: [
        'If you encounter an accessibility barrier on WMCYN.online, please tell us — describe the issue and the page it’s on, so we can investigate. You can reach us through our Privacy Choices page or the contact details below.',
      ],
    },
  ],
};
