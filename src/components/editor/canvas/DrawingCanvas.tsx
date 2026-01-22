import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import getStroke from 'perfect-freehand';

export interface DrawingCanvasRef {
    getCanvas: () => HTMLCanvasElement | null;
    undo: () => void;
    redo: () => void;
    saveHistory: () => void;
    setImage: (img: HTMLImageElement) => void;
    clear: () => void;
}

interface DrawingCanvasProps {
    width: number;
    height: number;
    brushColor: string;
    brushSize: number;
    selectedTool: string;
    onColorPick?: (color: string) => void;
}

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
    width,
    height,
    brushColor,
    brushSize,
    selectedTool,
    onColorPick
}, ref) => {
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement>(null);

    // History State
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyStep, setHistoryStep] = useState(-1);

    const [points, setPoints] = useState<number[][]>([]);
    const [isDrawing, setIsDrawing] = useState(false);

    // Initial History Save
    useEffect(() => {
        if (mainCanvasRef.current && history.length === 0) {
            const ctx = mainCanvasRef.current.getContext('2d');
            if (ctx) {
                const initialData = ctx.getImageData(0, 0, width, height);
                setHistory([initialData]);
                setHistoryStep(0);
            }
        }
    }, [width, height]);

    // Helper to push state
    const pushHistory = useCallback(() => {
        const canvas = mainCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const newData = ctx.getImageData(0, 0, width, height);

        setHistory(prev => {
            const newHistory = prev.slice(0, historyStep + 1);
            // Limit history size
            if (newHistory.length >= 30) {
                newHistory.shift();
                return [...newHistory, newData];
            }
            return [...newHistory, newData];
        });

        setHistoryStep(prev => {
            if (prev >= 29) return 29;
            return prev + 1;
        });
    }, [width, height, historyStep]);

    const undo = () => {
        if (historyStep > 0) {
            const newStep = historyStep - 1;
            setHistoryStep(newStep);
            const canvas = mainCanvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && history[newStep]) {
                ctx.putImageData(history[newStep], 0, 0);
            }
        }
    };

    const redo = () => {
        if (historyStep < history.length - 1) {
            const newStep = historyStep + 1;
            setHistoryStep(newStep);
            const canvas = mainCanvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && history[newStep]) {
                ctx.putImageData(history[newStep], 0, 0);
            }
        }
    };

    const setImage = (img: HTMLImageElement) => {
        const canvas = mainCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear existing content
        ctx.clearRect(0, 0, width, height);

        // Draw new image (fill canvas)
        ctx.drawImage(img, 0, 0, width, height);

        pushHistory();
    };

    useImperativeHandle(ref, () => ({
        getCanvas: () => mainCanvasRef.current,
        undo,
        redo,
        saveHistory: pushHistory,
        setImage,
        clear: () => {
            const canvas = mainCanvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, width, height);
                pushHistory();
            }
        }
    }), [history, historyStep, pushHistory]);

    // --- Drawing Logic (Temp Canvas) ---
    useEffect(() => {
        const tempCanvas = tempCanvasRef.current;
        if (!tempCanvas) return;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        const stroke = getStroke(points, {
            size: brushSize,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
        });

        ctx.clearRect(0, 0, width, height);

        if (points.length > 0) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = brushColor;
            if (selectedTool === 'eraser') {
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
            }

            ctx.beginPath();
            if (stroke.length > 0) {
                ctx.moveTo(stroke[0][0], stroke[0][1]);
                for (const [x, y] of stroke) {
                    ctx.lineTo(x, y);
                }
                ctx.fill();
            }
        }
    }, [points, brushColor, brushSize, width, height, selectedTool]);


    // --- Flood Fill ---
    const floodFill = (startX: number, startY: number, fillColor: string) => {
        const canvas = mainCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const getPixelColor = (index: number) => [data[index], data[index + 1], data[index + 2], data[index + 3]];
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 255] : [0, 0, 0, 255];
        };

        const targetRgba = hexToRgb(fillColor);
        const startPos = (startY * width + startX) * 4;
        const startRgba = getPixelColor(startPos);

        if (startRgba.every((v, i) => v === targetRgba[i])) return;

        const stack = [[startX, startY]];
        while (stack.length > 0) {
            const [x, y] = stack.pop()!;
            const idx = (y * width + x) * 4;
            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            if (data[idx] === startRgba[0] && data[idx + 1] === startRgba[1] && data[idx + 2] === startRgba[2] && data[idx + 3] === startRgba[3]) {
                data[idx] = targetRgba[0];
                data[idx + 1] = targetRgba[1];
                data[idx + 2] = targetRgba[2];
                data[idx + 3] = targetRgba[3];
                stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }
        }
        ctx.putImageData(imageData, 0, 0);
        pushHistory();
    };


    // --- Checkboard Pattern ---
    const patternStyle = {
        width,
        height,
        backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        backgroundColor: '#fff'
    };

    // --- Event Handlers ---
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.buttons !== 1) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Eyedropper tool - pick color from canvas
        if (selectedTool === 'eyedropper') {
            const canvas = mainCanvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const pixelX = Math.floor(x);
            const pixelY = Math.floor(y);
            const imageData = ctx.getImageData(pixelX, pixelY, 1, 1);
            const [r, g, b, a] = imageData.data;

            // Convert to hex color
            if (a > 0) {
                const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
                onColorPick?.(hex);
            }
            return;
        }

        if (selectedTool === 'bucket') {
            floodFill(Math.floor(x), Math.floor(y), brushColor);
            return;
        }

        if (selectedTool === 'pen' || selectedTool === 'eraser' || selectedTool === 'brush') {
            setIsDrawing(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            setPoints([[x, y, e.pressure]]);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing) return;
        if (e.buttons !== 1) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        setPoints(prev => [...prev, [x, y, e.pressure]]);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const mainCtx = mainCanvasRef.current?.getContext('2d');
        const tempCanvas = tempCanvasRef.current;

        if (mainCtx && tempCanvas) {
            if (selectedTool === 'eraser') {
                mainCtx.globalCompositeOperation = 'destination-out';
                const stroke = getStroke(points, { size: brushSize, thinning: 0.5, smoothing: 0.5, streamline: 0.5 });
                mainCtx.beginPath();
                if (stroke.length > 0) {
                    mainCtx.moveTo(stroke[0][0], stroke[0][1]);
                    for (const [x, y] of stroke) { mainCtx.lineTo(x, y); }
                    mainCtx.fill();
                }
                mainCtx.globalCompositeOperation = 'source-over';
            } else {
                mainCtx.drawImage(tempCanvas, 0, 0);
            }
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx?.clearRect(0, 0, width, height);

            pushHistory();
        }
        setPoints([]);
    };

    return (
        <div
            className="relative shadow-lg border border-gray-700 bg-white"
            style={patternStyle}
        >
            <canvas
                ref={mainCanvasRef}
                width={width}
                height={height}
                className="absolute top-0 left-0 pointer-events-none"
            />
            <canvas
                ref={tempCanvasRef}
                width={width}
                height={height}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="absolute top-0 left-0 touch-none cursor-crosshair"
            />
        </div>
    );
});

export default DrawingCanvas;
