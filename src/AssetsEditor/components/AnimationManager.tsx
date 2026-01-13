import { useState } from 'react';
import { useAssetsEditor, type AnimationDefinition } from '../context/AssetsEditorContext';

export function AnimationManager() {
    const {
        frames,
        animations,
        setAnimations,
        selectFrame,
        setIsPlaying,
        getFrameThumbnail
    } = useAssetsEditor();

    const [newName, setNewName] = useState('New Anim');
    const [selectedAnimIndex, setSelectedAnimIndex] = useState<number>(-1);

    const addAnimation = () => {
        const newAnim: AnimationDefinition = {
            name: newName,
            frames: frames.map((_, i) => i), // Default to all frames
            fps: 8,
            loop: true
        };
        setAnimations([...animations, newAnim]);
    };

    const updateAnimation = (index: number, partial: Partial<AnimationDefinition>) => {
        const updated = [...animations];
        updated[index] = { ...updated[index], ...partial };
        setAnimations(updated);
    };

    const removeAnimation = (index: number) => {
        const updated = [...animations];
        updated.splice(index, 1);
        setAnimations(updated);
        if (selectedAnimIndex === index) setSelectedAnimIndex(-1);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wide">Animations</h3>

            {/* List */}
            <div className="space-y-2">
                {animations.map((anim, idx) => (
                    <div key={idx} className={`bg-white/5 border ${selectedAnimIndex === idx ? 'border-blue-500' : 'border-white/10'} p-2 rounded`}>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-2">
                            <input
                                value={anim.name}
                                onChange={(e) => updateAnimation(idx, { name: e.target.value })}
                                className="bg-transparent text-xs text-white font-bold w-24 outline-none border-b border-transparent focus:border-blue-500"
                            />
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setIsPlaying(true)}
                                    className="text-[10px] bg-green-500/20 text-green-400 px-1 rounded uppercase"
                                >Play</button>
                                <button
                                    onClick={() => removeAnimation(idx)}
                                    className="text-[10px] bg-red-500/20 text-red-400 px-1 rounded uppercase"
                                >Del</button>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-white/60">
                            <div className="flex gap-1 items-center">
                                <span>FPS:</span>
                                <input
                                    type="number"
                                    value={anim.fps}
                                    onChange={(e) => updateAnimation(idx, { fps: Number(e.target.value) })}
                                    className="w-8 bg-black/40 text-white rounded px-1"
                                />
                            </div>
                            <div className="flex gap-1 items-center">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={anim.loop}
                                        onChange={(e) => updateAnimation(idx, { loop: e.target.checked })}
                                    />
                                    <span>Loop</span>
                                </label>
                            </div>
                        </div>

                        {/* Frame Selector (Simple Range for now, or Multi-select?) */}
                        {/* Let's implementation simple toggle for frames in this animation */}
                        <div className="mt-2 flex flex-wrap gap-1">
                            {frames.map((_, fIdx) => {
                                const isSelected = anim.frames.includes(fIdx);
                                return (
                                    <div
                                        key={fIdx}
                                        onClick={() => {
                                            let newFrames = [...anim.frames];
                                            if (isSelected) {
                                                newFrames = newFrames.filter(f => f !== fIdx);
                                            } else {
                                                newFrames.push(fIdx);
                                                newFrames.sort((a, b) => a - b);
                                            }
                                            updateAnimation(idx, { frames: newFrames });
                                        }}
                                        className={`
                                w-6 h-6 border cursor-pointer flex items-center justify-center text-[8px]
                                ${isSelected ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-white/10 bg-black/40 text-white/20'}
                            `}
                                    >
                                        {fIdx}
                                    </div>
                                )
                            })}
                        </div>

                    </div>
                ))}
            </div>

            {/* Add New */}
            <div className="flex gap-2">
                <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 px-2 py-1 text-xs text-white"
                    placeholder="Anim Name"
                />
                <button
                    onClick={addAnimation}
                    className="bg-blue-600 px-3 py-1 text-xs text-white font-bold uppercase"
                >
                    + Add
                </button>
            </div>
        </div>
    );
}
