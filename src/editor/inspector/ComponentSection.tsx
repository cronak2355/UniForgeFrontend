import { memo, useEffect, useState } from "react";
import type { EditorEntity } from "../types/Entity";
import type { LogicComponent } from "../types/Component";
import { ActionRegistry } from "../core/events/ActionRegistry";
import { colors } from "../constants/colors";
import { useEditorCoreSnapshot } from "../../contexts/EditorCoreContext";
import * as styles from "./ComponentSection.styles";
import { buildLogicItems, splitLogicItems } from "../types/Logic";
import type { EditorVariable } from "../types/Variable";

type Props = {
    entity: EditorEntity;
    onUpdateEntity: (entity: EditorEntity) => void;
};

const EVENT_TYPES = [
    { value: "OnStart", label: "OnStart" },
    { value: "OnUpdate", label: "OnUpdate" },
    { value: "OnDestroy", label: "OnDestroy" },
    { value: "OnSignalReceive", label: "OnSignalReceive" },
    { value: "OnCollision", label: "OnCollision" },
];

const ACTION_LABELS: Record<string, string> = {
    Move: "Move",
    Jump: "Jump",
    MoveToward: "MoveToward",
    ChaseTarget: "ChaseTarget",
    Attack: "Attack",
    FireProjectile: "FireProjectile",
    TakeDamage: "TakeDamage",
    Heal: "Heal",
    SetVar: "SetVar",
    Enable: "Enable",
    ChangeScene: "ChangeScene",
    Rotate: "Rotate",
    Pulse: "Pulse",
    ShowDialogue: "ShowDialogue",
    PlaySound: "PlaySound",
    EmitEventSignal: "EmitEventSignal",
    ClearSignal: "ClearSignal",
};

const CONDITION_TYPES = [
    { value: "IsGrounded", label: "State: Grounded" },
    { value: "IsAlive", label: "State: Alive" },
    { value: "VarEquals", label: "==" },
    { value: "VarNotEquals", label: "!=" },
    { value: "VarGreaterThan", label: ">" },
    { value: "VarGreaterOrEqual", label: ">=" },
    { value: "VarLessThan", label: "<" },
    { value: "VarLessOrEqual", label: "<=" },
    { value: "InputKey", label: "Input" },
];

