import { logEvent } from 'firebase/analytics';
import { analytics, initAnalytics } from '@/utils/lib/firebase';
import { postScanEvent } from '@/lib/apiClient';
import { parseWmcynUrl } from '@/lib/wmcynUrl';

// the app logs the same event with platform 'ios', so web and mobile scans compare directly.
// nothing is sent without analytics consent, including the server-side qr count.
export async function trackProductScan(enabled: boolean, url: string) {
  if (!enabled) return;
  const link = parseWmcynUrl(url);
  if (!link || link.kind === 'web') return;

  const parameters: Record<string, string> = { kind: link.kind, platform: 'web' };
  if (link.kind === 'qr') parameters.code = link.code;
  if (link.kind === 'product_set') parameters.slug = link.slug;
  if (link.kind === 'instance') parameters.public_id = link.publicId;

  await initAnalytics();
  if (analytics) logEvent(analytics, 'product_scan_completed', parameters);
  if (link.kind === 'qr') await postScanEvent(link.code).catch(() => undefined);
}

export async function trackClaimEvent(
  enabled: boolean,
  name: 'product_claim_started' | 'product_claim_completed',
  publicId: string
) {
  if (!enabled) return;
  await initAnalytics();
  if (analytics) logEvent(analytics, name, { kind: 'instance', public_id: publicId, platform: 'web' });
}
