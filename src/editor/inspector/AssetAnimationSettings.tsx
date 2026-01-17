// src/editor/inspector/AssetAnimationSettings.tsx
import { useState, useEffect } from 'react';
import type { Asset } from '../types/Asset';
import { colors } from '../constants/colors';
import { useEditorCore } from '../../contexts/EditorCoreContext';

interface Props {
    asset: Asset;
}

/**
 * Animation Settings panel for spritesheet assets.
 * Allows configuring FPS and loop for external spritesheets.
 */
export function AssetAnimationSettings({ asset }: Props) {
    const core = useEditorCore();

    // Extract current values from metadata
    const currentFps = asset.metadata?.animations?.default?.fps ?? 8;
    const currentLoop = asset.metadata?.animations?.default?.loop ?? true;
    const frameCount = asset.metadata?.frameCount ?? 1;

    const [fps, setFps] = useState(currentFps);
    const [loop, setLoop] = useState(currentLoop);
    const [isDirty, setIsDirty] = useState(false);

    // Sync state when asset changes
    useEffect(() => {
        setFps(asset.metadata?.animations?.default?.fps ?? 8);
        setLoop(asset.metadata?.animations?.default?.loop ?? true);
        setIsDirty(false);
    }, [asset.id]);

    // Check if this asset is a spritesheet (has multiple frames or is detected as one)
    const isSpritesheet = frameCount > 1 ||
        (asset.metadata?.frameWidth && asset.metadata?.frameWidth > 0) ||
        asset.tag === 'Character' ||
        asset.tag === 'Effect' ||
        asset.tag === 'Particle';

    if (!isSpritesheet) {
        return null; // Don't show for non-spritesheet assets
    }

    const handleFpsChange = (newFps: number) => {
        setFps(Math.max(1, Math.min(60, newFps)));
        setIsDirty(true);
    };

    const handleLoopChange = (newLoop: boolean) => {
        setLoop(newLoop);
        setIsDirty(true);
    };

    const handleApply = () => {
        // Build updated metadata
        const existingMetadata = asset.metadata || {};
        const existingAnimations = existingMetadata.animations || {};
        const existingDefault = existingAnimations.default || {};

        const frames = existingDefault.frames ||
            Array.from({ length: frameCount }, (_, i) => i);

        const updatedMetadata = {
            ...existingMetadata,
            frameCount: frameCount > 1 ? frameCount : undefined,
            animations: {
                ...existingAnimations,
                default: {
                    ...existingDefault,
                    frames,
                    fps,
                    loop
                }
            }
        };

        // Update asset in EditorCore
        core.updateAsset({
            ...asset,
            metadata: updatedMetadata
        });

        setIsDirty(false);

    };

    const handleReset = () => {
        setFps(currentFps);
        setLoop(currentLoop);
        setIsDirty(false);
    };

    return (
        <div style={{
            padding: '12px',
            background: colors.bgSecondary,
            borderRadius: '8px',
            marginBottom: '12px',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                color: colors.textPrimary,
                fontSize: '13px',
                fontWeight: 600,
            }}>
                <span>⚡</span>
                <span>Animation Settings</span>
                {frameCount > 1 && (
                    <span style={{
                        color: colors.textSecondary,
                        fontWeight: 400,
                        fontSize: '11px',
                        marginLeft: 'auto'
                    }}>
                        {frameCount} frames
                    </span>
                )}
            </div>

            {/* FPS Slider */}
            <div style={{ marginBottom: '12px' }}>
                <label style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: colors.textSecondary,
                    fontSize: '12px',
                    marginBottom: '6px',
                }}>
                    <span>FPS (Speed)</span>
                    <span style={{ color: colors.textPrimary, fontWeight: 500 }}>{fps}</span>
                </label>
                <input
                    type="range"
                    min="1"
                    max="30"
                    value={fps}
                    onChange={(e) => handleFpsChange(Number(e.target.value))}
                    style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: colors.bgTertiary,
                        cursor: 'pointer',
                        accentColor: colors.accent,
                    }}
                />
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: colors.textSecondary,
                    marginTop: '4px',
                }}>
                    <span>Slow</span>
                    <span>Fast</span>
                </div>
            </div>

            {/* Loop Checkbox */}
            <div style={{ marginBottom: '12px' }}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: colors.textSecondary,
                    fontSize: '12px',
                    cursor: 'pointer',
                }}>
                    <input
                        type="checkbox"
                        checked={loop}
                        onChange={(e) => handleLoopChange(e.target.checked)}
                        style={{
                            width: '16px',
                            height: '16px',
                            accentColor: colors.accent,
                            cursor: 'pointer',
                        }}
                    />
                    <span>Loop Animation</span>
                </label>
            </div>

            {/* Action Buttons */}
            {isDirty && (
                <div style={{
                    display: 'flex',
                    gap: '8px',
                }}>
                    <button
                        onClick={handleApply}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: colors.accent,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 500,
                        }}
                    >
                        Apply
                    </button>
                    <button
                        onClick={handleReset}
                        style={{
                            padding: '8px 12px',
                            background: colors.bgTertiary,
                            color: colors.textSecondary,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                        }}
                    >
                        Reset
                    </button>
                </div>
            )}
        </div>
    );
}
