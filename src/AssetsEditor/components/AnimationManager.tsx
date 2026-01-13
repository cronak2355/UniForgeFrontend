import { useState, useCallback } from 'react';
import { useAssetsEditor } from '../context/AssetsEditorContext';

export function AnimationManager() {
    const {
        animationMap,
        activeAnimationName,
        setActiveAnimation,
        addAnimation,
        deleteAnimation,
        renameAnimation,
        fps,
        setFps,
        isPlaying,
        setIsPlaying,
        loop,
        setLoop
    } = useAssetsEditor();

    const [newAnimName, setNewAnimName] = useState('');
    const [isRenaming, setIsRenaming] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    const handleAdd = () => {
        if (!newAnimName.trim()) return;
        addAnimation(newAnimName);
        setNewAnimName('');
    };

    const handleStartRename = (name: string) => {
        setIsRenaming(name);
        setRenameValue(name);
    };

    const handleFinishRename = () => {
        if (isRenaming && renameValue.trim() && renameValue !== isRenaming) {
            renameAnimation(isRenaming, renameValue);
        }
        setIsRenaming(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleFinishRename();
        if (e.key === 'Escape') setIsRenaming(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wide">Workspaces</h3>
                <div className="flex gap-1">
                    {/* Play/Stop Global Control */}
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${isPlaying ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
                    >
                        {isPlaying ? 'Stop' : 'Play'}
                    </button>
                </div>
            </div>

            {/* Animation List */}
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {Object.keys(animationMap).map((name) => {
                    const isActive = name === activeAnimationName;
                    const isEditing = isRenaming === name;

                    return (
                        <div
                            key={name}
                            onClick={() => !isEditing && setActiveAnimation(name)}
                            className={`
                                group flex items-center justify-between p-2 rounded cursor-pointer border text-xs
                                ${isActive ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10'}
                            `}
                        >
                            <div className="flex items-center gap-2 flex-1">
                                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]' : 'bg-white/20'}`} />

                                {isEditing ? (
                                    <input
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onBlur={handleFinishRename}
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                        className="bg-black/50 text-white w-full outline-none px-1 rounded"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            handleStartRename(name);
                                        }}
                                        className="font-medium truncate select-none"
                                        title={name}
                                    >
                                        {name}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteAnimation(name);
                                    }}
                                    className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-white/40"
                                    title="Delete"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add New */}
            <div className="flex gap-2">
                <input
                    value={newAnimName}
                    onChange={(e) => setNewAnimName(e.target.value)}
                    placeholder="New Animation..."
                    className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button
                    onClick={handleAdd}
                    disabled={!newAnimName.trim()}
                    className="px-3 py-1 bg-white/10 hover:bg-blue-600 text-white text-xs rounded disabled:opacity-50"
                >
                    +
                </button>
            </div>

            {/* Current Settings */}
            <div className="pt-2 border-t border-white/10">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="text-white/40 text-[10px] uppercase">Speed (FPS)</label>
                        <input
                            type="number"
                            min="1"
                            max="60"
                            value={fps}
                            onChange={(e) => setFps(Number(e.target.value))}
                            className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-white/40 text-[10px] uppercase">Playback</label>
                        <label className="flex items-center gap-2 cursor-pointer h-full">
                            <input
                                type="checkbox"
                                checked={loop}
                                onChange={(e) => setLoop(e.target.checked)}
                                className="accent-blue-500"
                            />
                            <span className="text-white/80">Loop</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
