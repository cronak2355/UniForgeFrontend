// src/AssetsEditor/components/Canvas.tsx

import { useEffect, useRef, useState } from 'react';
import { useAssetsEditor } from '../context/AssetsEditorContext';

export function Canvas() {
  const {
    canvasRef,
    initEngine,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    pixelSize,
    zoom,
    setZoom
  } = useAssetsEditor();

  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const lastPanPos = useRef({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const displaySize = pixelSize * zoom;

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  // Center Canvas and Auto-Fit Zoom on Mount and Resolution Change
  useEffect(() => {
    if (wrapperRef.current) {
      const { width, height } = wrapperRef.current.getBoundingClientRect();
      const padding = 40; // reduced padding for better fit
      const availableSize = Math.min(width, height) - padding;
      const optimalZoom = Math.max(0.5, Math.min(8, availableSize / pixelSize));

      const displaySize = pixelSize * optimalZoom;
      setZoom(optimalZoom);
      setPanOffset({
        x: (width - displaySize) / 2,
        y: (height - displaySize) / 2,
      });
    }
  }, [pixelSize, setZoom]);

  // 키보드 이벤트 (화살표)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const moveAmount = e.shiftKey ? 50 : 20;
      switch (e.code) {
        case 'ArrowUp':
          setPanOffset(prev => ({ ...prev, y: prev.y + moveAmount }));
          break;
        case 'ArrowDown':
          setPanOffset(prev => ({ ...prev, y: prev.y - moveAmount }));
          break;
        case 'ArrowLeft':
          setPanOffset(prev => ({ ...prev, x: prev.x + moveAmount }));
          break;
        case 'ArrowRight':
          setPanOffset(prev => ({ ...prev, x: prev.x - moveAmount }));
          break;
        case 'Home':
          setPanOffset({ x: 0, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 마우스 휠 줌 (Passive: false 설정)
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const factor = 0.1;
      const delta = e.deltaY > 0 ? -factor : factor; // +/- 10%
      const newZoom = Math.max(0.1, Math.min(20, zoom * (1 + delta)));
      if (newZoom === zoom) return;

      const rect = wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const canvasMouseX = mouseX - panOffset.x;
      const canvasMouseY = mouseY - panOffset.y;

      const pixelX = canvasMouseX / zoom;
      const pixelY = canvasMouseY / zoom;

      const newCanvasMouseX = pixelX * newZoom;
      const newCanvasMouseY = pixelY * newZoom;

      setPanOffset({
        x: mouseX - newCanvasMouseX,
        y: mouseY - newCanvasMouseY,
      });

      setZoom(newZoom);
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, [zoom, panOffset, setZoom]);

  // 패닝 시작 (우클릭 / 휠클릭)
  const handleWrapperPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handleWrapperPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleWrapperPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  // 우클릭 메뉴 방지
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // 캔버스 Pointer Up (window에서도 처리)
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      handlePointerUp();
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [handlePointerUp]);

  // 체커보드 패턴 크기
  const checkerSize = Math.max(8, zoom);

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 overflow-hidden"
      onPointerDown={handleWrapperPointerDown}
      onPointerMove={handleWrapperPointerMove}
      onPointerUp={handleWrapperPointerUp}
      onContextMenu={handleContextMenu}
      style={{
        cursor: isPanning ? 'grabbing' : 'crosshair',
      }}
    >
      {/* 캔버스 컨테이너 (이동 가능) */}
      <div
        className="absolute"
        style={{
          left: panOffset.x,
          top: panOffset.y,
          width: displaySize,
          height: displaySize,
        }}
      >
        {/* 체커보드 배경 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
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
          className="absolute inset-0 pointer-events-none border border-neutral-600"
        />

        {/* 메인 캔버스 */}
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            if (e.button === 0) {
              handlePointerDown(e);
            }
          }}
          onPointerMove={handlePointerMove}
          style={{
            position: 'absolute',
            inset: 0,
            imageRendering: 'pixelated',
            width: displaySize,
            height: displaySize,
            touchAction: 'none',
          }}
        />

        {/* 픽셀 그리드 오버레이 */}
        {zoom >= 6 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
              `,
              backgroundSize: `${zoom}px ${zoom}px`,
            }}
          />
        )}
      </div>
    </div>
  );
}
