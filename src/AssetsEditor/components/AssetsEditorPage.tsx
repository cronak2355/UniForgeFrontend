// src/AssetsEditor/components/AssetsEditorPage.tsx

import { AssetsEditorProvider, useAssetsEditor } from '../context/AssetsEditorContext';
import { Canvas } from './Canvas';
import { LeftToolbar } from './LeftToolbar';
import { RightPanel } from './RightPanel';

// Floating Glass Layout
function EditorContent() {
  const { pixelSize } = useAssetsEditor();

  return (
    <div className="h-screen w-screen overflow-hidden bg-grid-pattern relative flex items-center justify-center">

      {/* Background Glow (Subtle) */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/5 to-blue-900/10 pointer-events-none" />

      {/* Header (Top Floating) */}
      <header className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel px-6 py-2 rounded-full flex items-center gap-6 z-50">
        {/* Logo */}
        <div className="flex items-center gap-2">
          {/* SVG Logo - Same as before but no bg */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3b82f6" />
            <path d="M2 17L12 22L22 17" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-white font-bold tracking-tight text-sm">UniForge</span>
        </div>

        <div className="w-px h-3 bg-white/10" />

        <div className="flex items-center gap-2">
          <span className="text-neutral-400 text-xs uppercase tracking-wider">Asset Editor</span>
          <span className="text-blue-400 text-xs font-mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
            {pixelSize}px
          </span>
        </div>
      </header>

      {/* Main Stage (Canvas) */}
      <div className="relative z-10 p-10 flex items-center justify-center w-full h-full">
        <Canvas />
      </div>

      {/* Floating Left Toolbar */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 h-[80vh]">
        <LeftToolbar />
      </div>

      {/* Floating Right Panel */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 h-[85vh]">
        <RightPanel />
      </div>

    </div>
  );
}

export default function AssetsEditorPage() {
  return (
    <AssetsEditorProvider>
      <EditorContent />
    </AssetsEditorProvider>
  );
}
