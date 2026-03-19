import type { ARShareMetadata } from '@/types/arSessions';
import type { ThreeContext } from '@/hooks/useARScene';
import type { ShareResult } from './shareStoryCard';
import { buildNarrativeLine, SHARE_CARD_EYEBROW } from './shareNarrative';

// output dimensions — instagram story safe size (9:16)
const EXPORT_W = 1080;
const EXPORT_H = 1920;

// ─── compositor ───────────────────────────────────────────────────────────────

// composite the live ar viewport into a story-sized canvas.
// - layer 1: camera video frame (cover-scaled)
// - layer 2: webgl render (cover-scaled, forced re-render to flush back-buffer)
// - layer 3: liquid glass narrative dock (canvas — matches ARShareCard copy, not old black strip)
export async function compositeARFrame(
  mountEl: HTMLElement,
  shareMetadata: ARShareMetadata | null,
  threeContext: ThreeContext | null
): Promise<Blob | null> {
  const video = mountEl.querySelector('video') as HTMLVideoElement | null;
  const glCanvas = mountEl.querySelector('canvas') as HTMLCanvasElement | null;

  const hasVideo = video && video.videoWidth > 0 && video.readyState >= 2;
  const hasCanvas = glCanvas && glCanvas.width > 0;

  if (!hasVideo && !hasCanvas) return null;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = EXPORT_W;
  exportCanvas.height = EXPORT_H;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

  if (hasVideo) {
    const r = coverRect(video!.videoWidth, video!.videoHeight, EXPORT_W, EXPORT_H);
    try { ctx.drawImage(video!, r.drawX, r.drawY, r.drawW, r.drawH); } catch { /* skip */ }
  }

  if (threeContext) {
    try {
      const { renderer, scene, camera } = threeContext;
      if (renderer && scene && camera) {
        const origPR = renderer.getPixelRatio();
        const nativePR = Math.min(window.devicePixelRatio || 2, 3);
        const clientW = renderer.domElement.clientWidth || window.innerWidth;
        const clientH = renderer.domElement.clientHeight || window.innerHeight;
        const boosted = nativePR > origPR + 0.01;

        if (boosted) {
          renderer.setPixelRatio(nativePR);
          renderer.setSize(clientW, clientH, false);
        }

        renderer.render(scene, camera);

        if (glCanvas) {
          const r = coverRect(glCanvas.width, glCanvas.height, EXPORT_W, EXPORT_H);
          ctx.globalCompositeOperation = 'source-over';
          try { ctx.drawImage(glCanvas, r.drawX, r.drawY, r.drawW, r.drawH); } catch { /* tainted */ }
        }

        if (boosted) {
          renderer.setPixelRatio(origPR);
          renderer.setSize(clientW, clientH, false);
        }
      }
    } catch { /* renderer may be disposed */ }
  } else if (hasCanvas) {
    const r = coverRect(glCanvas!.width, glCanvas!.height, EXPORT_W, EXPORT_H);
    try {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(glCanvas!, r.drawX, r.drawY, r.drawW, r.drawH);
    } catch { /* tainted canvas */ }
  }

  if (shareMetadata) {
    await document.fonts.ready;
    drawLiquidGlassOverlay(ctx, shareMetadata);
  }

  return new Promise<Blob | null>((resolve) => {
    exportCanvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
  });
}

// ─── liquid glass dock (canvas) — same narrative as ARShareCard, bottom-aligned ─

