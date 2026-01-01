import { EditorComponent, ComponentDefaults } from "../types/Component";
import { colors } from "../constants/colors";

type Props = {
    components: EditorComponent[];
    onAdd: (component: EditorComponent) => void;
    onUpdate: (component: EditorComponent) => void;
    onDelete: (id: string) => void;
};

export function ComponentSection({ components, onAdd, onUpdate, onDelete }: Props) {
    const handleAddComponent = (type: "AutoRotate" | "Pulse") => {
        const defaults = ComponentDefaults[type];
        const newComponent: EditorComponent = {
            ...defaults,
            id: crypto.randomUUID(),
        } as EditorComponent;
        onAdd(newComponent);
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
                        onClick={() => handleAddComponent("AutoRotate")}
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
                        onClick={() => handleAddComponent("Pulse")}
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
                            onClick={() => onDelete(comp.id)}
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
}
