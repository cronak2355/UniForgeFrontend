// src/AssetsEditor/components/Sidebar.tsx

import { useState } from 'react';
import { useAssetsEditor, type Tool } from '../context/AssetsEditorContext';
import type { PixelSize } from '../engine/PixelEngine';

const COLOR_PRESETS = [
  { r: 0, g: 0, b: 0, a: 255 },       // Black
  { r: 255, g: 255, b: 255, a: 255 }, // White
  { r: 239, g: 68, b: 68, a: 255 },   // Red
  { r: 249, g: 115, b: 22, a: 255 },  // Orange
  { r: 234, g: 179, b: 8, a: 255 },   // Yellow
  { r: 34, g: 197, b: 94, a: 255 },   // Green
  { r: 59, g: 130, b: 246, a: 255 },  // Blue
  { r: 168, g: 85, b: 247, a: 255 },  // Purple
];

const RESOLUTION_OPTIONS: PixelSize[] = [32, 64, 128];

export function Sidebar() {
  const {
    currentTool,
    setCurrentTool,
    currentColor,
    setCurrentColor,
    pixelSize,
    setPixelSize,
    clearCanvas,
    downloadWebP,
    saveToLibrary,
    assets,
    deleteAsset,
  } = useAssetsEditor();

  const [assetName, setAssetName] = useState('my_asset');
  const [assetType, setAssetType] = useState<'character' | 'object' | 'tile'>('character');
  const [stats, setStats] = useState({ hp: 100, speed: 50, attack: 25 });

  const rgbaToHex = (c: { r: number; g: number; b: number }) =>
    '#' + [c.r, c.g, c.b].map((x) => x.toString(16).padStart(2, '0')).join('');

  const hexToRgba = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16), a: 255 }
      : { r: 255, g: 255, b: 255, a: 255 };
  };

  const handleDownload = async () => {
    await downloadWebP(assetName || 'pixel_art');
  };

  const handleSave = async () => {
    await saveToLibrary(assetName || 'Untitled', assetType, stats);
    setAssetName('');
  };

  return (
    <aside className="w-72 bg-neutral-800 border-l border-neutral-700 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Resolution */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            Resolution
          </h3>
          <div className="flex gap-2">
            {RESOLUTION_OPTIONS.map((size) => (
              <button
                key={size}
                onClick={() => setPixelSize(size)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  pixelSize === size
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            Tools
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'brush' as Tool, icon: '✏️', label: 'Brush' },
              { id: 'eraser' as Tool, icon: '🧹', label: 'Eraser' },
              { id: 'eyedropper' as Tool, icon: '💧', label: 'Picker' },
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => setCurrentTool(tool.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all ${
                  currentTool === tool.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                }`}
                title={tool.label}
              >
                <span className="text-lg">{tool.icon}</span>
                <span className="text-xs mt-1">{tool.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Color */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            Color
          </h3>
          
          {/* Color picker */}
          <div className="flex items-center gap-3 mb-3">
            <input
              type="color"
              value={rgbaToHex(currentColor)}
              onChange={(e) => setCurrentColor(hexToRgba(e.target.value))}
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-neutral-600"
            />
            <div className="flex-1">
              <div className="text-sm text-neutral-300 font-mono">
                {rgbaToHex(currentColor).toUpperCase()}
              </div>
              <div className="text-xs text-neutral-500">
                R:{currentColor.r} G:{currentColor.g} B:{currentColor.b}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-4 gap-2">
            {COLOR_PRESETS.map((color, i) => (
              <button
                key={i}
                onClick={() => setCurrentColor(color)}
                className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-105 ${
                  currentColor.r === color.r &&
                  currentColor.g === color.g &&
                  currentColor.b === color.b
                    ? 'border-white shadow-lg'
                    : 'border-neutral-600'
                }`}
                style={{ backgroundColor: rgbaToHex(color) }}
                title={rgbaToHex(color)}
              />
            ))}
          </div>
        </section>

        {/* Actions */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            Actions
          </h3>
          <button
            onClick={clearCanvas}
            className="w-full py-2 px-4 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors text-sm font-medium"
          >
            🗑️ Clear Canvas
          </button>
        </section>

        {/* Export */}
        <section>
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            Export
          </h3>
          
          <div className="space-y-3">
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="Asset name"
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500"
            />
            
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as typeof assetType)}
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="character">Character</option>
              <option value="object">Object</option>
              <option value="tile">Tile</option>
            </select>

            {/* Stats */}
            <div className="space-y-2 text-sm">
              <label className="flex items-center justify-between">
                <span className="text-neutral-400">HP</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stats.hp}
                  onChange={(e) => setStats({ ...stats, hp: +e.target.value })}
                  className="w-24"
                />
                <span className="text-neutral-300 w-8 text-right">{stats.hp}</span>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-neutral-400">Speed</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stats.speed}
                  onChange={(e) => setStats({ ...stats, speed: +e.target.value })}
                  className="w-24"
                />
                <span className="text-neutral-300 w-8 text-right">{stats.speed}</span>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-neutral-400">Attack</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stats.attack}
                  onChange={(e) => setStats({ ...stats, attack: +e.target.value })}
                  className="w-24"
                />
                <span className="text-neutral-300 w-8 text-right">{stats.attack}</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-2 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                ⬇️ WebP
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                💾 Save
              </button>
            </div>
          </div>
        </section>

        {/* Asset Library */}
        {assets.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Library ({assets.length})
            </h3>
            <div className="space-y-2">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center gap-2 p-2 bg-neutral-700 rounded-lg"
                >
                  <img
                    src={asset.imageData}
                    alt={asset.name}
                    className="w-10 h-10 rounded border border-neutral-600"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{asset.name}</div>
                    <div className="text-xs text-neutral-400">{asset.type}</div>
                  </div>
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}