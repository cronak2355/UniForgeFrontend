// src/AssetsEditor/components/LeftPanel/PaletteSection.tsx

import { useAssetsEditor } from '../../context/AssetsEditorContext';
import { hexToRgba } from './ToolsSection';
import './LeftPanel.css';

const PALETTE_COLORS = [
    '#000000', '#ffffff', '#9ca3af', '#4b5563',
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#3b82f6', '#8b5cf6', '#d946ef',
    '#be185d', '#881337', '#4c1d95', '#1e3a8a',
];

export function PaletteSection() {
    const {
        setCurrentColor,
        brushSize,
        setBrushSize,
        clearCanvas,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useAssetsEditor();

    return (
        <div className="left-panel-section flex-grow">
            {/* Palette */}
            <div className="subsection">
                <h3 className="lp-section-title muted">Palette</h3>
                <div className="palette-grid">
                    {PALETTE_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => setCurrentColor(hexToRgba(c))}
                            className="palette-color"
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            {/* Brush Size */}
            <div className="subsection">
                <div className="brush-size-header">
                    <h3 className="lp-section-title muted">Size</h3>
                    <span className="brush-size-value">{brushSize}px</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="16"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="brush-slider"
                />
            </div>

            {/* History & Actions */}
            <div className="actions-section">
                <div className="history-buttons">
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        className="action-btn"
                    >
                        Undo
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        className="action-btn"
                    >
                        Redo
                    </button>
                </div>

                <button
                    onClick={clearCanvas}
                    className="clear-btn"
                >
                    Clear
                </button>
            </div>
        </div>
    );
}
