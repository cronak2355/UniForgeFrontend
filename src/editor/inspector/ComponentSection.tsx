import { memo, type CSSProperties } from "react";
import type {
    EditorComponent,
    ComponentType,
    AutoRotateComponent,
    PulseComponent
} from "../types/Component";
import { ComponentDefaults } from "../types/Component";
import type { EditorEntity } from "../types/Entity";

// ============================================
// Styles
// ============================================

const colors = {
    bgSecondary: '#161b22',
    bgTertiary: '#21262d',
    borderColor: '#30363d',
    accentLight: '#58a6ff',
    textPrimary: '#f0f6fc',
    textSecondary: '#8b949e',
    textMuted: '#6e7681',
    danger: '#da3633',
};

const styles = {
    container: {
        padding: "12px 0",
        borderTop: `1px solid ${colors.borderColor}`,
    } as CSSProperties,

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
    } as CSSProperties,

    title: {
        fontSize: "11px",
        fontWeight: 600,
        color: colors.accentLight,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    } as CSSProperties,

    buttonGroup: {
        display: "flex",
        gap: "4px",
    } as CSSProperties,

    addButton: {
        padding: "4px 8px",
        fontSize: "10px",
        background: colors.bgTertiary,
        border: `1px solid ${colors.borderColor}`,
        borderRadius: "4px",
        color: colors.textPrimary,
        cursor: "pointer",
    } as CSSProperties,

    emptyText: {
        fontSize: "11px",
        color: colors.textMuted,
        fontStyle: "italic",
    } as CSSProperties,

    card: {
        padding: "8px",
        marginBottom: "4px",
        background: colors.bgTertiary,
        border: `1px solid ${colors.borderColor}`,
        borderRadius: "4px",
    } as CSSProperties,

    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "6px",
    } as CSSProperties,

    cardTitle: {
        fontSize: "11px",
        fontWeight: 500,
        color: colors.textPrimary,
    } as CSSProperties,

    removeButton: {
        padding: "2px 6px",
        fontSize: "10px",
        background: colors.danger,
        border: "none",
        borderRadius: "2px",
        color: "#fff",
        cursor: "pointer",
    } as CSSProperties,

    fieldRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    } as CSSProperties,

    fieldColumn: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    } as CSSProperties,

    label: {
        fontSize: "10px",
        color: colors.textSecondary,
        width: "60px",
    } as CSSProperties,

    input: {
        width: "60px",
        padding: "2px 4px",
        fontSize: "10px",
        background: colors.bgSecondary,
        border: `1px solid ${colors.borderColor}`,
        borderRadius: "2px",
        color: colors.textPrimary,
    } as CSSProperties,
};

// ============================================
// Sub-Components
// ============================================

type NumberFieldProps = {
    label: string;
    value: number;
    onChange: (value: number) => void;
    step?: number;
};

function NumberField({ label, value, onChange, step }: NumberFieldProps) {
    return (
        <div style={styles.fieldRow}>
            <label style={styles.label}>{label}:</label>
            <input
                type="number"
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                style={styles.input}
            />
        </div>
    );
}

type ComponentCardProps = {
    component: EditorComponent;
    onUpdate: (comp: EditorComponent) => void;
    onRemove: () => void;
};

function ComponentCard({ component, onUpdate, onRemove }: ComponentCardProps) {
    return (
        <div style={styles.card}>
            <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>{component.type}</span>
                <button onClick={onRemove} style={styles.removeButton}>✕</button>
            </div>

            {component.type === "AutoRotate" && (
                <NumberField
                    label="Speed"
                    value={(component as AutoRotateComponent).speed}
                    onChange={(v) => onUpdate({ ...component, speed: v } as AutoRotateComponent)}
                />
            )}

            {component.type === "Pulse" && (
                <div style={styles.fieldColumn}>
                    <NumberField
                        label="Speed"
                        value={(component as PulseComponent).speed}
                        onChange={(v) => onUpdate({ ...component, speed: v } as PulseComponent)}
                    />
                    <NumberField
                        label="Min Scale"
                        value={(component as PulseComponent).minScale}
                        onChange={(v) => onUpdate({ ...component, minScale: v } as PulseComponent)}
                        step={0.1}
                    />
                    <NumberField
                        label="Max Scale"
                        value={(component as PulseComponent).maxScale}
                        onChange={(v) => onUpdate({ ...component, maxScale: v } as PulseComponent)}
                        step={0.1}
                    />
                </div>
            )}
        </div>
    );
}

// ============================================
// Main Component
// ============================================

type Props = {
    entity: EditorEntity;
    onUpdateEntity: (entity: EditorEntity) => void;
};

export const ComponentSection = memo(function ComponentSection({ entity, onUpdateEntity }: Props) {
    const components = entity.components || [];

    const handleAdd = (type: ComponentType) => {
        const def = ComponentDefaults[type];
        const newComp = { ...def, id: crypto.randomUUID() } as EditorComponent;
        onUpdateEntity({ ...entity, components: [...components, newComp] });
    };

    const handleUpdate = (comp: EditorComponent) => {
        onUpdateEntity({ ...entity, components: components.map(c => c.id === comp.id ? comp : c) });
    };

    const handleRemove = (id: string) => {
        onUpdateEntity({ ...entity, components: components.filter(c => c.id !== id) });
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <span style={styles.title}>Components</span>
                <div style={styles.buttonGroup}>
                    <button onClick={() => handleAdd("AutoRotate")} style={styles.addButton}>
                        + Rotate
                    </button>
                    <button onClick={() => handleAdd("Pulse")} style={styles.addButton}>
                        + Pulse
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {components.length === 0 && (
                <div style={styles.emptyText}>No components attached</div>
            )}

            {/* Component Cards */}
            {components.map((comp) => (
                <ComponentCard
                    key={comp.id}
                    component={comp}
                    onUpdate={handleUpdate}
                    onRemove={() => handleRemove(comp.id)}
                />
            ))}
        </div>
    );
});
