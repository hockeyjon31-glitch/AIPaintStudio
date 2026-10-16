import { useEffect } from 'react';
import TopMenuBar from './components/TopMenuBar';
import ToolPalette from './components/ToolPalette';
import CanvasStage from './components/CanvasStage';
import LayersPanel from './components/LayersPanel';
import PropertiesPanel from './components/PropertiesPanel';
import AIPromptPanel from './components/AIPromptPanel';
import { initDocument, useEditor } from './store/editorStore';
import type { ToolId } from './types';

const KEY_TOOLS: Record<string, ToolId> = {
  b: 'brush',
  e: 'eraser',
  l: 'line',
  r: 'rect',
  o: 'ellipse',
  f: 'fill',
  i: 'eyedropper',
  t: 'text',
  s: 'select',
};

export default function App() {
  useEffect(() => {
    initDocument();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
        return;
      const store = useEditor.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) void store.redo();
        else void store.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        store.setSelection(null);
        return;
      }
      const t = KEY_TOOLS[e.key.toLowerCase()];
      if (t && !e.ctrlKey && !e.metaKey && !e.altKey) store.setTool(t);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <TopMenuBar />
      <div className="app-body">
        <ToolPalette />
        <CanvasStage />
        <div className="right-panels">
          <LayersPanel />
          <PropertiesPanel />
          <AIPromptPanel />
        </div>
      </div>
    </div>
  );
}