const INPUT_KEY_OPTIONS = [
    { value: "ArrowLeft", label: "ArrowLeft" },
    { value: "ArrowRight", label: "ArrowRight" },
    { value: "ArrowUp", label: "ArrowUp" },
    { value: "ArrowDown", label: "ArrowDown" },
    { value: "Space", label: "Space" },
    { value: "Enter", label: "Enter" },
    { value: "Tab", label: "Tab" },
    { value: "Escape", label: "Escape" },
    { value: "Backspace", label: "Backspace" },
    { value: "Delete", label: "Delete" },
    { value: "Insert", label: "Insert" },
    { value: "Home", label: "Home" },
    { value: "End", label: "End" },
    { value: "PageUp", label: "PageUp" },
    { value: "PageDown", label: "PageDown" },
    { value: "ShiftLeft", label: "ShiftLeft" },
    { value: "ShiftRight", label: "ShiftRight" },
    { value: "ControlLeft", label: "ControlLeft" },
    { value: "ControlRight", label: "ControlRight" },
    { value: "AltLeft", label: "AltLeft" },
    { value: "AltRight", label: "AltRight" },
    { value: "MetaLeft", label: "MetaLeft" },
    { value: "MetaRight", label: "MetaRight" },
    { value: "CapsLock", label: "CapsLock" },
    { value: "NumLock", label: "NumLock" },
    { value: "ScrollLock", label: "ScrollLock" },
    { value: "Pause", label: "Pause" },
    { value: "PrintScreen", label: "PrintScreen" },
    { value: "Backquote", label: "`" },
    { value: "Minus", label: "-" },
    { value: "Equal", label: "=" },
    { value: "BracketLeft", label: "[" },
    { value: "BracketRight", label: "]" },
    { value: "Backslash", label: "\\" },
    { value: "Semicolon", label: ";" },
    { value: "Quote", label: "'" },
    { value: "Comma", label: "," },
    { value: "Period", label: "." },
    { value: "Slash", label: "/" },
    { value: "Digit0", label: "0" },
    { value: "Digit1", label: "1" },
    { value: "Digit2", label: "2" },
    { value: "Digit3", label: "3" },
    { value: "Digit4", label: "4" },
    { value: "Digit5", label: "5" },
    { value: "Digit6", label: "6" },
    { value: "Digit7", label: "7" },
    { value: "Digit8", label: "8" },
    { value: "Digit9", label: "9" },
    { value: "KeyA", label: "A" },
    { value: "KeyB", label: "B" },
    { value: "KeyC", label: "C" },
    { value: "KeyD", label: "D" },
    { value: "KeyE", label: "E" },
    { value: "KeyF", label: "F" },
    { value: "KeyG", label: "G" },
    { value: "KeyH", label: "H" },
    { value: "KeyI", label: "I" },
    { value: "KeyJ", label: "J" },
    { value: "KeyK", label: "K" },
    { value: "KeyL", label: "L" },
    { value: "KeyM", label: "M" },
    { value: "KeyN", label: "N" },
    { value: "KeyO", label: "O" },
    { value: "KeyP", label: "P" },
    { value: "KeyQ", label: "Q" },
    { value: "KeyR", label: "R" },
    { value: "KeyS", label: "S" },
    { value: "KeyT", label: "T" },
    { value: "KeyU", label: "U" },
    { value: "KeyV", label: "V" },
    { value: "KeyW", label: "W" },
    { value: "KeyX", label: "X" },
    { value: "KeyY", label: "Y" },
    { value: "KeyZ", label: "Z" },
    { value: "Numpad0", label: "Numpad0" },
    { value: "Numpad1", label: "Numpad1" },
    { value: "Numpad2", label: "Numpad2" },
    { value: "Numpad3", label: "Numpad3" },
    { value: "Numpad4", label: "Numpad4" },
    { value: "Numpad5", label: "Numpad5" },
    { value: "Numpad6", label: "Numpad6" },
    { value: "Numpad7", label: "Numpad7" },
    { value: "Numpad8", label: "Numpad8" },
    { value: "Numpad9", label: "Numpad9" },
    { value: "NumpadAdd", label: "Numpad+" },
    { value: "NumpadSubtract", label: "Numpad-" },
    { value: "NumpadMultiply", label: "Numpad*" },
    { value: "NumpadDivide", label: "Numpad/" },
    { value: "NumpadDecimal", label: "Numpad." },
    { value: "F1", label: "F1" },
    { value: "F2", label: "F2" },
    { value: "F3", label: "F3" },
    { value: "F4", label: "F4" },
    { value: "F5", label: "F5" },
    { value: "F6", label: "F6" },
    { value: "F7", label: "F7" },
    { value: "F8", label: "F8" },
    { value: "F9", label: "F9" },
    { value: "F10", label: "F10" },
    { value: "F11", label: "F11" },
    { value: "F12", label: "F12" },
];

function coerceValue(value: string, variable?: EditorVariable) {
    if (!variable) return value;
    if (variable.type === "int" || variable.type === "float") {
        const num = Number(value);
        return Number.isNaN(num) ? 0 : num;
    }
    if (variable.type === "bool") {
        return value === "true";
    }
    return value;
}

function normalizeEvent(event: string): string {
    switch (event) {
        case "TICK":
            return "OnUpdate";
        case "KEY_DOWN":
        case "KEY_UP":
            return "OnSignalReceive";
        case "COLLISION_ENTER":
        case "COLLISION_STAY":
        case "COLLISION_EXIT":
            return "OnCollision";
        case "ENTITY_DIED":
            return "OnDestroy";
        default:
            return event;
    }
}

