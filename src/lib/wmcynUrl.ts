import { slugError } from '@/config/productSlugs';

// the shared grammar for links to wmcyn things. the canonical copy lives in
// wmcyn-backend-infra/functions/src/services/wmcynUrl.ts and wmcyn-url-vectors.json pins
// the expected parse for every shape; this port must agree with it vector for vector.
export const SITE_URL = 'https://wmcyn.online';

const SITE_HOSTS = new Set(['wmcyn.online', 'www.wmcyn.online']);
// the app's development scheme puts the first path segment in the host
const DEV_SCHEME = 'wmcynmobile:';

export const SLUG_ALIASES: Record<string, string> = {
  'cross-body-bag': 'wmcyn-shoulder-bag',
  'shoulder-bag': 'wmcyn-shoulder-bag',
};

export type WmcynLink =
  | { kind: 'qr'; code: string }
  | { kind: 'ar_session'; id: string }
  | { kind: 'product_set'; slug: string }
  | { kind: 'instance'; publicId: string }
  | { kind: 'instance_claim'; publicId: string }
  | { kind: 'custom_order' }
  | { kind: 'legacy_session'; id: string }
  | { kind: 'order_claim'; orderId: string; claimId: string }
  | { kind: 'web'; path: string };

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

// claim secrets ride in the fragment, which this never reads
export function parseWmcynUrl(input: string): WmcynLink | null {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const legacy = raw.match(/^session:\/{0,2}([^/?#\s]+)$/i);
  if (legacy) return { kind: 'legacy_session', id: decodeSegment(legacy[1]) };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  let segments = url.pathname.split('/').filter(Boolean).map(decodeSegment);
  if (url.protocol === DEV_SCHEME) {
    if (url.hostname) segments = [decodeSegment(url.hostname), ...segments];
  } else if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null;
  } else if (!SITE_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const query = url.searchParams;
  const sessionId = query.get('sessionId');
  if (sessionId) return { kind: 'legacy_session', id: sessionId };
  const orderId = query.get('orderId');
  const claimId = query.get('claimId');
  if (orderId && claimId) return { kind: 'order_claim', orderId, claimId };

  const path = `/${segments.join('/')}`;
  const [first = '', second = '', third = ''] = segments;
  const head = first.toLowerCase();
  const count = segments.length;

  if (head === 'qr' && count === 1) {
    const code = query.get('code');
    return code ? { kind: 'qr', code } : { kind: 'web', path };
  }
  if ((head === 'ar' || head === 'viewer' || head === 'session') && count === 2) return { kind: 'qr', code: second };
  if (head === 'sessions' && count === 2) return { kind: 'legacy_session', id: second };
  if (head === 'ar-session' && count === 2) return { kind: 'ar_session', id: second };
  if (head === 'p' && count === 2) return { kind: 'instance', publicId: second };
  if (head === 'p' && count === 3 && third.toLowerCase() === 'claim') return { kind: 'instance_claim', publicId: second };
  if ((head === 'friends-and-family' || head === 'friends&family') && count === 1) return { kind: 'custom_order' };

  if (count === 1) {
    const slug = SLUG_ALIASES[head] || head;
    if (!slugError(slug)) return { kind: 'product_set', slug };
  }

  return { kind: 'web', path };
}

// `#k=` on claim links and `#token=` on order-claim links; read only on the client
export function fragmentParam(input: string, name: 'k' | 'token'): string | null {
  const hash = String(input || '').split('#')[1];
  if (!hash) return null;
  return new URLSearchParams(hash).get(name);
}
