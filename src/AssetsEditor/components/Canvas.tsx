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
    setZoom,
    floatingImage,
    setFloatingImage,
    confirmFloatingImage,
    cancelFloatingImage,
  } = useAssetsEditor();

  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const lastPanPos = useRef({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Refs to hold latest values for wheel handler (closure fix)
  const zoomRef = useRef(zoom);
  const panOffsetRef = useRef(panOffset);

  // Keep refs in sync
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  // Floating Image Interaction State
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isResizingImage, setIsResizingImage] = useState<string | null>(null); // 'tl', 'tr', 'bl', 'br'
  const lastInteractPos = useRef({ x: 0, y: 0 });
  const initialImageState = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const displaySize = pixelSize * zoom;

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  // Center Canvas and Auto-Fit Zoom on Mount and Resolution Change
  useEffect(() => {
    if (wrapperRef.current) {
      const { width, height } = wrapperRef.current.getBoundingClientRect();
      const padding = 40;
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

  // Keyboard Events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Floating Image Shortcuts
      if (floatingImage) {
        if (e.code === 'Enter') {
          confirmFloatingImage();
          return;
        }
        if (e.code === 'Escape') {
          cancelFloatingImage();
          return;
        }
      }

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
  }, [floatingImage, confirmFloatingImage, cancelFloatingImage]);

  // Mouse Wheel Zoom
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const currentZoom = zoomRef.current;
      const currentPanOffset = panOffsetRef.current;

      const factor = 0.1;
      const delta = e.deltaY > 0 ? -factor : factor;
      const newZoom = Math.max(0.1, Math.min(20, currentZoom * (1 + delta)));
      if (newZoom === currentZoom) return;

      const rect = wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate position relative to canvas origin
      const canvasMouseX = mouseX - currentPanOffset.x;
      const canvasMouseY = mouseY - currentPanOffset.y;

      // Convert to pixel space (before zoom)
      const pixelX = canvasMouseX / currentZoom;
      const pixelY = canvasMouseY / currentZoom;

      // Calculate new canvas position after zoom
      const newCanvasMouseX = pixelX * newZoom;
      const newCanvasMouseY = pixelY * newZoom;

      // Adjust pan offset so mouse stays over the same pixel
      setPanOffset({
        x: mouseX - newCanvasMouseX,
        y: mouseY - newCanvasMouseY,
      });

      setZoom(newZoom);
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, [setZoom]);

  // Wrapper Pan Start
  const handleWrapperPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If floating image is active and we click on helper (not image itself), confirm
    if (floatingImage && e.target === wrapperRef.current && e.button === 0) {
      confirmFloatingImage();
      return;
    }

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

  // ==================== Floating Image Interaction ====================

  const handleImagePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !floatingImage) return;
    e.stopPropagation();
    setIsDraggingImage(true);
    lastInteractPos.current = { x: e.clientX, y: e.clientY };
    initialImageState.current = { ...floatingImage };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerDown = (e: React.PointerEvent, handle: string) => {
    if (e.button !== 0 || !floatingImage) return;
    e.stopPropagation();
    setIsResizingImage(handle);
    lastInteractPos.current = { x: e.clientX, y: e.clientY };
    initialImageState.current = { ...floatingImage };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleFloatingInteractMove = (e: React.PointerEvent) => {
    if (!floatingImage) return;

    if (isDraggingImage) {
      const dx = (e.clientX - lastInteractPos.current.x) / zoom;
      const dy = (e.clientY - lastInteractPos.current.y) / zoom;

      setFloatingImage({
        ...floatingImage,
        x: initialImageState.current.x + dx,
        y: initialImageState.current.y + dy,
      });
    } else if (isResizingImage) {
      const dx = (e.clientX - lastInteractPos.current.x) / zoom;
      const dy = (e.clientY - lastInteractPos.current.y) / zoom;

      const init = initialImageState.current;
      let newX = init.x;
      let newY = init.y;
      let newW = init.width;
      let newH = init.height;
      const ratio = init.aspectRatio; // Keep aspect ratio? Maybe optional. For now free transform.

      // Free Transform (Shift to keep aspect ratio could be added here)
      const keepRatio = e.shiftKey;

      switch (isResizingImage) {
        case 'br': // Bottom Right
          newW = init.width + dx;
          newH = keepRatio ? newW / ratio : init.height + dy;
          break;
        case 'bl': // Bottom Left
          newW = init.width - dx;
          newX = init.x + dx;
          newH = keepRatio ? newW / ratio : init.height + dy;
          break;
        case 'tr': // Top Right
          newW = init.width + dx;
          newH = keepRatio ? newW / ratio : init.height - dy;
          newY = keepRatio ? init.y + (init.height - newH) : init.y + dy;
          break;
        case 'tl': // Top Left
          newW = init.width - dx;
          newX = init.x + dx;
          newH = keepRatio ? newW / ratio : init.height - dy;
          newY = keepRatio ? init.y + (init.height - newH) : init.y + dy;
          break;
      }

      setFloatingImage({
        ...floatingImage,
        x: newX,
        y: newY,
        width: newW,
        height: newH
      });
    }
  };

  const handleFloatingInteractUp = (e: React.PointerEvent) => {
    if (isDraggingImage || isResizingImage) {
      setIsDraggingImage(false);
      setIsResizingImage(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Global Pointer Up
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      handlePointerUp();
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [handlePointerUp]);

  const checkerSize = Math.max(8, zoom);

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 overflow-hidden"
      onPointerDown={handleWrapperPointerDown}
      onPointerMove={(e) => {
        handleWrapperPointerMove(e);
        handleFloatingInteractMove(e);
      }}
      onPointerUp={(e) => {
        handleWrapperPointerUp(e);
        handleFloatingInteractUp(e);
      }}
      onContextMenu={handleContextMenu}
      style={{
        cursor: isPanning ? 'grabbing' : 'crosshair',
      }}
    >
      {/* Container (Pannable) */}
      <div
        className="absolute"
        style={{
          left: panOffset.x,
          top: panOffset.y,
          width: displaySize,
          height: displaySize,
        }}
      >
        {/* Background & Grid */}
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
        <div className="absolute inset-0 pointer-events-none border border-neutral-600" />

        {/* Main Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            // Block canvas drawing if floating image is active
            if (floatingImage) {
              // Clicking canvas while floating image is active -> Confirm?
              // Actually handleWrapperPointerDown handles outside clicks.
              // If we click inside canvas but outside image, that's also 'outside image' for float logic.
              // So let's handle confirm in wrapper down.
              return;
            }
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
            opacity: floatingImage ? 0.5 : 1 // Dim canvas when importing
          }}
        />

        {/* Floating Image Overlay */}
        {floatingImage && (
          <div
            className="absolute select-none"
            style={{
              left: floatingImage.x * zoom,
              top: floatingImage.y * zoom,
              width: floatingImage.width * zoom,
              height: floatingImage.height * zoom,
              cursor: isDraggingImage ? 'grabbing' : 'move',
              boxShadow: '0 0 0 1px #3b82f6, 0 0 10px rgba(0,0,0,0.5)',
              zIndex: 50
            }}
            onPointerDown={handleImagePointerDown}
          >
            <img
              src={floatingImage.src}
              alt="Import Preview"
              className="w-full h-full object-fill pointer-events-none pixelated"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Resize Handles */}
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border border-blue-500 cursor-nwse-resize"
              onPointerDown={(e) => handleResizePointerDown(e, 'tl')} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-blue-500 cursor-nesw-resize"
              onPointerDown={(e) => handleResizePointerDown(e, 'tr')} />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border border-blue-500 cursor-nesw-resize"
              onPointerDown={(e) => handleResizePointerDown(e, 'bl')} />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-blue-500 cursor-nwse-resize"
              onPointerDown={(e) => handleResizePointerDown(e, 'br')} />
          </div>
        )}

        {/* Pixel Grid */}
        {zoom >= 6 && !floatingImage && (
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

      {/* Help Text for Free Transform */}
      {floatingImage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium pointer-events-none animate-in fade-in slide-in-from-bottom-4">
          Drag to move • Drag corners to resize • Click background or Enter to Confirm
        </div>
      )}
    </div>
  );
}
