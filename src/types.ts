export type ProviderId = 'pollinations' | 'openai' | 'gemini' | 'huggingface' | 'cloudflare' | 'comfyui' | 'sdwebui' | 'custom';
export type ImageSize = '256x256' | '512x512' | '1024x1024';

export type ToolId =
  | 'brush'
  | 'eraser'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'fill'
  | 'eyedropper'
  | 'move'
  | 'text'
  | 'select';

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export type FilterSettings = {
  blur: number;
  brightness: number;
  contrast: number;
  grayscale: boolean;
  invert: boolean;
};

export const defaultFilters: FilterSettings = {
  blur: 0,
  brightness: 0,
  contrast: 0,
  grayscale: false,
  invert: false,
};

/** A raster layer keeps its own offscreen canvas (pixel data). */
export interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blend: BlendMode;
  filters: FilterSettings;
  /** For text layers */
  kind: 'raster' | 'text';
  text?: {
    value: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    fill: string;
  };
}

export interface HistoryEntry {
  label: string;
  layers: LayerSnapshot[];
}

export type LayerSnapshot = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blend: BlendMode;
  filters: FilterSettings;
  kind: 'raster' | 'text';
  text?: Layer['text'];
  dataURL: string;
};

export const ICON_SIZES = [16, 32, 64, 128, 256] as const;
