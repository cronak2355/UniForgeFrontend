// src/AssetsEditor/components/LeftToolbar.tsx

import { useEffect, useState } from 'react';
import { useAssetsEditor, type Tool } from '../context/AssetsEditorContext';

export function LeftToolbar() {
  const {
    currentTool,
    setCurrentTool,
    currentColor,
    setCurrentColor,
    pixelSize,
    setPixelSize,
    brushSize,
    setBrushSize,
    clearCanvas,
    undo,
    redo,
    canUndo,
    canRedo,
    historyState,
    // Frame
    frames,
    currentFrameIndex,
    maxFrames,
    addFrame,
    deleteFrame,
    duplicateFrame,
    selectFrame,
    getFrameThumbnail,
  } = useAssetsEditor();

  const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);

  useEffect(() => {
    const newThumbnails = frames.map((_, index) => getFrameThumbnail(index));
    setThumbnails(newThumbnails);
  }, [frames, getFrameThumbnail]);

  const tools = [
    { id: 'brush', icon: '✏️', label: 'Pen (P)' },
    { id: 'eraser', icon: '⌫', label: 'Eraser (E)' },
    { id: 'eyedropper', icon: '💧', label: 'Picker (O)' },
    { id: 'fill', icon: '🪣', label: 'Fill (B)' },
  ] as const;

  const rgbaToHex = (color: { r: number; g: number; b: number; a: number }) => {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  };

  const hexToRgba = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: 255,
    } : { r: 0, g: 0, b: 0, a: 255 };
  };

  // Modern Palette Colors
  const paletteColors = [
    '#000000', '#ffffff', '#9ca3af', '#4b5563',
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#3b82f6', '#8b5cf6', '#d946ef',
    '#be185d', '#881337', '#4c1d95', '#1e3a8a',
  ];

  return (
    <div className="h-full flex flex-col w-[260px] ml-4 transition-all duration-300 gap-4">

      {/* 1. Frames (Top Block) */}
      <div className="glass-panel p-4 border border-white/10 bg-black/40 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white/90 uppercase tracking-widest">Frames</h3>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 text-white/60">
            {frames.length} / {maxFrames}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {frames.map((frame, index) => (
            <div
              key={frame.id}
              onClick={() => selectFrame(index)}
              className={`
                        snap-start shrink-0 w-16 h-16 border-2 cursor-pointer relative overflow-hidden group
                        transition-all duration-200
                        ${currentFrameIndex === index ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] z-10' : 'border-white/10 hover:border-white/30'}
                    `}
            >
              <div className="absolute inset-0 bg-[#1a1a1a]"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%)',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 4px 4px'
                }}
              />
              {thumbnails[index] && (
                <img src={thumbnails[index]!} className="absolute inset-0 w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity backdrop-blur-[1px]">
                <button onClick={(e) => { e.stopPropagation(); duplicateFrame(index); }} disabled={frames.length >= maxFrames} className="text-xs text-white hover:text-blue-400 disabled:opacity-50 p-1 hover:bg-white/10">📋</button>
                <button onClick={(e) => { e.stopPropagation(); deleteFrame(index); }} disabled={frames.length <= 1} className="text-xs text-white hover:text-red-400 disabled:opacity-50 p-1 hover:bg-white/10">🗑</button>
              </div>
            </div>
          ))}

          {/* Add Button */}
          <button
            onClick={addFrame}
            disabled={frames.length >= maxFrames}
            className="shrink-0 w-16 h-16 border border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-white/40 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">+</span>
          </button>
        </div>
      </div>

      {/* 2. Tools & Color Picker (Middle Block) */}
      <div className="glass-panel p-4 border border-white/10 bg-black/40 space-y-4 shrink-0">
        {/* Resolution */}
        <div>
          <h3 className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-widest">Resolution</h3>
          <div className="flex gap-1">
            {([128, 256, 512] as const).map(size => (
              <button
                key={size}
                onClick={() => setPixelSize(size)}
                className={`
                  flex-1 py-2 text-[10px] font-bold transition-all border
                  ${pixelSize === size
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white'}
                `}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/5" />

        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Tools</h3>
        <div className="grid grid-cols-4 gap-2">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setCurrentTool(t.id as Tool)}
              className={`
                            aspect-square flex items-center justify-center text-xl transition-all border border-transparent
                            ${currentTool === t.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white hover:border-white/10'}
                        `}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="h-px bg-white/5 my-2" />

        {/* Current Color Input */}
        <div className="flex items-center gap-3 bg-white/5 p-2 border border-white/5">
          <div className="w-8 h-8 shadow-inner border border-white/10" style={{ backgroundColor: rgbaToHex(currentColor) }} />
          <div className="flex-1 relative">
            <input
              type="color"
              value={rgbaToHex(currentColor)}
              onChange={(e) => setCurrentColor(hexToRgba(e.target.value))}
              className="w-full h-6 bg-transparent cursor-pointer opacity-0 absolute inset-0 z-10"
            />
            <div className="text-xs font-mono text-white/60 uppercase pointer-events-none">{rgbaToHex(currentColor)}</div>
          </div>
        </div>
      </div>

      {/* 3. Palette & Brush (Bottom Block) */}
      <div className="glass-panel p-4 border border-white/10 bg-black/40 flex-1 overflow-y-auto space-y-6">

        {/* Palette */}
        <div>
          <h3 className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-widest">Palette</h3>
          <div className="grid grid-cols-6 gap-2">
            {paletteColors.map(c => (
              <button
                key={c}
                onClick={() => setCurrentColor(hexToRgba(c))}
                className="w-full aspect-square border border-white/10 hover:scale-110 transition-transform shadow-sm hover:border-white/50"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>



        {/* Brush Size */}
        <div>
          <div className="flex justify-between mb-2">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Size</h3>
            <span className="text-xs text-blue-400 font-mono">{brushSize}px</span>
          </div>
          <input
            type="range"
            min="1" max="16"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full h-1 bg-white/10 appearance-none cursor-pointer"
          />
        </div>

        {/* History & Actions */}
        <div className="space-y-2 pt-4 border-t border-white/5">
          <div className="flex gap-2">
            <button
              onClick={undo} disabled={!canUndo}
              className="flex-1 py-2 bg-white/5 text-xs text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              Undo
            </button>
            <button
              onClick={redo} disabled={!canRedo}
              className="flex-1 py-2 bg-white/5 text-xs text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              Redo
            </button>
          </div>

          <button
            onClick={clearCanvas}
            className="w-full py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all text-xs"
          >
            Clear
          </button>
        </div>

      </div>

    </div>
  );
}