function drawLiquidGlassOverlay(ctx: CanvasRenderingContext2D, meta: ARShareMetadata) {
  const vpW = window.innerWidth || 390;
  const scale = EXPORT_W / vpW;
  const overlayPad = 16 * scale;
  const innerPad = 20 * scale;
  const borderW = Math.max(2, 2 * scale);
  const radiusOuter = 22 * scale;
  const radiusInner = 20 * scale;
  const font = 'Outfit, sans-serif';

  const eyebrowFs = Math.round(11 * scale);
  const titleFs = Math.round(15 * scale);
  const narrativeFs = Math.round(12 * scale);
  const ctaFs = Math.round(11 * scale);

  const narrative = buildNarrativeLine(meta);
  const title = (meta.title || 'wmcyn ar experience').toLowerCase();

  const cardX = overlayPad;
  const cardW = EXPORT_W - overlayPad * 2;
  const innerW = cardW - borderW * 2;
  const textMaxW = innerW - innerPad * 2;

  let contentH = innerPad;
  contentH += eyebrowFs * 1.1 + 8 * scale;
  contentH += titleFs * 1.25 + 10 * scale;

  if (narrative) {
    ctx.save();
    ctx.font = `300 ${narrativeFs}px ${font}`;
    const lines = wrapText(ctx, narrative.toLowerCase(), textMaxW, 6);
    contentH += lines.length * narrativeFs * 1.45 + 6 * scale;
    ctx.restore();
  }

  if (meta.ctaLabel) {
    contentH += 8 * scale + ctaFs + 18 * scale;
  }

  contentH += innerPad;

  const cardH = Math.ceil(contentH + borderW * 2);
  const cardY = EXPORT_H - cardH - overlayPad;

  const innerX = cardX + borderW;
  const innerY = cardY + borderW;
  const innerH = cardH - borderW * 2;

  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, radiusOuter);
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, 'rgba(255,215,0,0.45)');
  borderGrad.addColorStop(0.45, 'rgba(255,255,255,0.28)');
  borderGrad.addColorStop(1, 'rgba(140,180,255,0.38)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = borderW;
  ctx.stroke();
  ctx.restore();

  roundRect(ctx, innerX, innerY, innerW, innerH, radiusInner);
  ctx.fillStyle = 'rgba(8,12,24,0.88)';
  ctx.fill();

  ctx.save();
  roundRect(ctx, innerX, innerY, innerW, innerH, radiusInner);
  ctx.clip();
  const shine = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
  shine.addColorStop(0, 'rgba(200,230,255,0.14)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  shine.addColorStop(1, 'rgba(255,215,0,0.08)');
  ctx.fillStyle = shine;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(innerX, innerY, innerW, innerH);
  ctx.restore();

  let ty = innerY + innerPad;
  const tx = innerX + innerPad;

  ctx.textBaseline = 'top';

  ctx.save();
  ctx.font = `300 ${eyebrowFs}px ${font}`;
  ctx.fillStyle = 'rgba(255,215,0,0.68)';
  ctx.textAlign = 'left';
  ctx.fillText(SHARE_CARD_EYEBROW, tx, ty);
  ty += eyebrowFs * 1.1 + 8 * scale;
  ctx.restore();

  ctx.save();
  ctx.font = `500 ${titleFs}px ${font}`;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fillText(truncate(title, textMaxW, ctx), tx, ty);
  ty += titleFs * 1.25 + 10 * scale;
  ctx.restore();

  if (narrative) {
    ctx.save();
    ctx.font = `300 ${narrativeFs}px ${font}`;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    const lines = wrapText(ctx, narrative.toLowerCase(), textMaxW, 6);
    for (const line of lines) {
      ctx.fillText(line, tx, ty);
      ty += narrativeFs * 1.45;
    }
    ty += 6 * scale;
    ctx.restore();
  }

  if (meta.ctaLabel) {
    ctx.save();
    ctx.font = `400 ${ctaFs}px ${font}`;
    const label = meta.ctaLabel.toLowerCase();
    const tw = ctx.measureText(label).width;
    const pillW = tw + 28 * scale;
    const pillH = ctaFs + 16 * scale;
    const pillX = tx;
    const pillY = ty + 4 * scale;
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = Math.max(1, scale);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pillX + pillW / 2, pillY + pillH / 2);
    ctx.restore();
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      if (lines.length >= maxLines) break;
      line = word;
    } else {
      line = test;
    }
  }

  if (line && lines.length < maxLines) {
    if (ctx.measureText(line).width > maxW) {
      while (line.length > 1 && ctx.measureText(`${line}…`).width > maxW) {
        line = line.slice(0, -1);
      }
      lines.push(`${line}…`);
    } else {
      lines.push(line);
    }
  } else if (lines.length === maxLines && lines[maxLines - 1]) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }

  return lines;
}

function truncate(s: string, maxW: number, ctx: CanvasRenderingContext2D): string {
  if (ctx.measureText(s).width <= maxW) return s;
  let t = s;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

function coverRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): { drawX: number; drawY: number; drawW: number; drawH: number } {
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  let drawW: number;
  let drawH: number;
  if (srcRatio > dstRatio) {
    drawH = dstH;
    drawW = drawH * srcRatio;
  } else {
    drawW = dstW;
    drawH = drawW / srcRatio;
  }
  return { drawX: (dstW - drawW) / 2, drawY: (dstH - drawH) / 2, drawW, drawH };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── share orchestration ──────────────────────────────────────────────────────

export async function shareARCapture(
  mountEl: HTMLElement | null,
  threeContext: ThreeContext | null,
  shareMetadata: ARShareMetadata,
  fallbackBlob: () => Promise<Blob>
): Promise<ShareResult> {
  let blob: Blob | null = null;

  if (mountEl) {
    try {
      blob = await compositeARFrame(mountEl, shareMetadata, threeContext);
    } catch (err: any) {
      console.warn('[shareARCapture] live composite failed, trying story card:', err?.message);
    }
  }

  if (!blob) {
    try {
      blob = await fallbackBlob();
    } catch (err: any) {
      console.error('[shareARCapture] story card capture also failed:', err?.message);
    }
  }

  if (!blob) {
    try { await navigator.clipboard.writeText(shareMetadata.shareUrl); } catch { /* ok */ }
    return { success: true, method: 'copy-link' };
  }

  const filename = blob.type === 'image/jpeg' ? 'wmcyn-ar-moment.jpg' : 'wmcyn-ar-moment.png';
  const file = new File([blob], filename, { type: blob.type, lastModified: Date.now() });

  if (
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] });
      return { success: true, method: 'native-share' };
    } catch (err: any) {
      if (err?.name === 'AbortError') return { success: false, error: 'share cancelled' };
      console.warn('[shareARCapture] native share failed, trying download:', err?.message);
    }
  }

  try {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    try { await navigator.clipboard.writeText(shareMetadata.shareUrl); } catch { /* ok */ }
    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('[shareARCapture] download failed:', err?.message);
  }

  try {
    await navigator.clipboard.writeText(shareMetadata.shareUrl);
    return { success: true, method: 'copy-link' };
  } catch {
    return { success: false, error: 'sharing is not available on this device' };
  }
}
