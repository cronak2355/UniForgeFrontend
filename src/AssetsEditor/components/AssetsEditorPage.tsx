// src/AssetsEditor/components/AssetsEditorPage.tsx

import { AssetsEditorProvider, useAssetsEditor } from '../context/AssetsEditorContext';
import { Canvas } from './Canvas';
import { LeftToolbar } from './LeftToolbar';
import { RightPanel } from './RightPanel';

function EditorLayout() {
  const { pixelSize, zoom } = useAssetsEditor();
  
  return (
    <div className="h-screen flex flex-col bg-black text-white select-none">
      {/* Header */}
      <header className="h-11 flex items-center justify-between px-4 bg-black border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#2563eb] flex items-center justify-center">
            <span className="text-white text-xs font-bold">U</span>
          </div>
          <span className="text-sm font-medium text-white">Uniforge</span>
        </div>
        <div className="text-sm text-neutral-500">
          Untitled
        </div>
        <button className="px-3 py-1.5 bg-[#2563eb] text-white text-xs font-medium hover:bg-[#3b82f6] transition-colors">
          Export
        </button>
      </header>

      {/* Main 3-column layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Frames + Tools + Colors */}
        <LeftToolbar />
        
        {/* Center: Canvas */}
        <div className="flex-1 flex items-center justify-center bg-neutral-950 overflow-hidden">
          <Canvas />
        </div>
        
        {/* Right: Preview + Layers + Palettes */}
        <RightPanel />
      </main>

      {/* Status bar */}
      <footer className="h-6 flex items-center justify-end px-4 bg-black border-t border-neutral-800 text-xs text-neutral-500 gap-4">
        <span className="text-[#3b82f6]">{zoom.toFixed(0)}x</span>
        <span>{pixelSize}×{pixelSize}</span>
        <span>Frame 1/1</span>
      </footer>
    </div>
  );
}

export function AssetsEditorPage() {
  return (
    <AssetsEditorProvider>
      <EditorLayout />
    </AssetsEditorProvider>
  );
}