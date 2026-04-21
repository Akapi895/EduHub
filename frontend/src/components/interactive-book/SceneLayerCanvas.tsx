import { memo, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { InteractiveLayer } from '@/types';

interface SceneLayerCanvasProps {
  layers: InteractiveLayer[];
  backgroundUrl?: string;
  selectedLayerId?: string | null;
  disabled?: boolean;
  onSelectLayer: (layerId: string) => void;
  onCommitLayerPosition: (layerId: string, position: { x: number; y: number }) => void;
}

interface LayerViewProps {
  layer: InteractiveLayer;
  selected: boolean;
  disabled?: boolean;
  previewPosition?: { x: number; y: number };
  onPointerDown: (event: PointerEvent<HTMLButtonElement>, layer: InteractiveLayer) => void;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

const LayerView = memo(function LayerView({
  layer,
  selected,
  disabled,
  previewPosition,
  onPointerDown,
}: LayerViewProps) {
  const x = previewPosition?.x ?? layer.x;
  const y = previewPosition?.y ?? layer.y;
  const width = Math.max(6, layer.width || 18);
  const height = Math.max(5, layer.height || 10);
  const layerText = layer.text || (layer.type === 'button' ? 'Button' : layer.type);

  return (
    <button
      type="button"
      onPointerDown={(event) => onPointerDown(event, layer)}
      className={`absolute select-none overflow-hidden border px-2 py-1 text-xs shadow-sm ${
        selected
          ? 'border-sky-400 bg-sky-50 text-sky-950 ring-2 ring-sky-200'
          : 'border-white/80 bg-white/90 text-slate-800'
      } ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      style={{
        left: `${clampPercent(x)}%`,
        top: `${clampPercent(y)}%`,
        width: `${width}%`,
        height: `${height}%`,
        zIndex: layer.z_index ?? 1,
        touchAction: 'none',
      }}
    >
      <div className="flex h-full items-center justify-center text-center leading-tight">
        {layer.type === 'image' && layer.url ? (
          <img src={layer.url} alt={layerText} className="h-full w-full object-cover" />
        ) : (
          <span>{layerText}</span>
        )}
      </div>
    </button>
  );
});

export default function SceneLayerCanvas({
  layers,
  backgroundUrl,
  selectedLayerId,
  disabled,
  onSelectLayer,
  onCommitLayerPosition,
}: SceneLayerCanvasProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    layerId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const previewPositionRef = useRef<Record<string, { x: number; y: number }>>({});
  const rafRef = useRef<number | null>(null);
  const [previewTick, setPreviewTick] = useState(0);

  const layerById = useMemo(
    () => new Map(layers.map((layer) => [layer.id, layer])),
    [layers],
  );

  const schedulePreview = () => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      setPreviewTick((current) => current + 1);
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, layer: InteractiveLayer) => {
    onSelectLayer(layer.id);
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      layerId: layer.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layer.x,
      startY: layer.y,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !canvasRef.current || disabled) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((event.clientX - dragRef.current.startClientX) / Math.max(1, rect.width)) * 100;
    const deltaY = ((event.clientY - dragRef.current.startClientY) / Math.max(1, rect.height)) * 100;
    previewPositionRef.current[dragRef.current.layerId] = {
      x: clampPercent(dragRef.current.startX + deltaX),
      y: clampPercent(dragRef.current.startY + deltaY),
    };
    schedulePreview();
  };

  const finishDrag = () => {
    const currentDrag = dragRef.current;
    if (!currentDrag) return;
    const finalPosition = previewPositionRef.current[currentDrag.layerId];
    dragRef.current = null;
    delete previewPositionRef.current[currentDrag.layerId];
    setPreviewTick((current) => current + 1);

    const originalLayer = layerById.get(currentDrag.layerId);
    if (!finalPosition || !originalLayer) return;
    if (Math.abs(finalPosition.x - originalLayer.x) < 0.01 && Math.abs(finalPosition.y - originalLayer.y) < 0.01) {
      return;
    }
    onCommitLayerPosition(currentDrag.layerId, finalPosition);
  };

  return (
    <div
      ref={canvasRef}
      className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      {backgroundUrl ? (
        <img src={backgroundUrl} alt="Scene background" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
          No scene background selected
        </div>
      )}

      {layers.map((layer) => (
        <LayerView
          key={layer.id}
          layer={layer}
          selected={layer.id === selectedLayerId}
          disabled={disabled}
          previewPosition={previewPositionRef.current[layer.id]}
          onPointerDown={handlePointerDown}
        />
      ))}
    </div>
  );
}
