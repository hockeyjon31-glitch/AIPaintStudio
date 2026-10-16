import { useRef } from 'react';
import { useEditor } from '../store/editorStore';
import { exportPNG, exportJPEG, exportIcon, exportIconSet } from '../utils/export';

export default function TopMenuBar() {
  const { width, height, layers, addLayer, addImageLayer, resizeDocument } = useEditor();
  const fileInput = useRef<HTMLInputElement>(null);

  const importImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => void addImageLayer(reader.result as string, file.name);
    reader.readAsDataURL(file);
  };

  return (
    <div className="top-menu">
      <span className="app-name">🎨 AI Paint Studio</span>
      <div className="menu-group">
        <button onClick={() => { addLayer(); }}>New Layer</button>
        <button onClick={() => fileInput.current?.click()}>Import Image</button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importImage(f);
            e.target.value = '';
          }}
        />
        <span className="menu-sep" />
        <button onClick={() => exportPNG(layers, width, height)}>Export PNG</button>
        <button onClick={() => exportJPEG(layers, width, height)}>Export JPEG</button>
        <button onClick={() => exportIcon(layers, width, height, 128)}>Icon 128</button>
        <button onClick={() => exportIconSet(layers, width, height)}>Icon Set (all)</button>
      </div>
      <span className="menu-spacer" />
      <button
        onClick={() => {
          const w = Number(window.prompt('New width (px):', String(width)));
          const h = Number(window.prompt('New height (px):', String(height)));
          if (w > 0 && h > 0) resizeDocument(w, h);
        }}
      >
        Resize
      </button>
    </div>
  );
}
