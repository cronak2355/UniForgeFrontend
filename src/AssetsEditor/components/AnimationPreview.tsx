// src/AssetsEditor/components/AnimationPreview.tsx

import { useEffect, useRef, useState } from 'react';
import { useAssetsEditor } from '../context/AssetsEditorContext';

export function AnimationPreview() {
  const {
    frames,
    currentFrameIndex,
    getFrameThumbnail,
    isPlaying,
    setIsPlaying,
    fps,
    setFps,
    pixelSize,
  } = useAssetsEditor();

  const [previewFrame, setPreviewFrame] = useState(0);
  const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);
  const intervalRef = useRef<number | null>(null);

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

  // 재생 중이 아닐 때는 현재 프레임 표시
  useEffect(() => {
    if (!isPlaying) {
      setPreviewFrame(currentFrameIndex);
    }
  }, [currentFrameIndex, isPlaying]);

  const currentThumbnail = thumbnails[previewFrame];

  return (
    <div className="border-b border-neutral-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-neutral-500">Animation Preview</span>
        <span className="text-[10px] text-neutral-600">
          {previewFrame + 1}/{frames.length}
        </span>
      </div>

      {/* Preview Canvas */}
      <div 
        className="w-full aspect-square mb-3 flex items-center justify-center"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #3a3a3a 25%, transparent 25%),
            linear-gradient(-45deg, #3a3a3a 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #3a3a3a 75%),
            linear-gradient(-45deg, transparent 75%, #3a3a3a 75%)
          `,
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          backgroundColor: '#2a2a2a',
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
          <div className="text-neutral-600 text-xs">No frames</div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={frames.length <= 1}
          className={`flex-1 py-2 text-sm flex items-center justify-center gap-1 transition-colors ${
            isPlaying
              ? 'bg-[#2563eb] text-white'
              : frames.length > 1
                ? 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                : 'bg-neutral-900/50 text-neutral-600 border border-neutral-800/50 cursor-not-allowed'
          }`}
        >
          {isPlaying ? (
            <>
              <span>⏸</span> Pause
            </>
          ) : (
            <>
              <span>▶</span> Play
            </>
          )}
        </button>
      </div>

      {/* FPS Control */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">FPS</span>
          <span className="text-xs text-neutral-400">{fps}</span>
        </div>
        <input
          type="range"
          min="1"
          max="24"
          value={fps}
          onChange={(e) => setFps(Number(e.target.value))}
          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
        />
        <div className="flex justify-between text-[10px] text-neutral-600">
          <span>1</span>
          <span>12</span>
          <span>24</span>
        </div>
      </div>

      {/* Frame Timeline */}
      {frames.length > 1 && (
        <div className="mt-3 pt-3 border-t border-neutral-800">
          <div className="text-xs text-neutral-500 mb-2">Timeline</div>
          <div className="flex gap-1">
            {frames.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1.5 transition-colors ${
                  index === previewFrame
                    ? 'bg-[#2563eb]'
                    : 'bg-neutral-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}