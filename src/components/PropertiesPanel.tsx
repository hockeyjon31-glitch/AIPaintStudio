import { useEditor } from '../store/editorStore';
import { defaultFilters } from '../types';

export default function PropertiesPanel() {
  const layers = useEditor((s) => s.layers);
  const activeLayerId = useEditor((s) => s.activeLayerId);
  const updateLayer = useEditor((s) => s.updateLayer);
  const width = useEditor((s) => s.width);
  const height = useEditor((s) => s.height);
  const resizeDocument = useEditor((s) => s.resizeDocument);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const history = useEditor((s) => s.history);
  const historyIndex = useEditor((s) => s.historyIndex);

  const active = layers.find((l) => l.id === activeLayerId);
  if (!active) return null;
  const f = active.filters;

  const setFilter = (patch: Partial<typeof f>) =>
    updateLayer(active.id, { filters: { ...f, ...patch } });

  return (
    <div className="panel">
      <div className="panel-title">Adjustments</div>
      <div className="layer-props">
        <div className="prop-row">
          <span>Blur</span>
          <input
            type="range"
            min={0}
            max={40}
            value={f.blur}
            onChange={(e) => setFilter({ blur: Number(e.target.value) })}
          />
          <button className="icon-btn" title="Reset" onClick={() => setFilter({ ...defaultFilters })}>
            ↺
          </button>
        </div>
        <div className="prop-row">
          <span>Brightness</span>
          <input
            type="range"
            min={-100}
            max={100}
            value={f.brightness}
            onChange={(e) => setFilter({ brightness: Number(e.target.value) / 100 })}
          />
        </div>
        <div className="prop-row">
          <span>Contrast</span>
          <input
            type="range"
            min={-100}
            max={100}
            value={f.contrast}
            onChange={(e) => setFilter({ contrast: (Number(e.target.value) + 100) / 100 })}
          />
        </div>
        <div className="prop-row checkboxes">
          <label>
            <input
              type="checkbox"
              checked={f.grayscale}
              onChange={(e) => setFilter({ grayscale: e.target.checked })}
            />
            Grayscale
          </label>
          <label>
            <input
              type="checkbox"
              checked={f.invert}
              onChange={(e) => setFilter({ invert: e.target.checked })}
            />
            Invert
          </label>
        </div>
      </div>

      <div className="panel-title">Document</div>
      <div className="layer-props">
        <div className="prop-row">
          <span>Size</span>
          <span className="dim">{width} × {height}px</span>
        </div>
        <div className="prop-row">
          <select
            defaultValue=""
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number);
              if (w && h) resizeDocument(w, h);
              e.target.value = '';
            }}
          >
            <option value="">Resize to preset…</option>
            <option value="512x512">512 × 512</option>
            <option value="256x256">256 × 256</option>
            <option value="128x128">128 × 128</option>
            <option value="1024x1024">1024 × 1024</option>
          </select>
        </div>
      </div>

      <div className="panel-title">History</div>
      <div className="history-row">
        <button disabled={historyIndex <= 0} onClick={() => void undo()}>
          ↶ Undo
        </button>
        <button
          disabled={historyIndex >= history.length - 1}
          onClick={() => void redo()}
        >
          ↷ Redo
        </button>
        <span className="dim">
          {historyIndex + 1}/{history.length}
        </span>
      </div>
    </div>
  );
}
