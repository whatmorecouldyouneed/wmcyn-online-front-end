import type { ARShareMetadata } from '@/types/arSessions';
import type { ThreeContext } from '@/hooks/useARScene';
import type { ShareResult } from './shareStoryCard';

// output dimensions — instagram story safe size (9:16)
const EXPORT_W = 1080;
const EXPORT_H = 1920;

// overlay metadata passed directly — avoids DOM capture issues with backdrop-filter
export interface OverlayData {
  title?: string;
  description?: string;
  campaign?: string;
  createdAt?: string;
  actions?: Array<{ type: string; label: string; url?: string }>;
}

// ─── compositor ───────────────────────────────────────────────────────────────

// composite the live ar viewport into a story-sized canvas.
// - layer 1: camera video frame (cover-scaled)
// - layer 2: webgl render (cover-scaled, forced re-render to flush back-buffer)
// - layer 3: overlay card redrawn in canvas using exact SCSS values * scale
// returns null if no usable pixels were produced.
export async function compositeARFrame(
  mountEl: HTMLElement,
  overlayData: OverlayData | null,
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

  // black base
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

  // layer 1: camera frame (cover)
  if (hasVideo) {
    const r = coverRect(video!.videoWidth, video!.videoHeight, EXPORT_W, EXPORT_H);
    try { ctx.drawImage(video!, r.drawX, r.drawY, r.drawW, r.drawH); } catch { /* skip */ }
  }

  // layer 2: webgl render
  // force one render call to ensure the back-buffer has the current frame
  if (threeContext) {
    try {
      const { renderer, scene, camera } = threeContext;
      if (renderer && scene && camera) renderer.render(scene, camera);
    } catch { /* renderer may be disposed */ }
  }

  if (hasCanvas) {
    const r = coverRect(glCanvas!.width, glCanvas!.height, EXPORT_W, EXPORT_H);
    try {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(glCanvas!, r.drawX, r.drawY, r.drawW, r.drawH);
    } catch { /* tainted canvas — skip gl layer */ }
  }

  // layer 3: overlay card — drawn in canvas using exact SCSS values, scaled to export size
  if (overlayData) {
    await document.fonts.ready;
    drawOverlayCard(ctx, overlayData);
  }

  return new Promise<Blob | null>((resolve) => {
    exportCanvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
}

// ─── overlay card renderer ────────────────────────────────────────────────────
// mirrors ARMetadataOverlay.module.scss exactly, scaled to 1080x1920.
// the live viewport on phone is typically ~390px wide, so scale ≈ 2.77×.

function drawOverlayCard(ctx: CanvasRenderingContext2D, data: OverlayData) {
  // infer scale from export width vs a reference 390px phone viewport
  const vpW = window.innerWidth || 390;
  const vpH = window.innerHeight || 844;
  const scaleX = EXPORT_W / vpW;
  const scaleY = EXPORT_H / vpH;

  // match SCSS overlay positioning:
  // bottom: 16px, left: 16px, right: 16px (safe-area ignored for simplicity)
  const overlayPad = 16 * scaleX;
  const innerPad = 18 * scaleX;           // .container padding: 18px
  const cardX = overlayPad;
  const cardW = EXPORT_W - overlayPad * 2;
  const scale = scaleX;

  // font sizes from SCSS
  const titleFs = 16 * scale;
  const metaFs = 13 * scale;
  const descFs = 12 * scale;
  const actionFs = 12 * scale;
  const font = 'Outfit, sans-serif';

  // measure content height
  let contentH = innerPad; // top padding

  // header: title
  contentH += titleFs * 1.2; // line height
  contentH += 12 * scale;    // .header margin-bottom

  // metadata rows
  const hasCreatedAt = !!data.createdAt;
  const hasCampaign = !!data.campaign;
  const metaRowH = metaFs + 6 * scale; // font + 6px margin-bottom
  if (hasCreatedAt) contentH += metaRowH;
  if (hasCampaign) contentH += metaRowH;
  if (hasCreatedAt || hasCampaign) contentH += 12 * scale; // .metadata margin-bottom

  // description (max 2 lines, font-size 12 * scale, line-height 1.4)
  const descLineH = descFs * 1.4;
  if (data.description?.trim()) {
    contentH += descLineH * 2;
    contentH += 12 * scale; // margin-bottom
  }

  // actions row — approximate button height
  const actions = data.actions || [];
  if (actions.length > 0) {
    contentH += (actionFs + 8 * scale * 2); // padding-y: 8px each side
  }

  contentH += innerPad; // bottom padding

  const cardH = Math.ceil(contentH);
  const cardY = EXPORT_H - cardH - overlayPad;

  // card background: rgba(0,0,0,0.9), border-radius 16px
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, 16 * scale);
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fill();
  ctx.restore();

  // draw content top-to-bottom
  let y = cardY + innerPad;
  const textX = cardX + innerPad;
  const textRight = cardX + cardW - innerPad;
  const textMaxW = cardW - innerPad * 2;

  // ── title ──
  ctx.save();
  ctx.font = `600 ${titleFs}px ${font}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    truncate((data.title || 'wmcyn ar experience').toLowerCase(), textMaxW, ctx),
    textX, y
  );
  y += titleFs * 1.2 + 12 * scale;
  ctx.restore();

  // ── metadata rows ──
  if (hasCreatedAt || hasCampaign) {
    ctx.save();
    ctx.font = `400 ${metaFs}px ${font}`;
    ctx.textBaseline = 'top';

    if (hasCreatedAt) {
      const formatted = new Date(data.createdAt!).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.textAlign = 'left';
      ctx.fillText('printed:', textX, y);
      ctx.fillStyle = '#ffffff';
      ctx.font = `500 ${metaFs}px ${font}`;
      ctx.textAlign = 'right';
      ctx.fillText(formatted, textRight, y);
      y += metaRowH;
    }

    if (hasCampaign) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.textAlign = 'left';
      ctx.fillText('campaign:', textX, y);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(data.campaign!, textRight, y);
      y += metaRowH;
    }

    ctx.restore();
    y += 12 * scale;
  }

  // ── description ──
  if (data.description?.trim()) {
    ctx.save();
    ctx.font = `400 ${descFs}px ${font}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const desc = data.description.toLowerCase();
    const lines = wrapText(ctx, desc, textMaxW, 2);
    for (const line of lines) {
      ctx.fillText(line, textX, y);
      y += descLineH;
    }

    ctx.restore();
    y += 12 * scale;
  }

  // ── action buttons ──
  if (actions.length > 0) {
    const btnPadX = 12 * scale;
    const btnPadY = 8 * scale;
    const btnRadius = 6 * scale;
    let btnX = textX;
    const btnH = actionFs + btnPadY * 2;

    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (const action of actions) {
      ctx.font = `600 ${actionFs}px ${font}`;
      const labelW = ctx.measureText(action.label).width;
      const btnW = labelW + btnPadX * 2;

      const grad = ctx.createLinearGradient(btnX, y, btnX + btnW, y + btnH);
      if (action.type === 'claim') {
        grad.addColorStop(0, '#667eea');
        grad.addColorStop(1, '#764ba2');
      } else if (action.type === 'share') {
        grad.addColorStop(0, '#8b5cf6');
        grad.addColorStop(1, '#7c3aed');
      } else {
        // purchase / info — muted
        grad.addColorStop(0, '#6b7280');
        grad.addColorStop(1, '#4b5563');
      }

      roundRect(ctx, btnX, y, btnW, btnH, btnRadius);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.fillStyle = action.type === 'purchase' ? '#9ca3af' : '#ffffff';
      ctx.fillText(action.label, btnX + btnW / 2, y + btnH / 2);

      btnX += btnW + 8 * scale;
      if (btnX + 60 * scale > textRight) break; // don't overflow
    }

    ctx.restore();
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// wrap text into at most maxLines lines, truncating the last with '…'
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(' ');
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
      // truncate last line
      while (line.length > 1 && ctx.measureText(line + '…').width > maxW) {
        line = line.slice(0, -1);
      }
      lines.push(line + '…');
    } else {
      lines.push(line);
    }
  } else if (lines.length === maxLines && lines[maxLines - 1]) {
    // truncate last line
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > maxW) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last + '…';
  }

  return lines;
}

