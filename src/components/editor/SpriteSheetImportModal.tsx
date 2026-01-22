import React, { useState, useEffect, useRef } from 'react';

interface SpriteSheetImportModalProps {
    isOpen: boolean;
    file: File | null;
    canvasSize: { width: number; height: number };
    onClose: () => void;
    onImport: (frames: ImageData[]) => void;
}

const SpriteSheetImportModal: React.FC<SpriteSheetImportModalProps> = ({ isOpen, file, canvasSize, onClose, onImport }) => {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [rows, setRows] = useState(1);
    const [cols, setCols] = useState(1);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Canvas reference for slicing logic
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            const img = new Image();
            img.onload = () => {
                setImage(img);
                // Auto calculation logic
                if (canvasSize.width > 0 && canvasSize.height > 0) {
                    const calculatedCols = Math.max(1, Math.round(img.width / canvasSize.width));
                    const calculatedRows = Math.max(1, Math.round(img.height / canvasSize.height));
                    setCols(calculatedCols);
                    setRows(calculatedRows);
                }
            };
            img.src = url;
            return () => URL.revokeObjectURL(url);
        }
    }, [file, canvasSize]);

    const handleImport = () => {
        if (!image || !canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const frameWidth = image.width / cols;
        const frameHeight = image.height / rows;

        // Ensure canvas is big enough to hold the image for slicing
        canvasRef.current.width = image.width;
        canvasRef.current.height = image.height;
        ctx.drawImage(image, 0, 0);

        const newFrames: ImageData[] = [];

        // Slice frames
        // Typically read row by row (left to right, then top to bottom)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // We need to resize each slice to the target canvas size if slightly different, 
                // but for pixel art usually we want exact pixel data. 
                // However, our internal data model relies on ImageData of specific canvasSize.
                // So we should extract the slice, put it on a temp canvas of canvasSize, and get ImageData.

                const sliceX = c * frameWidth;
                const sliceY = r * frameHeight;

                // Create a temp canvas for the frame
                const frameCanvas = document.createElement('canvas');
                frameCanvas.width = canvasSize.width;
                frameCanvas.height = canvasSize.height;
                const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
                if (!frameCtx) continue;

                // Draw the slice onto the frame canvas (scaling if necessary, but usually fit)
                // We assume the user wants it to fit the frame.
                frameCtx.imageSmoothingEnabled = false;
                frameCtx.drawImage(
                    image,
                    sliceX, sliceY, frameWidth, frameHeight,
                    0, 0, canvasSize.width, canvasSize.height
                );

                newFrames.push(frameCtx.getImageData(0, 0, canvasSize.width, canvasSize.height));
            }
        }

        onImport(newFrames);
        onClose();
    };

    if (!isOpen || !file) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-table-cells text-amber-500"></i>
                        스프라이트 시트 가져오기
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Preview Section */}
                    <div className="flex-1 bg-[#111] p-6 flex flex-col justify-center items-center overflow-auto relative pattern-grid-lg">
                        {previewUrl && (
                            <div className="relative shadow-2xl">
                                <img
                                    src={previewUrl}
                                    alt="Sprite Sheet Preview"
                                    className="max-w-full max-h-[60vh] object-contain border border-zinc-700 pixelated"
                                    style={{ imageRendering: 'pixelated' }}
                                />
                                {/* Grid Overlay Visualization (Optional but helpful) */}
                                <div className="absolute inset-0 pointer-events-none" style={{
                                    backgroundImage: `
                                        linear-gradient(to right, rgba(245, 158, 11, 0.5) 1px, transparent 1px),
                                        linear-gradient(to bottom, rgba(245, 158, 11, 0.5) 1px, transparent 1px)
                                    `,
                                    backgroundSize: `${100 / cols}% ${100 / rows}%`
                                }}></div>
                            </div>
                        )}
                        <p className="mt-4 text-xs text-zinc-500 font-mono">
                            Original Size: {image?.width} x {image?.height} px
                        </p>
                    </div>

                    {/* Settings Sidebar */}
                    <div className="w-80 bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col gap-6 shrink-0 z-10">

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-zinc-300">그리드 설정</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-400">가로 칸 (Cols)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={cols}
                                        onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none text-center"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-400">세로 칸 (Rows)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={rows}
                                        onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 focus:border-amber-500 focus:outline-none text-center"
                                    />
                                </div>
                            </div>

                            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-400">프레임 크기</span>
                                    <span className="text-zinc-200 font-mono">
                                        {image ? Math.round(image.width / cols) : 0} x {image ? Math.round(image.height / rows) : 0}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-400">총 프레임 수</span>
                                    <span className="text-amber-400 font-mono font-bold">
                                        {cols * rows}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 leading-relaxed">
                                <i className="fa-solid fa-wand-magic-sparkles mr-1.5"></i>
                                현재 캔버스 크기({canvasSize.width}x{canvasSize.height})에 맞춰 자동으로 계산되었습니다.
                            </div>
                        </div>

                        <div className="mt-auto flex flex-col gap-3">
                            <button
                                onClick={handleImport}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-file-import"></i>
                                {cols * rows}개 프레임 가져오기
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
    );
};

export default SpriteSheetImportModal;
