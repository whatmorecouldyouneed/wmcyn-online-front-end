/**
 * safari / ios getusermedia: avoid min width/height that trigger overconstrainederror;
 * ios caps at 1280x720. optional rear "wide" camera pick when labels exist (after permission).
 */

/** ios + ipados; includes ipad “request desktop website” (macintosh ua + touch) */
const isIOSLike = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  const nav = navigator as Navigator & { maxTouchPoints?: number };
  if (navigator.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1) return true;
  return false;
};

/**
 * strict 1280x720 ideals, no min width/height — avoids overconstrainederror and matches ios caps.
 * chrome on ios uses same webkit camera stack, so treat like ios.
 */
export function prefersSafariStyleCameraConstraints(): boolean {
  return isIOSLike();
}

export async function primeVideoInputLabels(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasLabeledVideo = devices.some(
      (d) => d.kind === 'videoinput' && d.label && d.label.length > 0
    );
    if (hasLabeledVideo) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // permission denied or no camera — caller will still use facingMode-only constraints
  }
}

function labelIsExcludedRearLens(label: string): boolean {
  const l = label.toLowerCase();
  return (
    l.includes('ultra wide') ||
    l.includes('ultrawide') ||
    l.includes('telephoto') ||
    l.includes('0.5x') ||
    l.includes('.5x')
  );
}

/** pick primary back / wide camera when labels are available (reduces ios multi-lens switching) */
export async function pickPreferredEnvironmentCameraDeviceId(): Promise<string | undefined> {
  if (!navigator.mediaDevices?.enumerateDevices) return undefined;
  try {
    const videos = (await navigator.mediaDevices.enumerateDevices()).filter(
      (d) => d.kind === 'videoinput'
    );
    const labeled = videos.filter((d) => d.label && d.label.length > 0);
    if (labeled.length === 0) return undefined;

    const backs = labeled.filter((d) => {
      const l = d.label.toLowerCase();
      const looksRear =
        l.includes('back') || l.includes('rear') || l.includes('environment');
      return looksRear && !labelIsExcludedRearLens(d.label);
    });
    if (backs.length > 0) return backs[0].deviceId;

    const anyNonExcluded = labeled.find((d) => !labelIsExcludedRearLens(d.label));
    return anyNonExcluded?.deviceId;
  } catch {
    return undefined;
  }
}

/**
 * constraints for ar camera (mindar video option + direct getusermedia).
 * uses ideal deviceId when enumeration yields a preferred rear camera.
 */
export async function buildARVideoConstraints(): Promise<MediaTrackConstraints> {
  const safariStyle = prefersSafariStyleCameraConstraints();

  if (safariStyle) {
    await primeVideoInputLabels();
  }

  const deviceId =
    safariStyle ? await pickPreferredEnvironmentCameraDeviceId() : undefined;

  if (safariStyle) {
    // min locks webkit to the 1280-wide preset; ideal-only often falls back to 640×480 (reported as 480×640)
    const c: MediaTrackConstraints = {
      width: { min: 1280, ideal: 1280 },
      height: { min: 720, ideal: 720 },
      frameRate: { ideal: 30 },
    };
    if (deviceId) {
      c.deviceId = { ideal: deviceId };
    } else {
      c.facingMode = { ideal: 'environment' };
    }
    return c;
  }

  const c: MediaTrackConstraints = {
    facingMode: { ideal: 'environment' },
    width: { min: 1280, ideal: 1920 },
    height: { min: 720, ideal: 1080 },
    frameRate: { ideal: 30, max: 60 },
  };
  if (deviceId) {
    c.deviceId = { ideal: deviceId };
  }
  return c;
}

/** hints merged into bare getusermedia calls (e.g. mind-ar) so ios does not default to vga */
export function getVideoResolutionMergeForGetUserMediaPatch(): MediaTrackConstraints {
  return prefersSafariStyleCameraConstraints()
    ? {
        width: { min: 1280, ideal: 1280 },
        height: { min: 720, ideal: 720 },
        frameRate: { ideal: 30 },
      }
    : {
        width: { min: 1280, ideal: 1920 },
        height: { min: 720, ideal: 1080 },
        frameRate: { ideal: 30, max: 60 },
      };
}

/** spread after hints so mindar’s facingMode string / deviceId exact stay authoritative */
export function mergeMediaStreamConstraintsForAR(constraints: MediaStreamConstraints): MediaStreamConstraints {
  const v = constraints.video;
  if (v === false || v === undefined) return constraints;
  const hints = getVideoResolutionMergeForGetUserMediaPatch();
  if (v === true) {
    return {
      ...constraints,
      video: { ...hints, facingMode: { ideal: 'environment' } },
    };
  }
  return {
    ...constraints,
    video: { ...hints, ...v },
  };
}

/**
 * mind-ar@1.2.5 only accepts environmentDeviceId (not a generic video constraints object).
 * use this for MindARThree({ environmentDeviceId }) on ios after priming labels.
 */
export async function getMindArEnvironmentDeviceId(): Promise<string | undefined> {
  if (!prefersSafariStyleCameraConstraints()) return undefined;
  await primeVideoInputLabels();
  return pickPreferredEnvironmentCameraDeviceId();
}

/**
 * bump track resolution after getusermedia (pattern ar only — do not use after mindar.start;
 * mind-ar locks controller input size at init).
 */
export async function sharpenVideoElementTrack(video: HTMLVideoElement): Promise<void> {
  const stream = video?.srcObject as MediaStream | null;
  if (!stream) return;
  const track = stream.getVideoTracks()[0];
  if (!track?.applyConstraints) return;

  const caps =
    typeof track.getCapabilities === 'function'
      ? (track.getCapabilities() as MediaTrackCapabilities)
      : ({} as MediaTrackCapabilities);
  const wMax = caps.width?.max;
  const hMax = caps.height?.max;

  const apply = async (c: MediaTrackConstraints) => {
    await track.applyConstraints(c);
  };

  try {
    if (wMax && hMax) {
      await apply({
        width: { ideal: Math.min(wMax, 1920) },
        height: { ideal: Math.min(hMax, 1080) },
      });
    } else {
      await apply({ width: { ideal: 1280 }, height: { ideal: 720 } });
    }
  } catch {
    try {
      await apply({ width: { ideal: 1280 }, height: { ideal: 720 } });
    } catch {
      try {
        await apply({ width: { ideal: 640 }, height: { ideal: 480 } });
      } catch {
        /* keep browser default */
      }
    }
  }
}
