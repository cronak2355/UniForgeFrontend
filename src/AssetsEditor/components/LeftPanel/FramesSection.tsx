// src/AssetsEditor/components/LeftPanel/FramesSection.tsx

import { useEffect, useState } from 'react';
import { useAssetsEditor } from '../../context/AssetsEditorContext';
import './LeftPanel.css';

export function FramesSection() {
    const {
        frames,
        currentFrameIndex,
        maxFrames,
        addFrame,
        deleteFrame,
        duplicateFrame,
        selectFrame,
        getFrameThumbnail,
    } = useAssetsEditor();

    const [thumbnails, setThumbnails] = useState<(string | null)[]>([]);

    useEffect(() => {
        const newThumbnails = frames.map((_, index) => getFrameThumbnail(index));
        setThumbnails(newThumbnails);
    }, [frames, getFrameThumbnail]);

    return (
        <div className="left-panel-section">
            <div className="lp-section-header">
                <h3 className="lp-section-title">Frames</h3>
                <span className="frame-count">
                    {frames.length} / {maxFrames}
                </span>
            </div>

            <div className="frames-grid">
                {frames.map((frame, index) => (
                    <div
                        key={frame.id}
                        onClick={() => selectFrame(index)}
                        className={`frame-item ${currentFrameIndex === index ? 'active' : ''}`}
                    >
                        <div className="frame-bg" />
                        {thumbnails[index] && (
                            <img
                                src={thumbnails[index]!}
                                className="frame-thumbnail"
                                alt={`Frame ${index + 1}`}
                            />
                        )}

                        {/* Hover Actions */}
                        <div className="frame-overlay">
                            <div className="frame-number">#{index + 1}</div>
                            <div className="frame-actions">
                                <button
                                    onClick={(e) => { e.stopPropagation(); duplicateFrame(index); }}
                                    disabled={frames.length >= maxFrames}
                                    className="frame-action-btn"
                                    title="Duplicate"
                                >
                                    📋
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteFrame(index); }}
                                    disabled={frames.length <= 1}
                                    className="frame-action-btn delete"
                                    title="Delete"
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add Button */}
                <button
                    onClick={addFrame}
                    disabled={frames.length >= maxFrames}
                    className="frame-add-btn"
                >
                    <span className="add-icon">+</span>
                </button>
            </div>
        </div>
    );
}
