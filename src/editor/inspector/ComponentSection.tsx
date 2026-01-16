import { memo, useEffect, useState } from "react";
import type { EditorEntity } from "../types/Entity";
import type { LogicComponent } from "../types/Component";


import { ActionRegistry } from "../core/events/ActionRegistry";
import { colors } from "../constants/colors";

import { useEditorCoreSnapshot } from "../../contexts/EditorCoreContext";
import * as styles from "./ComponentSection.styles";
import { buildLogicItems, splitLogicItems } from "../types/Logic";
import type { EditorVariable } from "../types/Variable";
import { ActionEditor } from "./ActionEditor";
import type { ModuleGraph } from "../types/Module";
import type { Asset } from "../types/Asset";

type Props = {
    entity: EditorEntity;
    onUpdateEntity: (entity: EditorEntity) => void;
};

export const EVENT_TYPES = [
    { value: "OnStart", label: "시작 시 (OnStart)" },
    { value: "OnUpdate", label: "매 프레임 (OnUpdate)" },
    { value: "OnDestroy", label: "파괴될 때 (OnDestroy)" },
    { value: "OnSignalReceive", label: "신호 수신 시 (OnSignalReceive)" },
    { value: "OnCollision", label: "충돌 시 (OnCollision)" },
    { value: "OnClick", label: "클릭 시 (OnClick)" },
];

export const ACTION_LABELS: Record<string, string> = {
    Move: "이동",
    Jump: "점프",
    Wait: "대기",
    MoveToward: "목표이동",
    ChaseTarget: "추적24시",
    Attack: "공격",
    FireProjectile: "발사체 발사",
    TakeDamage: "피해 입기",
    Heal: "회복",
    SetVar: "변수 설정",
    Enable: "활성",
    ChangeScene: "씬 전환",
    Log: "로그",
    Rotate: "회전",
    Pulse: "펄스",
    ShowDialogue: "대화 표시",
    PlaySound: "사운드 재생",
    EmitEventSignal: "이벤트 신호 보내기",
    ClearSignal: "신호 해제",
    IncrementVar: "변수 증가",
    Disable: "비활성",
    PlayParticle: "파티클 생성",
    StartParticleEmitter: "파티클 이미터 시작",
    StopParticleEmitter: "파티클 이미터 종료",
    If: "조건문",
    RunModule: "모듈 실행",
    OpenUrl: "url 열기",
    SpawnEntity: "엔티티 생성",
    PlayAnimation: "애니메이션 동작",
};

export const CONDITION_TYPES = [
    { value: "IsGrounded", label: "상태: 땅에 닿음 (Grounded)" },
    { value: "IsAlive", label: "상태: 생존 (Alive)" },
    { value: "VarEquals", label: "같음 (==)" },
    { value: "VarNotEquals", label: "다름 (!=)" },
    { value: "VarGreaterThan", label: "큼 (>)" },
    { value: "VarGreaterOrEqual", label: "크거나 같음 (>=)" },
    { value: "VarLessThan", label: "작음 (<)" },
    { value: "VarLessOrEqual", label: "작거나 같음 (<=)" },
    { value: "InputKey", label: "키 입력 중 (Hold)" },
    { value: "InputDown", label: "키 누름 (Down)" },
];

