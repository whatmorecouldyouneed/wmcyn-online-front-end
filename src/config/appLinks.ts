import { RESERVED_SLUGS } from './productSlugs';

export const IOS_APP_ID = 'CXTU43NJCA.com.wmcyn.mobile';

// reserved names the app handles itself: qr/ar codes, product instances, product aliases,
// and the custom order form. every other reserved name is a website-only page.
export const APP_ROUTABLE_RESERVED = [
  'ar', 'ar-session', 'cross-body-bag', 'friends-and-family', 'p', 'qr', 'session', 'shoulder-bag', 'viewer',
];

// public/.well-known/apple-app-site-association must equal this; appLinks.test.ts checks it.
// excludes come first because ios uses the first matching component.
export function buildAppSiteAssociation() {
  const websiteOnly = RESERVED_SLUGS.filter((name) => !APP_ROUTABLE_RESERVED.includes(name));
  return {
    applinks: {
      details: [
        {
          appIDs: [IOS_APP_ID],
          components: [
            // home-page links that carry an order claim or a legacy session id
            { '/': '/', '?': { orderId: '?*', claimId: '?*' } },
            { '/': '/', '?': { sessionId: '?*' } },
            { '/': '/', exclude: true },
            ...websiteOnly.flatMap((name) => [
              { '/': `/${name}`, exclude: true },
              { '/': `/${name}/*`, exclude: true },
            ]),
            { '/': '/*' },
          ],
        },
      ],
    },
    webcredentials: { apps: [IOS_APP_ID] },
  };
}
