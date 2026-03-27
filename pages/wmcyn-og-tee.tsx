import OgProductLanding from '@/components/OgProductLanding';
import { wmcynOgTeeMarker } from '@/config/markers';

export default function WmcynOgTeePage() {
  return (
    <OgProductLanding
      pageTitle="wmcyn og long sleeve tee — AR experience"
      metaDescription="scan the logo on your wmcyn og long sleeve tee to unlock the AR experience."
      canonicalUrl="https://wmcyn.online/wmcyn-og-tee"
      productName="wmcyn og long sleeve tee"
      vibeCopy="white long sleeve. black logo. final sample."
      garmentWord="shirt"
      marker={wmcynOgTeeMarker}
      shareUrl="https://wmcyn.online/wmcyn-og-tee"
    />
  );
}
