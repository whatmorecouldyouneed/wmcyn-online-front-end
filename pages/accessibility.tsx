import LegalPage from '@/components/legal/LegalPage';
import { accessibilityDocument } from '@/content/legal/accessibility';

export default function AccessibilityPage() {
  return <LegalPage document={accessibilityDocument} />;
}
