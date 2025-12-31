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

  // 마우스 휠 줌 (마우스 포인터 기준)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(2, Math.min(20, zoom + delta));
    if (newZoom === zoom) return;
    
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // wrapper 기준 마우스 위치 (고정된 좌표)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 캔버스 왼쪽 상단 기준 마우스 위치
    const canvasMouseX = mouseX - panOffset.x;
    const canvasMouseY = mouseY - panOffset.y;
    
    // 현재 줌에서 픽셀 좌표
    const pixelX = canvasMouseX / zoom;
    const pixelY = canvasMouseY / zoom;
    
    // 새 줌에서 같은 픽셀의 캔버스 위치
    const newCanvasMouseX = pixelX * newZoom;
    const newCanvasMouseY = pixelY * newZoom;
    
    // panOffset 조정 (마우스 화면 위치 고정)
    setPanOffset({
      x: mouseX - newCanvasMouseX,
      y: mouseY - newCanvasMouseY,
    });
    
    setZoom(newZoom);
  };

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
      onWheel={handleWheel}
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
