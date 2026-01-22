import React, { useState, useRef, useEffect } from 'react';
import DrawingCanvas, { DrawingCanvasRef } from '../components/editor/canvas/DrawingCanvas';
import { saveAs } from 'file-saver';

import { authService } from '../services/authService';
import { SagemakerService } from '../AssetsEditor/services/SagemakerService';
import { useNavigate } from 'react-router-dom';
import { HexColorPicker } from 'react-colorful';
import RiggingModal from '../components/editor/RiggingModal';
import ExportModal from '../components/editor/ExportModal';
import SpriteSheetImportModal from '../components/editor/SpriteSheetImportModal';

const NewAssetsEditorPage: React.FC = () => {
    const navigate = useNavigate();

    // --- UI Constants ---
    const toolIcons: Record<string, string> = {
        move: 'fa-solid fa-arrows-up-down-left-right',
        pen: 'fa-solid fa-paintbrush',
        eraser: 'fa-solid fa-eraser',
        bucket: 'fa-solid fa-fill-drip',
        eyedropper: 'fa-solid fa-eye-dropper',
    };

    const toolNames: Record<string, string> = {
        move: '이동',
        pen: '브러쉬',
        eraser: '지우개',
        bucket: '채우기',
        eyedropper: '스포이드',
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

    // Frame-based Sprite State (Dynamic)
    const [currentFrame, setCurrentFrame] = useState(0);
    const [frames, setFrames] = useState<(ImageData | null)[]>([null]); // Start with 1 frame
    const [copiedFrame, setCopiedFrame] = useState<ImageData | null>(null);
    const [isSpriteMode, setIsSpriteMode] = useState(false);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [fps, setFps] = useState(8);

    // Viewport State (Zoom/Pan)
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);

    // Rigging State
    const [isRiggingModalOpen, setIsRiggingModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isSheetImportModalOpen, setIsSheetImportModalOpen] = useState(false);
    const [sheetFile, setSheetFile] = useState<File | null>(null);

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


    // === Frame-based Sprite Functions ===

    // Enter sprite mode (4-frame editing)
    const handleEnterSpriteMode = () => {
        // Save current canvas to frame 0
        const canvas = canvasRef.current?.getCanvas();
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const newFrames = [...frames];
                newFrames[0] = imageData;
                setFrames(newFrames);
            }
        }
        setIsSpriteMode(true);
        setCurrentFrame(0);
    };

    // Exit sprite mode
    const handleExitSpriteMode = () => {
        setIsSpriteMode(false);
        // Load frame 0 back to canvas
        if (frames[0]) {
            const canvas = canvasRef.current?.getCanvas();
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.putImageData(frames[0], 0, 0);
                }
            }
        }
    };

    // Switch between frames
    const handleFrameSwitch = (newFrame: number) => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Save current frame
        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const newFrames = [...frames];
        newFrames[currentFrame] = currentImageData;

        // Load new frame (or clear if empty)
        if (newFrames[newFrame]) {
            ctx.putImageData(newFrames[newFrame]!, 0, 0);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        setFrames(newFrames);
        setCurrentFrame(newFrame);
    };

    // Add new frame (Copy previous)
    const handleAddFrame = () => {
        if (frames.length >= 32) {
            alert("최대 32프레임까지만 생성 가능합니다.");
            return;
        }

        // Copy the last frame
        const lastFrame = frames[frames.length - 1];
        setFrames([...frames, lastFrame]);

        // Switch to the new frame? Optional, but usually good UX.
        setCurrentFrame(frames.length);
    };

    // Delete current frame
    const handleDeleteFrame = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (frames.length <= 1) {
            alert("최소 1개의 프레임은 있어야 합니다.");
            return;
        }

        if (!confirm(`${index + 1}번 프레임을 삭제하시겠습니까?`)) return;

        const newFrames = frames.filter((_, i) => i !== index);
        setFrames(newFrames);

        // Adjust currentFrame if needed
        if (currentFrame >= newFrames.length) {
            setCurrentFrame(newFrames.length - 1);
            // We need to load this frame to canvas
            const targetFrame = newFrames[newFrames.length - 1];
            loadFrameToCanvas(targetFrame);
        } else if (currentFrame === index) {
            // Deleted currently viewed frame
            const targetFrame = newFrames[currentFrame]; // same index, now next frame
            loadFrameToCanvas(targetFrame);
        }
    };

    const loadFrameToCanvas = (imageData: ImageData | null) => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (imageData) {
            ctx.putImageData(imageData, 0, 0);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    // Playback Loop
    useEffect(() => {
        let intervalId: any;

        if (isPlaying) {
            intervalId = setInterval(() => {
                setCurrentFrame(prev => {
                    const next = (prev + 1) % frames.length;
                    // Load frame logic here inside the loop effectively requires effect on currentFrame change
                    // But we can't easily trigger loadFrameToCanvas from state update callback.
                    // So we rely on effect below.
                    return next;
                });
            }, 1000 / fps);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isPlaying, fps, frames.length]);

    // Effect to update canvas when currentFrame changes (Only during playback?)
    // Or always? If we switch frame manually, we call handleFrameSwitch which does both.
    // If playback switches frame, we need this effect.
    // BUT handleFrameSwitch logic also saves current frame. 
    // Playback should NOT save current frame every tick, just DISPLAY.

    // Changing approach:
    // Manual switch -> Saves current, loads new.
    // Playback switch -> Just loads new.

    useEffect(() => {
        if (isPlaying) {
            const targetFrame = frames[currentFrame];
            loadFrameToCanvas(targetFrame);
        }
    }, [currentFrame, isPlaying]);

    // Copy current frame to clipboard (internal)

    const handleCopyFrame = () => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setCopiedFrame(imageData);
    };

    const handlePasteFrame = () => {
        if (!copiedFrame) return;
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.putImageData(copiedFrame, 0, 0);
    };

    // Apply procedural animation preset
    const handleApplyPreset = (type: 'breathing' | 'jump' | 'shake') => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;

        // Reset to 4 frames if not already
        if (frames.length !== 4) {
            alert(`프리셋 적용을 위해 프레임 수가 4개로 초기화됩니다.`);
        }

        // Ensure we capture latest changes to current frame
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Get base frame (Frame 0 or current frame if 0)
        let baseImageData: ImageData;
        if (currentFrame === 0) {
            baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } else if (frames[0]) {
            baseImageData = frames[0];
        } else {
            alert("Frame 1(원본)이 비어있습니다. 먼저 그림을 그려주세요.");
            return;
        }

        // Helper: Create temp canvas with base image
        const createTempCanvas = () => {
            const c = document.createElement('canvas');
            c.width = 512;
            c.height = 512;
            const cx = c.getContext('2d');
            if (cx) cx.putImageData(baseImageData, 0, 0);
            return c;
        };

        // Force 4 frames
        const newFrames = [baseImageData, null, null, null];

        const processFrame = (frameIndex: number, transform: (ctx: CanvasRenderingContext2D, img: HTMLCanvasElement) => void) => {
            const c = document.createElement('canvas');
            c.width = 512;
            c.height = 512;
            const cx = c.getContext('2d');
            if (!cx) return null;

            // Draw transformed image
            cx.save();
            transform(cx, createTempCanvas());
            cx.restore();

            return cx.getImageData(0, 0, 512, 512);
        };

        // 2. Generate frames based on type
        if (type === 'breathing') {
            // Frame 0: Normal
            // Frame 1: Squash (Height 98%, Width 102%)
            // Frame 2: Normal
            // Frame 3: Stretch (Height 102%, Width 98%)
            newFrames[1] = processFrame(1, (cx, img) => {
                cx.translate(256, 512); // Pivot bottom center
                cx.scale(1.02, 0.98);
                cx.translate(-256, -512);
                cx.drawImage(img, 0, 0);
            });
            newFrames[2] = baseImageData; // Normal
            newFrames[3] = processFrame(3, (cx, img) => {
                cx.translate(256, 512);
                cx.scale(0.98, 1.02);
                cx.translate(-256, -512);
                cx.drawImage(img, 0, 0);
            });

        } else if (type === 'jump') {
            // Frame 0: Normal
            // Frame 1: Up 10px
            // Frame 2: Up 20px
            // Frame 3: Up 10px
            newFrames[1] = processFrame(1, (cx, img) => cx.drawImage(img, 0, -15));
            newFrames[2] = processFrame(2, (cx, img) => cx.drawImage(img, 0, -30));
            newFrames[3] = processFrame(3, (cx, img) => cx.drawImage(img, 0, -15));

        } else if (type === 'shake') {
            // Frame 0: Normal
            // Frame 1: Left 5px
            // Frame 2: Right 5px
            // Frame 3: Normal
            newFrames[1] = processFrame(1, (cx, img) => cx.drawImage(img, -8, 0));
            newFrames[2] = processFrame(2, (cx, img) => cx.drawImage(img, 8, 0));
            newFrames[3] = baseImageData;
        }

        // 3. Update state
        setFrames(newFrames);

        // Show animation result (switch to next frame to see effect, or stay)
        // Let's reload current frame to reflect changes if we modified it (unlikely here as we modify 1-3)
        // If user is on frame 0, they see no change. Maybe switch to 1?
        // Let's stick to current frame but refresh logic.

        if (newFrames[currentFrame]) {
            ctx.putImageData(newFrames[currentFrame]!, 0, 0);
        }

        alert(`⚡ '${type}' 프리셋이 적용되었습니다! F1~F4 탭을 눌러 확인해보세요.`);
    };


    // Save sprite sheet (Dynamic width)
    const handleSaveSpriteSheet = () => {
        const canvas = canvasRef.current?.getCanvas();
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Save current frame first
        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const finalFrames = [...frames];
        finalFrames[currentFrame] = currentImageData;

        const frameCount = finalFrames.length;
        const width = frameCount * 512;
        const height = 512;

        // Create sprite sheet canvas
        const spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = width;
        spriteCanvas.height = height;
        const spriteCtx = spriteCanvas.getContext('2d');
        if (!spriteCtx) return;

        // Draw each frame
        for (let i = 0; i < frameCount; i++) {
            if (finalFrames[i]) {
                // Create temp canvas to convert ImageData to drawable
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = 512;
                tempCanvas.height = 512;
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) {
                    tempCtx.putImageData(finalFrames[i]!, 0, 0);
                    spriteCtx.drawImage(tempCanvas, i * 512, 0);
                }
            }
        }

        // Download
        spriteCanvas.toBlob((blob) => {
            if (blob) {
                saveAs(blob, `sprite_sheet_${frames.length}x_${Date.now()}.png`);
            }
        }, 'image/png');
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

            // Global Color Replacement (Scan all pixels)
            // Removes "islands" like gaps between arms/legs
            if (bgA !== 0) {
                for (let i = 0; i < data.length; i += 4) {
                    if (isMatch(i)) {
                        data[i + 3] = 0; // Make transparent
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

    // Mouse wheel zoom with useEffect for non-passive listener
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !canvasSize) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate mouse position relative to the canvas (accounting for current pan and zoom)
            const canvasMouseX = (mouseX - pan.x) / zoom;
            const canvasMouseY = (mouseY - pan.y) / zoom;

            // Calculate new zoom
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(Math.max(zoom * delta, 0.1), 10);

            // Adjust pan so that the mouse stays over the same canvas pixel
            const newPanX = mouseX - canvasMouseX * newZoom;
            const newPanY = mouseY - canvasMouseY * newZoom;

            setZoom(newZoom);
            setPan({ x: newPanX, y: newPanY });
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [canvasSize, pan, zoom]);

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

                    {/* Export Button */}
                    <button
                        onClick={() => setIsExportModalOpen(true)}
                        className="h-9 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded-lg border border-zinc-700 transition-all flex items-center gap-2"
                        title="내보내기 (마켓플레이스/프로젝트)"
                    >
                        <i className="fa-solid fa-share-from-square"></i>
                        <span className="hidden sm:inline">내보내기</span>
                    </button>

                    {/* AI & Sprite Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsAiModalOpen(true)}
                            disabled={isLoading}
                            className={`h-9 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                            <span className="hidden sm:inline">AI 생성</span>
                        </button>

                        {!isSpriteMode ? (
                            <button
                                onClick={handleEnterSpriteMode}
                                disabled={isLoading}
                                className={`h-9 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <i className="fa-solid fa-film"></i>
                                <span className="hidden sm:inline">스프라이트 모드</span>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleSaveSpriteSheet}
                                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg shadow-lg flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-download"></i>
                                    <span className="hidden sm:inline">스프라이트 저장</span>
                                </button>
                                <button
                                    onClick={handleExitSpriteMode}
                                    className="h-9 px-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded-lg"
                                    title="스프라이트 모드 종료"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </>
                        )}
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
                                    onColorPick={(color) => {
                                        setBrushColor(color);
                                        setSelectedTool('pen'); // 색상 추출 후 자동으로 브러시 도구로 전환
                                    }}
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

                    {/* Timeline (Sprite Mode Only) */}
                    {isSpriteMode && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl flex flex-col gap-2 z-30 animate-in slide-in-from-bottom-10 fade-in duration-300">

                            {/* NEW: Timeline Control Bar */}
                            <div className="bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-xl p-2 flex justify-between items-center shadow-lg">

                                {/* Left: Playback & Settings */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 bg-zinc-950/50 rounded-lg border border-zinc-800 p-1">
                                        <button
                                            onClick={() => setIsPlaying(!isPlaying)}
                                            className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${isPlaying ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                                            title={isPlaying ? "정지" : "재생"}
                                        >
                                            <i className={`fa-solid ${isPlaying ? 'fa-stop' : 'fa-play'}`}></i>
                                        </button>
                                        <div className="flex items-center gap-1 px-1 border-l border-zinc-800 pl-2">
                                            <span className="text-[10px] text-zinc-500 font-mono">FPS</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={fps}
                                                onChange={(e) => setFps(Number(e.target.value))}
                                                className="w-8 h-5 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-center text-zinc-300 focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex items-center gap-2">
                                    {/* Presets Button Group */}
                                    <div className="relative group">
                                        <button className="h-8 px-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs rounded-lg flex items-center gap-2 border border-indigo-500/30">
                                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                                            <span className="hidden sm:inline">프리셋</span>
                                        </button>
                                        <div className="absolute bottom-full right-0 mb-1 w-32 hidden group-hover:block z-50">
                                            <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                                                <button onClick={() => handleApplyPreset('breathing')} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                                                    😮‍💨 숨쉬기
                                                </button>
                                                <button onClick={() => handleApplyPreset('jump')} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                                                    🦘 점프
                                                </button>
                                                <button onClick={() => handleApplyPreset('shake')} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                                                    🫨 흔들림
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-4 w-[1px] bg-zinc-700 mx-1"></div>

                                    {/* Copy/Paste */}
                                    <button
                                        onClick={handleCopyFrame}
                                        className="h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg flex items-center justify-center border border-zinc-700"
                                        title="프레임 복사"
                                    >
                                        <i className="fa-regular fa-copy"></i>
                                    </button>
                                    <button
                                        onClick={handlePasteFrame}
                                        disabled={!copiedFrame}
                                        className={`h-8 w-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg flex items-center justify-center border border-zinc-700 ${!copiedFrame ? 'opacity-50' : ''}`}
                                        title="프레임 붙여넣기"
                                    >
                                        <i className="fa-regular fa-clipboard"></i>
                                    </button>

                                    <div className="h-4 w-[1px] bg-zinc-700 mx-1"></div>

                                    {/* Sheet Import */}
                                    <label className="h-8 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg flex items-center gap-2 cursor-pointer border border-zinc-700 hover:border-zinc-500 transition-all" title="스프라이트 시트 가져오기">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    setSheetFile(e.target.files[0]);
                                                    setIsSheetImportModalOpen(true);
                                                    e.target.value = ''; // Reset
                                                }
                                            }}
                                        />
                                        <i className="fa-solid fa-table-cells"></i>
                                        <span className="hidden sm:inline">시트 가져오기</span>
                                    </label>

                                    {/* Rigging Button */}
                                    <button
                                        onClick={() => {
                                            // 1. Ensure current frame has data
                                            const canvas = canvasRef.current?.getCanvas();
                                            if (!canvas) return;
                                            const ctx = canvas.getContext('2d');
                                            if (!ctx) return;

                                            // Capture current rendering to update frames state
                                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                            const newFrames = [...frames];
                                            newFrames[currentFrame] = imageData;
                                            setFrames(newFrames);

                                            setIsRiggingModalOpen(true);
                                        }}
                                        className="h-8 px-3 bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 hover:text-amber-400 text-xs rounded-lg flex items-center gap-2 border border-amber-500/30"
                                    >
                                        <i className="fa-solid fa-bone"></i>
                                        <span className="hidden sm:inline">리깅</span>
                                    </button>
                                </div>
                            </div>

                            {/* Existing Frame List Container */}
                            <div className="bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-xl p-3 flex items-center gap-3 shadow-2xl">
                                {/* Frame List (Scrollable) */}
                                <div className="flex-1 overflow-x-auto flex items-center gap-2 scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-transparent py-1 px-1">
                                    {frames.map((_, index) => (
                                        <div key={index} className="relative group/frame shrink-0">
                                            <button
                                                onClick={() => handleFrameSwitch(index)}
                                                className={`w-16 h-16 flex flex-col items-center justify-center rounded-lg border-2 transition-all ${currentFrame === index
                                                    ? 'bg-zinc-800 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                                    : 'bg-zinc-950/50 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'
                                                    }`}
                                            >
                                                <span className={`text-xs font-bold ${currentFrame === index ? 'text-amber-500' : 'text-zinc-500'}`}>
                                                    {index + 1}
                                                </span>
                                                <div className="w-8 h-8 mt-1 rounded bg-zinc-800/50 flex items-center justify-center">
                                                    <i className="fa-solid fa-image text-zinc-600 text-[10px]"></i>
                                                </div>
                                            </button>

                                            {/* Delete Button */}
                                            {frames.length > 1 && (
                                                <button
                                                    onClick={(e) => handleDeleteFrame(index, e)}
                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-400 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover/frame:opacity-100 transition-all shadow-md hover:scale-110 z-10"
                                                    title="프레임 삭제"
                                                >
                                                    <i className="fa-solid fa-xmark"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add Frame Button */}
                                    <button
                                        onClick={handleAddFrame}
                                        className="w-16 h-16 shrink-0 flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 text-zinc-600 hover:text-zinc-400 transition-all"
                                        title="프레임 추가"
                                    >
                                        <i className="fa-solid fa-plus text-xl"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Floating Zoom Controls (Adjusted position) */}
                    <div className="absolute bottom-6 right-6 bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-full px-4 py-2 flex items-center gap-4 shadow-xl z-20">
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


                    </div>
                </aside>
            </div>

            {/* Rigging Modal */}
            <RiggingModal
                isOpen={isRiggingModalOpen}
                onClose={() => setIsRiggingModalOpen(false)}
                onApply={(newFrames) => {
                    setFrames(newFrames);
                    setCurrentFrame(0);
                    // Load first frame to canvas
                    const canvas = canvasRef.current?.getCanvas();
                    if (canvas && newFrames[0]) {
                        canvas.getContext('2d')?.putImageData(newFrames[0], 0, 0);
                    }
                    setIsRiggingModalOpen(false);
                }}
                baseImageData={frames[currentFrame] || (frames[0] as ImageData)}
            />

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

            {/* Export Modal */}
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                getCanvasBlob={() => new Promise<Blob | null>((resolve) => {
                    const canvas = canvasRef.current?.getCanvas();
                    if (canvas) {
                        canvas.toBlob(resolve, 'image/png');
                    } else {
                        resolve(null);
                    }
                })}
            />

            {/* Sheet Import Modal */}
            <SpriteSheetImportModal
                isOpen={isSheetImportModalOpen}
                file={sheetFile}
                canvasSize={canvasSize}
                onClose={() => setIsSheetImportModalOpen(false)}
                onImport={(newFrames) => {
                    if (newFrames.length === 0) return;

                    setFrames(prev => {
                        const updated = [...prev];
                        // 1. Replace current frame with the first imported frame
                        updated[currentFrame] = newFrames[0];

                        // 2. Insert the rest of the frames after the current frame
                        if (newFrames.length > 1) {
                            const remaining = newFrames.slice(1);
                            updated.splice(currentFrame + 1, 0, ...remaining);
                        }
                        return updated;
                    });

                    // Update canvas immediately with the first imported frame (which is now current)
                    const canvas = canvasRef.current?.getCanvas();
                    const ctx = canvas?.getContext('2d');
                    if (canvas && ctx) {
                        ctx.putImageData(newFrames[0], 0, 0);
                    }

                    // Optional: If you want to move selection to the last imported frame?
                    // Or keep it at the start? User didn't specify, but keeping at current (start of import) or moving to end is common.
                    // Let's keep the focus on the current frame (the first one imported) as they said "make current frame the 1st frame"
                }}
            />

        </div>
    );
};

export default NewAssetsEditorPage;
