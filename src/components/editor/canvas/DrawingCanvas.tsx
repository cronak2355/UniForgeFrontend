import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import getStroke from 'perfect-freehand';

interface DrawingCanvasProps {
    width: number;
    height: number;
    brushColor: string;
    brushSize: number;
    selectedTool: string;
}

const DrawingCanvas = forwardRef<HTMLCanvasElement, DrawingCanvasProps>(({
    width,
    height,
    brushColor,
    brushSize,
    selectedTool
}, ref) => {
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement>(null);

    const [points, setPoints] = useState<number[][]>([]);
    const [isDrawing, setIsDrawing] = useState(false);

    // Expose Main Canvas to parent (for saving)
    useImperativeHandle(ref, () => mainCanvasRef.current!, []);

    // Initial Setup
    useEffect(() => {
        // No resize handling needed for fixed size canvas
    }, [width, height]);

    // --- Drawing Logic (Temp Canvas) ---
    useEffect(() => {
        const tempCanvas = tempCanvasRef.current;
        if (!tempCanvas) return;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        // Create stroke path
        const stroke = getStroke(points, {
            size: brushSize,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
        });

        // Clear temp canvas every frame
        ctx.clearRect(0, 0, width, height);

        if (points.length > 0) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = brushColor;
            if (selectedTool === 'eraser') {
                ctx.fillStyle = '#ffffff'; // Visuals only for temp layer
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


    // --- Flood Fill Algorithm ---
    const floodFill = (startX: number, startY: number, fillColor: string) => {
        const canvas = mainCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get Image Data
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Helper to get color at index
        const getPixelColor = (index: number) => {
            return [data[index], data[index + 1], data[index + 2], data[index + 3]];
        };

        // Parse Fill Color (Hex to RGBA)
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16),
                255 // Alpha
            ] : [0, 0, 0, 255];
        };
        const targetRgba = hexToRgb(fillColor);

        // Get Start Color
        const startPos = (startY * width + startX) * 4;
        const startRgba = getPixelColor(startPos);

        // Check if same color
        if (startRgba[0] === targetRgba[0] &&
            startRgba[1] === targetRgba[1] &&
            startRgba[2] === targetRgba[2] &&
            startRgba[3] === targetRgba[3]) {
            return;
        }

        // BFS
        const stack = [[startX, startY]];

        while (stack.length > 0) {
            const [x, y] = stack.pop()!;
            const idx = (y * width + x) * 4;

            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            if (data[idx] === startRgba[0] &&
                data[idx + 1] === startRgba[1] &&
                data[idx + 2] === startRgba[2] &&
                data[idx + 3] === startRgba[3]) {

                data[idx] = targetRgba[0];
                data[idx + 1] = targetRgba[1];
                data[idx + 2] = targetRgba[2];
                data[idx + 3] = targetRgba[3];

                stack.push([x + 1, y]);
                stack.push([x - 1, y]);
                stack.push([x, y + 1]);
                stack.push([x, y - 1]);
            }
        }

        ctx.putImageData(imageData, 0, 0);
    };


    // --- Event Handlers (Fixed Coordinates) ---
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.buttons !== 1) return;

        const rect = e.currentTarget.getBoundingClientRect();
        // Calculate scale factor in case displayed size != actual canvas size (Zoomed)
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Bucket Logic
        if (selectedTool === 'bucket') {
            floodFill(Math.floor(x), Math.floor(y), brushColor);
            return;
        }

        // Draw Logic
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

        // Commit Temp Canvas to Main Canvas
        const mainCtx = mainCanvasRef.current?.getContext('2d');
        const tempCanvas = tempCanvasRef.current;

        if (mainCtx && tempCanvas) {
            if (selectedTool === 'eraser') {
                mainCtx.globalCompositeOperation = 'destination-out';

                const stroke = getStroke(points, {
                    size: brushSize,
                    thinning: 0.5,
                    smoothing: 0.5,
                    streamline: 0.5,
                });

                mainCtx.beginPath();
                if (stroke.length > 0) {
                    mainCtx.moveTo(stroke[0][0], stroke[0][1]);
                    for (const [x, y] of stroke) {
                        mainCtx.lineTo(x, y);
                    }
                    mainCtx.fill();
                }

                mainCtx.globalCompositeOperation = 'source-over'; // Reset

            } else {
                mainCtx.drawImage(tempCanvas, 0, 0);
            }

            // Clear Temp
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx?.clearRect(0, 0, width, height);
        }

        setPoints([]);
    };

    return (
        <div
            className="relative shadow-lg border border-gray-700 bg-white"
            style={{
                width,
                height,
                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
        >
            {/* Main Canvas (Baked) */}
            <canvas
                ref={mainCanvasRef}
                width={width}
                height={height}
                className="absolute top-0 left-0 pointer-events-none"
            />

            {/* Temp Canvas (Interaction & Overlay) */}
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
