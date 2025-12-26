// src/AssetsEditor/components/AssetsEditorPage.tsx

import { AssetsEditorProvider } from '../context/AssetsEditorContext';
import {Canvas} from './Canvas';
import Toolbar from './Toolbar';
import ExportPanel from './ExportPanel';

export default function AssetEditorPage() {
  return (
    <AssetsEditorProvider>
      <div className="h-screen w-screen overflow-hidden bg-black flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                fill="#3b82f6"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="#2563eb"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-white font-semibold">Uniforge</span>
          </div>

          {/* Center - File Info */}
          <div className="flex items-center gap-4">
            <span className="text-neutral-500 text-sm">Asset Editor</span>
            <div className="w-px h-4 bg-neutral-800" />
            <span className="text-neutral-600 text-xs font-mono">128 × 128</span>
          </div>

          {/* Right - Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500" />
              <span className="text-neutral-500 text-xs">Ready</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-[240px_1fr_280px] divide-x divide-neutral-800">
          {/* Left: Toolbar */}
          <Toolbar />

          {/* Center: Canvas */}
          <Canvas />

          {/* Right: Export Panel */}
          <ExportPanel />
        </div>
      </div>
    </AssetsEditorProvider>
  );
}