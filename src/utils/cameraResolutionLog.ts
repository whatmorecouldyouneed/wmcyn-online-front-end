/**
 * resolution comes from the decoded video frame size (videoWidth/videoHeight) and
 * the active MediaStreamTrack getSettings() — both can differ slightly from constraints.
 */

export function logActiveVideoResolution(context: string, video: HTMLVideoElement | null | undefined): void {
  if (!video) {
    console.info('[ar-camera]', context, 'no video element');
    return;
  }

  const stream = video.srcObject as MediaStream | null;
  const track = stream?.getVideoTracks?.()?.[0];

  let settings: MediaTrackSettings | undefined;
  let capabilities: MediaTrackCapabilities | undefined;
  try {
    settings = track?.getSettings?.();
    capabilities = track?.getCapabilities?.() as MediaTrackCapabilities | undefined;
  } catch {
    /* some webviews omit apis */
  }

  console.info('[ar-camera]', context, {
    // what the <video> decoder is actually outputting (used for textures / layout)
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    // what the track reports (often matches; aspect ratio / rotation may differ on some devices)
    trackSettings: settings,
    // hardware maxes / allowed ranges (when exposed)
    widthRange: capabilities?.width,
    heightRange: capabilities?.height,
    frameRateRange: capabilities?.frameRate,
    deviceId: settings?.deviceId ? `${settings.deviceId.slice(0, 8)}…` : settings?.deviceId,
  });
}

/** webgl drawing buffer vs css size — helps spot dpr / sizing issues */
export function logWebGLDrawBuffer(context: string, renderer: { domElement: HTMLCanvasElement; getPixelRatio?: () => number } | null | undefined): void {
  if (!renderer?.domElement) {
    console.info('[ar-camera]', context, 'no renderer');
    return;
  }
  const el = renderer.domElement;
  const pr = typeof renderer.getPixelRatio === 'function' ? renderer.getPixelRatio() : undefined;
  console.info('[ar-camera]', context, {
    canvasCss: { w: el.clientWidth, h: el.clientHeight },
    drawingBuffer: { w: el.width, h: el.height },
    pixelRatio: pr,
  });
}

/** ios sometimes updates videoWidth a frame or two late */
export function logActiveVideoResolutionSoon(context: string, video: HTMLVideoElement | null | undefined): void {
  logActiveVideoResolution(`${context} (immediate)`, video);
  requestAnimationFrame(() => {
    logActiveVideoResolution(`${context} (rAF)`, video);
  });
  window.setTimeout(() => {
    logActiveVideoResolution(`${context} (+300ms)`, video);
  }, 300);
}