export const ComponentSection = memo(function ComponentSection({ entity, onUpdateEntity }: Props) {
    const { entities: allEntities } = useEditorCoreSnapshot();
    const allComponents = splitLogicItems(entity.logic);
    const logicComponents = allComponents.filter((comp) => comp.type === "Logic") as LogicComponent[];
    const otherComponents = allComponents.filter((comp) => comp.type !== "Logic");
    const variables = entity.variables ?? [];

    const commitLogic = (nextLogicComponents: LogicComponent[]) => {
        const nextComponents = [...otherComponents, ...nextLogicComponents];
        const nextLogic = buildLogicItems({ components: nextComponents });
        onUpdateEntity({ ...entity, logic: nextLogic });
    };

    useEffect(() => {
        const normalized = logicComponents.map((rule) => {
            const nextEvent = normalizeEvent(rule.event);
            if (nextEvent === rule.event) return rule;
            return { ...rule, event: nextEvent };
        });
        const changed = normalized.some((rule, idx) => rule.event !== logicComponents[idx]?.event);
        if (changed) {
            commitLogic(normalized);
        }
    }, [entity, onUpdateEntity, logicComponents]);

    const otherEntities = Array.from(allEntities.values())
        .filter((e) => e.id !== entity.id)
        .map((e) => ({ id: e.id, name: e.name }));

    const handleAddComponent = () => {
        const newComponent: LogicComponent = {
            id: crypto.randomUUID(),
            type: "Logic",
            event: "OnUpdate",
            eventParams: {},
            conditions: [],
            conditionLogic: "AND",
            actions: [],
        };
        commitLogic([...logicComponents, newComponent]);
    };

    const handleUpdateRule = (index: number, rule: LogicComponent) => {
        const nextRules = [...logicComponents];
        nextRules[index] = rule;
        commitLogic(nextRules);
    };

    const handleRemoveRule = (index: number) => {
        const nextRules = logicComponents.filter((_, i) => i != index);
        commitLogic(nextRules);
    };

    return (
        <div style={styles.sectionContainer}>
            <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>Components ({logicComponents.length})</div>
                <div style={styles.headerButtons}>
                    <button onClick={handleAddComponent} style={styles.addButton}>
                        + Add Component
                    </button>
                </div>
            </div>

            <div style={styles.ruleList}>
                {logicComponents.map((rule, index) => (
                    <RuleItem
                        key={index}
                        rule={rule}
                        index={index}
                        variables={variables}
                        entities={otherEntities}
                        onUpdate={(r) => handleUpdateRule(index, r)}
                        onRemove={() => handleRemoveRule(index)}
                    />
                ))}
                {logicComponents.length === 0 && (
                    <div style={styles.emptyState}>
                        No components yet. Add one to define logic.
                    </div>
                )}
            </div>
        </div>
    );
});

