import type { LegalDocument } from '@/components/legal/types';

const EFFECTIVE_DATE = 'August 21, 2026';

export const shippingReturnsDocument: LegalDocument = {
  title: 'shipping & returns',
  description: 'Shipping, returns, and refund information for WMCYN orders.',
  path: '/shipping-returns',
  effectiveDate: EFFECTIVE_DATE,
  lastUpdated: EFFECTIVE_DATE,
  sections: [
    {
      id: 'overview',
      heading: 'overview',
      body: [
        'WMCYN products are sold through our Shopify-powered shop. This page explains our general approach to shipping, returns, and refunds — order- and drop-specific details (like exact processing windows) are confirmed at checkout or on the relevant product page.',
      ],
    },
    {
      id: 'processing-and-shipping',
      heading: 'order processing and shipping',
      requiresLegalReview: true,
      body: [
        'Processing and shipping timelines vary by product, drop, and whether an item is made to order. We have not yet published a fixed, site-wide processing/shipping SLA — check the product page or your order confirmation for drop-specific timing, or contact us if you need an estimate.',
      ],
    },
    {
      id: 'limited-releases',
      heading: 'limited and 1-of-1 releases',
      body: [
        'Some WMCYN products are released in limited quantities, made to order, or as one-of-a-kind ("1 of 1") pieces — this is disclosed on the product page. Because of the small production runs involved, these releases may take longer to produce and ship than standard items, and quantities cannot be increased once a drop sells out.',
      ],
    },
    {
      id: 'lost-or-damaged',
      heading: 'lost or damaged packages',
      requiresLegalReview: true,
      body: [
        'If your order arrives damaged or a tracked package shows as lost in transit, contact us with your order details and we’ll work with you on next steps. We have not yet finalized a formal claims process or timeframe for this — treat this section as directional until that’s confirmed.',
      ],
    },
    {
      id: 'returns-and-exchanges',
      heading: 'returns and exchanges',
      requiresLegalReview: true,
      body: [
        'We have not yet published a fixed returns/exchange window. Limited and 1-of-1 releases in particular may be final sale given their production model, but that has not been formally confirmed policy-wide. Contact us before sending anything back so we can advise on your specific order.',
      ],
    },
    {
      id: 'refunds',
      heading: 'refunds',
      requiresLegalReview: true,
      body: [
        'Approved refunds are issued to your original payment method through Shopify. We have not yet published a fixed refund-processing timeframe — contact us if you need a status update on a specific order.',
      ],
    },
  ],
};
