// src/AssetEditor/components/Toolbar.tsx

import { useState } from 'react';
import { useAssetsEditor } from '../context/AssetsEditorContext';
import type { RGBA } from '../engine/PixelEngine';

function rgbaToHex(rgba: RGBA): string {
  const r = rgba.r.toString(16).padStart(2, '0');
  const g = rgba.g.toString(16).padStart(2, '0');
  const b = rgba.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function hexToRGBA(hex: string): RGBA {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b, a: 255 };
}

// 프리셋 컬러 팔레트
const PRESET_COLORS: RGBA[] = [
  { r: 0, g: 0, b: 0, a: 255 },       // Black
  { r: 255, g: 255, b: 255, a: 255 }, // White
  { r: 239, g: 68, b: 68, a: 255 },   // Red
  { r: 249, g: 115, b: 22, a: 255 },  // Orange
  { r: 234, g: 179, b: 8, a: 255 },   // Yellow
  { r: 34, g: 197, b: 94, a: 255 },   // Green
  { r: 59, g: 130, b: 246, a: 255 },  // Blue
  { r: 168, g: 85, b: 247, a: 255 },  // Purple
];

export default function Toolbar() {
  const [aiPrompt, setAIPrompt] = useState('');
  const { tool, setTool, color, setColor, loadAIImage, isLoading, clear } = useAssetsEditor();

  const handleAIGenerate = async () => {
    try {
      // TODO: 실제 AI API 연동
      const response = await fetch('https://via.placeholder.com/512');
      const blob = await response.blob();
      await loadAIImage(blob);
      setAIPrompt('');
    } catch (error) {
      console.error('AI generation failed:', error);
    }
  };

  return (
    <div className="bg-[#0a0a0a] flex flex-col h-full">
      {/* Tools Section */}
      <div className="p-3 border-b border-neutral-800">
        <div className="text-neutral-500 text-[10px] font-medium uppercase tracking-wider mb-2">
          Tools
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'brush', icon: '●', label: 'Brush' },
            { id: 'eraser', icon: '○', label: 'Eraser' },
            { id: 'eyedropper', icon: '◉', label: 'Pick' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as typeof tool)}
              className={`flex flex-col items-center py-2 text-xs transition-colors ${
                tool === t.id
                  ? 'bg-blue-600 text-white'
                  : 'text-neutral-500 hover:bg-neutral-800 hover:text-white'
              }`}
              title={t.label}
            >
              <span className="text-base mb-1">{t.icon}</span>
              <span className="text-[10px]">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Section */}
      <div className="p-3 border-b border-neutral-800">
        <div className="text-neutral-500 text-[10px] font-medium uppercase tracking-wider mb-2">
          Color
        </div>
        
        {/* Current Color */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 border border-neutral-700"
            style={{ backgroundColor: rgbaToHex(color) }}
          />
          <input
            type="color"
            value={rgbaToHex(color)}
            onChange={(e) => setColor(hexToRGBA(e.target.value))}
            className="w-8 h-8 cursor-pointer bg-transparent"
          />
          <span className="text-neutral-500 text-xs font-mono flex-1">
            {rgbaToHex(color).toUpperCase()}
          </span>
        </div>

        {/* Preset Colors */}
        <div className="grid grid-cols-8 gap-1">
          {PRESET_COLORS.map((c, i) => (
            <button
              key={i}
              onClick={() => setColor(c)}
              className="w-full aspect-square border border-neutral-800 hover:border-neutral-600 transition-colors"
              style={{ backgroundColor: rgbaToHex(c) }}
            />
          ))}
        </div>
      </div>

      {/* AI Generate Section */}
      <div className="p-3 border-b border-neutral-800 flex-1">
        <div className="text-neutral-500 text-[10px] font-medium uppercase tracking-wider mb-2">
          AI Generate
        </div>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAIPrompt(e.target.value)}
          placeholder="Describe your pixel art..."
          className="w-full h-20 p-2 bg-black border border-neutral-800 text-white text-xs placeholder-neutral-600 resize-none focus:outline-none focus:border-neutral-700"
          disabled={isLoading}
        />
        <button
          onClick={handleAIGenerate}
          disabled={isLoading || !aiPrompt.trim()}
          className="w-full mt-2 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 text-white transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Actions */}
      <div className="p-3">
        <button
          onClick={clear}
          className="w-full py-2 text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-700 transition-colors"
        >
          Clear Canvas
        </button>
      </div>
    </div>
  );
}