import LegalPage from '@/components/legal/LegalPage';
import { privacyDocument } from '@/content/legal/privacy';

export default function PrivacyPage() {
  return <LegalPage document={privacyDocument} />;
}
