import OgProductLanding from '@/components/OgProductLanding';
import { wmcynShoulderBagMarker } from '@/config/markers';

export default function WmcynShoulderBagPage() {
  return (
    <OgProductLanding
      pageTitle="wmcyn shoulder bag — AR experience"
      metaDescription="scan the logo on your wmcyn shoulder bag to unlock the AR experience."
      canonicalUrl="https://wmcyn.online/wmcyn-shoulder-bag"
      productName="wmcyn shoulder bag"
      vibeCopy="printed september 19, 2026. $40.00."
      garmentWord="bag"
      marker={wmcynShoulderBagMarker}
      shareUrl="https://wmcyn.online/wmcyn-shoulder-bag"
    />
  );
}
