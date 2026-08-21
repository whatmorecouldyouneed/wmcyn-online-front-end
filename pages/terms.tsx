import LegalPage from '@/components/legal/LegalPage';
import { termsDocument } from '@/content/legal/terms';

export default function TermsPage() {
  return <LegalPage document={termsDocument} />;
}
