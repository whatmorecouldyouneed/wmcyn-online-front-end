import LegalPage from '@/components/legal/LegalPage';
import { cookiesDocument } from '@/content/legal/cookies';

export default function CookiesPage() {
  return <LegalPage document={cookiesDocument} />;
}
