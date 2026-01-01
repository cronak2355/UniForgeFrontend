import { memo } from "react";
import type {
    EditorComponent,
    ComponentType,
    AutoRotateComponent,
    PulseComponent
} from "../types/Component";
import { ComponentDefaults } from "../types/Component";

const colors = {
    bgPrimary: '#0d1117',
    borderColor: '#30363d',
    accentLight: '#58a6ff',
    textPrimary: '#f0f6fc',
    textSecondary: '#8b949e',
    btnBg: '#21262d',
    btnHover: '#30363d',
    danger: '#da3633',
};

type Props = {
    components: EditorComponent[];
    onAdd: (comp: EditorComponent) => void;
    onUpdate: (comp: EditorComponent) => void;
    onRemove: (id: string) => void;
};

export const ComponentSection = memo(function ComponentSection({ components, onAdd, onUpdate, onRemove }: Props) {

    const handleAdd = (type: ComponentType) => {
        const def = ComponentDefaults[type];
        onAdd({ ...def, id: crypto.randomUUID() } as EditorComponent);
    };

    return (
        <div style={{ padding: "12px 0", borderTop: `1px solid ${colors.borderColor}` }}>
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px"
            }}>
                <div style={{
                    fontSize: '11px', fontWeight: 600, color: colors.accentLight,
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                    Components
                </div>
                <select
                    style={{
                        background: colors.btnBg, color: colors.textPrimary, border: `1px solid ${colors.borderColor}`,
                        borderRadius: "4px", fontSize: "11px", padding: "2px 4px", outline: "none"
                    }}
                    value=""
                    onChange={(e) => {
                        if (e.target.value) handleAdd(e.target.value as ComponentType);
                    }}
                >
                    <option value="">+ Add</option>
                    <option value="AutoRotate">Auto Rotate</option>
                    <option value="Pulse">Pulse</option>
                </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {components.map((comp) => (
                    <ComponentItem
                        key={comp.id}
                        component={comp}
                        onUpdate={onUpdate}
                        onRemove={onRemove}
                    />
                ))}
            </div>
        </div>
    );
});

const ComponentItem = memo(function ComponentItem({
    component, onUpdate, onRemove
}: {
    component: EditorComponent;
    onUpdate: (c: EditorComponent) => void;
    onRemove: (id: string) => void;
}) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${colors.borderColor}`,
            borderRadius: "6px",
            padding: "8px"
        }}>
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px"
            }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: colors.textPrimary }}>
                    {component.type}
                </span>
                <button
                    onClick={() => onRemove(component.id)}
                    style={{
                        background: "transparent", border: "none", color: colors.danger,
                        cursor: "pointer", fontSize: "10px"
                    }}
                >
                    Remove
                </button>
            </div>

            {component.type === "AutoRotate" && (
                <AutoRotateEditor
                    component={component as AutoRotateComponent}
                    onUpdate={onUpdate}
                />
            )}

            {component.type === "Pulse" && (
                <PulseEditor
                    component={component as PulseComponent}
                    onUpdate={onUpdate}
                />
            )}
        </div>
    );
});

function AutoRotateEditor({ component, onUpdate }: { component: AutoRotateComponent, onUpdate: (c: EditorComponent) => void }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <NumberField
                label="Speed"
                value={component.speed}
                onChange={(v) => onUpdate({ ...component, speed: v })}
            />
        </div>
    );
}

function PulseEditor({ component, onUpdate }: { component: PulseComponent, onUpdate: (c: EditorComponent) => void }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <NumberField
                label="Speed"
                value={component.speed}
                onChange={(v) => onUpdate({ ...component, speed: v })}
            />
            <div style={{ display: "flex", gap: "8px" }}>
                <NumberField
                    label="Min"
                    value={component.minScale}
                    onChange={(v) => onUpdate({ ...component, minScale: v })}
                />
                <NumberField
                    label="Max"
                    value={component.maxScale}
                    onChange={(v) => onUpdate({ ...component, maxScale: v })}
                />
            </div>
        </div>
    );
}

function NumberField({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", color: colors.textSecondary }}>{label}</span>
            <input
                type="number"
                value={value}
                step={0.1}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{
                    width: "60px",
                    background: "#0d1117",
                    border: "1px solid #30363d",
                    color: "#f0f6fc",
                    borderRadius: "4px",
                    fontSize: "11px",
                    padding: "2px 4px"
                }}
            />
        </div>
    );
}
