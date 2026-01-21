import React, { useState, useRef } from 'react';
import DrawingCanvas from '../components/editor/canvas/DrawingCanvas';
import Toolbar from '../components/editor/tools/Toolbar';
import { saveAs } from 'file-saver';

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

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSizeSelect = (size: number) => {
        setCanvasSize({ width: size, height: size });
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // Pan Handlers
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault(); // Disable default context menu
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 2) { // Right Click
            setIsPanning(true);
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
            setZoom(prev => Math.min(Math.max(prev * delta, 0.1), 5));
        }
    };

    if (!canvasSize) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white select-none">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                        Asset Forge
                    </h1>
                    <p className="text-gray-400 text-lg">Create stunning pixel art and assets.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[512, 256, 128].map((size) => (
                        <button
                            key={size}
                            onClick={() => handleSizeSelect(size)}
                            className="group relative p-8 bg-[#111] rounded-2xl border border-[#222] hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1"
                        >
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-blue-400">✨</span>
                            </div>
                            <div className="text-3xl font-bold mb-3 font-mono">{size}</div>
                            <div className="text-sm text-gray-500 group-hover:text-blue-300 transition-colors uppercase tracking-widest">
                                {size === 512 ? 'High Definition' : size === 256 ? 'Standard' : 'Pixel Art'}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex h-screen bg-[#050505] text-white overflow-hidden"
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
        >
            {/* Toolbar Side */}
            <Toolbar
                selectedTool={selectedTool}
                onToolChange={setSelectedTool}
                brushColor={brushColor}
                onColorChange={setBrushColor}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
            />

            {/* Canvas Validation Area */}
            <div className="flex-1 flex flex-col relative bg-[#1a1a1a]">
                {/* Header/Top Bar */}
                <div className="h-14 border-b border-[#222] flex items-center justify-between px-6 bg-[#050505] z-10">
                    <span className="font-mono text-xs text-gray-500">
                        {canvasSize.width}x{canvasSize.height} • {selectedTool.toUpperCase()} • {Math.round(brushSize)}px • {(zoom * 100).toFixed(0)}%
                    </span>
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                if (canvasRef.current) {
                                    canvasRef.current.toBlob((blob) => {
                                        if (blob) saveAs(blob, 'my-asset.png');
                                    });
                                }
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-4 py-2 rounded-lg hover:bg-blue-500/20 transition-all"
                        >
                            <i className="fa-solid fa-download mr-2"></i>
                            Save Asset
                        </button>
                        <button
                            onClick={() => setCanvasSize(null)}
                            className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                            Exit
                        </button>
                    </div>
                </div>

                {/* Canvas Viewport */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-hidden relative bg-[url('https://transparenttextures.com/patterns/dark-matter.png')] cursor-default"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onWheel={handleWheel}
                >
                    <div
                        className="absolute shadow-2xl shadow-black ring-1 ring-white/10"
                        style={{
                            width: canvasSize.width,
                            height: canvasSize.height,
                            // Centering logic + Pan/Zoom
                            top: `calc(50% - ${canvasSize.height / 2}px + ${pan.y}px)`,
                            left: `calc(50% - ${canvasSize.width / 2}px + ${pan.x}px)`,
                            transform: `scale(${zoom})`,
                            transformOrigin: 'center center'
                        }}
                    >
                        <DrawingCanvas
                            ref={canvasRef}
                            width={canvasSize.width}
                            height={canvasSize.height}
                            brushColor={brushColor}
                            brushSize={brushSize}
                            selectedTool={selectedTool}
                        />
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                        <button onClick={() => setZoom(z => z + 0.1)} className="w-10 h-10 bg-[#222] border border-[#333] rounded-lg text-white hover:bg-[#333] transition-colors flex items-center justify-center">+</button>
                        <button onClick={() => setZoom(1)} className="w-10 h-10 bg-[#222] border border-[#333] rounded-lg text-white hover:bg-[#333] transition-colors flex items-center justify-center text-xs">1:1</button>
                        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="w-10 h-10 bg-[#222] border border-[#333] rounded-lg text-white hover:bg-[#333] transition-colors flex items-center justify-center">-</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewAssetsEditorPage;