const RuleItem = memo(function RuleItem({
    rule,
    index,
    variables,
    entities,
    onUpdate,
    onRemove,
}: {
    rule: LogicComponent;
    index: number;
    variables: EditorVariable[];
    entities: { id: string; name: string }[];
    onUpdate: (rule: LogicComponent) => void;
    onRemove: () => void;
}) {
    const [expanded, setExpanded] = useState(true);

    const handleEventChange = (event: string) => {
        onUpdate({ ...rule, event, eventParams: {} });
    };

    const handleAddCondition = () => {
        const defaultVar = variables[0]?.name ?? "";
        onUpdate({
            ...rule,
            conditions: [...(rule.conditions || []), { type: "VarEquals", name: defaultVar, value: 0 }],
        });
    };

    const handleAddAction = () => {
        const availableActions = ActionRegistry.getAvailableActions();
        const actionType = availableActions[0] || "Move";
        onUpdate({
            ...rule,
            actions: [...rule.actions, { type: actionType }],
        });
    };

    return (
        <div style={styles.ruleItemContainer}>
            <div style={styles.ruleItemHeader} onClick={() => setExpanded(!expanded)}>
                <span style={styles.ruleItemTitle}>
                    {expanded ? "▼" : "▶"} Component #{index + 1}: {rule.event}
                </span>
                <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={styles.removeButton}>
                    Remove
                </button>
            </div>

            {expanded && (
                <div style={styles.ruleItemBody}>
                    <div>
                        <label style={styles.label}>Event</label>
                        <select value={rule.event} onChange={(e) => handleEventChange(e.target.value)} style={styles.selectField}>
                            {EVENT_TYPES.map((et) => (
                                <option key={et.value} value={et.value}>
                                    {et.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div style={styles.sectionHeader}>
                            <label style={styles.label}>Conditions ({rule.conditions?.length || 0})</label>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <select
                                    value={rule.conditionLogic ?? "AND"}
                                    onChange={(e) => onUpdate({ ...rule, conditionLogic: e.target.value as "AND" | "OR" })}
                                    style={styles.smallSelect}
                                >
                                    <option value="AND">AND</option>
                                    <option value="OR">OR</option>
                                </select>
                                <button onClick={handleAddCondition} style={styles.smallAddButton}>+ Add</button>
                            </div>
                        </div>

                        {rule.conditions?.map((cond, i) => (
                            <ConditionEditor
                                key={i}
                                condition={cond}
                                variables={variables}
                                onUpdate={(c) => {
                                    const newConds = [...(rule.conditions || [])];
                                    newConds[i] = c;
                                    onUpdate({ ...rule, conditions: newConds });
                                }}
                                onRemove={() => {
                                    onUpdate({ ...rule, conditions: rule.conditions?.filter((_, j) => j !== i) });
                                }}
                            />
                        ))}
                    </div>

                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label style={{ fontSize: "10px", color: colors.textSecondary }}>
                                Actions ({rule.actions.length})
                            </label>
                            <button
                                onClick={handleAddAction}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: colors.accentLight,
                                    cursor: "pointer",
                                    fontSize: "10px",
                                }}
                            >
                                + Add
                            </button>
                        </div>
                        {rule.actions.map((action, i) => (
                            <ActionEditor
                                key={i}
                                action={action}
                                variables={variables}
                                entities={entities}
                                onUpdate={(a) => {
                                    const newActions = [...rule.actions];
                                    newActions[i] = a;
                                    onUpdate({ ...rule, actions: newActions });
                                }}
                                onRemove={() => {
                                    onUpdate({ ...rule, actions: rule.actions.filter((_, j) => j !== i) });
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

function ConditionEditor({
    condition,
    variables,
    onUpdate,
    onRemove,
}: {
    condition: { type: string; [key: string]: unknown };
    variables: EditorVariable[];
    onUpdate: (c: { type: string; [key: string]: unknown }) => void;
    onRemove: () => void;
}) {
    const selectedVar = variables.find((v) => v.name === (condition.name as string));
    const isInputCondition = condition.type === "InputKey";
    const isValueFreeCondition = isInputCondition || condition.type === "IsGrounded" || condition.type === "IsAlive";

    return (
        <div style={styles.conditionRow}>
            {!isValueFreeCondition && (
                <select
                    value={(condition.name as string) || ""}
                    onChange={(e) => onUpdate({ ...condition, name: e.target.value })}
                    style={styles.smallSelect}
                >
                    <option value="">(variable)</option>
                    {variables.map((v) => (
                        <option key={v.id} value={v.name}>
                            {v.name}
                        </option>
                    ))}
                </select>
            )}

            <select
                value={condition.type}
                onChange={(e) => {
                    const nextType = e.target.value;
                    if (nextType === "InputKey") {
                        onUpdate({ ...condition, type: nextType, key: (condition.key as string) ?? "KeyA" });
                        return;
                    }
                    onUpdate({ ...condition, type: nextType });
                }}
                style={styles.smallSelect}
            >
                {!CONDITION_TYPES.some((op) => op.value === condition.type) && (
                    <option value={condition.type}>{condition.type}</option>
                )}
                {CONDITION_TYPES.map((op) => (
                    <option key={op.value} value={op.value}>
                        {op.label}
                    </option>
                ))}
            </select>

            {isInputCondition && (
                <select
                    value={(condition.key as string) || "KeyA"}
                    onChange={(e) => onUpdate({ ...condition, key: e.target.value })}
                    style={styles.smallSelect}
                >
                    {INPUT_KEY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            )}

            {!isValueFreeCondition && (
                selectedVar?.type === "bool" ? (
                    <select
                        value={condition.value === true ? "true" : "false"}
                        onChange={(e) => onUpdate({ ...condition, value: e.target.value === "true" })}
                        style={styles.smallSelect}
                    >
                        <option value="true">true</option>
                        <option value="false">false</option>
                    </select>
                ) : (
                    <input
                        type="text"
                        placeholder="value"
                        value={condition.value !== undefined ? String(condition.value) : ""}
                        onChange={(e) => onUpdate({ ...condition, value: coerceValue(e.target.value, selectedVar) })}
                        style={styles.textInput}
                    />
                )
            )}

            <button onClick={onRemove} style={styles.removeButton}>×</button>
        </div>
    );
}

function ActionEditor({
    action,
    variables,
    entities,
    onUpdate,
    onRemove,
}: {
    action: { type: string; [key: string]: unknown };
    variables: EditorVariable[];
    entities: { id: string; name: string }[];
    onUpdate: (a: { type: string; [key: string]: unknown }) => void;
    onRemove: () => void;
}) {
    const availableActions = ActionRegistry.getAvailableActions();
    const selectedVar = variables.find((v) => v.name === (action.name as string));

    return (
        <div style={styles.actionRow}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <select
                    value={action.type}
                    onChange={(e) => onUpdate({ type: e.target.value })}
                    style={styles.selectField}
                >
                    {availableActions.map((a) => (
                        <option key={a} value={a}>
                            {ACTION_LABELS[a] || a} ({a})
                        </option>
                    ))}
                </select>
            </div>

            {action.type === "Move" && (
                <>
                    <ParamInput label="x" value={action.x as number} onChange={(v) => onUpdate({ ...action, x: v })} />
                    <ParamInput label="y" value={action.y as number} onChange={(v) => onUpdate({ ...action, y: v })} />
                    <ParamInput label="speed" value={action.speed as number} defaultValue={200} onChange={(v) => onUpdate({ ...action, speed: v })} />
                </>
            )}

            {action.type === "ChaseTarget" && (
                <>
                    <select
                        value={(action.targetId as string) || ""}
                        onChange={(e) => onUpdate({ ...action, targetId: e.target.value })}
                        style={styles.smallSelect}
                    >
                        <option value="">(target)</option>
                        {entities.map((ent) => (
                            <option key={ent.id} value={ent.id}>
                                {ent.name || ent.id}
                            </option>
                        ))}
                    </select>
                    <ParamInput label="speed" value={action.speed as number} defaultValue={80} onChange={(v) => onUpdate({ ...action, speed: v })} />
                </>
            )}

            {(action.type === "TakeDamage" || action.type === "Heal") && (
                <ParamInput label="amount" value={action.amount as number} defaultValue={10} onChange={(v) => onUpdate({ ...action, amount: v })} />
            )}

            {action.type === "Attack" && (
                <>
                    <ParamInput label="range" value={action.range as number} defaultValue={100} onChange={(v) => onUpdate({ ...action, range: v })} />
                    <ParamInput label="damage" value={action.damage as number} defaultValue={10} onChange={(v) => onUpdate({ ...action, damage: v })} />
                </>
            )}

            {action.type === "SetVar" && (
                <>
                    <input
                        type="text"
                        placeholder="name"
                        value={(action.name as string) || ""}
                        onChange={(e) => onUpdate({ ...action, name: e.target.value })}
                        style={styles.textInput}
                    />
                    {selectedVar?.type === "bool" ? (
                        <select
                            value={action.value === true ? "true" : "false"}
                            onChange={(e) => onUpdate({ ...action, value: e.target.value === "true" })}
                            style={styles.smallSelect}
                        >
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </select>
                    ) : selectedVar?.type === "int" || selectedVar?.type === "float" ? (
                        <input
                            type="number"
                            placeholder="value"
                            value={action.value !== undefined ? Number(action.value) : 0}
                            onChange={(e) => onUpdate({ ...action, value: parseFloat(e.target.value) || 0 })}
                            style={styles.textInput}
                        />
                    ) : (
                        <input
                            type="text"
                            placeholder="value"
                            value={action.value !== undefined ? String(action.value) : ""}
                            onChange={(e) => onUpdate({ ...action, value: e.target.value })}
                            style={styles.textInput}
                        />
                    )}
                </>
            )}

            {action.type === "ClearSignal" && (
                <input
                    type="text"
                    placeholder="signalKey"
                    value={(action.key as string) || ""}
                    onChange={(e) => onUpdate({ ...action, key: e.target.value })}
                    style={styles.textInput}
                />
            )}

            {action.type === "ShowDialogue" && (
                <input
                    type="text"
                    placeholder="dialogue"
                    value={(action.text as string) || ""}
                    onChange={(e) => onUpdate({ ...action, text: e.target.value })}
                    style={styles.textInput}
                />
            )}

            {action.type === "PlaySound" && (
                <input
                    type="text"
                    placeholder="soundId"
                    value={(action.soundId as string) || ""}
                    onChange={(e) => onUpdate({ ...action, soundId: e.target.value })}
                    style={styles.textInput}
                />
            )}

            {action.type === "EmitEventSignal" && (
                <input
                    type="text"
                    placeholder="signalKey"
                    value={(action.signalKey as string) || ""}
                    onChange={(e) => onUpdate({ ...action, signalKey: e.target.value })}
                    style={styles.textInput}
                />
            )}

            {action.type === "Rotate" && (
                <ParamInput label="speed" value={action.speed as number} defaultValue={90} onChange={(v) => onUpdate({ ...action, speed: v })} />
            )}

            {action.type === "Pulse" && (
                <>
                    <ParamInput label="speed" value={action.speed as number} defaultValue={2} onChange={(v) => onUpdate({ ...action, speed: v })} />
                    <ParamInput label="min" value={action.minScale as number} defaultValue={0.9} onChange={(v) => onUpdate({ ...action, minScale: v })} />
                    <ParamInput label="max" value={action.maxScale as number} defaultValue={1.1} onChange={(v) => onUpdate({ ...action, maxScale: v })} />
                </>
            )}

            {action.type === "Enable" && (
                <select
                    value={action.enabled === false ? "false" : "true"}
                    onChange={(e) => onUpdate({ ...action, enabled: e.target.value === "true" })}
                    style={styles.smallSelect}
                >
                    <option value="true">enable</option>
                    <option value="false">disable</option>
                </select>
            )}

            <button onClick={onRemove} style={styles.removeButton}>×</button>
        </div>
    );
}

function ParamInput({
    label,
    value,
    defaultValue = 0,
    onChange,
}: {
    label: string;
    value: number | undefined;
    defaultValue?: number;
    onChange: (v: number) => void;
}) {
    return (
        <div style={styles.paramInputContainer}>
            <span style={styles.paramLabel}>{label}:</span>
            <input
                type="number"
                value={value ?? defaultValue}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                style={styles.smallNumberInput}
            />
        </div>
    );
}
