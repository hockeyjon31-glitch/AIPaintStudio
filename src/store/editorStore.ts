import { create } from 'zustand';
import type {
  HistoryEntry,
  Layer,
  LayerSnapshot,
  ToolId,
} from '../types';
import { defaultFilters } from '../types';

export const DEFAULT_WIDTH = 512;
export const DEFAULT_HEIGHT = 512;

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

function makeLayer(
  name: string,
  width: number,
  height: number,
  index: number
): Layer {
  return {
    id: crypto.randomUUID(),
    name,
    canvas: makeCanvas(width, height),
    visible: true,
    locked: false,
    opacity: 1,
    blend: 'source-over',
    filters: { ...defaultFilters },
    kind: 'raster',
  };
}

function cloneLayerCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height);
  c.getContext('2d')!.drawImage(src, 0, 0);
  return c;
}

function snapshotLayer(l: Layer): LayerSnapshot {
  return {
    id: l.id,
    name: l.name,
    visible: l.visible,
    locked: l.locked,
    opacity: l.opacity,
    blend: l.blend,
    filters: { ...l.filters },
    kind: l.kind,
    text: l.text ? { ...l.text } : undefined,
    dataURL: l.canvas.toDataURL(),
  };
}

function restoreLayer(s: LayerSnapshot): Promise<Layer> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = makeCanvas(img.width, img.height);
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve({
        id: s.id,
        name: s.name,
        canvas,
        visible: s.visible,
        locked: s.locked,
        opacity: s.opacity,
        blend: s.blend,
        filters: { ...s.filters },
        kind: s.kind,
        text: s.text ? { ...s.text } : undefined,
      });
    };
    img.src = s.dataURL;
  });
}

export interface EditorState {
  width: number;
  height: number;
  layers: Layer[]; // bottom-to-top order
  activeLayerId: string | null;
  tool: ToolId;
  brushColor: string;
  brushSize: number;
  brushOpacity: number;
  zoom: number;
  history: HistoryEntry[];
  historyIndex: number;
  selection: { x: number; y: number; width: number; height: number } | null;

  setTool: (t: ToolId) => void;
  setBrushColor: (c: string) => void;
  setBrushSize: (n: number) => void;
  setBrushOpacity: (n: number) => void;
  setZoom: (z: number) => void;
  setSelection: (sel: EditorState['selection']) => void;

  getActiveLayer: () => Layer | undefined;
  addLayer: () => void;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  selectLayer: (id: string) => void;
  moveLayer: (id: string, dir: -1 | 1) => void;
  updateLayer: (id: string, patch: Partial<Omit<Layer, 'canvas' | 'id'>>) => void;

  pushHistory: (label: string) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  addImageLayer: (dataUrl: string, name?: string) => Promise<void>;
  resizeDocument: (w: number, h: number) => void;
}

export const useEditor = create<EditorState>((set, get) => ({
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  layers: [],
  activeLayerId: null,
  tool: 'brush',
  brushColor: '#1e88e5',
  brushSize: 8,
  brushOpacity: 1,
  zoom: 1,
  history: [],
  historyIndex: -1,
  selection: null,

  setTool: (t) => set({ tool: t }),
  setBrushColor: (c) => set({ brushColor: c }),
  setBrushSize: (n) => set({ brushSize: n }),
  setBrushOpacity: (n) => set({ brushOpacity: n }),
  setZoom: (z) => set({ zoom: Math.min(8, Math.max(0.1, z)) }),
  setSelection: (sel) => set({ selection: sel }),

  getActiveLayer: () => {
    const { layers, activeLayerId } = get();
    return layers.find((l) => l.id === activeLayerId);
  },

  addLayer: () => {
    const { layers, width, height } = get();
    const layer = makeLayer(`Layer ${layers.length + 1}`, width, height, layers.length);
    set({ layers: [...layers, layer], activeLayerId: layer.id });
    get().pushHistory('Add layer');
  },

  deleteLayer: (id) => {
    const { layers } = get();
    if (layers.length <= 1) return;
    const idx = layers.findIndex((l) => l.id === id);
    const next = layers.filter((l) => l.id !== id);
    set({
      layers: next,
      activeLayerId: next[Math.min(idx, next.length - 1)]?.id ?? null,
    });
    get().pushHistory('Delete layer');
  },

  duplicateLayer: (id) => {
    const { layers } = get();
    const idx = layers.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const src = layers[idx];
    const copy: Layer = {
      ...src,
      id: crypto.randomUUID(),
      name: `${src.name} copy`,
      canvas: cloneLayerCanvas(src.canvas),
      filters: { ...src.filters },
      text: src.text ? { ...src.text } : undefined,
    };
    const next = [...layers];
    next.splice(idx + 1, 0, copy);
    set({ layers: next, activeLayerId: copy.id });
    get().pushHistory('Duplicate layer');
  },

  selectLayer: (id) => set({ activeLayerId: id }),

  moveLayer: (id, dir) => {
    const { layers } = get();
    const idx = layers.findIndex((l) => l.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= layers.length) return;
    const next = [...layers];
    [next[idx], next[target]] = [next[target], next[idx]];
    set({ layers: next });
    get().pushHistory('Reorder layers');
  },

  updateLayer: (id, patch) => {
    set({
      layers: get().layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
    get().pushHistory('Layer properties');
  },

  pushHistory: (label) => {
    const { layers, history, historyIndex } = get();
    const entry: HistoryEntry = {
      label,
      layers: layers.map(snapshotLayer),
    };
    const trimmed = history.slice(0, historyIndex + 1);
    trimmed.push(entry);
    // cap history at 30 entries to limit memory
    const capped = trimmed.slice(-30);
    set({ history: capped, historyIndex: capped.length - 1 });
  },

  undo: async () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    await applyHistory(get, set, historyIndex - 1);
  },

  redo: async () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    await applyHistory(get, set, historyIndex + 1);
  },

  addImageLayer: async (dataUrl, name) => {
    const { width, height, layers } = get();
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });
    const canvas = makeCanvas(width, height);
    const scale = Math.min(width / img.width, height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    const layer: Layer = {
      id: crypto.randomUUID(),
      name: name ?? `Image ${layers.length + 1}`,
      canvas,
      visible: true,
      locked: false,
      opacity: 1,
      blend: 'source-over',
      filters: { ...defaultFilters },
      kind: 'raster',
    };
    set({ layers: [...layers, layer], activeLayerId: layer.id });
    get().pushHistory('Insert image');
  },

  resizeDocument: (w, h) => {
    const resized = get().layers.map((l) => {
      const canvas = makeCanvas(w, h);
      canvas.getContext('2d')!.drawImage(l.canvas, 0, 0);
      return { ...l, canvas };
    });
    set({ width: w, height: h, layers: resized });
    get().pushHistory('Resize document');
  },
}));

async function applyHistory(
  get: () => EditorState,
  set: (partial: Partial<EditorState>) => void,
  index: number
) {
  const entry = get().history[index];
  const layers = await Promise.all(entry.layers.map(restoreLayer));
  set({
    layers,
    historyIndex: index,
    activeLayerId: layers[layers.length - 1]?.id ?? null,
  });
}

/** Initialize a fresh document with one layer + baseline history entry. */
export function initDocument(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
  const layer = makeLayer('Background', width, height, 0);
  useEditor.setState({
    width,
    height,
    layers: [layer],
    activeLayerId: layer.id,
    history: [],
    historyIndex: -1,
  });
  useEditor.getState().pushHistory('New document');
}
