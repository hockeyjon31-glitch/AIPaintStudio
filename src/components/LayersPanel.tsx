import { useState } from 'react';
import { useEditor } from '../store/editorStore';
import type { BlendMode } from '../types';

const BLEND_MODES: BlendMode[] = [
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
];

export default function LayersPanel() {
  const layers = useEditor((s) => s.layers);
  const activeLayerId = useEditor((s) => s.activeLayerId);
  const selectLayer = useEditor((s) => s.selectLayer);
  const addLayer = useEditor((s) => s.addLayer);
  const deleteLayer = useEditor((s) => s.deleteLayer);
  const duplicateLayer = useEditor((s) => s.duplicateLayer);
  const moveLayer = useEditor((s) => s.moveLayer);
  const updateLayer = useEditor((s) => s.updateLayer);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState('');

  const active = layers.find((l) => l.id === activeLayerId);

  return (
    <div className="panel">
      <div className="panel-title">
        Layers
        <span className="panel-actions">
          <button title="Add layer" onClick={addLayer}>＋</button>
          <button
            title="Duplicate"
            disabled={!active}
            onClick={() => active && duplicateLayer(active.id)}
          >
            ⧉
          </button>
          <button
            title="Delete"
            disabled={layers.length <= 1 || !active}
            onClick={() => active && deleteLayer(active.id)}
          >
            🗑
          </button>
        </span>
      </div>
      <div className="layer-list">
        {[...layers].reverse().map((l) => (
          <div
            key={l.id}
            className={`layer-row ${l.id === activeLayerId ? 'active' : ''}`}
            onClick={() => selectLayer(l.id)}
          >
            <button
              className="icon-btn"
              title="Toggle visibility"
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(l.id, { visible: !l.visible });
              }}
            >
              {l.visible ? '👁' : '–'}
            </button>
            {renaming === l.id ? (
              <input
                autoFocus
                value={name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  updateLayer(l.id, { name: name || l.name });
                  setRenaming(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateLayer(l.id, { name: name || l.name });
                    setRenaming(null);
                  }
                }}
              />
            ) : (
              <span
                className="layer-name"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenaming(l.id);
                  setName(l.name);
                }}
              >
                {l.name}
              </span>
            )}
            <span className="layer-actions">
              <button
                className="icon-btn"
                title="Move up"
                onClick={(e) => {
                  e.stopPropagation();
                  moveLayer(l.id, 1);
                }}
              >
                ▲
              </button>
              <button
                className="icon-btn"
                title="Move down"
                onClick={(e) => {
                  e.stopPropagation();
                  moveLayer(l.id, -1);
                }}
              >
                ▼
              </button>
            </span>
          </div>
        ))}
      </div>
      {active && (
        <div className="layer-props">
          <div className="prop-row">
            <span>Opacity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(active.opacity * 100)}
              onChange={(e) => updateLayer(active.id, { opacity: Number(e.target.value) / 100 })}
            />
          </div>
          <div className="prop-row">
            <span>Blend</span>
            <select
              value={active.blend}
              onChange={(e) => updateLayer(active.id, { blend: e.target.value as BlendMode })}
            >
              {BLEND_MODES.map((b) => (
                <option key={b} value={b}>
                  {b === 'source-over' ? 'normal' : b}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
