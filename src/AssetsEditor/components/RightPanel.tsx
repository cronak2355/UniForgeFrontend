// src/AssetsEditor/components/RightPanel.tsx

import { useState } from 'react';
import { useAssetsEditor } from '../context/AssetsEditorContext';

export function RightPanel() {
  const { currentColor, setCurrentColor, downloadWebP } = useAssetsEditor();
  const [fps, setFps] = useState(12);
  
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
    <div className="w-[220px] bg-black border-l border-neutral-800 flex flex-col">
      {/* Preview */}
      <div className="p-3 border-b border-neutral-800">
        <div className="text-xs text-neutral-500 mb-2">Preview</div>
        <div className="bg-neutral-900 aspect-square flex items-center justify-center border border-neutral-800">
          <div className="w-20 h-20 bg-neutral-800 flex items-center justify-center">
            <span className="text-2xl opacity-30">👁️</span>
          </div>
        </div>
        
        {/* FPS */}
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span className="text-neutral-500 w-14">{fps} FPS</span>
          <input
            type="range"
            min="1"
            max="30"
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
            className="flex-1 h-1 accent-[#3b82f6] bg-neutral-800"
          />
        </div>
      </div>

      {/* Layers */}
      <div className="border-b border-neutral-800">
        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
          <span className="text-xs text-neutral-500">Layers</span>
          <button className="text-[#3b82f6] text-xs hover:text-[#60a5fa]">+ Add</button>
        </div>
        <div className="p-2">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-neutral-900 border border-[#2563eb] text-xs">
            <span className="text-white">Layer 1</span>
            <span className="ml-auto text-neutral-500">👁️</span>
          </div>
        </div>
      </div>

      {/* Transform */}
      <div className="border-b border-neutral-800">
        <div className="px-3 py-2 border-b border-neutral-800">
          <span className="text-xs text-neutral-500">Transform</span>
        </div>
        <div className="p-2 grid grid-cols-4 gap-1">
          {[
            { icon: '↔️', label: 'Flip H' },
            { icon: '↕️', label: 'Flip V' },
            { icon: '↻', label: 'Rotate' },
            { icon: '⊞', label: 'Center' },
          ].map((item) => (
            <button 
              key={item.label}
              className="aspect-square bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-sm text-neutral-400 hover:text-white transition-colors" 
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Palette */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 py-2 border-b border-neutral-800">
          <span className="text-xs text-neutral-500">Palette</span>
        </div>
        <div className="p-2 flex-1 overflow-auto">
          <select className="w-full bg-neutral-900 border border-neutral-800 text-xs py-1.5 px-2 text-neutral-400 mb-2">
            <option>Default</option>
            <option>Game Boy</option>
            <option>NES</option>
            <option>PICO-8</option>
          </select>
          
          <div className="grid grid-cols-8 gap-0.5">
            {[
              '#000000', '#1a1a2e', '#16213e', '#0f3460',
              '#e94560', '#ff6b6b', '#feca57', '#48dbfb',
              '#1dd1a1', '#10ac84', '#5f27cd', '#341f97',
              '#2e86de', '#54a0ff', '#c8d6e5', '#ffffff',
            ].map((color, i) => (
              <button
                key={i}
                onClick={() => setCurrentColor(hexToRgba(color))}
                className="aspect-square border border-neutral-800 hover:border-[#3b82f6] transition-colors"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="p-3 border-t border-neutral-800 space-y-2">
        <button
          onClick={() => downloadWebP('pixel-art')}
          className="w-full py-2 text-xs bg-[#2563eb] hover:bg-[#3b82f6] text-white transition-colors font-medium"
        >
          Download WebP
        </button>
        <button className="w-full py-2 text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors">
          Export PNG
        </button>
      </div>
    </div>
  );
}