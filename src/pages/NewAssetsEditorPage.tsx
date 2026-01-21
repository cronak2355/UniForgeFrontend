import React, { useState, useRef, useEffect } from 'react';
import DrawingCanvas, { DrawingCanvasRef } from '../components/editor/canvas/DrawingCanvas';
import { saveAs } from 'file-saver';

import { authService } from '../services/authService';
import { SagemakerService } from '../AssetsEditor/services/SagemakerService';
import { useNavigate } from 'react-router-dom';
import { HexColorPicker } from 'react-colorful';
import { SkeletonPreview, useSkeletonPreview } from '../AssetsEditor/phaser/skeleton';
import type { MotionType } from '../AssetsEditor/phaser/skeleton/SkeletonController';

const NewAssetsEditorPage: React.FC = () => {
    const navigate = useNavigate();

    // --- UI Constants ---
    const toolIcons: Record<string, string> = {
        move: 'fa-solid fa-arrows-up-down-left-right',
        pen: 'fa-solid fa-paintbrush',
        eraser: 'fa-solid fa-eraser',
        bucket: 'fa-solid fa-fill-drip',
    };

    const toolNames: Record<string, string> = {
        move: '이동',
        pen: '브러쉬',
        eraser: '지우개',
        bucket: '채우기',
    };

    const handleExit = () => {
        if (confirm("저장하지 않은 변경사항은 사라집니다. 정말 나가시겠습니까?")) {
            navigate('/');
        }
    };

    // Canvas State
    const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);

    // Tool State
    const [selectedTool, setSelectedTool] = useState('pen');
    const [brushColor, setBrushColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);

    // AI Generation State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiStyle, setAiStyle] = useState('pixel-art');

    // AI Animation State -> Skeleton Animation Panel State
    const [isSkeletonPanelOpen, setIsSkeletonPanelOpen] = useState(false);
    const skeleton = useSkeletonPreview();
    const [currentMotion, setCurrentMotion] = useState<MotionType | null>(null);
    const [motionConfig, setMotionConfig] = useState({ speed: 1, intensity: 1 });

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
    const [isLoading, setIsLoading] = useState(false);

    // Image Manipulation State
    const dragRef = useRef<{
        type: 'move' | 'tl' | 'tr' | 'bl' | 'br' | 'rotate' | null;
        startX: number;
        startY: number;
        initialTransform: typeof imageTransform;
    }>({ type: null, startX: 0, startY: 0, initialTransform: { x: 0, y: 0, width: 0, height: 0, rotate: 0 } });

    const handleImageMouseDown = (e: React.MouseEvent, type: 'move' | 'tl' | 'tr' | 'bl' | 'br' | 'rotate') => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        dragRef.current = {
            type,
            startX: e.clientX,
            startY: e.clientY,
            initialTransform: { ...imageTransform }
        };
    };

    // Global Mouse Listeners for Image Drag
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!dragRef.current.type) return;

            e.preventDefault();
            const { type, startX, startY, initialTransform } = dragRef.current;
            const dx = (e.clientX - startX) / zoom;
            const dy = (e.clientY - startY) / zoom;

            if (type === 'move') {
                setImageTransform(prev => ({
                    ...prev,
                    x: initialTransform.x + dx,
                    y: initialTransform.y + dy
                }));
            } else if (type === 'rotate') {
                const sensitivity = 0.5;
                setImageTransform(prev => ({
                    ...prev,
                    rotate: initialTransform.rotate + dx * sensitivity
                }));
            } else {
                // Resize Logic
                let newX = initialTransform.x;
                let newY = initialTransform.y;
                let newW = initialTransform.width;
                let newH = initialTransform.height;

                switch (type) {
                    case 'br':
                        newW = initialTransform.width + dx;
                        newH = initialTransform.height + dy;
                        break;
                    case 'bl':
                        newW = initialTransform.width - dx;
                        newX = initialTransform.x + dx;
                        newH = initialTransform.height + dy;
                        break;
                    case 'tr':
                        newW = initialTransform.width + dx;
                        newH = initialTransform.height - dy;
                        newY = initialTransform.y + dy;
                        break;
                    case 'tl':
                        newW = initialTransform.width - dx;
                        newX = initialTransform.x + dx;
                        newH = initialTransform.height - dy;
                        newY = initialTransform.y + dy;
                        break;
                }

                // Minimum size check
                if (newW < 5) newW = 5;
                if (newH < 5) newH = 5;

                setImageTransform(prev => ({
                    ...prev,
                    x: newX,
                    y: newY,
                    width: newW,
                    height: newH
                }));
            }
        };

        const handleGlobalMouseUp = () => {
            dragRef.current = { type: null, startX: 0, startY: 0, initialTransform: dragRef.current.initialTransform };
        };

        if (importedImage) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [zoom, importedImage]);

    // Refs
    const canvasRef = useRef<DrawingCanvasRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Undo/Redo Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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

    // --- Actions ---
    const handleSizeSelect = (size: number) => {
        setCanvasSize({ width: size, height: size });
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const handleClearCanvas = () => {
        if (confirm("캔버스를 초기화하시겠습니까? 모든 작업이 삭제됩니다.")) {
            canvasRef.current?.clear();
        }
    };

    const handleAiGenerate = async () => {
        setIsLoading(true);
        try {
            const response = await SagemakerService.generateAsset({
                prompt: aiPrompt,
                width: canvasSize?.width || 512,
                height: canvasSize?.height || 512,
                style_preset: aiStyle
            });

            if (!response.success || !response.image) {
                throw new Error(response.error || "Image generation failed");
            }

            const img = new Image();
            img.onload = async () => {
                canvasRef.current?.setImage(img);
                setIsAiModalOpen(false);
                await handleRemoveBackground();
            };
            img.src = `data:image/png;base64,${response.image}`;

        } catch (error) {
            console.error(error);
            alert("AI 생성 실패: " + (error instanceof Error ? error.message : "알 수 없는 오류"));
            setIsLoading(false);
        }
    };


    // Load current canvas image into skeleton preview
    const handleLoadToSkeleton = () => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get image data from canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        skeleton.loadFromImageData(imageData);
        setIsSkeletonPanelOpen(true);
    };

    // Play motion on skeleton
    const handlePlayMotion = (motionType: MotionType) => {
        setCurrentMotion(motionType);
        skeleton.playMotion(motionType);
    };

    // Stop motion on skeleton
    const handleStopMotion = () => {
        setCurrentMotion(null);
        skeleton.stopMotion();
    };

    // Update motion config
    const handleUpdateConfig = (newConfig: Partial<{ speed: number; intensity: number }>) => {
        const updated = { ...motionConfig, ...newConfig };
        setMotionConfig(updated);
        skeleton.updateConfig(updated);
    };

    const handleRemoveBackground = async () => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;

        setIsLoading(true);

        // Client-side Background Removal (Flood Fill from Top-Left)
        // This is robust, instant, and free.
        try {
            const w = canvas.width;
            const h = canvas.height;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w;
            tempCanvas.height = h;
            const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });

            if (!ctx) throw new Error("Could not get canvas context");

            ctx.drawImage(canvas, 0, 0);
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;

            // Get background color from (0,0)
            const bgR = data[0];
            const bgG = data[1];
            const bgB = data[2];
            const bgA = data[3];

            // Helper: Color distance check
            const isMatch = (idx: number) => {
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];
                // Strict matching for pixel art, or slight tolerance
                const tolerance = 10;
                return Math.abs(r - bgR) < tolerance &&
                    Math.abs(g - bgG) < tolerance &&
                    Math.abs(b - bgB) < tolerance &&
                    Math.abs(a - bgA) < tolerance;
            };

            // BFS Flood Fill to remove background
            // We assume background is connected to (0,0)
            // If (0,0) is transparent, maybe it's already done, but we check anyway.

            const queue: number[] = [0, 0]; // x, y
            const visited = new Uint8Array(w * h); // 0: unvisited, 1: visited

            // Check if top-left is actually the background (if it's not transparent)
            if (bgA !== 0) {
                while (queue.length > 0) {
                    const y = queue.pop()!;
                    const x = queue.pop()!;

                    const idx = (y * w + x) * 4;
                    const visitIdx = y * w + x;

                    if (visited[visitIdx]) continue;
                    visited[visitIdx] = 1;

                    if (isMatch(idx)) {
                        // Make transparent
                        data[idx + 3] = 0;

                        // Add neighbors
                        if (x > 0) { queue.push(x - 1, y); }
                        if (x < w - 1) { queue.push(x + 1, y); }
                        if (y > 0) { queue.push(x, y - 1); }
                        if (y < h - 1) { queue.push(x, y + 1); }
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);

            // Update Main Canvas
            const finalImg = new Image();
            finalImg.onload = () => {
                canvasRef.current?.setImage(finalImg);
                setIsLoading(false);
            };
            finalImg.src = tempCanvas.toDataURL();

        } catch (error) {
            console.error(error);
            alert("배경 제거 오류: " + (error instanceof Error ? error.message : "알 수 없는 오류"));
            setIsLoading(false);
        }
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

    const handleGlobalMouseUp = () => {
        setIsPanning(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 10));
        }
    };

    const handleImageUpload = (file: File) => {
        if (!canvasSize) return;

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const targetRatio = 0.8;
            const maxWidth = canvasSize.width * targetRatio;
            const maxHeight = canvasSize.height * targetRatio;

            let newWidth = img.width;
            let newHeight = img.height;

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

        canvasRef.current.saveHistory();

        setImportedImage(null);
        setSelectedTool('pen');
    };

    if (!canvasSize) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-zinc-200 select-none font-sans">
                <div className="text-center mb-16 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl shadow-2xl flex items-center justify-center">
                            <i className="fa-solid fa-wand-magic-sparkles text-3xl text-white"></i>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold mb-3 text-white tracking-tight">
                        새 에셋 만들기
                    </h1>
                    <p className="text-zinc-500 text-sm">작업할 캔버스 크기를 선택하세요.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                    {[128, 256, 512].map((size) => (
                        <button
                            key={size}
                            onClick={() => handleSizeSelect(size)}
                            className="group relative w-48 h-48 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800/80 transition-all flex flex-col items-center justify-center shadow-lg hover:shadow-violet-500/10 hover:-translate-y-1"
                        >
                            <div className="text-3xl font-bold mb-3 font-mono text-zinc-300 group-hover:text-white transition-colors">{size}</div>
                            <div className="text-[10px] text-zinc-500 group-hover:text-violet-300 transition-colors uppercase tracking-widest font-semibold">
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
            className="flex flex-col h-screen bg-zinc-950 text-zinc-200 overflow-hidden font-sans select-none"
            onMouseUp={handleGlobalMouseUp}
            onContextMenu={handleContextMenu}
        >
            {/* 1. Top Header */}
            <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 z-20 shadow-sm relative">
                {/* Left: Logo & Title */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-zinc-100 font-bold tracking-tight">
                        <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                            <i className="fa-solid fa-shapes text-sm text-white"></i>
                        </div>
                        <span>에셋 에디터</span>
                    </div>
                    <div className="h-4 w-[1px] bg-zinc-700 mx-2"></div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                        <span>{canvasSize.width}x{canvasSize.height}</span>
                        <span className="text-zinc-600">|</span>
                        <span>{Math.round(zoom * 100)}%</span>
                        {isLoading && <span className="ml-2 text-violet-400 animate-pulse"><i className="fa-solid fa-spinner fa-spin mr-1"></i>처리 중</span>}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {/* Tool Actions */}
                    <div className="flex items-center bg-zinc-950/50 p-1 rounded-lg border border-zinc-800">
                        {/* Save Button */}
                        <button
                            onClick={() => {
                                const canvas = canvasRef.current?.getCanvas();
                                if (canvas) {
                                    canvas.toBlob((blob) => {
                                        if (blob) {
                                            saveAs(blob, `asset_${Date.now()}.png`);
                                        }
                                    }, 'image/png');
                                }
                            }}
                            className="px-3 py-1.5 hover:bg-emerald-800/30 text-emerald-400 hover:text-emerald-300 text-xs rounded-md transition-colors flex items-center gap-2"
                            title="저장"
                        >
                            <i className="fa-solid fa-download"></i> 저장
                        </button>
                        <div className="w-[1px] h-3 bg-zinc-800 mx-1"></div>
                        <button
                            onClick={handleRemoveBackground}
                            disabled={isLoading}
                            className={`px-3 py-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs rounded-md transition-colors flex items-center gap-2 ${isLoading ? 'opacity-50' : ''}`}
                            title="배경 제거"
                        >
                            <i className="fa-solid fa-eraser"></i> 배경 제거
                        </button>
                        <div className="w-[1px] h-3 bg-zinc-800 mx-1"></div>
                        <button
                            onClick={handleClearCanvas}
                            className="px-3 py-1.5 hover:bg-red-900/20 text-zinc-400 hover:text-red-400 text-xs rounded-md transition-colors"
                            title="초기화"
                        >
                            <i className="fa-regular fa-trash-can"></i>
                        </button>
                    </div>

                    {/* AI & Animation Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsAiModalOpen(true)}
                            disabled={isLoading}
                            className={`h-9 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                            <span className="hidden sm:inline">AI 생성</span>
                        </button>

                        <button
                            onClick={handleLoadToSkeleton}
                            disabled={isLoading}
                            className={`h-9 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <i className="fa-solid fa-person-running"></i>
                            <span className="hidden sm:inline">리깅 애니메이션</span>
                        </button>
                    </div>

                    <div className="h-6 w-[1px] bg-zinc-800 mx-1"></div>

                    {/* Exit */}
                    <button
                        onClick={handleExit}
                        className="h-9 w-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors flex items-center justify-center border border-zinc-700"
                        title="나가기"
                    >
                        <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    </button>
                </div>
            </header>

            {/* 2. Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* 2.1 Left Sidebar: Tools */}
                <aside className="w-16 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 gap-3 z-10 shrink-0">
                    {Object.entries(toolNames).map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => {
                                if (importedImage && id !== 'move') {
                                    if (confirm("이미지가 적용되지 않았습니다. 적용하시겠습니까?")) handleBakeImage();
                                    else setImportedImage(null);
                                }
                                setSelectedTool(id);
                            }}
                            title={label}
                            className={`
                                w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-200 relative group
                                ${selectedTool === id
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                                    : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}
                            `}
                        >
                            <i className={toolIcons[id]}></i>
                            {/* Tooltip */}
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-zinc-800 text-zinc-200 text-xs rounded border border-zinc-700 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                {label}
                            </div>
                        </button>
                    ))}

                    <div className="h-[1px] w-8 bg-zinc-800 my-1"></div>

                    {/* Image Upload Tool */}
                    <label className="w-10 h-10 rounded-xl flex items-center justify-center text-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer" title="이미지 불러오기">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                                e.target.value = '';
                            }}
                            className="hidden"
                        />
                        <i className="fa-regular fa-image"></i>
                    </label>
                </aside>

                {/* 2.2 Center: Canvas */}
                <main className="flex-1 relative bg-[#09090b] overflow-hidden flex flex-col">
                    <div className="flex-1 relative overflow-hidden cursor-crosshair"
                        ref={containerRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onWheel={handleWheel}
                    >
                        {/* Canvas Container */}
                        <div
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transformOrigin: '0 0',
                                width: '100%',
                                height: '100%',
                            }}
                            className="absolute top-0 left-0"
                        >
                            {/* The Drawing Canvas */}
                            <div
                                style={{
                                    width: canvasSize.width,
                                    height: canvasSize.height,
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    position: 'absolute',
                                }}
                                className="bg-white shadow-2xl shadow-black/50"
                            >
                                <DrawingCanvas
                                    ref={canvasRef}
                                    width={canvasSize.width}
                                    height={canvasSize.height}
                                    selectedTool={selectedTool === 'move' ? 'none' : selectedTool}
                                    brushColor={brushColor}
                                    brushSize={brushSize}
                                />

                                {/* Imported Image Overlay */}
                                {importedImage && (
                                    <>
                                        {/* Image Itself */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: imageTransform.x,
                                                top: imageTransform.y,
                                                width: imageTransform.width,
                                                height: imageTransform.height,
                                                transform: `rotate(${imageTransform.rotate}deg)`,
                                                pointerEvents: 'auto', // Allow interaction
                                                zIndex: 10
                                            }}
                                            onMouseDown={(e) => handleImageMouseDown(e, 'move')}
                                        >
                                            <img
                                                ref={imageRef}
                                                src={importedImage}
                                                alt="Imported"
                                                className="w-full h-full select-none"
                                                draggable={false}
                                                style={{
                                                    imageRendering: 'pixelated',
                                                    cursor: 'move'
                                                }}
                                            />

                                            {/* Resize Handles */}
                                            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 cursor-nwse-resize z-20"
                                                onMouseDown={(e) => handleImageMouseDown(e, 'tl')} />
                                            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 cursor-nesw-resize z-20"
                                                onMouseDown={(e) => handleImageMouseDown(e, 'tr')} />
                                            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 cursor-nesw-resize z-20"
                                                onMouseDown={(e) => handleImageMouseDown(e, 'bl')} />
                                            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 cursor-nwse-resize z-20"
                                                onMouseDown={(e) => handleImageMouseDown(e, 'br')} />

                                            {/* Rotation Handle (Top Center) */}
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-grab active:cursor-grabbing z-20 flex items-center justify-center"
                                                onMouseDown={(e) => handleImageMouseDown(e, 'rotate')}>
                                                <div className="w-px h-3 bg-blue-500 absolute top-full left-1/2 -translate-x-1/2"></div>
                                            </div>

                                            {/* Selection Border */}
                                            <div className="absolute inset-0 border border-blue-500 pointer-events-none"></div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Floating Zoom Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-full px-4 py-2 flex items-center gap-4 shadow-xl z-20">
                        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="text-zinc-400 hover:text-white transition-colors">
                            <i className="fa-solid fa-minus"></i>
                        </button>
                        <span className="text-xs font-mono w-12 text-center text-zinc-200">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(10, z + 0.1))} className="text-zinc-400 hover:text-white transition-colors">
                            <i className="fa-solid fa-plus"></i>
                        </button>
                        <div className="w-[1px] h-4 bg-zinc-700"></div>
                        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="text-xs text-zinc-400 hover:text-violet-400 transition-colors">
                            Fit
                        </button>
                    </div>
                </main>

                {/* 2.3 Right Sidebar: Properties */}
                <aside className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 z-10">
                    <div className="p-4 border-b border-zinc-800">
                        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Properties</h2>

                        {/* Brush Settings */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs text-zinc-300">Size</label>
                                    <span className="text-xs font-mono text-zinc-500">{brushSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="64"
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-violet-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* Color Picker Section */}
                        <div className="p-4 border-b border-zinc-800">
                            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Color</h2>
                            <div className="custom-color-picker-container">
                                <HexColorPicker color={brushColor} onChange={setBrushColor} style={{ width: '100%' }} />
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <div className="w-8 h-8 rounded border border-zinc-700 shadow-inner" style={{ backgroundColor: brushColor }}></div>
                                <input
                                    type="text"
                                    value={brushColor.toUpperCase()}
                                    onChange={(e) => setBrushColor(e.target.value)}
                                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:border-violet-500 focus:outline-none uppercase"
                                />
                            </div>

                            {/* Quick Colors */}
                            <div className="grid grid-cols-6 gap-2 mt-3">
                                {['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#71717a', '#a1a1aa'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setBrushColor(c)}
                                        className="w-full aspect-square rounded cursor-pointer border border-zinc-700/50 hover:scale-110 transition-transform shadow-sm"
                                        style={{ backgroundColor: c }}
                                    ></button>
                                ))}
                            </div>
                        </div>

                        {/* Layers Section (Visual Only) */}
                        <div className="p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Layers</h2>
                                <button className="text-zinc-500 hover:text-violet-400 transition-colors">
                                    <i className="fa-solid fa-plus"></i>
                                </button>
                            </div>
                            <div className="space-y-2">
                                <div className="p-2 bg-zinc-800 rounded border border-violet-500/50 flex items-center gap-3">
                                    <div className="w-4 text-center"><i className="fa-regular fa-eye text-zinc-400 text-xs"></i></div>
                                    <div className="w-8 h-8 bg-white border border-zinc-600 rounded-sm"></div>
                                    <span className="text-xs text-zinc-200">Layer 1</span>
                                </div>
                                {importedImage && (
                                    <div className="p-2 bg-zinc-900/50 hover:bg-zinc-800 rounded border border-transparent hover:border-zinc-700 flex items-center gap-3 transition-colors cursor-pointer">
                                        <div className="w-4 text-center"><i className="fa-regular fa-eye text-zinc-400 text-xs"></i></div>
                                        <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-sm overflow-hidden relative">
                                            <img src={importedImage} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-xs text-zinc-400 italic">Imported Image</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* AI Generation Modal */}
            {isAiModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsAiModalOpen(false); }}>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-zinc-800/50 p-4 border-b border-zinc-700 flex justify-between items-center">
                            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                                <i className="fa-solid fa-wand-magic-sparkles text-violet-400"></i> AI 에셋 생성
                            </h3>
                            <button onClick={() => setIsAiModalOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 mb-2">프롬프트</label>
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="무엇을 그리고 싶으신가요? (예: 판타지 검, 귀여운 고양이)"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none h-28 resize-none placeholder:text-zinc-600 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 mb-2">스타일</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['pixel-art', 'anime', '3d-model'].map((style) => (
                                        <button key={style} onClick={() => setAiStyle(style)}
                                            className={`py-2 text-xs rounded-lg border transition-all font-medium ${aiStyle === style ? 'bg-violet-600/20 border-violet-500 text-violet-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}>
                                            {style === 'pixel-art' ? '픽셀 아트' : style === 'anime' ? '애니메이션' : '3D'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-zinc-800/30 flex justify-end gap-2 border-t border-zinc-800">
                            <button onClick={() => setIsAiModalOpen(false)} className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 font-medium">취소</button>
                            <button onClick={handleAiGenerate} disabled={!aiPrompt.trim() || isLoading}
                                className={`px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg shadow-violet-600/20 ${(!aiPrompt.trim() || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bolt"></i>} 생성하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Skeleton Animation Panel */}
            {isSkeletonPanelOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsSkeletonPanelOpen(false); }}>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-[500px] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-zinc-800/50 p-4 border-b border-zinc-700 flex justify-between items-center">
                            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                                <i className="fa-solid fa-person-running text-amber-400"></i> 리깅 애니메이션
                            </h3>
                            <button onClick={() => setIsSkeletonPanelOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Skeleton Preview */}
                            <div className="flex justify-center bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                                <SkeletonPreview
                                    ref={skeleton.ref}
                                    width={300}
                                    height={300}
                                    className="rounded"
                                />
                            </div>

                            {/* Motion Buttons */}
                            <div className="grid grid-cols-3 gap-2">
                                {(['idle', 'walk', 'jump', 'attack', 'hit', 'rotate'] as MotionType[]).map((motion) => (
                                    <button
                                        key={motion}
                                        onClick={() => handlePlayMotion(motion)}
                                        className={`px-3 py-2 text-xs font-medium rounded-lg transition-all capitalize ${currentMotion === motion
                                                ? 'bg-amber-600 text-white'
                                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                            }`}
                                    >
                                        {motion}
                                    </button>
                                ))}
                            </div>

                            {/* Controls */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-zinc-400 w-16">Speed</span>
                                    <input
                                        type="range"
                                        min="0.25"
                                        max="2"
                                        step="0.25"
                                        value={motionConfig.speed}
                                        onChange={(e) => handleUpdateConfig({ speed: parseFloat(e.target.value) })}
                                        className="flex-1"
                                    />
                                    <span className="text-xs text-zinc-300 w-8">{motionConfig.speed}x</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-zinc-400 w-16">Intensity</span>
                                    <input
                                        type="range"
                                        min="0.25"
                                        max="2"
                                        step="0.25"
                                        value={motionConfig.intensity}
                                        onChange={(e) => handleUpdateConfig({ intensity: parseFloat(e.target.value) })}
                                        className="flex-1"
                                    />
                                    <span className="text-xs text-zinc-300 w-8">{motionConfig.intensity}x</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-zinc-800/30 flex justify-between gap-2 border-t border-zinc-800">
                            <button onClick={handleStopMotion} className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 font-medium bg-zinc-800 rounded-lg">
                                <i className="fa-solid fa-stop mr-1"></i> 정지
                            </button>
                            <button onClick={() => setIsSkeletonPanelOpen(false)} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-lg font-bold transition-all shadow-lg shadow-amber-600/20">
                                완료
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewAssetsEditorPage;
