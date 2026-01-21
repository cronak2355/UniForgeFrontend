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

    // Initial Setup & Resize Handling
    useEffect(() => {
        // Here we could handle resizing logic if needed, 
        // ensuring 'mainCanvas' content is preserved. 
        // For now, size is fixed per session.
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

        // Clear temp canvas every frame to avoid stacking opacity
        ctx.clearRect(0, 0, width, height);

        if (points.length > 0) {
            // Setup composite operation for temp canvas
            // If eraser, we visualize it as white or special color?
            // Actually, for Eraser, "Previewing" on a separate layer is tricky because it needs to erase the underlying layer.
            // Standard solution: draw on temp layer, but for eraser, we might need to draw directly to main?
            // OR: render composite of Main + Temp(EraserLoop) every frame? Expensive.
            // Simple approach: Eraser draws directly on Main? No, undo will be hard later.
            // Let's stick to: Eraser works on MAIN canvas for "Validation" but for "Preview" we might just show cursor.
            // Wait, users expect to see the erasing trail. 
            // For Eraser, we will update the MAIN canvas in realtime? That breaks the "Temp Layer" benefit for transparency.
            // But Eraser usually has 100% opacity in simple apps.
            // Let's make Eraser draw directly to Main Canvas nicely, OR keep points and re-run destination-out on Main.
            // If we re-run destination-out on Main for every point update, we are erasing more and more.
            // Correct way: With points, we have the WHOLE stroke. 
            // So we can undo the last "erase" frame? No.
            // Let's TRY: Eraser draws on Temp Canvas as "White" (or background color) if we assume opacity.
            // But we need transparency.
            // Better: Use Temp Canvas for Pen/Brush. Use Main Canvas (incremental) for Eraser?
            // Let's try drawing Eraser on Temp with 'source-over' showing a "Eraser Color" (e.g. pink) for debug, 
            // then apply 'destination-out' to Main on pointerUp?
            // No, user needs to see what's being erased.
            // Pivot: For Eraser, we apply to Main Canvas incrementally? 
            // Or just keep simple single-layer behavior for Eraser, and 2-layer for Brush.

            if (selectedTool === 'eraser') {
                // Eraser Preview on Temp? 
                // Let's leave Eraser as "Direct to Main" logic for now (simpler), or 'destination-out' on Main.
                // But 'perfect-freehand' gives entire path. 
                // We will use the 2-layer system for Additive Drawing (Pen). 
                // For Subtractive (Eraser), let's render strictly to Temp, using 'destination-out' on ... Temp? No (Temp is empty).
                // We'll skip Eraser special handling for a second and focus on Pen.
            }

            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = brushColor;
            if (selectedTool === 'eraser') {
                ctx.fillStyle = '#ffffff'; // visuals only
                // Real erasing happens on Main?
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
        const seen = new Set(); // To prevent loops if needed, though color check usually handles it

        // We can modify 'data' directly
        while (stack.length > 0) {
            const [x, y] = stack.pop()!;
            const idx = (y * width + x) * 4;

            // Boundary check
            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            // Check match
            if (data[idx] === startRgba[0] &&
                data[idx + 1] === startRgba[1] &&
                data[idx + 2] === startRgba[2] &&
                data[idx + 3] === startRgba[3]) {

                // Set color
                data[idx] = targetRgba[0];
                data[idx + 1] = targetRgba[1];
                data[idx + 2] = targetRgba[2];
                data[idx + 3] = targetRgba[3];

                // Push neighbors
                stack.push([x + 1, y]);
                stack.push([x - 1, y]);
                stack.push([x, y + 1]);
                stack.push([x, y - 1]);
            }
        }

        ctx.putImageData(imageData, 0, 0);
    };


    // --- Event Handlers ---
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.buttons !== 1) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);

        // Bucket Logic
        if (selectedTool === 'bucket') {
            floodFill(x, y, brushColor);
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
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
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
                // For eraser, we use the stroke path to 'cut' mainly.
                // Re-calculate the full stroke one last time to be sure? 
                // Or just use the 'tempCanvas' mask?
                // Problem: TempCanvas has 'White' pixels for Eraser (per my hack above).
                // We want to use those pixels to Erase on Main.

                // Composite Logic:
                mainCtx.globalCompositeOperation = 'destination-out';
                // Draw the 'shape' of the eraser stroke on Main
                // We can redraw the path directly on Main!

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
                // Standard Draw
                // Draw the temp canvas onto the main canvas
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
