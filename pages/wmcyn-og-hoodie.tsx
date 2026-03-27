import OgProductLanding from '@/components/OgProductLanding';
import { wmcynOgHoodieMarker } from '@/config/markers';

export default function WmcynOgHoodiePage() {
  return (
    <OgProductLanding
      pageTitle="wmcyn og hoodie — AR experience"
      metaDescription="scan the logo on your wmcyn og hoodie to unlock the AR experience."
      canonicalUrl="https://wmcyn.online/wmcyn-og-hoodie"
      productName="wmcyn og hoodie"
      vibeCopy="heather grey. black accent. first run final sample."
      garmentWord="hoodie"
      marker={wmcynOgHoodieMarker}
      shareUrl="https://wmcyn.online/wmcyn-og-hoodie"
    />
  );
}
