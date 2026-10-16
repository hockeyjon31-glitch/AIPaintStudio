import { useEffect, useRef, useState } from 'react';
import { Stage, Layer as KonvaLayer, Rect, Image as KonvaImage, Text, Line } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject, Filter } from 'konva/lib/Node';
import { useEditor } from '../store/editorStore';
import type { ToolId } from '../types';

function useLayerImage(canvas: HTMLCanvasElement | undefined, version: number) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!canvas) {
      setImg(null);
      return;
    }
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = canvas.toDataURL();
  }, [canvas, version]);
  return img;
}

function LayerNode({
  layer,
  version,
  onTextDragEnd,
}: {
  layer: ReturnType<typeof useEditor.getState>['layers'][number];
  version: number;
  onTextDragEnd: (id: string, x: number, y: number) => void;
}) {
  const img = useLayerImage(layer.canvas, version);
  const { width, height } = useEditor();
  const filters = layer.filters;
  const konvaFilters: Filter[] = [];
  if (filters.blur > 0) konvaFilters.push(Konva.Filters.Blur);
  if (filters.brightness !== 0 || filters.contrast !== 0) konvaFilters.push(Konva.Filters.Brighten);
  if (filters.contrast !== 0) konvaFilters.push(Konva.Filters.Contrast);
  if (filters.grayscale) konvaFilters.push(Konva.Filters.Grayscale);
  if (filters.invert) konvaFilters.push(Konva.Filters.Invert);

  if (!layer.visible) return null;

  if (layer.kind === 'text' && layer.text) {
    return (
      <Text
        text={layer.text.value}
        x={layer.text.x}
        y={layer.text.y}
        fontSize={layer.text.fontSize}
        fontFamily={layer.text.fontFamily}
        fill={layer.text.fill}
        draggable
        opacity={layer.opacity}
        globalCompositeOperation={layer.blend}
        onDragEnd={(e) => onTextDragEnd(layer.id, e.target.x(), e.target.y())}
      />
    );
  }

  return (
    <KonvaImage
      image={img ?? undefined}
      width={width}
      height={height}
      opacity={layer.opacity}
      globalCompositeOperation={layer.blend}
      filters={konvaFilters as never}
      blurRadius={filters.blur}
      brightness={filters.brightness}
      contrast={filters.contrast}
      listening={false}
      ref={(node) => {
        if (node && konvaFilters.length > 0) node.cache();
      }}
    />
  );
}

