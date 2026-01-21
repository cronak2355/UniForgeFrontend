import React, { useState, useRef, useEffect } from 'react';
import DrawingCanvas, { DrawingCanvasRef } from '../components/editor/canvas/DrawingCanvas';
import Toolbar from '../components/editor/tools/Toolbar';
import { saveAs } from 'file-saver';

import { authService } from '../services/authService';
import { SagemakerService } from '../AssetsEditor/services/SagemakerService';

const NewAssetsEditorPage: React.FC = () => {
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

    // AI Animation State
    const [isAnimModalOpen, setIsAnimModalOpen] = useState(false);
    const [animPrompt, setAnimPrompt] = useState('');

    // ... Viewport State (Zoom/Pan)

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
                // Rotation Logic
                const centerX = initialTransform.x + initialTransform.width / 2;
                const centerY = initialTransform.y + initialTransform.height / 2;

                // Get center in screen coordinates
                // We need to account for canvas pan and zoom to get accurate screen center?
                // Actually, simplest is to use vectors from center.
                // But center depends on where the canvas is.

                // Let's rely on simple delta for now, or use arctan2 if we want absolute angle.
                // Delta is easier for consistency.
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

                // Minimum size check to prevent flipping
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
            // 1. Generate Asset (SDXL) - Backend handles translation automatically
            const response = await SagemakerService.generateAsset({
                prompt: aiPrompt, // Send Korean directly
                width: canvasSize?.width || 512,
                height: canvasSize?.height || 512,
                style_preset: aiStyle
            });

            if (!response.success || !response.image) {
                throw new Error(response.error || "Image generation failed");
            }

            // 2. Load Image to Canvas
            const img = new Image();
            img.onload = async () => {
                canvasRef.current?.setImage(img);
                setIsAiModalOpen(false); // Close Modal

                // 3. Auto Trigger Background Removal
                await handleRemoveBackground();
            };
            img.src = `data:image/png;base64,${response.image}`;

        } catch (error) {
            console.error(error);
            alert("AI 생성 실패: " + (error instanceof Error ? error.message : "알 수 없는 오류"));
            setIsLoading(false);
        }
    };

    const handleAnimGenerate = async () => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) {
            alert("캔버스를 찾을 수 없습니다.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Capture current canvas
            const base64Image = canvas.toDataURL('image/png').split(',')[1];

            // 2. Call API
            const response = await SagemakerService.generateAnimationSheet(animPrompt, base64Image);

            if (!response.success || !response.image) {
                throw new Error(response.error || "Animation generation failed");
            }

            // 3. Load Result
            const img = new Image();
            img.onload = async () => {
                canvasRef.current?.setImage(img);
                setIsAnimModalOpen(false);

                // Optional: Auto Remove Background for the sheet?
                // Might be risky for a sheet, but let's try it if the prompt forces white background.
                await handleRemoveBackground();
            };
            img.src = `data:image/png;base64,${response.image}`;

        } catch (error) {
            console.error(error);
            alert("애니메이션 생성 실패: " + (error instanceof Error ? error.message : "알 수 없는 오류"));
            setIsLoading(false);
        }
    };

    const handleRemoveBackground = async () => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;

        setIsLoading(true);

        const w = canvas.width;
        const h = canvas.height;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        if (!tempCtx) {
            setIsLoading(false);
            return;
        }

        try {
            // 1. Get Base64 for API
            const base64Image = canvas.toDataURL('image/png').split(',')[1];
            let processSuccess = false;

            // 2. Try API First
            const token = authService.getToken();
            try {
                const response = await fetch('/api/remove-background', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : '',
                    },
                    body: JSON.stringify({ image: base64Image }),
                });

                if (!response.ok) throw new Error('API Failed');

                const data = await response.json();
                const cleanBase64 = data.image;

                const blob = await (await fetch(`data:image/png;base64,${cleanBase64}`)).blob();
                const bitmap = await createImageBitmap(blob);
                tempCtx.clearRect(0, 0, w, h);
                tempCtx.drawImage(bitmap, 0, 0, w, h);
                processSuccess = true;

            } catch (apiError) {
                console.warn("API Background Removal Failed, using fallback:", apiError);

                // 3. Fallback: Legacy Algorithm
                tempCtx.drawImage(canvas, 0, 0);
                const imageData = tempCtx.getImageData(0, 0, w, h);
                const data = imageData.data;

                // --- Algorithm Helpers (Legacy) ---
                const detectBackgroundColor = (data: Uint8ClampedArray, w: number, h: number) => {
                    const candidates: number[] = [];
                    for (let x = 0; x < w; x += 5) { candidates.push(x); candidates.push((h - 1) * w + x); }
                    for (let y = 0; y < h; y += 5) { candidates.push(y * w); candidates.push(y * w + w - 1); }
                    const colorGeneric = (r: number, g: number, b: number) =>
                        `${Math.floor(r / 15)},${Math.floor(g / 15)},${Math.floor(b / 15)}`;
                    const counts: Record<string, { count: number, color: { r: number, g: number, b: number, a: number } }> = {};
                    for (const idx of candidates) {
                        if (idx >= data.length / 4) continue;
                        const r = data[idx * 4]; const g = data[idx * 4 + 1]; const b = data[idx * 4 + 2]; const a = data[idx * 4 + 3];
                        if (a === 0) continue;
                        const key = colorGeneric(r, g, b);
                        if (!counts[key]) counts[key] = { count: 0, color: { r, g, b, a } };
                        counts[key].count++;
                    }
                    let maxCount = 0; let winner = null;
                    for (const key in counts) {
                        if (counts[key].count > maxCount) { maxCount = counts[key].count; winner = counts[key].color; }
                    }
                    return winner;
                };

                const removeBackgroundAlg = (data: Uint8ClampedArray, w: number, h: number, bgColor: { r: number, g: number, b: number }) => {
                    const isGreenDominant = bgColor.g > bgColor.r + 30 && bgColor.g > bgColor.b + 30;
                    const baseTolerance = isGreenDominant ? 25 : 10;
                    const tolerance = baseTolerance + 10; // Default feather

                    const visited = new Uint8Array(w * h);
                    const stack: number[] = [];
                    for (let x = 0; x < w; x++) { stack.push(x); stack.push((h - 1) * w + x); visited[x] = 1; visited[(h - 1) * w + x] = 1; }
                    for (let y = 1; y < h - 1; y++) { stack.push(y * w); stack.push(y * w + w - 1); visited[y * w] = 1; visited[y * w + w - 1] = 1; }
                    const toleranceSq = tolerance * tolerance;

                    const getDistSq = (idx: number) => {
                        const r = data[idx * 4]; const g = data[idx * 4 + 1]; const b = data[idx * 4 + 2];
                        const dr = r - bgColor.r; const dg = g - bgColor.g; const db = b - bgColor.b;
                        return dr * dr + dg * dg + db * db;
                    };

                    // Initial seed filtering
                    let writePtr = 0;
                    for (let i = 0; i < stack.length; i++) {
                        const d2 = getDistSq(stack[i]);
                        if (d2 < toleranceSq) stack[writePtr++] = stack[i];
                    }
                    stack.length = writePtr;

                    while (stack.length > 0) {
                        const idx = stack.pop()!;
                        const d2 = getDistSq(idx);

                        // Soft erase
                        data[idx * 4 + 3] = 0;

                        const x = idx % w; const y = Math.floor(idx / w);
                        const neighbors = [{ nx: x + 1, ny: y }, { nx: x - 1, ny: y }, { nx: x, ny: y + 1 }, { nx: x, ny: y - 1 }];
                        for (const { nx, ny } of neighbors) {
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                const nIdx = ny * w + nx;
                                if (visited[nIdx] === 0) {
                                    const nd2 = getDistSq(nIdx);
                                    if (nd2 < toleranceSq) {
                                        visited[nIdx] = 1;
                                        stack.push(nIdx);
                                    }
                                }
                            }
                        }
                    }
                };

                const bgColor = detectBackgroundColor(data, w, h);
                if (bgColor) {
                    removeBackgroundAlg(data, w, h, bgColor);
                    tempCtx.putImageData(imageData, 0, 0);
                    processSuccess = true;
                    console.warn('Fell back to algorithmic removal.');
                } else {
                    alert("배경 제거 실패: 단색 배경이 감지되지 않았습니다.");
                }
            }

            // 4. Smart Crop & Replace Logic
            if (processSuccess) {
                const imageData = tempCtx.getImageData(0, 0, w, h);
                const data = imageData.data;

                const getBounds = (data: Uint8ClampedArray, w: number, h: number) => {
                    let minX = w, minY = h, maxX = 0, maxY = 0;
                    let hasPixels = false;
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            const idx = (y * w + x) * 4;
                            if (data[idx + 3] > 0) {
                                if (x < minX) minX = x; if (x > maxX) maxX = x;
                                if (y < minY) minY = y; if (y > maxY) maxY = y;
                                hasPixels = true;
                            }
                        }
                    }
                    return { minX, minY, maxX, maxY, hasPixels };
                };

                const b = getBounds(data, w, h);

                // Draw back to main canvas
                const finalImg = new Image();
                finalImg.onload = () => {
                    canvasRef.current?.setImage(finalImg);
                    setIsLoading(false);
                };
                finalImg.src = tempCanvas.toDataURL(); // We just use the temp canvas result directly for now without scaling to keep it simple, or we can add scaling if user wants "Smart Crop" specifically. 
                // Legacy did smart crop. Let's do simple placement for now to ensure stability, or duplicate legacy exactly?
                // Legacy scaled content to fit canvas. That changes pixel art size.
                // Let's just put the result back as is to avoid unexpected resizing, unless user explicitly wanted "Centered & Scaled".
                // Given the context is "Asset Editor", maybe preserving scale is better?
                // But the user asked to "Check legacy logic". Legacy logic *did* smart scaling.
                // Let's stick to EXACT legacy behavior: Crop transparent area, then scale content to fit canvas with padding.

                if (b.hasPixels) {
                    // Smart Crop & Scale logic implementation
                    const contentW = b.maxX - b.minX + 1;
                    const contentH = b.maxY - b.minY + 1;

                    // Extract content
                    const cCanvas = document.createElement('canvas');
                    cCanvas.width = contentW; cCanvas.height = contentH;
                    cCanvas.getContext('2d')?.putImageData(tempCtx.getImageData(b.minX, b.minY, contentW, contentH), 0, 0);

                    // Prepare target
                    const targetCanvas = document.createElement('canvas');
                    targetCanvas.width = w; targetCanvas.height = h;
                    const tCtx = targetCanvas.getContext('2d');
                    if (tCtx) {
                        tCtx.imageSmoothingEnabled = false;

                        // Calculate safe scale
                        const safePadding = 2;
                        const targetSize = w - (safePadding * 2);
                        const scale = Math.min(targetSize / contentW, targetSize / contentH);

                        const dstW = Math.floor(contentW * scale);
                        const dstH = Math.floor(contentH * scale);
                        const offX = Math.floor((w - dstW) / 2);
                        const offY = Math.floor((h - dstH) / 2);

                        tCtx.drawImage(cCanvas, 0, 0, contentW, contentH, offX, offY, dstW, dstH);

                        const resultImg = new Image();
                        resultImg.onload = () => {
                            canvasRef.current?.setImage(resultImg);
                            setIsLoading(false);
                        }
                        resultImg.src = targetCanvas.toDataURL();
                    }
                } else {
                    setIsLoading(false); // Empty result
                }
            } else {
                setIsLoading(false);
            }

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

    // Image Upload Logic
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

        canvasRef.current.saveHistory();

        setImportedImage(null);
        setSelectedTool('pen');
    };

    if (!canvasSize) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#1e1e1e] text-gray-200 select-none font-sans">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-3 text-gray-100 tracking-tight">
                        에셋 에디터
                    </h1>
                    <p className="text-gray-500 text-sm">캔버스 크기를 선택하여 시작하세요.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[128, 256, 512].map((size) => (
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
                    <div className="flex gap-4 text-[11px] text-gray-500 font-mono items-center">
                        <span>{canvasSize.width}x{canvasSize.height}</span>
                        <span className="text-gray-700">|</span>
                        <span>{Math.round(zoom * 100)}%</span>
                        <span className="text-gray-700">|</span>
                        <span className="uppercase text-gray-400">{selectedTool === 'move' && importedImage ? '이미지 변형 모드' : selectedTool}</span>
                        {/* Status Message */}
                        {isLoading && <span className="text-blue-400 ml-4 animate-pulse"><i className="fa-solid fa-spinner fa-spin mr-1"></i>처리 중...</span>}
                    </div>
                    <div className="flex gap-3">
                        {/* Extra Actions */}
                        <button
                            onClick={() => setIsAiModalOpen(true)}
                            disabled={isLoading}
                            className={`px-3 py-1 bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 text-[11px] rounded-[2px] transition-colors border border-purple-500/30 flex items-center gap-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="AI 에셋 생성 (SDXL)"
                        >
                            <i className="fa-solid fa-wand-magic-sparkles"></i> AI 생성
                        </button>

                        <button
                            onClick={() => setIsAnimModalOpen(true)}
                            disabled={isLoading}
                            className={`ml-1 px-3 py-1 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-200 text-[11px] rounded-[2px] transition-colors border border-indigo-500/30 flex items-center gap-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="기존 캐릭터로 애니메이션 시트 생성"
                        >
                            <i className="fa-solid fa-film"></i> AI 애니메이션
                        </button>
                        <div className="w-[1px] h-4 bg-[#333] my-auto mx-1"></div>

                        <button
                            onClick={handleRemoveBackground}
                            disabled={isLoading}
                            className={`px-3 py-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 text-[11px] rounded-[2px] transition-colors border border-[#333] flex items-center gap-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="AI 배경 제거"
                        >
                            <i className="fa-solid fa-eraser text-gray-400"></i> 배경 제거
                        </button>
                        <button
                            onClick={handleClearCanvas}
                            className="px-3 py-1 bg-[#2a2a2a] hover:bg-red-900/30 hover:text-red-400 text-gray-300 text-[11px] rounded-[2px] transition-colors border border-[#333]"
                            title="전체 지우기"
                        >
                            <i className="fa-regular fa-trash-can"></i>
                        </button>
                        <div className="w-[1px] h-4 bg-[#333] my-auto mx-1"></div>


                        {/* AI Generation Modal */}
                        {isAiModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                                onClick={(e) => {
                                    if (e.target === e.currentTarget) setIsAiModalOpen(false);
                                }}>
                                <div className="bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl w-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="bg-[#252525] px-4 py-3 border-b border-[#333] flex justify-between items-center">
                                        <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                                            <i className="fa-solid fa-wand-magic-sparkles text-purple-400"></i>
                                            AI 에셋 생성
                                        </h3>
                                        <button onClick={() => setIsAiModalOpen(false)} className="text-gray-500 hover:text-gray-300">
                                            <i className="fa-solid fa-xmark"></i>
                                        </button>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1.5">프롬프트 (한글 가능)</label>
                                            <textarea
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                placeholder="예: 귀여운 픽셀 아트 고양이, 판타지 검, 붉은 포션..."
                                                className="w-full bg-[#121212] border border-[#333] rounded p-2 text-sm text-gray-200 focus:border-purple-500 focus:outline-none h-24 resize-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1.5">스타일 프리셋</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['pixel-art', 'anime', '3d-model'].map((style) => (
                                                    <button
                                                        key={style}
                                                        onClick={() => setAiStyle(style)}
                                                        className={`px-2 py-2 text-xs rounded border transition-colors ${aiStyle === style
                                                            ? 'bg-purple-900/30 border-purple-500 text-purple-200'
                                                            : 'bg-[#252525] border-[#333] text-gray-400 hover:bg-[#2a2a2a]'
                                                            }`}
                                                    >
                                                        {style === 'pixel-art' ? '픽셀 아트' : style === 'anime' ? '애니메이션' : '3D 모델'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-[#333] bg-[#222] flex justify-end gap-2">
                                        <button
                                            onClick={() => setIsAiModalOpen(false)}
                                            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleAiGenerate}
                                            disabled={!aiPrompt.trim() || isLoading}
                                            className={`px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded flex items-center gap-2 font-medium transition-colors ${(!aiPrompt.trim() || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                        >
                                            {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                                            {isLoading ? '생성 중...' : '생성하기'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                {/* Custom Moveable Implementation */}
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
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewAssetsEditorPage;