// truncate string to fit within maxW pixels
function truncate(s: string, maxW: number, ctx: CanvasRenderingContext2D): string {
  if (ctx.measureText(s).width <= maxW) return s;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) {
    s = s.slice(0, -1);
  }
  return s + '…';
}

function coverRect(
  srcW: number, srcH: number, dstW: number, dstH: number
): { drawX: number; drawY: number; drawW: number; drawH: number } {
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  let drawW: number, drawH: number;
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
  overlayData: OverlayData | null,
  threeContext: ThreeContext | null,
  shareMetadata: ARShareMetadata,
  fallbackBlob: () => Promise<Blob>
): Promise<ShareResult> {
  let blob: Blob | null = null;

  if (mountEl) {
    try {
      blob = await compositeARFrame(mountEl, overlayData, threeContext);
    } catch (err: any) {
      console.warn('[shareARCapture] live capture failed, using fallback:', err?.message);
    }
  }

  if (!blob) {
    try {
      blob = await fallbackBlob();
    } catch (err: any) {
      console.error('[shareARCapture] fallback capture also failed:', err?.message);
    }
  }

  if (!blob) {
    try { await navigator.clipboard.writeText(shareMetadata.shareUrl); } catch { /* ok */ }
    return { success: true, method: 'copy-link' };
  }

  const filename = blob.type === 'image/jpeg' ? 'wmcyn-ar-moment.jpg' : 'wmcyn-ar-moment.png';
  const file = new File([blob], filename, { type: blob.type, lastModified: Date.now() });

  // path 1: native file share
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

  // path 2: download + copy link
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

  // path 3: copy link only
  try {
    await navigator.clipboard.writeText(shareMetadata.shareUrl);
    return { success: true, method: 'copy-link' };
  } catch {
    return { success: false, error: 'sharing is not available on this device' };
  }
}