export default function CanvasStage() {
  const stageRef = useRef<Konva.Stage>(null);
  const editor = useEditor();
  const [version, setVersion] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [preview, setPreview] = useState<{
    tool: ToolId;
    x: number;
    y: number;
    w: number;
    h: number;
    points: number[];
  } | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const panStart = useRef<{ x: number; y: number } | null>(null);

  // bump render version whenever layers array identity changes
  useEffect(() => {
    setVersion((v) => v + 1);
  }, [editor.layers, editor.width, editor.height]);

  const getPos = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current!;
    const pos = stage.getPointerPosition()!;
    return { x: pos.x / editor.zoom, y: pos.y / editor.zoom };
  };

  const floodFill = (x: number, y: number) => {
    const layer = editor.getActiveLayer();
    if (!layer || layer.locked) return;
    const ctx = layer.canvas.getContext('2d')!;
    const { width, height } = layer.canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const px = Math.floor(x);
    const py = Math.floor(y);
    const startIdx = (py * width + px) * 4;
    const target = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]];

    // parse brush color to rgb
    const c = document.createElement('canvas').getContext('2d')!;
    c.fillStyle = editor.brushColor;
    const rgbStr = c.fillStyle as string;
    const m = rgbStr.match(/\d+/g)!;
    const fill = [Number(m[0]), Number(m[1]), Number(m[2]), 255];

    if (
      target[0] === fill[0] &&
      target[1] === fill[1] &&
      target[2] === fill[2] &&
      target[3] === fill[3]
    )
      return;

    const match = (i: number) =>
      data[i] === target[0] &&
      data[i + 1] === target[1] &&
      data[i + 2] === target[2] &&
      data[i + 3] === target[3];

    const stack: number[] = [px, py];
    while (stack.length) {
      const cy = stack.pop()!;
      const cx = stack.pop()!;
      if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
      const i = (cy * width + cx) * 4;
      if (!match(i)) continue;
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
      data[i + 3] = fill[3];
      stack.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
    }
    ctx.putImageData(imageData, 0, 0);
    setVersion((v) => v + 1);
    editor.pushHistory('Fill');
  };

  const pickColor = (x: number, y: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const layer = editor.getActiveLayer();
    if (!layer) return;
    const d = layer.canvas.getContext('2d')!.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    if (d[3] === 0) return;
    const hex = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    editor.setBrushColor(hex);
  };

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const layer = editor.getActiveLayer();
    if (!layer || layer.locked) return;
    const ctx = layer.canvas.getContext('2d')!;
    ctx.save();
    ctx.globalAlpha = editor.brushOpacity;
    ctx.strokeStyle = editor.tool === 'eraser' ? 'rgba(0,0,0,1)' : editor.brushColor;
    ctx.globalCompositeOperation = editor.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineWidth = editor.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
    setVersion((v) => v + 1);
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const pos = getPos(e);
    lastPos.current = pos;
    switch (editor.tool) {
      case 'brush':
      case 'eraser':
        drawSegment(pos, pos);
        setDrawing(true);
        break;
      case 'fill':
        floodFill(pos.x, pos.y);
        break;
      case 'eyedropper':
        pickColor(pos.x, pos.y);
        break;
      case 'select':
        setPreview({ tool: 'select', x: pos.x, y: pos.y, w: 0, h: 0, points: [] });
        break;
      case 'rect':
      case 'ellipse':
      case 'line':
        setPreview({ tool: editor.tool, x: pos.x, y: pos.y, w: 0, h: 0, points: [pos.x, pos.y] });
        break;
      case 'text': {
        const layer = editor.getActiveLayer();
        const value = window.prompt('Text:');
        if (value && layer) {
          editor.updateLayer(layer.id, {
            kind: 'text',
            text: {
              value,
              x: pos.x,
              y: pos.y,
              fontSize: Math.max(16, editor.brushSize * 4),
              fontFamily: 'Arial',
              fill: editor.brushColor,
            },
          });
        }
        break;
      }
      default:
        break;
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const pos = getPos(e);
    if (editor.tool === 'brush' || editor.tool === 'eraser') {
      if (drawing && lastPos.current) {
        drawSegment(lastPos.current, pos);
        lastPos.current = pos;
      }
      return;
    }
    if (preview) {
      if (preview.tool === 'select' || preview.tool === 'rect' || preview.tool === 'ellipse') {
        setPreview({ ...preview, w: pos.x - preview.x, h: pos.y - preview.y });
      } else if (preview.tool === 'line') {
        setPreview({ ...preview, points: [preview.x, preview.y, pos.x, pos.y] });
      }
    }
  };

  const handleMouseUp = () => {
    if (editor.tool === 'brush' || editor.tool === 'eraser') {
      if (drawing) {
        setDrawing(false);
        editor.pushHistory(editor.tool === 'brush' ? 'Brush' : 'Erase');
      }
      return;
    }
    if (!preview) return;
    const layer = editor.getActiveLayer();
    const ctx = layer?.canvas.getContext('2d');
    const norm = {
      x: Math.min(preview.x, preview.x + preview.w),
      y: Math.min(preview.y, preview.y + preview.h),
      w: Math.abs(preview.w),
      h: Math.abs(preview.h),
    };
    if (ctx) {
      ctx.save();
      ctx.globalAlpha = editor.brushOpacity;
      ctx.strokeStyle = editor.brushColor;
      ctx.lineWidth = editor.brushSize;
      if (preview.tool === 'rect') {
        ctx.strokeRect(norm.x, norm.y, norm.w, norm.h);
      } else if (preview.tool === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(
          preview.x + preview.w / 2,
          preview.y + preview.h / 2,
          norm.w / 2,
          norm.h / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      } else if (preview.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(preview.points[0], preview.points[1]);
        ctx.lineTo(preview.points[2], preview.points[3]);
        ctx.stroke();
      }
      ctx.restore();
      if (preview.tool === 'select') {
        editor.setSelection(
          norm.w > 0 && norm.h > 0
            ? { x: norm.x, y: norm.y, width: norm.w, height: norm.h }
            : null
        );
      } else {
        editor.pushHistory(preview.tool);
      }
    }
    setPreview(null);
  };

  // wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const dir = e.deltaY > 0 ? -0.1 : 0.1;
      editor.setZoom(editor.zoom + dir);
    }
  };

  const onTextDragEnd = (id: string, x: number, y: number) => {
    const layer = editor.layers.find((l) => l.id === id);
    if (layer?.text) {
      editor.updateLayer(id, { text: { ...layer.text, x, y } });
    }
  };

  return (
    <div
      className="canvas-area"
      onWheel={handleWheel}
      style={{ background: '#2a2a35' }}
    >
      <Stage
        ref={stageRef}
        width={editor.width * editor.zoom}
        height={editor.height * editor.zoom}
        scaleX={editor.zoom}
        scaleY={editor.zoom}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          boxShadow: '0 0 0 1px #555, 0 8px 40px rgba(0,0,0,0.5)',
          background:
            'repeating-conic-gradient(#3a3a48 0% 25%, #33333f 0% 50%) 50% / 24px 24px',
          cursor: editor.tool === 'move' ? 'move' : 'crosshair',
        }}
      >
        {editor.layers.map((layer) => (
          <KonvaLayer
            key={layer.id + version}
            opacity={layer.opacity}
            globalCompositeOperation={layer.blend === 'source-over' ? undefined : layer.blend}
          >
            <LayerNode layer={layer} version={version} onTextDragEnd={onTextDragEnd} />
          </KonvaLayer>
        ))}
        {preview && (preview.tool === 'select' || preview.tool === 'rect') && (
          <KonvaLayer>
            <Rect
              x={Math.min(preview.x, preview.x + preview.w)}
              y={Math.min(preview.y, preview.y + preview.h)}
              width={Math.abs(preview.w)}
              height={Math.abs(preview.h)}
              stroke={preview.tool === 'select' ? '#4fc3f7' : editor.brushColor}
              dash={[4, 4]}
              strokeWidth={1 / editor.zoom}
            />
          </KonvaLayer>
        )}
        {preview?.tool === 'ellipse' && (
          <KonvaLayer>
            <Rect
              x={Math.min(preview.x, preview.x + preview.w)}
              y={Math.min(preview.y, preview.y + preview.h)}
              width={Math.abs(preview.w)}
              height={Math.abs(preview.h)}
              stroke={editor.brushColor}
              dash={[4, 4]}
              strokeWidth={1 / editor.zoom}
              cornerRadius={Math.min(Math.abs(preview.w), Math.abs(preview.h)) / 2}
            />
          </KonvaLayer>
        )}
        {preview?.tool === 'line' && (
          <KonvaLayer>
            <Line
              points={preview.points}
              stroke={editor.brushColor}
              strokeWidth={editor.brushSize}
              lineCap="round"
            />
          </KonvaLayer>
        )}
      </Stage>
      <div className="zoom-badge">{Math.round(editor.zoom * 100)}%</div>
    </div>
  );
}
