export type MarkerGenerationOptions = {
  patternRatio: number;
  imageSize: number;
  borderColor: string;
};

export type GeneratedMarkerResult = {
  canvas: HTMLCanvasElement;
  blob: Blob;
  dataUrl: string;
  pattContent: string;
};

export async function generateCompleteMarker(
  imageFile: File,
  options: MarkerGenerationOptions
): Promise<GeneratedMarkerResult> {
  const size = Math.max(128, Math.min(2048, options.imageSize || 512));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('failed to create canvas context');

  ctx.fillStyle = options.borderColor || '#000000';
  ctx.fillRect(0, 0, size, size);

  const ratio = Math.max(0.1, Math.min(0.9, options.patternRatio || 0.5));
  const inner = Math.floor(size * ratio);
  const pad = Math.floor((size - inner) / 2);

  const dataUrl = await fileToDataUrl(imageFile);
  const img = await loadImage(dataUrl);
  ctx.drawImage(img, pad, pad, inner, inner);

  const pngBlob = await canvasToBlob(canvas);
  const pngDataUrl = canvas.toDataURL('image/png');

  // simple deterministic text payload for local patt downloads
  const pattContent = [
    '# generated marker pattern',
    `# size=${size}`,
    `# ratio=${ratio}`,
    `# source=${imageFile.name}`,
  ].join('\n');

  return { canvas, blob: pngBlob, dataUrl: pngDataUrl, pattContent };
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

export function downloadPattFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  downloadFile(blob, filename);
}

export function downloadMarkerBundle(
  markerBlob: Blob,
  pattContent: string,
  baseName: string
): void {
  // lightweight fallback: download both files separately
  downloadFile(markerBlob, `${baseName || 'marker'}.png`);
  downloadPattFile(pattContent, `${baseName || 'marker'}.patt`);
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('failed to create marker blob'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('failed reading image'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed loading image'));
    img.src = src;
  });
}
