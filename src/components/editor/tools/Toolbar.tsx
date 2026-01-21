import React, { useState } from 'react';
import { HexColorPicker } from 'react-colorful';

interface ToolbarProps {
    selectedTool: string;
    onToolChange: (tool: string) => void;
    brushColor: string;
    onColorChange: (color: string) => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
    selectedTool,
    onToolChange,
    brushColor,
    onColorChange,
    brushSize,
    onBrushSizeChange
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);

    const tools = [
        { id: 'pen', label: 'Pen', icon: '✏️' },
        { id: 'eraser', label: 'Eraser', icon: '🧹' },
        { id: 'bucket', label: 'Bucket', icon: '🪣' },
        { id: 'lasso', label: 'Lasso', icon: '✂️' },
    ];

    return (
        <div className="w-72 bg-[#111] border-r border-[#222] flex flex-col h-full p-6 overflow-y-auto z-20 shadow-xl">
            <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">Tools</h3>

            <div className="grid grid-cols-2 gap-3 mb-8">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => onToolChange(tool.id)}
                        className={`
                            p-4 rounded-xl flex flex-col items-center justify-center transition-all duration-200
                            ${selectedTool === tool.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105'
                                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-white hover:border-gray-600 border border-transparent'}
                        `}
                    >
                        <span className="text-2xl mb-2">{tool.icon}</span>
                        <span className="text-xs font-medium">{tool.label}</span>
                    </button>
                ))}
            </div>

            <div className="mb-8">
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3">Color</h3>
                <div className="relative">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-full h-12 rounded-xl border border-[#333] flex items-center justify-center mb-2 overflow-hidden shadow-inner"
                        style={{ backgroundColor: brushColor }}
                    >
                        <span className="text-xs text-white mix-blend-difference font-mono opacity-80 backdrop-blur-sm px-2 py-1 rounded">{brushColor}</span>
                    </button>

                    {showColorPicker && (
                        <div className="absolute top-full left-0 z-50 mt-2 bg-[#1a1a1a] p-3 rounded-xl shadow-2xl border border-[#333] animate-fadeIn">
                            <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                                <HexColorPicker color={brushColor} onChange={onColorChange} />
                            </div>
                            <button
                                onClick={() => setShowColorPicker(false)}
                                className="w-full py-1.5 bg-[#333] text-xs text-white rounded-lg hover:bg-[#444] transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                        Size
                    </h3>
                    <span className="text-xs text-gray-300 font-mono bg-[#222] px-2 py-1 rounded">{brushSize}px</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#333] rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                />
            </div>
        </div>
    );
};

export default Toolbar;
