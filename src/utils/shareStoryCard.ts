import type { RefObject } from 'react';
import type { ARShareMetadata } from '@/types/arSessions';

// result returned to the caller so the ui can show appropriate feedback
export type ShareResult =
  | { success: true; method: 'native-share' | 'download' | 'copy-link' }
  | { success: false; error: string };

// derive a normalized ARShareMetadata from the same shape ARCamera uses for its
// overlayMetadata prop. works for both ar-session and product metadata flows.
export function buildShareMetadata(
  overlayMetadata: {
    title?: string;
    description?: string;
    campaign?: string;
    createdAt?: string;
    printDate?: string;
    printLocation?: string;
    quantity?: number;
    editionNumber?: number;
    price?: { amount: string; currencyCode: string };
    isClaimed?: boolean;
    actions?: Array<{ type: string; label: string; url?: string }>;
  } | null,
  shareUrl: string
): ARShareMetadata {
  const firstCta = overlayMetadata?.actions?.find(
    (a) => a.type === 'purchase' || a.type === 'claim' || a.type === 'info'
  );

  const base: ARShareMetadata = {
    title: overlayMetadata?.title || 'wmcyn ar experience',
    description: overlayMetadata?.description,
    campaign: overlayMetadata?.campaign,
    createdAt: overlayMetadata?.createdAt,
    shareUrl,
    ctaLabel: firstCta?.label,
  };

  const om = overlayMetadata;
  if (om?.printDate != null) {
    return {
      ...base,
      kind: 'product',
      printDate: om.printDate,
      printLocation: om.printLocation,
      quantity: om.quantity,
      editionNumber: om.editionNumber,
      priceAmount: om.price?.amount,
      priceCurrency: om.price?.currencyCode,
      isClaimed: om.isClaimed,
    };
  }

  return { ...base, kind: 'session' };
}

// capture the hidden share card element to a png blob using html-to-image.
// waits for fonts to be ready before capturing to avoid blank-text output.
async function captureCardBlob(cardRef: RefObject<HTMLElement>): Promise<Blob> {
  await document.fonts.ready;

  const { toBlob } = await import('html-to-image');

  const el = cardRef.current;
  if (!el) throw new Error('share card element not mounted');

  const blob = await toBlob(el, {
    pixelRatio: 1,         // 1080×1920 is already retina-sized; no need to double
    width: 1080,
    height: 1920,
    backgroundColor: '#0a0a0a',
    cacheBust: true,       // avoid next.js image cache conflicts
  });

  if (!blob) throw new Error('html-to-image produced a null blob');
  return blob;
}

// main export: generate the share asset and trigger the best available share path.
// priority:
//   1. navigator.share({ files }) — native share sheet on supported mobile browsers
//   2. download the image file — desktop or fallback
//   3. copy the ar link — last resort
export async function shareStoryCard(
  cardRef: RefObject<HTMLElement>,
  shareMetadata: ARShareMetadata
): Promise<ShareResult> {
  let blob: Blob;

  try {
    blob = await captureCardBlob(cardRef);
  } catch (err: any) {
    console.error('[shareStoryCard] capture failed, falling back to copy-link:', err?.message);
    // capture failed - still offer copy-link as a useful fallback
    try {
      await navigator.clipboard.writeText(shareMetadata.shareUrl);
    } catch {
      // clipboard also failed — not much we can do
    }
    return { success: true, method: 'copy-link' };
  }

  const file = new File([blob], 'wmcyn-ar-story.png', {
    type: 'image/png',
    lastModified: Date.now(),
  });

  // path 1: native web share api with file (mobile safari, chrome android, etc.)
  // pass ONLY files on ios — adding text/title can cause share to fail on some versions
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] });
      return { success: true, method: 'native-share' };
    } catch (err: any) {
      // user cancelled — not a real error, but treat as non-fatal
      if (err?.name === 'AbortError') {
        return { success: false, error: 'share cancelled' };
      }
      console.warn('[shareStoryCard] native share failed, falling back to download:', err?.message);
    }
  }

  // path 2: download the image + copy the link
  try {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'wmcyn-ar-story.png';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    // delay revoke so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);

    // also copy the link so the user can paste it into their post caption
    try {
      await navigator.clipboard.writeText(shareMetadata.shareUrl);
    } catch {
      // clipboard api not available — non-fatal
    }

    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('[shareStoryCard] download failed:', err?.message);
  }

  // path 3: copy-link only
  try {
    await navigator.clipboard.writeText(shareMetadata.shareUrl);
    return { success: true, method: 'copy-link' };
  } catch (err: any) {
    return { success: false, error: 'sharing is not available on this device' };
  }
}
