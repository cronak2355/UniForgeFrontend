import React, { useState, useRef, useEffect } from 'react';

// Types
export interface RiggingPart {
    id: string;
    name: string;
    color: string;
    // We store mask as a specialized canvas or ImageData to overlay
    maskData: ImageData | null;
    // Visualization properties
    isVisible: boolean;
    // Computed during transition to animation
    imageBitmap?: ImageBitmap;
    origin?: { x: number, y: number };
}

export interface FrameTransform {
    [partId: string]: { x: number, y: number, rotate: number, scale: number, scaleX: number }
}

interface RiggingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (newFrames: ImageData[]) => void;
    baseImageData: ImageData | null;
}

const RiggingModal: React.FC<RiggingModalProps> = ({ isOpen, onClose, onApply, baseImageData }) => {
    // --- State ---
    const [step, setStep] = useState<'setup' | 'animation'>('setup');
    const [parts, setParts] = useState<RiggingPart[]>([]);
    const [activePartId, setActivePartId] = useState<string | null>(null);
    const [brushSize, setBrushSize] = useState(10);
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');

    // Animation State
    const [transforms, setTransforms] = useState<FrameTransform[]>([{}, {}, {}, {}]); // 4 frames default
    const [currentAnimFrame, setCurrentAnimFrame] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Refs
    const setupCanvasRef = useRef<HTMLCanvasElement>(null);
    const animCanvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 });

    // Constants
    const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

    // --- Setup Phase Logic ---

    // Drag & Drop State
    const [dragPartIndex, setDragPartIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDragPartIndex(index);
        e.dataTransfer.effectAllowed = "move"; // Indicate move operation
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        if (dragPartIndex === null || dragPartIndex === index) return;

        // Perform reordering on hover (or can do on drop)
        // Doing on hover gives real-time feedback
        const newParts = [...parts];
        const draggedItem = newParts[dragPartIndex];
        newParts.splice(dragPartIndex, 1);
        newParts.splice(index, 0, draggedItem);

        setParts(newParts);
        setDragPartIndex(index);
    };

    const handleDragEnd = () => {
        setDragPartIndex(null);
    };

    // Rename & Delete State
    const [editingPartId, setEditingPartId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const startEditing = (part: RiggingPart, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingPartId(part.id);
        setEditName(part.name);
    };

    const saveEditing = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!editingPartId) return;

        setParts(prev => prev.map(p =>
            p.id === editingPartId ? { ...p, name: editName || p.name } : p
        ));
        setEditingPartId(null);
    };

    const cancelEditing = () => {
        setEditingPartId(null);
    };

    const handleDeletePart = (partId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("정말 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)")) return;

        setParts(prev => prev.filter(p => p.id !== partId));
        if (activePartId === partId) {
            setActivePartId(null);
        }
    };


    // Init Parts when opening
    useEffect(() => {
        if (isOpen && parts.length === 0) {
            setParts([
                { id: 'head', name: '머리', color: COLORS[0], maskData: null, isVisible: true },
                { id: 'body', name: '몸통', color: COLORS[1], maskData: null, isVisible: true },
                { id: 'arm_l', name: '왼팔', color: COLORS[2], maskData: null, isVisible: true },
                { id: 'arm_r', name: '오른팔', color: COLORS[3], maskData: null, isVisible: true },
            ]);
            setActivePartId('head');
        }
    }, [isOpen]);

    // Draw Setup Canvas (Base + Masks)
    useEffect(() => {
        if (!isOpen || step !== 'setup' || !setupCanvasRef.current || !baseImageData) return;
        const canvas = setupCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Base Image (Dimmed)
        const temp = document.createElement('canvas');
        temp.width = baseImageData.width;
        temp.height = baseImageData.height;
        temp.getContext('2d')?.putImageData(baseImageData, 0, 0);

        ctx.globalAlpha = 0.5;
        ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;

        // 2. Draw Masks (Reverse order: List Top = Layer Top = Drawn Last)
        // We iterate backward through the list to draw bottom-most first
        // Wait, if List Index 0 is "Top", it should be drawn LAST.
        // So we should iterate from End to Start? 
        // No, standard painting: Index 0 (Top) -> Drawn 4th (Last). 
        // Index 3 (Bottom) -> Drawn 1st (First).
        // So we need to reverse the *iteration* for drawing.
        parts.slice().reverse().forEach(part => {
            if (part.maskData && part.isVisible) {
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = baseImageData.width;
                maskCanvas.height = baseImageData.height;
                maskCanvas.getContext('2d')?.putImageData(part.maskData, 0, 0);

                // Tint mask
                ctx.globalAlpha = part.id === activePartId ? 0.7 : 0.4;
                ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
            }
        });

        ctx.globalAlpha = 1.0;

    }, [isOpen, step, parts, activePartId, baseImageData]);

    // Handle Mask Painting
    const isDrawing = useRef(false);

    // Helper to get mouse pos
    const getPos = (e: React.MouseEvent) => {
        const canvas = setupCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (step !== 'setup' || !activePartId) return;
        isDrawing.current = true;
        drawMask(getPos(e));
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing.current) return;
        drawMask(getPos(e));
    };

    const handleMouseUp = () => {
        isDrawing.current = false;
    };

    const drawMask = (pos: { x: number, y: number }) => {
        if (!activePartId || !baseImageData) return;

        setParts(prev => prev.map(part => {
            if (part.id === activePartId) {
                // Determine mask canvas (create if null)
                const w = baseImageData.width;
                const h = baseImageData.height;
                let data = part.maskData;

                const c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                const ctx = c.getContext('2d')!;

                if (data) {
                    ctx.putImageData(data, 0, 0);
                }

                // Draw circle
                ctx.fillStyle = part.color;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, brushSize, 0, Math.PI * 2);

                if (tool === 'eraser') {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                } else {
                    ctx.fill();
                }

                return { ...part, maskData: ctx.getImageData(0, 0, w, h) };
            }
            return part;
        }));
    };



    // Background Bitmap (Base image minus parts)
    const [bgBitmap, setBgBitmap] = useState<ImageBitmap | null>(null);

    // --- Transition Logic ---
    const handleNext = async () => {
        if (!baseImageData) return;

        // 1. Create Parts
        const newParts: RiggingPart[] = [];
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = baseImageData.width;
        baseCanvas.height = baseImageData.height;
        const bCtx = baseCanvas.getContext('2d')!;
        bCtx.putImageData(baseImageData, 0, 0);

        // Prepare background canvas (copy of base)
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = baseImageData.width;
        bgCanvas.height = baseImageData.height;
        const bgCtx = bgCanvas.getContext('2d')!;
        bgCtx.drawImage(baseCanvas, 0, 0);

        for (const part of parts) {
            if (!part.maskData) {
                newParts.push(part);
                continue;
            }

            // Cutout logic for Part
            const partCanvas = document.createElement('canvas');
            partCanvas.width = baseImageData.width;
            partCanvas.height = baseImageData.height;
            const size = baseImageData.width;
            const ctx = partCanvas.getContext('2d')!;

            // Draw mask (solid)
            const maskTemp = document.createElement('canvas');
            maskTemp.width = size;
            maskTemp.height = size;
            maskTemp.getContext('2d')?.putImageData(part.maskData, 0, 0);

            ctx.drawImage(maskTemp, 0, 0);

            // Composite source-in with base image to get Part Image
            ctx.globalCompositeOperation = 'source-in';
            ctx.drawImage(baseCanvas, 0, 0);

            // Create Bitmap for Part
            const bitmap = await createImageBitmap(partCanvas);

            // 4. Calculate center of mass for origin? Default center for now.
            newParts.push({
                ...part,
                imageBitmap: bitmap,
                origin: { x: size / 2, y: size / 2 }
            });

            // Punch hole in Background
            bgCtx.globalCompositeOperation = 'destination-out';
            bgCtx.drawImage(maskTemp, 0, 0);
            bgCtx.globalCompositeOperation = 'source-over'; // Reset
        }

        // Create Background Bitmap
        const bgBm = await createImageBitmap(bgCanvas);
        setBgBitmap(bgBm);

        setParts(newParts);
        setStep('animation');
    };

    // --- Animation Phase Logic ---

    // Draw Animation Canvas
    useEffect(() => {
        if (step !== 'animation' || !animCanvasRef.current || !baseImageData) return;
        const canvas = animCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Background (Dimmed or Normal)
        if (bgBitmap) {
            ctx.drawImage(bgBitmap, 0, 0);
        } else {
            ctx.fillStyle = '#18181b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw Parts with Transform (Reverse order for correct Z-index)
        const frameData = transforms[currentAnimFrame] || {};

        parts.slice().reverse().forEach(part => {
            if (part.imageBitmap && part.isVisible) {
                const t = frameData[part.id] || { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1 };

                ctx.save();
                const originX = part.origin?.x || 256;
                const originY = part.origin?.y || 256;

                const finalX = originX + t.x;
                const finalY = originY + t.y;

                ctx.translate(finalX, finalY);
                ctx.rotate((t.rotate * Math.PI) / 180);

                // Scale (Flip Horizontal if scaleX is -1)
                ctx.scale(t.scaleX, 1);

                ctx.drawImage(part.imageBitmap, -originX, -originY);
                ctx.restore();
            }
        });

        // Draw Gizmo for active part
        if (activePartId) {
            const t = frameData[activePartId] || { x: 0, y: 0, rotate: 0, scale: 1 };
            const part = parts.find(p => p.id === activePartId);
            if (part) {
                const originX = part.origin?.x || 256;
                const originY = part.origin?.y || 256;
                const cx = originX + t.x;
                const cy = originY + t.y;

                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, cy, 30, 0, Math.PI * 2); // Selection circle
                ctx.stroke();

                // Rotation stick
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx, cy - 50);
                ctx.stroke();
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(cx, cy - 50, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

    }, [step, transforms, currentAnimFrame, parts, activePartId, bgBitmap]);

    // Handle Animation Interactions
    const dragStartRef = useRef<{ x: number, y: number, type: 'move' | 'rotate' } | null>(null);

    const handleAnimMouseDown = (e: React.MouseEvent) => {
        if (step !== 'animation' || !activePartId) return;
        const pos = getAnimPos(e); // Need to implement getPos for anim canvas too

        // Check gizmo hit
        const frameData = transforms[currentAnimFrame] || {};
        const t = frameData[activePartId] || { x: 0, y: 0, rotate: 0, scale: 1 };
        const originX = 256; // Simplified origin
        const originY = 256;
        const cx = originX + t.x;
        const cy = originY + t.y;

        // Rotate handle
        const rotX = cx;
        const rotY = cy - 50; // Visual handle position? Actually need to rotate this point too if visual rotates? 
        // No, Gizmo itself stays upright? Or rotates with object? Typically Gizmo handles overlay on top.
        // Let's implement global controls for now easier than on-canvas gizmo hit testing.

        // Basic Drag
        dragStartRef.current = { x: pos.x, y: pos.y, type: e.shiftKey ? 'rotate' : 'move' };
    };

    const handleAnimMouseMove = (e: React.MouseEvent) => {
        if (!dragStartRef.current || !activePartId) return;
        const pos = getAnimPos(e); // Reuse getPos logic but point to animCanvas
        const dx = pos.x - dragStartRef.current.x;
        const dy = pos.y - dragStartRef.current.y;

        setTransforms(prev => {
            const newTransforms = [...prev];
            const currentFrameData = { ...(newTransforms[currentAnimFrame] || {}) };
            const partData = currentFrameData[activePartId] || { x: 0, y: 0, rotate: 0, scale: 1 };

            if (dragStartRef.current?.type === 'move') {
                currentFrameData[activePartId] = { ...partData, x: partData.x + dx, y: partData.y + dy };
            } else {
                currentFrameData[activePartId] = { ...partData, rotate: partData.rotate + dx * 0.5 }; // Horizontal drag to rotate
            }

            newTransforms[currentAnimFrame] = currentFrameData;
            return newTransforms;
        });

        dragStartRef.current = { x: pos.x, y: pos.y, type: dragStartRef.current.type };
    };

    // Reuse getPos for anim canvas
    const getAnimPos = (e: React.MouseEvent) => {
        const canvas = animCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleFinalApply = () => {
        if (!bgBitmap || !baseImageData) return;

        const finalFrames: ImageData[] = [];
        const canvas = document.createElement('canvas');
        canvas.width = baseImageData.width;
        canvas.height = baseImageData.height;
        const ctx = canvas.getContext('2d')!;

        // Iterate all 4 frames
        for (let i = 0; i < 4; i++) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 1. Draw Background
            ctx.drawImage(bgBitmap, 0, 0);

            // 2. Draw Parts (Reverse order!)
            const frameData = transforms[i] || {};
            parts.slice().reverse().forEach(part => {
                if (part.imageBitmap && part.isVisible) {
                    const t = frameData[part.id] || { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1 };

                    ctx.save();
                    const originX = part.origin?.x || 256;
                    const originY = part.origin?.y || 256;

                    const finalX = originX + t.x;
                    const finalY = originY + t.y;

                    ctx.translate(finalX, finalY);
                    ctx.rotate((t.rotate * Math.PI) / 180);

                    // Apply ScaleX
                    ctx.scale(t.scaleX, 1);

                    ctx.drawImage(part.imageBitmap, -originX, -originY);
                    ctx.restore();
                }
            });

            finalFrames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }

        onApply(finalFrames);
    };

    const handleAnimFlip = () => {
        if (!activePartId || step !== 'animation') return;

        setTransforms(prev => {
            const newTransforms = [...prev];
            const currentFrameData = { ...(newTransforms[currentAnimFrame] || {}) };
            const partData = currentFrameData[activePartId] || { x: 0, y: 0, rotate: 0, scale: 1, scaleX: 1 };

            // Toggle scaleX
            const newScaleX = partData.scaleX === 1 ? -1 : 1;

            currentFrameData[activePartId] = { ...partData, scaleX: newScaleX };
            newTransforms[currentAnimFrame] = currentFrameData;
            return newTransforms;
        });
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-6xl h-full max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                            <i className="fa-solid fa-bone text-white text-lg"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">2D 리깅 & 애니메이션</h2>
                            <p className="text-xs text-zinc-400">
                                {step === 'setup' ? '1단계: 부위 영역 지정 (마스킹)' : '2단계: 키프레임 애니메이션'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Left: Tools Pane */}
                    <div className="w-64 bg-zinc-950/50 border-r border-zinc-800 p-4 flex flex-col gap-4">
                        <div className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">
                            {step === 'setup' ? '부위 목록 (드래그하여 순서 변경)' : '애니메이션 제어'}
                        </div>

                        {/* Part List */}
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {parts.map((part, index) => (
                                <button
                                    key={part.id}
                                    draggable={step === 'setup'} // Only draggable in setup? Or both? Setup makes sense to define hierarchy.
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => setActivePartId(part.id)}
                                    className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors border relative ${activePartId === part.id
                                        ? 'bg-zinc-800 border-amber-500/50'
                                        : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                                        } ${dragPartIndex === index ? 'opacity-50 border-dashed border-amber-500' : ''}`}
                                >
                                    {editingPartId === part.id ? (
                                        <form onSubmit={saveEditing} className="flex-1 flex gap-2" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onBlur={() => saveEditing()}
                                                autoFocus
                                                className="flex-1 bg-zinc-950 border border-amber-500 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
                                            />
                                        </form>
                                    ) : (
                                        <>
                                            <div className="w-4 h-4 rounded-full shadow-sm shrink-0" style={{ backgroundColor: part.color }}></div>
                                            <span className={`text-sm font-medium flex-1 ${activePartId === part.id ? 'text-white' : 'text-zinc-400'}`}>
                                                {part.name}
                                            </span>

                                            {/* Action Buttons (Visible on Hover or Active) */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => startEditing(part, e)}
                                                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-700"
                                                    title="이름 수정"
                                                >
                                                    <i className="fa-solid fa-pen text-xs"></i>
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeletePart(part.id, e)}
                                                    className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-zinc-700"
                                                    title="삭제"
                                                >
                                                    <i className="fa-solid fa-trash text-xs"></i>
                                                </button>
                                                <div className="w-6 h-6 flex items-center justify-center cursor-move text-zinc-600">
                                                    <i className="fa-solid fa-grip-lines"></i>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Setup Tools */}
                        {step === 'setup' && (
                            <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-2 block">도구</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setTool('brush')}
                                            className={`flex-1 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-2 ${tool === 'brush' ? 'bg-zinc-700 text-white border border-zinc-600' : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-750'}`}
                                        >
                                            <i className="fa-solid fa-paintbrush"></i> 브러쉬
                                        </button>
                                        <button
                                            onClick={() => setTool('eraser')}
                                            className={`flex-1 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-2 ${tool === 'eraser' ? 'bg-zinc-700 text-white border border-zinc-600' : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-750'}`}
                                        >
                                            <i className="fa-solid fa-eraser"></i> 지우개
                                        </button>
                                    </div>

                                </div>

                                <div>
                                    <label className="text-xs text-zinc-500 mb-2 block">브러쉬 크기 ({brushSize}px)</label>
                                    <input
                                        type="range"
                                        min="1" max="50"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(Number(e.target.value))}
                                        className="w-full accent-amber-500"
                                    />
                                </div>
                            </div>

                        )}

                        {/* Add Part Button (Setup Mode Only) */}
                        {step === 'setup' && (
                            <button
                                onClick={() => {
                                    const newId = `part_${Date.now()}`;
                                    const color = COLORS[parts.length % COLORS.length];
                                    setParts([...parts, {
                                        id: newId,
                                        name: `부위 ${parts.length + 1}`,
                                        color: color,
                                        maskData: null,
                                        isVisible: true
                                    }]);
                                    setActivePartId(newId);
                                }}
                                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm font-medium border border-zinc-700 border-dashed transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-plus"></i> 부위 추가
                            </button>
                        )}

                        {/* Animation Frame List */}
                        {step === 'animation' && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    {[0, 1, 2, 3].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setCurrentAnimFrame(f)}
                                            className={`w-full py-2 text-xs font-mono rounded ${currentAnimFrame === f ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                                        >
                                            Frame {f + 1}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={handleAnimFlip}
                                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm font-medium border border-zinc-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-repeat"></i> 선택 부위 좌우 반전
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Center: Canvas Area */}
                    <div className="flex-1 bg-[#101012] flex items-center justify-center relative overflow-hidden">
                        {step === 'setup' ? (
                            <canvas
                                ref={setupCanvasRef}
                                width={canvasSize.width}
                                height={canvasSize.height}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                className={`bg-[#18181b] shadow-2xl border border-zinc-800 ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
                                style={{ width: 512, height: 512, maxWidth: '90%', maxHeight: '90%' }} // Responsive View
                            />
                        ) : (
                            <canvas
                                ref={animCanvasRef}
                                width={canvasSize.width}
                                height={canvasSize.height}
                                onMouseDown={(e) => {
                                    const pos = getAnimPos(e);
                                    if (activePartId) {
                                        dragStartRef.current = { x: pos.x, y: pos.y, type: e.shiftKey ? 'rotate' : 'move' };
                                    }
                                }}
                                onMouseMove={(e) => {
                                    if (!dragStartRef.current || !activePartId) return;
                                    const pos = getAnimPos(e);
                                    const dx = pos.x - dragStartRef.current.x;
                                    const dy = pos.y - dragStartRef.current.y;

                                    setTransforms(prev => {
                                        const newTransforms = [...prev];
                                        const currentFrameData = { ...(newTransforms[currentAnimFrame] || {}) };
                                        const partData = currentFrameData[activePartId!] || { x: 0, y: 0, rotate: 0, scale: 1 };

                                        if (dragStartRef.current?.type === 'move') {
                                            currentFrameData[activePartId!] = { ...partData, x: partData.x + dx, y: partData.y + dy };
                                        } else {
                                            currentFrameData[activePartId!] = { ...partData, rotate: partData.rotate + dx * 0.5 };
                                        }

                                        newTransforms[currentAnimFrame] = currentFrameData;
                                        return newTransforms;
                                    });

                                    dragStartRef.current = { x: pos.x, y: pos.y, type: dragStartRef.current.type };
                                }}
                                onMouseUp={() => dragStartRef.current = null}
                                onMouseLeave={() => dragStartRef.current = null}
                                className="bg-[#18181b] shadow-2xl border border-zinc-800 cursor-move"
                                style={{ width: 512, height: 512, maxWidth: '90%', maxHeight: '90%' }}
                            />
                        )}

                        {/* Help Text Overlay */}
                        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1.5 rounded text-xs text-zinc-300 pointer-events-none">
                            {step === 'setup'
                                ? '💡 팁: 부위를 선택하고 마우스 드래그로 칠해서 영역을 지정하세요.'
                                : '💡 팁: Shift + 드래그하여 회전, 그냥 드래그하여 이동.'}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="h-16 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between px-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">
                        취소
                    </button>

                    {step === 'setup' ? (
                        <button
                            onClick={handleNext}
                            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-amber-900/20 transition-all flex items-center gap-2"
                        >
                            다음 단계로 <i className="fa-solid fa-arrow-right"></i>
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setStep('setup')}
                                className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
                            >
                                <i className="fa-solid fa-arrow-left"></i> 뒤로
                            </button>
                            <button
                                onClick={handleFinalApply}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
                            >
                                <i className="fa-solid fa-check"></i> 적용 완료
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default RiggingModal;
