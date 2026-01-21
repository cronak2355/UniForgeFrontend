import React, { useState } from 'react';
import { HexColorPicker } from 'react-colorful';

interface ToolbarProps {
    selectedTool: string;
    onToolChange: (tool: string) => void;
    brushColor: string;
    onColorChange: (color: string) => void;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    onImageUpload: (file: File) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
    selectedTool,
    onToolChange,
    brushColor,
    onColorChange,
    brushSize,
    onBrushSizeChange,
    onImageUpload
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);

    const tools = [
        { id: 'move', label: '이동', icon: 'fa-solid fa-arrows-up-down-left-right' },
        { id: 'pen', label: '브러쉬', icon: 'fa-solid fa-paintbrush' },
        { id: 'eraser', label: '지우개', icon: 'fa-solid fa-eraser' },
        { id: 'bucket', label: '채우기', icon: 'fa-solid fa-fill-drip' },
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImageUpload(e.target.files[0]);
            e.target.value = '';
        }
    };

    return (
        <div className="w-16 md:w-64 bg-[#262626] border-r border-[#1a1a1a] flex flex-col h-full text-[#b3b3b3] select-none text-[11px] font-sans shadow-2xl z-30">
            {/* Header */}
            <div className="h-8 bg-[#303030] flex items-center px-3 border-b border-[#1a1a1a] mb-2 shadow-sm shrink-0">
                <span className="hidden md:block font-bold tracking-wide text-gray-400">도구</span>
                <i className="fa-solid fa-toolbox md:hidden text-gray-400"></i>
            </div>

            {/* Scrollable Tools Area */}
            <div className="p-2 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1">
                {/* Tools Grid - Adaptive */}
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
                        {tools.map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => onToolChange(tool.id)}
                                title={tool.label}
                                className={`
                                    w-full aspect-square rounded-[3px] flex items-center justify-center transition-all duration-100
                                    ${selectedTool === tool.id
                                        ? 'bg-[#404040] text-white shadow-[inset_0_0_0_1px_#666]'
                                        : 'hover:bg-[#363636] hover:text-gray-200'}
                                `}
                            >
                                <i className={`${tool.icon} text-sm`}></i>
                            </button>
                        ))}

                        {/* Image Upload Button */}
                        <label
                            title="이미지 가져오기"
                            className="w-full aspect-square rounded-[3px] flex items-center justify-center hover:bg-[#363636] hover:text-gray-200 cursor-pointer transition-all duration-100"
                        >
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            <i className="fa-regular fa-image text-sm"></i>
                        </label>
                    </div>
                </div>

                <div className="h-[1px] bg-[#383838] w-full shrink-0"></div>

                {/* Sub Tools Area (Brush Size) */}
                <div className="hidden md:block">
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1.5">
                            <span>크기</span>
                            <span className="bg-[#181818] px-1.5 py-0.5 rounded text-[10px] text-gray-300 tabular-nums border border-[#333] shadow-inner">{brushSize}px</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="64"
                            value={brushSize}
                            onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
                            className="w-full h-1 bg-[#111] rounded-full appearance-none cursor-pointer accent-[#666] hover:accent-[#888]"
                        />
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Area for Color Picker */}
            <div className="p-2 border-t border-[#1a1a1a] bg-[#262626] relative">
                <div className="mt-auto md:mt-0">
                    <div className="mb-2 hidden md:block">색상</div>
                    <div className="flex flex-col gap-2 relative group">
                        {/* Foreground Color */}
                        <div
                            className="w-full aspect-square md:aspect-auto md:h-12 rounded-[2px] border border-[#444] shadow-inner cursor-pointer relative bg-checkboard"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                        >
                            <div className="absolute inset-0" style={{ backgroundColor: brushColor }}></div>
                            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 pointer-events-none"></div>
                        </div>

                        {/* Quick Colors */}
                        <div className="flex justify-between px-0.5">
                            <button
                                onClick={() => onColorChange('#000000')}
                                title="검은색"
                                className="w-5 h-5 bg-black border border-[#444] rounded-[2px] hover:scale-105 transition-transform shadow-sm"
                            ></button>
                            <button
                                onClick={() => onColorChange('#ffffff')}
                                title="흰색"
                                className="w-5 h-5 bg-white border border-[#444] rounded-[2px] hover:scale-105 transition-transform shadow-sm"
                            ></button>
                        </div>

                        {/* Popover - Now escapes the scroll container because it's in a sibling div */}
                        {showColorPicker && (
                            <div className="absolute bottom-full left-0 mb-2 z-50 bg-[#2b2b2b] p-2 rounded-[4px] border border-[#111] shadow-[0_4px_20px_rgba(0,0,0,0.5)] w-[200px]">
                                <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                                    <HexColorPicker color={brushColor} onChange={onColorChange} />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 h-6 bg-[#161616] border border-[#333] text-gray-300 px-2 flex items-center text-[10px] font-mono shadow-inner rounded-[2px]">
                                        {brushColor.toUpperCase()}
                                    </div>
                                    <button
                                        onClick={() => setShowColorPicker(false)}
                                        className="px-3 bg-[#444] hover:bg-[#505050] text-white text-[10px] rounded-[2px] transition-colors border border-[#555]"
                                    >
                                        확인
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Toolbar;
