import React, { useState, useRef, useEffect } from 'react';
import DrawingCanvas, { DrawingCanvasRef } from '../components/editor/canvas/DrawingCanvas';
import Toolbar from '../components/editor/tools/Toolbar';
import { saveAs } from 'file-saver';
import Moveable from 'react-moveable';
import { authService } from '../services/authService';

const NewAssetsEditorPage: React.FC = () => {
    // Canvas State
    const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);

    // Tool State
    const [selectedTool, setSelectedTool] = useState('pen');
    const [brushColor, setBrushColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);

    // Viewport State (Zoom/Pan)
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);

    // Image Import State
    const [importedImage, setImportedImage] = useState<string | null>(null);
    const [imageTransform, setImageTransform] = useState({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotate: 0
    });
    const imageRef = useRef<HTMLImageElement>(null);

    // Refs
    const canvasRef = useRef<DrawingCanvasRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Undo/Redo Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore input fields
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        canvasRef.current?.redo();
                    } else {
                        canvasRef.current?.undo();
                    }
                } else if (e.key === 'y') {
                    e.preventDefault();
                    canvasRef.current?.redo();
                }
            }

            if (e.key === 'Enter' && importedImage) {
                handleBakeImage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [importedImage]);

    const handleSizeSelect = (size: number) => {
        setCanvasSize({ width: size, height: size });
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // Pan Handlers
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 2 || selectedTool === 'move') {
            if (e.button === 2) {
                setIsPanning(true);
            } else if (selectedTool === 'move' && !importedImage) {
                setIsPanning(true);
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPan(prev => ({
                x: prev.x + e.movementX,
                y: prev.y + e.movementY
            }));
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 10));
        }
    };

    // Image Upload Logic (Fixed Size Issue)
    const handleImageUpload = (file: File) => {
        if (!canvasSize) return;

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            // Target Size: 80% of canvas
            const targetRatio = 0.8;
            const maxWidth = canvasSize.width * targetRatio;
            const maxHeight = canvasSize.height * targetRatio;

            let newWidth = img.width;
            let newHeight = img.height;

            // Logic: If image is larger than target, scale down. If smaller, scale up to target.
            const scaleX = maxWidth / newWidth;
            const scaleY = maxHeight / newHeight;
            const optimalScale = Math.min(scaleX, scaleY);

            newWidth *= optimalScale;
            newHeight *= optimalScale;

            setImportedImage(url);
            setImageTransform({
                x: (canvasSize.width - newWidth) / 2,
                y: (canvasSize.height - newHeight) / 2,
                width: newWidth,
                height: newHeight,
                rotate: 0
            });
            setSelectedTool('move');
        };
        img.src = url;
    };

    // Bake Image to Canvas
    const handleBakeImage = () => {
        if (!importedImage || !canvasRef.current || !imageRef.current) return;

        const canvas = canvasRef.current.getCanvas();
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = imageRef.current;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const centerX = imageTransform.x + imageTransform.width / 2;
        const centerY = imageTransform.y + imageTransform.height / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate((imageTransform.rotate * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);

        ctx.drawImage(
            img,
            imageTransform.x,
            imageTransform.y,
            imageTransform.width,
            imageTransform.height
        );

        ctx.restore();

        // Ensure History is saved
        canvasRef.current.saveHistory();

        setImportedImage(null);
        setSelectedTool('pen');
    };

    if (!canvasSize) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#1e1e1e] text-gray-200 select-none font-sans">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-3 text-gray-100 tracking-tight">
                        자산 에디터
                    </h1>
                    <p className="text-gray-500 text-sm">캔버스 크기를 선택하여 시작하세요.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[512, 256, 128].map((size) => (
                        <button
                            key={size}
                            onClick={() => handleSizeSelect(size)}
                            className="group relative w-40 h-40 bg-[#252525] rounded-[4px] border border-[#333] hover:border-[#666] hover:bg-[#2a2a2a] transition-all flex flex-col items-center justify-center shadow-lg"
                        >
                            <div className="text-2xl font-bold mb-2 font-mono text-gray-300">{size}</div>
                            <div className="text-[10px] text-gray-600 group-hover:text-gray-400 transition-colors uppercase tracking-widest">
                                {size === 512 ? 'High Detail' : size === 256 ? 'Standard' : 'Pixel Art'}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex h-screen bg-[#1e1e1e] text-gray-200 overflow-hidden font-sans select-none"
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
        >
            {/* Toolbar */}
            <Toolbar
                selectedTool={selectedTool}
                onToolChange={(tool) => {
                    if (importedImage && tool !== 'move') {
                        if (confirm("이미지가 적용되지 않았습니다. 현재 이미지를 캔버스에 적용하시겠습니까?")) {
                            handleBakeImage();
                        } else {
                            setImportedImage(null);
                        }
                    }
                    setSelectedTool(tool);
                }}
                brushColor={brushColor}
                onColorChange={setBrushColor}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                onImageUpload={handleImageUpload}
            />

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative bg-[#121212]">
                {/* Header */}
                <div className="h-10 border-b border-[#282828] flex items-center justify-between px-4 bg-[#1e1e1e] z-10 shadow-sm shrink-0">
                    <div className="flex gap-4 text-[11px] text-gray-500 font-mono">
                        <span>{canvasSize.width}x{canvasSize.height}</span>
                        <span className="text-gray-700">|</span>
                        <span>{Math.round(zoom * 100)}%</span>
                        <span className="text-gray-700">|</span>
                        <span className="uppercase text-gray-400">{selectedTool === 'move' && importedImage ? '이미지 변형 모드' : selectedTool}</span>
                    </div>
                    <div className="flex gap-3">
                        {importedImage && (
                            <button
                                onClick={handleBakeImage}
                                className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-[11px] rounded-[2px] transition-colors"
                            >
                                <i className="fa-solid fa-check mr-1.5"></i>적용 (Enter)
                            </button>
                        )}
                        <div className="flex gap-1 mr-2">
                            <button
                                onClick={() => canvasRef.current?.undo()}
                                className="px-2 py-1 bg-[#333] hover:bg-[#444] text-white text-[10px] rounded-[2px] transition-colors"
                                title="실행 취소 (Ctrl+Z)"
                            >
                                <i className="fa-solid fa-rotate-left"></i>
                            </button>
                            <button
                                onClick={() => canvasRef.current?.redo()}
                                className="px-2 py-1 bg-[#333] hover:bg-[#444] text-white text-[10px] rounded-[2px] transition-colors"
                                title="다시 실행 (Ctrl+Y)"
                            >
                                <i className="fa-solid fa-rotate-right"></i>
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                const canvas = canvasRef.current?.getCanvas();
                                if (canvas) {
                                    canvas.toBlob((blob) => {
                                        if (blob) saveAs(blob, 'my_asset.png');
                                    });
                                }
                            }}
                            className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white text-[11px] rounded-[2px] transition-colors"
                        >
                            <i className="fa-solid fa-download mr-1.5"></i>
                            저장
                        </button>
                        <button
                            onClick={() => setCanvasSize(null)}
                            className="px-3 py-1 bg-[#222] hover:bg-[#333] text-gray-400 text-[11px] rounded-[2px] transition-colors"
                        >
                            나가기
                        </button>
                    </div>
                </div>

                {/* Canvas Viewport */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-hidden relative bg-[#0a0a0a] cursor-default"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onWheel={handleWheel}
                >
                    <div
                        className="absolute shadow-2xl shadow-black origin-center"
                        style={{
                            width: canvasSize.width,
                            height: canvasSize.height,
                            top: `calc(50% - ${canvasSize.height / 2}px + ${pan.y}px)`,
                            left: `calc(50% - ${canvasSize.width / 2}px + ${pan.x}px)`,
                            transform: `scale(${zoom})`,
                        }}
                    >
                        <DrawingCanvas
                            ref={canvasRef}
                            width={canvasSize.width}
                            height={canvasSize.height}
                            brushColor={brushColor}
                            brushSize={brushSize}
                            selectedTool={selectedTool === 'move' ? 'none' : selectedTool}
                        />

                        {/* Imported Image Overlay */}
                        {importedImage && (
                            <>
                                <img
                                    ref={imageRef}
                                    src={importedImage}
                                    alt="Imported"
                                    className="absolute top-0 left-0 select-none pointer-events-none"
                                    style={{
                                        transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) rotate(${imageTransform.rotate}deg)`,
                                        width: imageTransform.width,
                                        height: imageTransform.height,
                                        imageRendering: 'pixelated'
                                    }}
                                />
                                <Moveable
                                    target={imageRef.current}
                                    container={null}
                                    origin={true}
                                    edge={true}
                                    draggable={true}
                                    resizable={true}
                                    rotatable={true}
                                    keepRatio={false}
                                    snappable={true}

                                    onDrag={({ left, top }) => {
                                        setImageTransform(prev => ({ ...prev, x: left, y: top }));
                                    }}
                                    onResize={({ width, height, drag }) => {
                                        setImageTransform(prev => ({
                                            ...prev,
                                            width,
                                            height,
                                            x: drag.left,
                                            y: drag.top
                                        }));
                                    }}
                                    onRotate={({ rotate }) => {
                                        setImageTransform(prev => ({ ...prev, rotate }));
                                    }}
                                    className="moveable-control-box"
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewAssetsEditorPage;
