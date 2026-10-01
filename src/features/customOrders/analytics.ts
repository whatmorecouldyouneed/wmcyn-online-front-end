import { logEvent } from 'firebase/analytics';
import { analytics, initAnalytics } from '@/utils/lib/firebase';

export async function trackCustomOrderEvent(
  enabled: boolean,
  name:
    | 'custom_order_started'
    | 'custom_order_reference_uploaded'
    | 'custom_order_budget_selected'
    | 'custom_order_submitted'
    | 'custom_order_submission_failed',
  parameters?: Record<string, string | number | boolean>
) {
  if (!enabled) return;
  await initAnalytics();
  if (analytics) logEvent(analytics, name, parameters);
}
