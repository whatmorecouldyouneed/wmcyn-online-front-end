import OgProductLanding from '@/components/OgProductLanding';
import { wmcynSchoolBagMarker } from '@/config/markers';

export default function WmcynSchoolBagPage() {
  return (
    <OgProductLanding
      pageTitle="wmcyn school bag — AR experience"
      metaDescription="scan the logo on your wmcyn school bag to unlock the AR experience."
      canonicalUrl="https://wmcyn.online/wmcyn-school-bag"
      productName="wmcyn school bag"
      vibeCopy="printed september 19, 2026. $40.00."
      garmentWord="bag"
      marker={wmcynSchoolBagMarker}
      shareUrl="https://wmcyn.online/wmcyn-school-bag"
    />
  );
}
