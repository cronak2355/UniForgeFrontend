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
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full p-4 overflow-y-auto">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Tools</h3>

            <div className="grid grid-cols-2 gap-2 mb-6">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => onToolChange(tool.id)}
                        className={`
                            p-3 rounded-lg flex flex-col items-center justify-center transition-all
                            ${selectedTool === tool.id
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'}
                        `}
                    >
                        <span className="text-xl mb-1">{tool.icon}</span>
                        <span className="text-xs">{tool.label}</span>
                    </button>
                ))}
            </div>

            <div className="mb-6">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Brush Color</h3>
                <div className="relative">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-full h-10 rounded-lg border-2 border-gray-600 flex items-center justify-center mb-2"
                        style={{ backgroundColor: brushColor }}
                    >
                        <span className="text-xs text-white mix-blend-difference font-mono">{brushColor}</span>
                    </button>

                    {showColorPicker && (
                        <div className="absolute top-full left-0 z-10 mt-2 bg-gray-700 p-2 rounded-lg shadow-xl">
                            <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                                <HexColorPicker color={brushColor} onChange={onColorChange} />
                            </div>
                            <button
                                onClick={() => setShowColorPicker(false)}
                                className="w-full py-1 bg-gray-600 text-xs text-white rounded hover:bg-gray-500"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Size: {brushSize}px
                </h3>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
            </div>
        </div>
    );
};

export default Toolbar;
