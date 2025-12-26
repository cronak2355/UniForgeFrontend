// src/AssetsEditor/components/Canvas.tsx

import { useEffect, useRef, useState } from 'react';
import { useAssetsEditor } from '../context/AssetsEditorContext';

export function Canvas() {
  const { canvasRef, initEngine, handleCanvasInteraction, pixelSize } = useAssetsEditor();
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomFactor = pixelSize === 32 ? 12 : pixelSize === 64 ? 6 : 3;
  const displaySize = pixelSize * zoomFactor;

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    handleCanvasInteraction(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      handleCanvasInteraction(e);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
  };

  // 체커보드 패턴 (투명도 표시용)
  const checkerboardStyle = {
    backgroundImage: `
      linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
      linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
      linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)
    `,
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#0d0d0d',
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-neutral-900 p-8">
      {/* Resolution info */}
      <div className="text-neutral-400 text-sm mb-4 font-mono">
        {pixelSize} × {pixelSize} px
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative border-2 border-neutral-700 rounded-lg overflow-hidden shadow-2xl"
        style={checkerboardStyle}
      >
        {/* Grid overlay */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={displaySize}
          height={displaySize}
          style={{ opacity: 0.15 }}
        >
          <defs>
            <pattern
              id="grid"
              width={zoomFactor}
              height={zoomFactor}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${zoomFactor} 0 L 0 0 0 ${zoomFactor}`}
                fill="none"
                stroke="white"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Main canvas */}
        <canvas
          ref={canvasRef}
          width={displaySize}
          height={displaySize}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair"
          style={{ 
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />
      </div>

      {/* Zoom info */}
      <div className="text-neutral-500 text-xs mt-3 font-mono">
        {zoomFactor}x zoom • {displaySize} × {displaySize} display
      </div>
    </div>
  );
}