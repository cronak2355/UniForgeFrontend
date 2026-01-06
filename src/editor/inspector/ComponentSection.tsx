import { memo } from "react";
import { ComponentDefaults } from "../types/Component";
import type {
    ComponentType,
    EditorComponent,
    RenderComponent,
    SignalComponent,
    SignalValue,
    TransformComponent,
    VariablesComponent,
} from "../types/Component";
import type { EditorEntity } from "../types/Entity";

const colors = {
    bgSecondary: "#161b22",
    bgTertiary: "#21262d",
    borderColor: "#30363d",
    accentLight: "#58a6ff",
    textPrimary: "#f0f6fc",
    textSecondary: "#8b949e",
    textMuted: "#6e7681",
    danger: "#da3633",
};

const labelStyle = {
    fontSize: "10px",
    color: colors.textSecondary,
};

const inputStyle = {
    padding: "2px 4px",
    fontSize: "10px",
    background: colors.bgSecondary,
    border: `1px solid ${colors.borderColor}`,
    borderRadius: "2px",
    color: colors.textPrimary,
};

type Props = {
    entity: EditorEntity;
    onUpdateEntity: (next: EditorEntity) => void;
    availableEntities: EditorEntity[];
};

const COMPONENT_TYPES: ComponentType[] = ["Transform", "Render", "Variables", "Signal"];
const TRIGGER_TYPES = ["OnStart", "OnUpdate", "OnKeyDown", "OnClick", "VariableOnChanged"] as const;
const CONDITION_TYPES = ["Always", "VariableEquals"] as const;

function isTransform(c: EditorComponent): c is TransformComponent {
    return c.type === "Transform";
}

function isRender(c: EditorComponent): c is RenderComponent {
    return c.type === "Render";
}

function isVariables(c: EditorComponent): c is VariablesComponent {
    return c.type === "Variables";
}

function isSignal(c: EditorComponent): c is SignalComponent {
    return c.type === "Signal";
}

function getLiteralType(value: SignalValue["value"]): "string" | "number" | "boolean" | "null" {
    if (value === null) return "null";
    const t = typeof value;
    if (t === "number" || t === "boolean") return t;
    return "string";
}

