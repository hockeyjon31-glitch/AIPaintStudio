import type { Layer } from '../types';
import { ICON_SIZES } from '../types';

/** Composite all visible layers into one canvas. */
export function flatten(layers: Layer[], width: number, height: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d')!;
  for (const l of layers) {
    if (!l.visible) continue;
    ctx.save();
    ctx.globalAlpha = l.opacity;
    ctx.globalCompositeOperation = l.blend as GlobalCompositeOperation;
    if (l.kind === 'text' && l.text) {
      ctx.font = `${l.text.fontSize}px ${l.text.fontFamily}`;
      ctx.fillStyle = l.text.fill;
      ctx.fillText(l.text.value, l.text.x, l.text.y + l.text.fontSize);
    } else {
      ctx.drawImage(l.canvas, 0, 0);
    }
    ctx.restore();
  }
  return out;
}

function download(canvas: HTMLCanvasElement, filename: string) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

export function exportPNG(layers: Layer[], width: number, height: number, filename = 'artwork.png') {
  download(flatten(layers, width, height), filename);
}

export function exportJPEG(layers: Layer[], width: number, height: number, filename = 'artwork.jpg') {
  const flat = flatten(layers, width, height);
  // JPEG has no alpha: paint white background first
  const bg = document.createElement('canvas');
  bg.width = width;
  bg.height = height;
  const ctx = bg.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(flat, 0, 0);
  const a = document.createElement('a');
  a.download = filename;
  a.href = bg.toDataURL('image/jpeg', 0.92);
  a.click();
}

/** Export a transparent icon at the given size (aspect-fit, centered). */
export function exportIcon(
  layers: Layer[],
  width: number,
  height: number,
  size: number,
  filename?: string
) {
  const flat = flatten(layers, width, height);
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  const scale = Math.min(size / width, size / height);
  const w = width * scale;
  const h = height * scale;
  ctx.drawImage(flat, (size - w) / 2, (size - h) / 2, w, h);
  download(out, filename ?? `icon-${size}.png`);
}

export function exportIconSet(layers: Layer[], width: number, height: number, baseName = 'icon') {
  for (const size of ICON_SIZES) exportIcon(layers, width, height, size, `${baseName}-${size}.png`);
}
