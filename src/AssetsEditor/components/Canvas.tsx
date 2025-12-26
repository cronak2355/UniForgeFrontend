// src/AssetsEditor/components/Canvas.tsx

import { useEffect, useRef, useState } from 'react';
import { useAssetsEditor } from '../context/AssetsEditorContext';

export function Canvas() {
  const { 
    canvasRef, 
    initEngine, 
    handleCanvasInteraction, 
    pixelSize,
    zoom,
    setZoom
  } = useAssetsEditor();
  
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const lastPanPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const displaySize = pixelSize * zoom;

  // 마운트 시 엔진 초기화
  useEffect(() => {
    initEngine();
  }, [initEngine]);

  // 마우스 휠 줌
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    setZoom(zoom + delta);
  };

  // 패닝 (중간 버튼)
  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleContainerMouseUp = () => {
    setIsPanning(false);
  };

  // 캔버스 드로잉 이벤트
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      handleCanvasInteraction(e);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons === 1 && !isPanning) {
      handleCanvasInteraction(e);
    }
  };

  // 체커보드 패턴 크기
  const checkerSize = Math.max(8, zoom);

  return (
    <div 
      ref={containerRef}
      className="relative"
      onWheel={handleWheel}
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUp}
      onMouseLeave={handleContainerMouseUp}
      style={{
        transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
        cursor: isPanning ? 'grabbing' : 'crosshair',
      }}
    >
      {/* 체커보드 배경 (밝은 대비) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          width: displaySize,
          height: displaySize,
          backgroundImage: `
            linear-gradient(45deg, #3d3d3d 25%, transparent 25%),
            linear-gradient(-45deg, #3d3d3d 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #3d3d3d 75%),
            linear-gradient(-45deg, transparent 75%, #3d3d3d 75%)
          `,
          backgroundSize: `${checkerSize * 2}px ${checkerSize * 2}px`,
          backgroundPosition: `0 0, 0 ${checkerSize}px, ${checkerSize}px -${checkerSize}px, -${checkerSize}px 0px`,
          backgroundColor: '#2a2a2a',
        }}
      />
      
      {/* 캔버스 테두리 */}
      <div 
        className="absolute pointer-events-none border border-neutral-600"
        style={{
          width: displaySize,
          height: displaySize,
        }}
      />
      
      {/* 메인 캔버스 */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        style={{
          position: 'relative',
          imageRendering: 'pixelated',
          width: displaySize,
          height: displaySize,
        }}
      />

      {/* 픽셀 그리드 오버레이 */}
      {zoom >= 6 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            width: displaySize,
            height: displaySize,
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: `${zoom}px ${zoom}px`,
          }}
        />
      )}
    </div>
  );
}