export const ComponentSection = memo(function ComponentSection({
    entity,
    onUpdateEntity,
    availableEntities,
}: Props) {
    const components = entity.components ?? [];

    const updateComponents = (next: EditorComponent[]) => {
        onUpdateEntity({ ...entity, components: next });
    };

    const handleAdd = (type: ComponentType) => {
        const def = ComponentDefaults[type];
        const next: EditorComponent = {
            id: crypto.randomUUID(),
            ...def,
        };
        updateComponents([...components, next]);
    };

    const updateComponent = (next: EditorComponent) => {
        updateComponents(components.map((c) => (c.id === next.id ? next : c)));
    };

    const removeComponent = (id: string) => {
        updateComponents(components.filter((c) => c.id !== id));
    };

    return (
        <div style={{ padding: "12px 0", borderTop: `1px solid ${colors.borderColor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span
                    style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: colors.accentLight,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    Components
                </span>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {COMPONENT_TYPES.map((type) => (
                        <button
                            key={type}
                            onClick={() => handleAdd(type)}
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
                            + {type}
                        </button>
                    ))}
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
                        marginBottom: "6px",
                        background: colors.bgTertiary,
                        border: `1px solid ${colors.borderColor}`,
                        borderRadius: "4px",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: colors.textPrimary }}>{comp.type}</span>
                        <button
                            onClick={() => removeComponent(comp.id)}
                            style={{
                                padding: "2px 6px",
                                fontSize: "10px",
                                background: colors.danger,
                                border: "none",
                                borderRadius: "2px",
                                color: "#fff",
                                cursor: "pointer",
                            }}
                        >
                            Remove
                        </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "6px", marginBottom: "8px" }}>
                        <label style={labelStyle}>Trigger</label>
                        <select
                            value={comp.trigger?.type ?? "OnUpdate"}
                            onChange={(e) => {
                                const type = e.target.value as (typeof TRIGGER_TYPES)[number];
                                const params = type === "OnKeyDown" ? { key: "Space" } : undefined;
                                updateComponent({
                                    ...comp,
                                    trigger: {
                                        id: comp.id,
                                        radius: 0,
                                        once: false,
                                        type,
                                        params,
                                    },
                                });
                            }}
                            style={inputStyle}
                        >
                            {TRIGGER_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>

                        {comp.trigger?.type === "OnKeyDown" && (
                            <>
                                <label style={labelStyle}>Key</label>
                                <input
                                    type="text"
                                    value={(comp.trigger.params?.key as string) ?? ""}
                                    onChange={(e) =>
                                        updateComponent({
                                            ...comp,
                                            trigger: {
                                                ...comp.trigger,
                                                params: { ...comp.trigger.params, key: e.target.value },
                                            },
                                        })
                                    }
                                    style={inputStyle}
                                />
                            </>
                        )}

                        {comp.trigger?.type === "VariableOnChanged" && (
                            <>
                                <label style={labelStyle}>Var Name</label>
                                <input
                                    type="text"
                                    value={(comp.trigger.params?.name as string) ?? ""}
                                    onChange={(e) =>
                                        updateComponent({
                                            ...comp,
                                            trigger: {
                                                ...comp.trigger,
                                                params: { ...comp.trigger.params, name: e.target.value },
                                            },
                                        })
                                    }
                                    style={inputStyle}
                                />
                            </>
                        )}

                        <label style={labelStyle}>Condition</label>
                        <select
                            value={comp.condition?.type ?? "Always"}
                            onChange={(e) => {
                                const type = e.target.value as (typeof CONDITION_TYPES)[number];
                                const params = type === "VariableEquals" ? { name: "", value: "" } : undefined;
                                updateComponent({
                                    ...comp,
                                    condition: { type, params },
                                });
                            }}
                            style={inputStyle}
                        >
                            {CONDITION_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>

                        {comp.condition?.type === "VariableEquals" && (
                            <>
                                <label style={labelStyle}>Var</label>
                                <input
                                    type="text"
                                    value={(comp.condition.params?.name as string) ?? ""}
                                    onChange={(e) =>
                                        updateComponent({
                                            ...comp,
                                            condition: {
                                                ...comp.condition,
                                                params: { ...comp.condition.params, name: e.target.value },
                                            },
                                        })
                                    }
                                    style={inputStyle}
                                />
                                <label style={labelStyle}>Value</label>
                                <input
                                    type="text"
                                    value={(comp.condition.params?.value as string) ?? ""}
                                    onChange={(e) =>
                                        updateComponent({
                                            ...comp,
                                            condition: {
                                                ...comp.condition,
                                                params: { ...comp.condition.params, value: e.target.value },
                                            },
                                        })
                                    }
                                    style={inputStyle}
                                />
                            </>
                        )}
                    </div>

                    {isTransform(comp) && (
                        <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: "6px" }}>
                            <label style={labelStyle}>X</label>
                            <input
                                type="number"
                                value={comp.x}
                                onChange={(e) => updateComponent({ ...comp, x: +e.target.value })}
                                style={inputStyle}
                            />
                            <label style={labelStyle}>Y</label>
                            <input
                                type="number"
                                value={comp.y}
                                onChange={(e) => updateComponent({ ...comp, y: +e.target.value })}
                                style={inputStyle}
                            />
                            <label style={labelStyle}>Rotation</label>
                            <input
                                type="number"
                                value={comp.rotation}
                                onChange={(e) => updateComponent({ ...comp, rotation: +e.target.value })}
                                style={inputStyle}
                            />
                            <label style={labelStyle}>Scale X</label>
                            <input
                                type="number"
                                step="0.1"
                                value={comp.scaleX}
                                onChange={(e) => updateComponent({ ...comp, scaleX: +e.target.value })}
                                style={inputStyle}
                            />
                            <label style={labelStyle}>Scale Y</label>
                            <input
                                type="number"
                                step="0.1"
                                value={comp.scaleY}
                                onChange={(e) => updateComponent({ ...comp, scaleY: +e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    )}

                    {isRender(comp) && (
                        <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: "6px" }}>
                            <label style={labelStyle}>Sprite</label>
                            <input
                                type="text"
                                value={comp.spriteId}
                                onChange={(e) => updateComponent({ ...comp, spriteId: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    )}

                    {isVariables(comp) && (
                        <div style={{ fontSize: "10px", color: colors.textMuted }}>
                            Variables editor coming soon
                        </div>
                    )}

                    {isSignal(comp) && (
                        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "6px" }}>
                            <label style={labelStyle}>Target</label>
                            <select
                                value={comp.targetEntityId ?? ""}
                                onChange={(e) => updateComponent({ ...comp, targetEntityId: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="">(self)</option>
                                {availableEntities.map((ent) => (
                                    <option key={ent.id} value={ent.id}>
                                        {ent.name || ent.id}
                                    </option>
                                ))}
                            </select>
                            <label style={labelStyle}>Signal Key</label>
                            <input
                                type="text"
                                value={comp.signalKey}
                                onChange={(e) => updateComponent({ ...comp, signalKey: e.target.value })}
                                style={inputStyle}
                            />
                            <label style={labelStyle}>Value Kind</label>
                            <select
                                value={comp.signalValue.kind}
                                onChange={(e) => {
                                    const kind = e.target.value as SignalValue["kind"];
                                    const nextValue =
                                        kind === "EntityVariable"
                                            ? { kind, name: "" }
                                            : { kind, value: null };
                                    updateComponent({ ...comp, signalValue: nextValue });
                                }}
                                style={inputStyle}
                            >
                                <option value="Literal">Literal</option>
                                <option value="EntityVariable">Entity Variable</option>
                            </select>

                            {comp.signalValue.kind === "EntityVariable" && (
                                <>
                                    <label style={labelStyle}>Var Name</label>
                                    <input
                                        type="text"
                                        value={comp.signalValue.name}
                                        onChange={(e) =>
                                            updateComponent({
                                                ...comp,
                                                signalValue: { kind: "EntityVariable", name: e.target.value },
                                            })
                                        }
                                        style={inputStyle}
                                    />
                                </>
                            )}

                            {comp.signalValue.kind === "Literal" && (
                                <>
                                    <label style={labelStyle}>Type</label>
                                    <select
                                        value={getLiteralType(comp.signalValue.value)}
                                        onChange={(e) => {
                                            const nextType = e.target.value;
                                            let nextValue: number | string | boolean | null = null;
                                            if (nextType === "number") nextValue = 0;
                                            if (nextType === "string") nextValue = "";
                                            if (nextType === "boolean") nextValue = false;
                                            updateComponent({
                                                ...comp,
                                                signalValue: { kind: "Literal", value: nextValue },
                                            });
                                        }}
                                        style={inputStyle}
                                    >
                                        <option value="string">string</option>
                                        <option value="number">number</option>
                                        <option value="boolean">boolean</option>
                                        <option value="null">null</option>
                                    </select>

                                    {getLiteralType(comp.signalValue.value) !== "null" && (
                                        <>
                                            <label style={labelStyle}>Value</label>
                                            {getLiteralType(comp.signalValue.value) === "boolean" ? (
                                                <select
                                                    value={comp.signalValue.value ? "true" : "false"}
                                                    onChange={(e) =>
                                                        updateComponent({
                                                            ...comp,
                                                            signalValue: {
                                                                kind: "Literal",
                                                                value: e.target.value === "true",
                                                            },
                                                        })
                                                    }
                                                    style={inputStyle}
                                                >
                                                    <option value="true">true</option>
                                                    <option value="false">false</option>
                                                </select>
                                            ) : (
                                                <input
                                                    type={getLiteralType(comp.signalValue.value) === "number" ? "number" : "text"}
                                                    value={String(comp.signalValue.value ?? "")}
                                                    onChange={(e) =>
                                                        updateComponent({
                                                            ...comp,
                                                            signalValue: {
                                                                kind: "Literal",
                                                                value:
                                                                    getLiteralType(comp.signalValue.value) === "number"
                                                                        ? Number(e.target.value)
                                                                        : e.target.value,
                                                            },
                                                        })
                                                    }
                                                    style={inputStyle}
                                                />
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
});