export const INPUT_KEY_OPTIONS = [
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
    const { core, entities: allEntities, modules: libraryModules, assets, scenes: sceneMap } = useEditorCoreSnapshot();
    const allComponents = splitLogicItems(entity.logic);
    const logicComponents = allComponents.filter((comp) => comp.type === "Logic") as LogicComponent[];
    const otherComponents = allComponents.filter((comp) => comp.type !== "Logic");
    const variables = entity.variables ?? [];
    const sceneOptions = Array.from(sceneMap.values()).map((scene) => ({ id: scene.id, name: scene.name }));
    const mergeModule = (base: ModuleGraph, override?: ModuleGraph): ModuleGraph => {
        if (!override) return base;
        const baseVars = base.variables ?? [];
        const overrideVars = override.variables ?? [];
        const overrideByName = new Map(overrideVars.map((v) => [v.name, v]));
        const mergedVars = [
            ...baseVars.map((v) => overrideByName.get(v.name) ?? v),
            ...overrideVars.filter((v) => !baseVars.some((b) => b.name === v.name)),
        ];
        return { ...override, variables: mergedVars };
    };
    const modules = [
        ...libraryModules.map((module) => {
            const override = entity.modules?.find((m) => m.id === module.id);
            return mergeModule(module, override);
        }),
        ...(entity.modules ?? []).filter((module) => !libraryModules.some((m) => m.id === module.id)),
    ];

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

    const handleUpdateRule = (index: number, rule: LogicComponent, ensureModuleId?: string) => {
        const nextRules = [...logicComponents];
        nextRules[index] = rule;
        let nextModules = entity.modules ?? [];
        if (ensureModuleId && !nextModules.some((m) => m.id === ensureModuleId)) {
            const source = libraryModules.find((m) => m.id === ensureModuleId);
            if (source) {
                const cloned = JSON.parse(JSON.stringify(source)) as ModuleGraph;
                nextModules = [...nextModules, cloned];
            }
        }
        const nextComponents = [...otherComponents, ...nextRules];
        const nextLogic = buildLogicItems({ components: nextComponents });
        onUpdateEntity({ ...entity, logic: nextLogic, modules: nextModules });
    };

    const handleRemoveRule = (index: number) => {
        const nextRules = logicComponents.filter((_, i) => i != index);
        commitLogic(nextRules);
    };

    const availableActions = ActionRegistry.getAvailableActions();
    const actionLabels = { ...ACTION_LABELS };

    const ensureVariable = (name: string, value: unknown, explicitType?: EditorVariable["type"]) => {
        if (!name) return;
        if (variables.some((v) => v.name === name)) return;
        let type: EditorVariable["type"] = "string";
        let nextValue: EditorVariable["value"] = "";
        if (explicitType) {
            type = explicitType;
        }
        if (typeof value === "boolean") {
            type = "bool";
            nextValue = value;
        } else if (typeof value === "number" && !Number.isNaN(value)) {
            type = Number.isInteger(value) ? "int" : "float";
            nextValue = value;
        } else if (value === undefined || value === null) {
            type = "int";
            nextValue = 0;
        } else {
            nextValue = String(value);
        }
        const nextVar: EditorVariable = {
            id: crypto.randomUUID(),
            name,
            type,
            value: nextValue,
        };
        onUpdateEntity({ ...entity, variables: [...variables, nextVar] });
    };

    const handleUpdateModuleVariable = (
        moduleId: string,
        name: string,
        value: unknown,
        explicitType?: EditorVariable["type"]
    ) => {
        const entityModules = entity.modules ?? [];
        let nextModules = [...entityModules];
        let target = entityModules.find((m) => m.id === moduleId);

        if (!target) {
            const source = libraryModules.find((m) => m.id === moduleId);
            if (!source) return;
            target = JSON.parse(JSON.stringify(source)) as ModuleGraph;
            nextModules = [...nextModules, target];
        }

        const nextVars = (target.variables ?? []).map((v) => {
            if (v.name !== name) return v;
            return {
                ...v,
                type: explicitType ?? v.type,
                value: value as typeof v.value,
            };
        });
        const updated = { ...target, variables: nextVars };
        nextModules = nextModules.map((m) => (m.id === updated.id ? updated : m));
        onUpdateEntity({ ...entity, modules: nextModules });
    };

    return (
        <div style={styles.sectionContainer}>
            <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>구성 요소 (Components) ({logicComponents.length})</div>
                <div style={styles.headerButtons}>
                    <button onClick={handleAddComponent} style={styles.addButton}>
                        + 요소 추가
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
                        modules={modules}
                        assets={assets}
                        scenes={sceneOptions}
                        currentEntity={entity}
                        availableActions={availableActions}
                        actionLabels={actionLabels}
                        onCreateVariable={ensureVariable}
                        onUpdateModuleVariable={handleUpdateModuleVariable}
                        onUpdate={(r, ensureModuleId) => handleUpdateRule(index, r, ensureModuleId)}
                        onRemove={() => handleRemoveRule(index)}
                    />
                ))}
                {logicComponents.length === 0 && (
                    <div style={styles.emptyState}>
                        등록된 구성 요소가 없습니다. 로직을 정의하려면 추가하세요.
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
    modules,
    assets,
    scenes,
    currentEntity,
    availableActions,
    actionLabels,
    onCreateVariable,
    onUpdateModuleVariable,
    onUpdate,
    onRemove,
}: {
    rule: LogicComponent;
    index: number;
    variables: EditorVariable[];
    entities: { id: string; name: string }[];
    modules: ModuleGraph[];
    assets: Asset[];
    scenes: { id: string; name: string }[];
    currentEntity: EditorEntity;
    availableActions: string[];
    actionLabels: Record<string, string>;
    onCreateVariable: (name: string, value: unknown, explicitType?: EditorVariable["type"]) => void;
    onUpdateModuleVariable: (
        moduleId: string,
        name: string,
        value: unknown,
        explicitType?: EditorVariable["type"]
    ) => void;
    onUpdate: (rule: LogicComponent, ensureModuleId?: string) => void;
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
                    {expanded ? "▼" : "▶"} 구성 요소 #{index + 1}: {rule.event}
                </span>
                <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={styles.removeButton}>
                    삭제
                </button>
            </div>

            {expanded && (
                <div style={styles.ruleItemBody}>
                    <div>
                        <label style={styles.label}>이벤트 (Event)</label>
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
                            <label style={styles.label}>조건 목록 ({rule.conditions?.length || 0})</label>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <select
                                    value={rule.conditionLogic ?? "AND"}
                                    onChange={(e) => onUpdate({ ...rule, conditionLogic: e.target.value as "AND" | "OR" | "BRANCH" })}
                                    style={styles.smallSelect}
                                >
                                    <option value="AND">AND</option>
                                    <option value="OR">OR</option>
                                    <option value="BRANCH">BRANCH</option>
                                </select>
                                <button onClick={handleAddCondition} style={styles.smallAddButton}>+ 추가</button>
                            </div>
                        </div>

                        {rule.conditions?.map((cond, i) => (
                            <ConditionEditor
                                key={i}
                                condition={cond}
                                variables={variables}
                                showActions={rule.conditionLogic === "BRANCH"}
                                availableActions={availableActions}
                                actionLabels={actionLabels}
                                entities={entities}
                                modules={modules}
                                assets={assets}
                                scenes={scenes}
                                currentEntity={currentEntity}
                                onCreateVariable={onCreateVariable}
                                onUpdateModuleVariable={onUpdateModuleVariable}
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

                    {/* Then Actions (조건 참) */}
                    {rule.conditionLogic !== "BRANCH" && (
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <label style={{ fontSize: "10px", color: colors.textSecondary }}>
                                    실행 동작 ({rule.actions.length})
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
                                    + 추가
                                </button>
                            </div>
                            {rule.actions.map((action, i) => (
                                <ActionEditor
                                    key={i}
                                    action={action}
                                    availableActions={availableActions}
                                    actionLabels={actionLabels}
                                    variables={variables}
                                    entities={entities}
                                    modules={modules}
                                    assets={assets}
                                    scenes={scenes}
                                    currentEntity={currentEntity}
                                    onCreateVariable={onCreateVariable}
                                    onUpdateModuleVariable={onUpdateModuleVariable}
                                    onUpdate={(a) => {
                                        const newActions = [...rule.actions];
                                        newActions[i] = a;
                                        const moduleId =
                                            a.type === "RunModule"
                                                ? ((a.moduleId as string) ??
                                                    (a.moduleName as string) ??
                                                    (a.name as string) ??
                                                    "")
                                                : "";
                                        onUpdate({ ...rule, actions: newActions }, moduleId || undefined);
                                    }}
                                    onRemove={() => {
                                        onUpdate({ ...rule, actions: rule.actions.filter((_, j) => j !== i) });
                                    }}
                                />
                            ))}
                            {rule.actions.length === 0 && (
                                <div style={{ fontSize: 9, color: "#6b8066", fontStyle: "italic" }}>없음</div>
                            )}
                        </div>
                    )}

                    {/* Else Actions (조건 거짓) */}
                    {/* Else Actions (조건 거짓) */}
                    {rule.conditionLogic === "BRANCH" && (
                        <div style={{ background: "rgba(200,100,100,0.05)", borderRadius: 4, padding: 4, border: "1px solid rgba(200,100,100,0.2)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <label style={{ fontSize: "10px", color: "#f44336" }}>
                                    ❌ 그 외 동작 (Else) ({rule.elseActions?.length || 0})
                                </label>
                                <button
                                    onClick={() => {
                                        const actionType = availableActions[0] || "Move";
                                        onUpdate({
                                            ...rule,
                                            elseActions: [...(rule.elseActions || []), { type: actionType }],
                                        });
                                    }}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "#f44336",
                                        cursor: "pointer",
                                        fontSize: "10px",
                                    }}
                                >
                                    + 추가
                                </button>
                            </div>
                            {(rule.elseActions || []).map((action, i) => (
                                <ActionEditor
                                    key={i}
                                    action={action}
                                    availableActions={availableActions}
                                    actionLabels={actionLabels}
                                    variables={variables}
                                    entities={entities}
                                    modules={modules}
                                    assets={assets}
                                    scenes={scenes}
                                    currentEntity={currentEntity}
                                    onCreateVariable={onCreateVariable}
                                    onUpdateModuleVariable={onUpdateModuleVariable}
                                    onUpdate={(a) => {
                                        const newElseActions = [...(rule.elseActions || [])];
                                        newElseActions[i] = a;
                                        onUpdate({ ...rule, elseActions: newElseActions });
                                    }}
                                    onRemove={() => {
                                        onUpdate({ ...rule, elseActions: (rule.elseActions || []).filter((_, j) => j !== i) });
                                    }}
                                />
                            ))}
                            {(rule.elseActions?.length || 0) === 0 && (
                                <div style={{ fontSize: 9, color: "#806666", fontStyle: "italic" }}>없음 (선택)</div>
                            )}
                        </div>
                    )}
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
    showActions,
    availableActions,
    actionLabels,
    entities,
    modules,
    assets,
    scenes,
    currentEntity,
    onCreateVariable,
    onUpdateModuleVariable,
}: {
    condition: { type: string; then?: Array<{ type: string;[key: string]: unknown }>;[key: string]: unknown };
    variables: EditorVariable[];
    onUpdate: (c: { type: string;[key: string]: unknown }) => void;
    onRemove: () => void;
    showActions?: boolean;
    availableActions: string[];
    actionLabels?: Record<string, string>;
    entities?: { id: string; name: string }[];
    modules?: ModuleGraph[];
    assets?: Asset[];
    scenes?: { id: string; name: string }[];
    currentEntity?: EditorEntity;
    onCreateVariable?: (name: string, value: unknown, explicitType?: EditorVariable["type"]) => void;
    onUpdateModuleVariable?: (moduleId: string, name: string, value: unknown, explicitType?: EditorVariable["type"]) => void;
}) {
    const selectedVar = variables.find((v) => v.name === (condition.name as string));
    const isInputCondition = condition.type === "InputKey" || condition.type === "InputDown";
    const isValueFreeCondition = isInputCondition || condition.type === "IsGrounded" || condition.type === "IsAlive";
    const thenActions = condition.then || [];

    const updateThenActions = (newActions: any[]) => {
        onUpdate({ ...condition, then: newActions });
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                        if (nextType === "InputKey" || nextType === "InputDown") {
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

            {showActions && (
                <div style={{ marginLeft: 16, borderLeft: "2px solid #666", paddingLeft: 8, paddingBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: colors.textSecondary }}>추가 동작 ({thenActions.length})</span>
                        <button
                            onClick={() => updateThenActions([...thenActions, { type: availableActions[0] || "Log" }])}
                            style={{ ...styles.addButton, padding: "1px 4px", fontSize: 9 }}
                        >
                            + 동작 추가
                        </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {thenActions.map((act, idx) => (
                            <ActionEditor
                                key={idx}
                                action={act}
                                availableActions={availableActions}
                                actionLabels={actionLabels}
                                variables={variables}
                                entities={entities || []}
                                modules={modules || []}
                                scenes={scenes}
                                assets={assets}
                                currentEntity={currentEntity}
                                onCreateVariable={onCreateVariable}
                                onUpdateModuleVariable={onUpdateModuleVariable}
                                onUpdate={(updated) => {
                                    const newActions = [...thenActions];
                                    newActions[idx] = updated;
                                    updateThenActions(newActions);
                                }}
                                onRemove={() => updateThenActions(thenActions.filter((_, i) => i !== idx))}
                                showRemove={true}
                            />
                        ))}
                        {thenActions.length === 0 && <div style={{ fontSize: 9, color: "#666" }}>동작 없음</div>}
                    </div>
                </div>
            )}
        </div>
    );
}
