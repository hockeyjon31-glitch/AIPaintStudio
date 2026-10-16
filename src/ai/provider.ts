import type {
  ImageSize,
  ProviderId,
} from '../types';

export interface GenerateOptions {
  prompt: string;
  size: ImageSize;
  style?: string;
  transparent?: boolean;
  n?: number;
}

export interface GenerateResult {
  /** data URLs or remote URLs */
  images: string[];
}

export interface ImageGenerationProvider {
  id: ProviderId;
  label: string;
  generate(opts: GenerateOptions): Promise<GenerateResult>;
}

/** Helper: resolve an image URL/dataURL into a data URL so it can be drawn safely. */
export async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Common prompt-style presets used by the UI. */
export const STYLE_PRESETS: { label: string; suffix: string }[] = [
  { label: 'Game icon', suffix: 'game icon, centered, simple shapes, vibrant colors, clean background, high contrast' },
  { label: 'App icon', suffix: 'app icon, rounded square composition, minimal flat design, centered subject' },
  { label: 'Character', suffix: 'character concept art, full body, clear silhouette, neutral background' },
  { label: 'Creature', suffix: 'creature design, fantasy concept art, detailed, neutral background' },
  { label: 'Vehicle', suffix: 'vehicle concept design, side view, clean lines, neutral background' },
  { label: 'Flat vector', suffix: 'flat vector illustration, bold colors, no gradients, minimal detail' },
  { label: 'Pixel art', suffix: 'pixel art, 16-bit style, crisp pixels' },
  { label: 'None', suffix: '' },
];
