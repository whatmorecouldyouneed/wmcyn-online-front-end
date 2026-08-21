import LegalPage from '@/components/legal/LegalPage';
import { shippingReturnsDocument } from '@/content/legal/shippingReturns';

export default function ShippingReturnsPage() {
  return <LegalPage document={shippingReturnsDocument} />;
}
