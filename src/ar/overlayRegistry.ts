import type { OverlayConfig, OverlayCustom, ResolvedOverlay, ResolvedArConfig, ArConfigResponse } from '@/types/arSessions';

// default assets configuration
export const DEFAULT_LOGO_URL = 'https://cdn.wmcyn.online/assets/wmcyn-logo.glb';
export const DEFAULT_LOGO_SCALE: [number,number,number] = [0.3,0.3,0.3];
export const DEFAULT_LOGO_ROT: [number,number,number] = [0,0,0];
export const DEFAULT_LOGO_POS: [number,number,number] = [0,0,0];

// fallback hiro pattern url if backend says USE_DEFAULT_HIRO_PATTERN
export const DEFAULT_HIRO_PATTERN_URL = 'https://cdn.wmcyn.online/ar/patterns/hiro.patt';

// create default wmcyn logo overlay
const defOverlay = (): ResolvedOverlay => ({
  type: 'model',
  src: DEFAULT_LOGO_URL,
  scale: DEFAULT_LOGO_SCALE,
  rotation: DEFAULT_LOGO_ROT,
  position: DEFAULT_LOGO_POS,
});

// normalize marker url - handle special case for default hiro pattern
const normalizeMarkerUrl = (markerType: ArConfigResponse['markerType'], markerDataUrl: string) => {
  if (markerType === 'hiro' && markerDataUrl === 'USE_DEFAULT_HIRO_PATTERN') {
    return DEFAULT_HIRO_PATTERN_URL;
  }
  return markerDataUrl;
};

// convert overlay custom to resolved overlay
const toResolved = (c?: OverlayCustom | null): ResolvedOverlay | null =>
  !c ? null : ({ 
    type: c.type, 
    src: c.src, 
    scale: c.scale, 
    position: c.position, 
    rotation: c.rotation, 
    text: c.text 
  });

// resolve ar config response to renderable format
export function resolveArConfig(resp: ArConfigResponse): ResolvedArConfig {
  const overlays: ResolvedOverlay[] = [];
  const mode = resp.overlayConfig?.mode || 'default';
  const custom = toResolved(resp.overlayConfig?.custom);

  // apply overlay mode logic
  if (mode === 'default') {
    overlays.push(defOverlay());
  } else if (mode === 'custom') {
    overlays.push(custom ?? defOverlay());
  } else if (mode === 'stacked') {
    overlays.push(defOverlay(), ...(custom ? [custom] : []));
  }

  return {
    markerType: resp.markerType,
    markerDataUrl: normalizeMarkerUrl(resp.markerType, resp.markerDataUrl),
    overlays,
    meta: resp.metadata,
    asset3D: resp.asset3D,
  };
}

