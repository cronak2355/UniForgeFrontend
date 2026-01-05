import { useEffect, useRef } from "react";
import { colors } from "../constants/colors";

type Props = {
    currentColor: string;
    onColorChange: (color: string) => void;
    onClose: () => void;
    anchorRect: { left: number; top: number; width: number; height: number };
};

export function ColorPicker({ currentColor, onColorChange, onClose, anchorRect }: Props) {
    const pickerRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        // Use capture phase to handle events before they might be stopped by other handlers? 
        // Or just normal bubbling. Window click should solve it.
        // AssetPanel has a global pointerup for drag, but this is click.
        // Let's use mousedown to be faster/consistent.
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    // Calculate position - position ABOVE the asset
    const pickerHeight = 200; // approximate height of the picker
    const top = anchorRect.top - pickerHeight - 8;
    const left = anchorRect.left;

    const presetColors = [
        "#ef4444", "#f97316", "#f59e0b", "#eab308",
        "#84cc16", "#22c55e", "#10b981", "#14b8a6",
        "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
        "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
        "#f43f5e", "#ffffff", "#9ca3af", "#4b5563",
        "#1f2937", "#000000"
    ];

    return (
        <div
            ref={pickerRef}
            style={{
                position: "fixed",
                top: top,
                left: left,
                zIndex: 9999,
                background: colors.bgSecondary,
                border: `1px solid ${colors.borderColor}`,
                borderRadius: "8px",
                padding: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
            }}
        >
            {/* Hex Input */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                    style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "4px",
                        background: currentColor,
                        border: `1px solid ${colors.borderColor}`
                    }}
                />
                <input
                    type="text"
                    value={currentColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    style={{
                        background: colors.bgTertiary,
                        border: `1px solid ${colors.borderColor}`,
                        borderRadius: "4px",
                        color: colors.textPrimary,
                        padding: "4px 8px",
                        fontSize: "12px",
                        width: "80px",
                    }}
                />
            </div>

            {/* Presets Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "6px"
            }}>
                {presetColors.map((color) => (
                    <div
                        key={color}
                        onClick={() => onColorChange(color)}
                        style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "4px",
                            background: color,
                            border: currentColor === color ? `2px solid ${colors.textPrimary}` : `1px solid ${colors.borderColor}`,
                            cursor: "pointer",
                        }}
                        title={color}
                    />
                ))}
            </div>

            {/* HTML Color Input as a fallback/advanced picker */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    style={{
                        width: '100%',
                        height: '24px',
                        cursor: 'pointer',
                        border: 'none',
                        background: 'transparent'
                    }}
                />
            </div>
        </div>
    );
}
