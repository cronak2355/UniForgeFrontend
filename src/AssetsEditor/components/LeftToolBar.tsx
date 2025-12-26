// src/AssetsEditor/components/LeftToolbar.tsx

import { useAssetsEditor } from '../context/AssetsEditorContext';

export function LeftToolbar() {
  const { 
    currentTool, 
    setCurrentTool, 
    currentColor, 
    setCurrentColor,
    pixelSize,
    setPixelSize,
    clearCanvas 
  } = useAssetsEditor();

  const tools = [
    { id: 'brush', icon: '✏️', label: 'Pen (P)' },
    { id: 'eraser', icon: '⌫', label: 'Eraser (E)' },
    { id: 'eyedropper', icon: '💧', label: 'Picker (O)' },
    { id: 'bucket', icon: '🪣', label: 'Fill (B)' },
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
    <div className="w-[200px] bg-black border-r border-neutral-800 flex flex-col">
      {/* Frame Preview */}
      <div className="p-3 border-b border-neutral-800">
        <div className="text-xs text-neutral-500 mb-2">Frames</div>
        <div className="border border-[#2563eb] bg-neutral-900 aspect-square flex items-center justify-center mb-2">
          <div className="w-16 h-16 bg-neutral-800 flex items-center justify-center">
            <div className="w-6 h-6 bg-[#2563eb] flex items-center justify-center">
              <span className="text-white text-xs font-bold">U</span>
            </div>
          </div>
        </div>
        <button className="w-full py-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center gap-1 text-neutral-400 hover:text-white transition-colors">
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

      {/* Color */}
      <div className="p-3 flex-1">
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
          Clear
        </button>
      </div>
    </div>
  );
}