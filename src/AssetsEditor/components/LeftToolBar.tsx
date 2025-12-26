// src/AssetsEditor/components/LeftToolbar.tsx

import { useEffect, useState } from 'react';
import { useAssetsEditor } from '../context/AssetsEditorContext';

export function LeftToolbar() {
  const { 
    currentTool, 
    setCurrentTool, 
    currentColor, 
    setCurrentColor,
    pixelSize,
    setPixelSize,
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

  // 썸네일 캐시 (프레임 변경 시 업데이트)
  const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);

  // 프레임 변경 시 썸네일 업데이트
  useEffect(() => {
    const newThumbnails = frames.map((_, index) => getFrameThumbnail(index));
    setThumbnails(newThumbnails);
  }, [frames, getFrameThumbnail]);

  const tools = [
    { id: 'brush', icon: '✏️', label: 'Pen (P)' },
    { id: 'eraser', icon: '⬜', label: 'Eraser (E)' },
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

  return (
    <div className="w-[200px] bg-black border-r border-neutral-800 flex flex-col overflow-hidden">
      {/* Frames Panel */}
      <div className="p-3 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-500">Frames</span>
          <span className="text-[10px] text-neutral-600">{frames.length}/{maxFrames}</span>
        </div>
        
        {/* Frame Thumbnails */}
        <div className="space-y-1.5 mb-2 max-h-[200px] overflow-y-auto">
          {frames.map((frame, index) => (
            <div
              key={frame.id}
              onClick={() => selectFrame(index)}
              className={`group relative flex items-center gap-2 p-1.5 cursor-pointer transition-colors ${
                currentFrameIndex === index
                  ? 'bg-[#2563eb]/20 border border-[#2563eb]'
                  : 'bg-neutral-900 border border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Thumbnail */}
              <div 
                className="w-10 h-10 bg-neutral-800 flex-shrink-0"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #3a3a3a 25%, transparent 25%),
                    linear-gradient(-45deg, #3a3a3a 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #3a3a3a 75%),
                    linear-gradient(-45deg, transparent 75%, #3a3a3a 75%)
                  `,
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                  backgroundColor: '#2a2a2a',
                }}
              >
                {thumbnails[index] && (
                  <img 
                    src={thumbnails[index]!} 
                    alt={`Frame ${index + 1}`}
                    className="w-full h-full"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
              </div>
              
              {/* Frame Info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">Frame {index + 1}</div>
                <div className="text-[10px] text-neutral-500">{pixelSize}×{pixelSize}</div>
              </div>

              {/* Frame Actions (on hover) */}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateFrame(index);
                  }}
                  disabled={frames.length >= maxFrames}
                  className="w-5 h-5 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Duplicate"
                >
                  📋
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFrame(index);
                  }}
                  disabled={frames.length <= 1}
                  className="w-5 h-5 flex items-center justify-center bg-neutral-800 hover:bg-red-900/50 text-[10px] text-neutral-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Frame Button */}
        <button 
          onClick={addFrame}
          disabled={frames.length >= maxFrames}
          className="w-full py-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center gap-1 text-neutral-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-[#3b82f6]">+</span> Add frame
        </button>
      </div>

      {/* Canvas Size */}
      <div className="p-3 border-b border-neutral-800">
        <div className="text-xs text-neutral-500 mb-2">Canvas</div>
        <div className="flex gap-1">
          {([32, 64, 128] as const).map((size) => (
            <button
              key={size}
              onClick={() => setPixelSize(size)}
              className={`flex-1 py-1.5 text-xs transition-colors ${
                pixelSize === size 
                  ? 'bg-[#2563eb] text-white' 
                  : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-neutral-800'
              }`}
            >
              {size}px
            </button>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div className="p-3 border-b border-neutral-800">
        <div className="text-xs text-neutral-500 mb-2">Tools</div>
        <div className="grid grid-cols-4 gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id as typeof currentTool)}
              className={`aspect-square flex items-center justify-center text-sm transition-colors ${
                currentTool === tool.id
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-neutral-800'
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Undo / Redo */}
      <div className="p-3 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-500">History</span>
          <span className="text-[10px] text-neutral-600">
            {historyState.undoCount} / {historyState.redoCount}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`flex-1 py-1.5 text-xs flex items-center justify-center gap-1 transition-colors ${
              canUndo
                ? 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                : 'bg-neutral-900/50 text-neutral-600 border border-neutral-800/50 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <span>↩</span> Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`flex-1 py-1.5 text-xs flex items-center justify-center gap-1 transition-colors ${
              canRedo
                ? 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                : 'bg-neutral-900/50 text-neutral-600 border border-neutral-800/50 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            Redo <span>↪</span>
          </button>
        </div>
      </div>

      {/* Color */}
      <div className="p-3 flex-1 overflow-hidden">
        <div className="text-xs text-neutral-500 mb-2">Color</div>
        
        {/* Current Color Display */}
        <div className="flex gap-2 mb-3">
          <div 
            className="w-10 h-10 border border-neutral-700"
            style={{ backgroundColor: rgbaToHex(currentColor) }}
          />
          <div className="flex-1">
            <input
              type="color"
              value={rgbaToHex(currentColor)}
              onChange={(e) => setCurrentColor(hexToRgba(e.target.value))}
              className="w-full h-10 cursor-pointer bg-neutral-900 border border-neutral-800"
            />
          </div>
        </div>
        
        {/* Color Palette */}
        <div className="grid grid-cols-8 gap-0.5">
          {[
            '#000000', '#ffffff', '#9ca3af', '#6b7280',
            '#ef4444', '#f97316', '#eab308', '#22c55e',
            '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
            '#1e3a8a', '#065f46', '#7c2d12', '#4c1d95',
          ].map((color) => (
            <button
              key={color}
              onClick={() => setCurrentColor(hexToRgba(color))}
              className="aspect-square border border-neutral-800 hover:border-[#3b82f6] transition-colors"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-neutral-800">
        <button
          onClick={clearCanvas}
          className="w-full py-1.5 text-xs bg-neutral-900 hover:bg-red-900/50 border border-neutral-800 hover:border-red-800 text-neutral-400 hover:text-red-400 transition-colors"
        >
          Clear Frame
        </button>
      </div>
    </div>
  );
}