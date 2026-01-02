import { memo } from "react";
import type {
    EditorComponent,
    ComponentType,
} from "../types/Component";
import { ComponentDefaults } from "../types/Component";

const colors = {
    bgPrimary: '#0d1117',
    bgSecondary: '#161b22',
    bgTertiary: '#21262d',
    borderColor: '#30363d',
    accentLight: '#58a6ff',
    textPrimary: '#f0f6fc',
    textSecondary: '#8b949e',
    textMuted: '#6e7681',
    btnBg: '#21262d',
    btnHover: '#30363d',
    danger: '#da3633',
    error: '#da3633',
};

import type { EditorEntity } from "../types/Entity"; // Import 추가

// ...

type Props = {
    entity: EditorEntity;
    onUpdateEntity: (entity: EditorEntity) => void;
};

export const ComponentSection = memo(function ComponentSection({ entity, onUpdateEntity }: Props) {
    const components = entity.components || [];

    const onAdd = (comp: EditorComponent) => {
        onUpdateEntity({ ...entity, components: [...components, comp] });
    };

    const onUpdate = (comp: EditorComponent) => {
        onUpdateEntity({ ...entity, components: components.map(c => c.id === comp.id ? comp : c) });
    };

    const onRemove = (id: string) => {
        onUpdateEntity({ ...entity, components: components.filter(c => c.id !== id) });
    };

    const handleAdd = (type: ComponentType) => {
        const def = ComponentDefaults[type];
        onAdd({ ...def, id: crypto.randomUUID() } as EditorComponent);
    };

    return (
        <div style={{ marginBottom: "16px" }}>
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
            }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: colors.textSecondary }}>
                    Components
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                    <button
                        onClick={() => handleAdd("AutoRotate")}
                        style={{
                            padding: "4px 8px",
                            fontSize: "10px",
                            background: colors.bgTertiary,
                            border: `1px solid ${colors.borderColor}`,
                            borderRadius: "4px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                        }}
                    >
                        + Rotate
                    </button>
                    <button
                        onClick={() => handleAdd("Pulse")}
                        style={{
                            padding: "4px 8px",
                            fontSize: "10px",
                            background: colors.bgTertiary,
                            border: `1px solid ${colors.borderColor}`,
                            borderRadius: "4px",
                            color: colors.textPrimary,
                            cursor: "pointer",
                        }}
                    >
                        + Pulse
                    </button>
                </div>
            </div>

            {components.length === 0 && (
                <div style={{ fontSize: "11px", color: colors.textMuted, fontStyle: "italic" }}>
                    No components attached
                </div>
            )}

            {components.map((comp) => (
                <div
                    key={comp.id}
                    style={{
                        padding: "8px",
                        marginBottom: "4px",
                        background: colors.bgTertiary,
                        border: `1px solid ${colors.borderColor}`,
                        borderRadius: "4px",
                    }}
                >
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "6px",
                    }}>
                        <span style={{ fontSize: "11px", fontWeight: 500, color: colors.textPrimary }}>
                            {comp.type}
                        </span>
                        <button
                            onClick={() => onRemove(comp.id)}
                            style={{
                                padding: "2px 6px",
                                fontSize: "10px",
                                background: colors.error,
                                border: "none",
                                borderRadius: "2px",
                                color: "#fff",
                                cursor: "pointer",
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Render component-specific properties */}
                    {comp.type === "AutoRotate" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <label style={{ fontSize: "10px", color: colors.textSecondary }}>Speed:</label>
                            <input
                                type="number"
                                value={comp.speed}
                                onChange={(e) => onUpdate({ ...comp, speed: parseFloat(e.target.value) || 0 })}
                                style={{
                                    width: "60px",
                                    padding: "2px 4px",
                                    fontSize: "10px",
                                    background: colors.bgSecondary,
                                    border: `1px solid ${colors.borderColor}`,
                                    borderRadius: "2px",
                                    color: colors.textPrimary,
                                }}
                            />
                        </div>
                    )}

                    {comp.type === "Pulse" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <label style={{ fontSize: "10px", color: colors.textSecondary, width: "60px" }}>Speed:</label>
                                <input
                                    type="number"
                                    value={comp.speed}
                                    onChange={(e) => onUpdate({ ...comp, speed: parseFloat(e.target.value) || 0 })}
                                    style={{
                                        width: "60px",
                                        padding: "2px 4px",
                                        fontSize: "10px",
                                        background: colors.bgSecondary,
                                        border: `1px solid ${colors.borderColor}`,
                                        borderRadius: "2px",
                                        color: colors.textPrimary,
                                    }}
                                />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <label style={{ fontSize: "10px", color: colors.textSecondary, width: "60px" }}>Min Scale:</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={comp.minScale}
                                    onChange={(e) => onUpdate({ ...comp, minScale: parseFloat(e.target.value) || 0 })}
                                    style={{
                                        width: "60px",
                                        padding: "2px 4px",
                                        fontSize: "10px",
                                        background: colors.bgSecondary,
                                        border: `1px solid ${colors.borderColor}`,
                                        borderRadius: "2px",
                                        color: colors.textPrimary,
                                    }}
                                />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <label style={{ fontSize: "10px", color: colors.textSecondary, width: "60px" }}>Max Scale:</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={comp.maxScale}
                                    onChange={(e) => onUpdate({ ...comp, maxScale: parseFloat(e.target.value) || 0 })}
                                    style={{
                                        width: "60px",
                                        padding: "2px 4px",
                                        fontSize: "10px",
                                        background: colors.bgSecondary,
                                        border: `1px solid ${colors.borderColor}`,
                                        borderRadius: "2px",
                                        color: colors.textPrimary,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
});
