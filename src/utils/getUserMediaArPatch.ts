import { mergeMediaStreamConstraintsForAR } from './cameraConstraints';

let patchDepth = 0;
let originalGetUserMedia: typeof navigator.mediaDevices.getUserMedia | null = null;

/**
 * mind-ar@1.2.5 calls getusermedia with only facingMode/deviceid — webkit then often picks ~640×480.
 * while patched, merge width/height so the camera opens at 1280×720 (ios cap) when possible.
 */
export function pushArGetUserMediaResolutionPatch(): void {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
  if (patchDepth === 0) {
    originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) =>
      originalGetUserMedia!(mergeMediaStreamConstraintsForAR(constraints));
  }
  patchDepth += 1;
}

export function popArGetUserMediaResolutionPatch(): void {
  if (patchDepth === 0) return;
  patchDepth -= 1;
  if (patchDepth === 0 && originalGetUserMedia && navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = originalGetUserMedia;
    originalGetUserMedia = null;
  }
}
