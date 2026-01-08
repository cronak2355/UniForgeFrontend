// src/AssetsEditor/components/LeftPanel/ToolsSection.tsx

import { useAssetsEditor, type Tool } from '../../context/AssetsEditorContext';
import './LeftPanel.css';

const TOOLS = [
    { id: 'brush', icon: '✏️', label: 'Pen (P)' },
    { id: 'eraser', icon: '🧽', label: 'Eraser (E)' },
    { id: 'eyedropper', icon: '💧', label: 'Picker (O)' },
    { id: 'fill', icon: '🪣', label: 'Fill (B)' },
] as const;

const RESOLUTIONS = [128, 256, 512] as const;

// Color conversion utilities
export const rgbaToHex = (color: { r: number; g: number; b: number; a: number }) => {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
};

export const hexToRgba = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255,
    } : { r: 0, g: 0, b: 0, a: 255 };
};

export function ToolsSection() {
    const {
        currentTool,
        setCurrentTool,
        currentColor,
        setCurrentColor,
        pixelSize,
        setPixelSize,
    } = useAssetsEditor();

    return (
        <div className="left-panel-section">
            {/* Resolution */}
            <div className="subsection">
                <h3 className="lp-section-title muted">Resolution</h3>
                <div className="resolution-buttons">
                    {RESOLUTIONS.map(size => (
                        <button
                            key={size}
                            onClick={() => setPixelSize(size)}
                            className={`resolution-btn ${pixelSize === size ? 'active' : ''}`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            <div className="divider" />

            {/* Tools */}
            <h3 className="lp-section-title muted">Tools</h3>
            <div className="tools-grid">
                {TOOLS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setCurrentTool(t.id as Tool)}
                        className={`tool-btn ${currentTool === t.id ? 'active' : ''}`}
                        title={t.label}
                    >
                        {t.icon}
                    </button>
                ))}
            </div>

            <div className="divider" />

            {/* Current Color Input */}
            <div className="color-picker-row">
                <div
                    className="color-preview"
                    style={{ backgroundColor: rgbaToHex(currentColor) }}
                />
                <div className="color-input-wrapper">
                    <input
                        type="color"
                        value={rgbaToHex(currentColor)}
                        onChange={(e) => setCurrentColor(hexToRgba(e.target.value))}
                        className="color-input"
                    />
                    <div className="color-hex">{rgbaToHex(currentColor)}</div>
                </div>
            </div>
        </div>
    );
}

