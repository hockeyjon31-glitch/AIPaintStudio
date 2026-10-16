import { useEditor } from '../store/editorStore';
import type { ToolId } from '../types';

const TOOLS: { id: ToolId; label: string; icon: string; key: string }[] = [
  { id: 'brush', label: 'Brush', icon: '🖌️', key: 'B' },
  { id: 'eraser', label: 'Eraser', icon: '🧽', key: 'E' },
  { id: 'line', label: 'Line', icon: '📏', key: 'L' },
  { id: 'rect', label: 'Rectangle', icon: '▭', key: 'R' },
  { id: 'ellipse', label: 'Ellipse', icon: '◯', key: 'O' },
  { id: 'fill', label: 'Flood fill', icon: '🪣', key: 'F' },
  { id: 'eyedropper', label: 'Eyedropper', icon: '💧', key: 'I' },
  { id: 'text', label: 'Text', icon: '🔤', key: 'T' },
  { id: 'select', label: 'Select', icon: '⬚', key: 'S' },
];

export default function ToolPalette() {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const brushColor = useEditor((s) => s.brushColor);
  const setBrushColor = useEditor((s) => s.setBrushColor);
  const brushSize = useEditor((s) => s.brushSize);
  const setBrushSize = useEditor((s) => s.setBrushSize);
  const brushOpacity = useEditor((s) => s.brushOpacity);
  const setBrushOpacity = useEditor((s) => s.setBrushOpacity);

  return (
    <div className="tool-palette">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={`tool-btn ${tool === t.id ? 'active' : ''}`}
          title={`${t.label} (${t.key})`}
          onClick={() => setTool(t.id)}
        >
          <span className="tool-icon">{t.icon}</span>
        </button>
      ))}
      <div className="palette-sep" />
      <label className="color-label">
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
        />
      </label>
      <div className="slider-group">
        <span title="Brush size">Size</span>
        <input
          type="range"
          min={1}
          max={100}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
        <span className="slider-val">{brushSize}</span>
      </div>
      <div className="slider-group">
        <span title="Opacity">Opacity</span>
        <input
          type="range"
          min={5}
          max={100}
          value={Math.round(brushOpacity * 100)}
          onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
        />
        <span className="slider-val">{Math.round(brushOpacity * 100)}%</span>
      </div>
    </div>
  );
}
