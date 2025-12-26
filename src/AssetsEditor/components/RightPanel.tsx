// src/AssetsEditor/components/RightPanel.tsx

import { useState, useEffect, useRef } from 'react';
import { useAssetsEditor } from '../context/AssetsEditorContext';

export function RightPanel() {
  const {
    frames,
    currentFrameIndex,
    getFrameThumbnail,
    isPlaying,
    setIsPlaying,
    fps,
    setFps,
    downloadWebP,
    isLoading,
    pixelSize,
  } = useAssetsEditor();

  // ==================== State ====================
  const [activeTab, setActiveTab] = useState<'ai' | 'export'>('ai');
  const [previewFrame, setPreviewFrame] = useState(0);
  const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);
  const intervalRef = useRef<number | null>(null);

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState<'pixel' | 'retro' | 'modern'>('pixel');

  // Export State
  const [exportName, setExportName] = useState('sprite');

  // ==================== Animation Preview ====================

  // 썸네일 업데이트
  useEffect(() => {
    const newThumbnails = frames.map((_, index) => getFrameThumbnail(index));
    setThumbnails(newThumbnails);
  }, [frames, getFrameThumbnail, currentFrameIndex]);

  // 애니메이션 재생
  useEffect(() => {
    if (isPlaying && frames.length > 1) {
      intervalRef.current = window.setInterval(() => {
        setPreviewFrame((prev) => (prev + 1) % frames.length);
      }, 1000 / fps);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPreviewFrame(currentFrameIndex);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, fps, frames.length, currentFrameIndex]);

  // 재생 중이 아닐 때 현재 프레임 표시
  useEffect(() => {
    if (!isPlaying) {
      setPreviewFrame(currentFrameIndex);
    }
  }, [currentFrameIndex, isPlaying]);

  // ==================== Handlers ====================

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    
    console.log('Generate:', { prompt: aiPrompt, style: aiStyle, size: pixelSize });
    
    // TODO: 실제 API 연동
    // const response = await fetch('/api/generate-pixel-art', {
    //   method: 'POST',
    //   body: JSON.stringify({ prompt: aiPrompt, style: aiStyle, size: pixelSize })
    // });
    // const blob = await response.blob();
    // await loadAIImage(blob);
  };

  const handleExportWebP = () => {
    downloadWebP(exportName);
  };

  const handleExportGif = () => {
    // TODO: GIF 내보내기 구현
    console.log('Export GIF:', frames.length, 'frames at', fps, 'fps');
  };

  const handleExportSpriteSheet = () => {
    // TODO: 스프라이트시트 내보내기 구현
    console.log('Export Sprite Sheet:', frames.length, 'frames');
  };

  // ==================== Render ====================

  const currentThumbnail = thumbnails[previewFrame];

  return (
    <div className="w-[260px] bg-black border-l border-neutral-800 flex flex-col">
      
      {/* ==================== Animation Preview ==================== */}
      <div className="p-3 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-500">Preview</span>
          <span className="text-[10px] text-neutral-600">
            Frame {previewFrame + 1}/{frames.length}
          </span>
        </div>

        {/* Preview Canvas */}
        <div 
          className="w-full aspect-square mb-3 border border-neutral-800"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
              linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
              linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)
            `,
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            backgroundColor: '#1a1a1a',
          }}
        >
          {currentThumbnail ? (
            <img
              src={currentThumbnail}
              alt={`Frame ${previewFrame + 1}`}
              className="w-full h-full"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
              Empty
            </div>
          )}
        </div>

        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={frames.length <= 1}
          className={`w-full py-1.5 text-xs flex items-center justify-center gap-1.5 transition-colors ${
            isPlaying
              ? 'bg-[#2563eb] text-white'
              : frames.length > 1
                ? 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                : 'bg-neutral-900/50 text-neutral-600 border border-neutral-800/50 cursor-not-allowed'
          }`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        {/* FPS Control */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-neutral-500">Speed</span>
            <span className="text-[10px] text-neutral-400">{fps} FPS</span>
          </div>
          <input
            type="range"
            min="1"
            max="24"
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
            className="w-full h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-[#2563eb]"
          />
        </div>

        {/* Timeline */}
        {frames.length > 1 && (
          <div className="flex gap-0.5 mt-2">
            {frames.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1 transition-colors ${
                  index === previewFrame ? 'bg-[#2563eb]' : 'bg-neutral-800'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ==================== Tab Switcher ==================== */}
      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-2 text-xs transition-colors ${
            activeTab === 'ai'
              ? 'text-white border-b-2 border-[#2563eb]'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          ✨ AI Generate
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2 text-xs transition-colors ${
            activeTab === 'export'
              ? 'text-white border-b-2 border-[#2563eb]'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          📤 Export
        </button>
      </div>

      {/* ==================== Tab Content ==================== */}
      <div className="flex-1 overflow-y-auto">
        
        {activeTab === 'ai' ? (
          /* AI Tab */
          <div className="p-3 space-y-3">
            {/* Prompt */}
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1">Prompt</label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="A cute pixel art character..."
                className="w-full h-20 px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 resize-none focus:border-[#2563eb] focus:outline-none"
              />
            </div>

            {/* Style */}
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1">Style</label>
              <div className="grid grid-cols-3 gap-1">
                {(['pixel', 'retro', 'modern'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setAiStyle(style)}
                    className={`py-1.5 text-[10px] capitalize transition-colors ${
                      aiStyle === style
                        ? 'bg-[#2563eb] text-white'
                        : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-800'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading || !aiPrompt.trim()}
              className="w-full py-2 text-xs bg-[#2563eb] hover:bg-[#3b82f6] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  Generating...
                </>
              ) : (
                <>✨ Generate</>
              )}
            </button>

            {/* Tips */}
            <div className="p-2 bg-neutral-900/50 border border-neutral-800 text-[10px] text-neutral-500 space-y-0.5">
              <p>• AI가 현재 프레임에 그림을 생성해요</p>
              <p>• Undo로 되돌릴 수 있어요</p>
            </div>
          </div>
        ) : (
          /* Export Tab */
          <div className="p-3 space-y-3">
            {/* Filename */}
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1">Filename</label>
              <input
                type="text"
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                placeholder="sprite"
                className="w-full px-2 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 focus:border-[#2563eb] focus:outline-none"
              />
            </div>

            {/* Current Frame Export */}
            <div>
              <div className="text-[10px] text-neutral-500 mb-1">Current Frame</div>
              <button
                onClick={handleExportWebP}
                className="w-full py-2 text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                📄 Download WebP
              </button>
            </div>

            {/* Animation Export */}
            {frames.length > 1 && (
              <div>
                <div className="text-[10px] text-neutral-500 mb-1">
                  Animation ({frames.length} frames)
                </div>
                <div className="space-y-1">
                  <button
                    onClick={handleExportGif}
                    className="w-full py-2 text-xs bg-[#2563eb] hover:bg-[#3b82f6] text-white transition-colors"
                  >
                    🎬 Export GIF
                  </button>
                  <button
                    onClick={handleExportSpriteSheet}
                    className="w-full py-2 text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  >
                    🖼 Sprite Sheet
                  </button>
                </div>
              </div>
            )}

            {/* Export Info */}
            <div className="p-2 bg-neutral-900/50 border border-neutral-800">
              <div className="text-[10px] text-neutral-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>Resolution:</span>
                  <span className="text-neutral-400">{pixelSize}×{pixelSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frames:</span>
                  <span className="text-neutral-400">{frames.length}</span>
                </div>
                {frames.length > 1 && (
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="text-neutral-400">
                      {((frames.length / fps) * 1000).toFixed(0)}ms
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RightPanel;