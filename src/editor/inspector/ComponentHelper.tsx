import { useEffect, useMemo, useState } from "react";
import { useEditorCoreSnapshot } from "../../contexts/EditorCoreContext";
import { ActionRegistry } from "../core/events/ActionRegistry";
import { colors } from "../constants/colors";
import type { EditorEntity } from "../types/Entity";
import type { EditorVariable } from "../types/Variable";
import type { LogicComponent } from "../types/Component";
import { buildLogicItems, splitLogicItems } from "../types/Logic";
import type { ModuleGraph } from "../types/Module";
import {
    ACTION_LABELS,
    CONDITION_TYPES,
    EVENT_TYPES,
    INPUT_KEY_OPTIONS,
} from "./ComponentSection";
import { ActionEditor } from "./ActionEditor";

type ComponentHelperProps = {
    isOpen: boolean;
    onClose: () => void;
    entity: EditorEntity | null;
    onUpdateEntity: (entity: EditorEntity) => void;
};

type Step = 0 | 1 | 2;

const VALUE_FREE_CONDITIONS = new Set(["IsGrounded", "IsAlive", "InputKey", "InputDown"]);

const CONDITION_DESCRIPTIONS: Record<string, string> = {
    IsGrounded: "조건 : 땅에 닿아 있을 때만 실행",
    IsAlive: "조건 : 생존 상태일 때만 실행",
    VarEquals: "조건 : 변수가 특정 값과 같을 때",
    VarNotEquals: "조건 : 변수가 특정 값과 다를 때",
    VarGreaterThan: "조건 : 변수가 특정 값보다 클 때",
    VarGreaterOrEqual: "조건 : 변수가 특정 값보다 크거나 같을 때",
    VarLessThan: "조건 : 변수가 특정 값보다 작을 때",
    VarLessOrEqual: "조건 : 변수가 특정 값보다 작거나 같을 때",
    InputKey: "조건 : 특정 키를 누르고 있는 동안 실행",
    InputDown: "조건 : 특정 키를 누른 순간에만 실행",
};

const ACTION_DESCRIPTIONS: Record<string, string> = {
    Move: "지정 방향으로 이동합니다! x값과 y값의 설정이 중요합니다.",
    Jump: "점프 동작 수행. 플랫포머 게임을 개발할때 유용합니다.",
    Wait: "일정 시간동안 기다립니다.",
    MoveToward: "목표 지점으로 이동합니다. 목표는 다양하게 설정 가능합니다.",
    Attack: "타겟에게 공격을 가합니다. 데미지를 설정할 수 있습니다.",
    FireProjectile: "적이나 플레이어에게 발사체를 생성 후 발사합니다.",
    TakeDamage: "데미지를 입힐수있습니다.",
    Heal: "체력을 회복합니다.",
    SetVar: "원하는 변수 값을 변경합니다.",
    Enable: "오브젝트를 활성화합니다.",
    Disable: "오브젝트를 비활성화합니다.",
    ChangeScene: "다른씬으로 이동합니다.",
    Rotate: "오브젝트를 회전시킵니다.",
    Pulse: "크기를 조절하거나 색상을 변경하는등 다양한 효과를 줍니다.",
    ShowDialogue: "대화 UI를 표시힙니다.",
    PlaySound: "사운드를 재생합니다.",
    IncrementVar: "원하는 변수에 더하기를 사용합니다.",
    EmitEventSignal: "이벤트 신호 전송해서 특정 컴포넌트를 실행시킬 수 있습니다.",
    RunModule: "모듈(비쥬얼 스크립트)을 실행합니다.",
    SpawnEntity: "엔티티를 생성합니다.",
    PlayAnimation: "애니메이션을 재생합니다.",
    Log: "원하는 로그를 출력할수있습니다!",
    OpenUrl: "URL 열어줍니다.",
    If: "조건에 맞춰 참과 거짓일때 행동을 조절할수있습니다.",
};

function parseConditionValue(value: string): string | number | boolean {
    const trimmed = value.trim();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed.length === 0) return 0;
    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;
    return trimmed;
}

export function ComponentHelper({
    isOpen,
    onClose,
    entity,
    onUpdateEntity,
}: ComponentHelperProps) {
    const { entities: allEntities, modules: libraryModules, assets, scenes: sceneMap } =
        useEditorCoreSnapshot();
    const availableActions = useMemo(() => ActionRegistry.getAvailableActions(), []);
    const [step, setStep] = useState<Step>(0);
    const [selectedEvent, setSelectedEvent] = useState("");
    const [selectedCondition, setSelectedCondition] = useState("");
    const [actionDraft, setActionDraft] = useState<{ type: string;[key: string]: unknown }>({
        type: "",
    });
    const [stepError, setStepError] = useState("");
    const [conditionVar, setConditionVar] = useState("");
    const [conditionValue, setConditionValue] = useState("0");
    const [inputKey, setInputKey] = useState(INPUT_KEY_OPTIONS[0]?.value ?? "KeyA");

    useEffect(() => {
        if (!isOpen) return;
        setStep(0);
        setSelectedEvent("");
        setSelectedCondition("");
        setActionDraft({ type: "" });
        setConditionVar(entity?.variables?.[0]?.name ?? "");
        setConditionValue("0");
        setInputKey(INPUT_KEY_OPTIONS[0]?.value ?? "KeyA");
        setStepError("");
    }, [isOpen, entity?.id, availableActions]);

    if (!isOpen) return null;

    const hasCondition = selectedCondition.length > 0;
    const isInputCondition = selectedCondition === "InputKey" || selectedCondition === "InputDown";
    const isValueFreeCondition = VALUE_FREE_CONDITIONS.has(selectedCondition);
    const variables = entity?.variables ?? [];
    const sceneOptions = Array.from(sceneMap.values()).map((scene) => ({ id: scene.id, name: scene.name }));
    const otherEntities = Array.from(allEntities.values())
        .filter((e) => e.id !== entity?.id)
        .map((e) => ({ id: e.id, name: e.name }));
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
            const override = entity?.modules?.find((m) => m.id === module.id);
            return mergeModule(module, override);
        }),
        ...(entity?.modules ?? []).filter((module) => !libraryModules.some((m) => m.id === module.id)),
    ];

    const buildCondition = () => {
        const fallbackCondition = CONDITION_TYPES[0]?.value ?? "IsGrounded";
        const conditionType = selectedCondition || fallbackCondition;
        if (isInputCondition) {
            return { type: conditionType, key: inputKey };
        }
        if (isValueFreeCondition) {
            return { type: conditionType };
        }
        const fallbackName = variables[0]?.name ?? "var_1";
        const name = conditionVar || fallbackName;
        return {
            type: conditionType,
            name,
            value: parseConditionValue(conditionValue),
        };
    };

    const ensureConditionVariable = (currentVars: EditorVariable[], name: string) => {
        if (!name) return currentVars;
        if (currentVars.some((v) => v.name === name)) return currentVars;
        const nextVar: EditorVariable = {
            id: crypto.randomUUID(),
            name,
            type: "int",
            value: 0,
        };
        return [...currentVars, nextVar];
    };

    const ensureVariable = (name: string, value: unknown, explicitType?: EditorVariable["type"]) => {
        if (!entity) return;
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
        if (!entity) return;
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

    const handleAddComponent = () => {
        if (!entity) return;
        const existing = splitLogicItems(entity.logic);
        const fallbackEvent = EVENT_TYPES[0]?.value ?? "OnUpdate";
        const fallbackAction = availableActions[0] ?? "Move";
        const condition = buildCondition();
        const nextVars = isValueFreeCondition
            ? variables
            : ensureConditionVariable(variables, (condition as { name?: string }).name ?? "");
        const newComponent: LogicComponent = {
            id: crypto.randomUUID(),
            type: "Logic",
            event: selectedEvent || fallbackEvent,
            eventParams: {},
            conditions: [condition],
            conditionLogic: "AND",
            actions: [{ ...actionDraft, type: actionDraft.type || fallbackAction }],
        };
        const nextLogic = buildLogicItems({ components: [...existing, newComponent] });
        onUpdateEntity({ ...entity, logic: nextLogic, variables: nextVars });
        onClose();
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2200,
                padding: "16px",
            }}
        >
            <div
                style={{
                    width: "620px",
                    height: "620px",
                    background: colors.bgSecondary,
                    border: `1px solid ${colors.borderColor}`,
                    borderRadius: "10px",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                    padding: "16px",
                    color: colors.textPrimary,
                    fontSize: "13px",
                    display: "flex",
                    flexDirection: "column",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                    }}
                >
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>컴포넌트 마술사</div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            border: "none",
                            background: "transparent",
                            color: colors.textSecondary,
                            cursor: "pointer",
                            fontSize: "16px",
                        }}
                        aria-label="Close"
                    >
                        x
                    </button>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {!entity ? (
                        <div style={{ color: colors.textSecondary, lineHeight: 1.5 }}>
                            Select an entity to add a component.
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                                {[
                                    {
                                        label: "이벤트",
                                        value: selectedEvent || "아직 안 고름!",
                                    },
                                    {
                                        label: "컨디션",
                                        value: selectedCondition || "아직 안 고름!",
                                    },
                                    {
                                        label: "액션",
                                        value: actionDraft.type || "아직 안 고름!",
                                    },
                                ].map((item, index) => (
                                    <div
                                        key={item.label}
                                        style={{
                                            flex: 1,
                                            textAlign: "left",
                                            padding: "4px 2px",
                                            color: step === index ? colors.textPrimary : colors.textSecondary,
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            borderBottom: step === index ? `2px solid ${colors.accent}` : `1px solid ${colors.borderColor}`,
                                        }}
                                    >
                                        {index + 1}. {item.label}
                                        <div style={{ fontSize: "10px", marginTop: "4px", color: colors.textSecondary }}>
                                            {item.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {step === 0 && (
                                <div style={{ display: "grid", gap: "10px" }}>
                                    <label style={{ color: colors.textSecondary, fontSize: "11px" }}>Event</label>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                            gap: "8px",
                                        }}
                                    >
                                        {EVENT_TYPES.map((event, idx) => {
                                            const isSelected = selectedEvent === event.value;
                                            const rainbow = [
                                                "#ef4444",
                                                "#f97316",
                                                "#facc15",
                                                "#22c55e",
                                                "#3b82f6",
                                                "#8b5cf6",
                                            ];
                                            const accent = rainbow[idx % rainbow.length];
                                            return (
                                                <button
                                                    key={event.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedEvent(event.value);
                                                        setStepError("");
                                                    }}
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "flex-start",
                                                        gap: "4px",
                                                        padding: "10px",
                                                        borderRadius: "8px",
                                                        border: `1px solid ${isSelected ? accent : colors.borderColor}`,
                                                        background: isSelected
                                                            ? `${accent}22`
                                                            : `${accent}12`,
                                                        color: isSelected ? colors.textPrimary : colors.textSecondary,
                                                        cursor: "pointer",
                                                        textAlign: "left",
                                                        lineHeight: 1.3,
                                                        boxShadow: isSelected ? `0 0 0 1px ${accent}55` : "none",
                                                    }}
                                                >
                                                    <span style={{ fontSize: "11px", fontWeight: 600 }}>
                                                        {event.label}
                                                    </span>
                                                    <span style={{ fontSize: "12px" }}>
                                                        {{
                                                            OnStart: "씬 시작 시 한 번 실행",
                                                            OnUpdate: "매 프레임 반복 실행",
                                                            OnDestroy: "엔티티 제거 시 실행",
                                                            OnSignalReceive: "신호(이벤트) 수신 시 실행",
                                                            OnCollision: "충돌 감지 시 실행",
                                                            OnClick: "클릭했을 때 실행",
                                                        }[event.value] ?? "이벤트가 발생하면 실행"}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {step === 1 && (
                                <div style={{ display: "grid", gap: "8px" }}>
                                    <label style={{ color: colors.textSecondary, fontSize: "11px" }}>Condition</label>
                                    <select
                                        value={selectedCondition}
                                        onChange={(e) => {
                                            setSelectedCondition(e.target.value);
                                            setStepError("");
                                        }}
                                        style={{
                                            background: colors.bgPrimary,
                                            border: `1px solid ${colors.borderColor}`,
                                            borderRadius: "6px",
                                            padding: "8px",
                                            color: colors.textPrimary,
                                        }}
                                    >
                                        <option value="">선택하세요</option>
                                        {CONDITION_TYPES.map((cond) => (
                                            <option key={cond.value} value={cond.value}>
                                                {cond.label}
                                            </option>
                                        ))}
                                    </select>
                                    {hasCondition && isInputCondition && (
                                        <select
                                            value={inputKey}
                                            onChange={(e) => setInputKey(e.target.value)}
                                            style={{
                                                background: colors.bgPrimary,
                                                border: `1px solid ${colors.borderColor}`,
                                                borderRadius: "6px",
                                                padding: "8px",
                                                color: colors.textPrimary,
                                            }}
                                        >
                                            {INPUT_KEY_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {hasCondition && !isValueFreeCondition && !isInputCondition && (
                                        <>
                                            <label style={{ color: colors.textSecondary, fontSize: "11px" }}>
                                                Variable
                                            </label>
                                            {variables.length > 0 ? (
                                                <select
                                                    value={conditionVar || variables[0]?.name || ""}
                                                    onChange={(e) => setConditionVar(e.target.value)}
                                                    style={{
                                                        background: colors.bgPrimary,
                                                        border: `1px solid ${colors.borderColor}`,
                                                        borderRadius: "6px",
                                                        padding: "8px",
                                                        color: colors.textPrimary,
                                                    }}
                                                >
                                                    {variables.map((v) => (
                                                        <option key={v.id} value={v.name}>
                                                            {v.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={conditionVar}
                                                    onChange={(e) => setConditionVar(e.target.value)}
                                                    placeholder="var_1"
                                                    style={{
                                                        background: colors.bgPrimary,
                                                        border: `1px solid ${colors.borderColor}`,
                                                        borderRadius: "6px",
                                                        padding: "8px",
                                                        color: colors.textPrimary,
                                                    }}
                                                />
                                            )}
                                            <label style={{ color: colors.textSecondary, fontSize: "11px" }}>Value</label>
                                            <input
                                                type="text"
                                                value={conditionValue}
                                                onChange={(e) => setConditionValue(e.target.value)}
                                                placeholder="0"
                                                style={{
                                                    background: colors.bgPrimary,
                                                    border: `1px solid ${colors.borderColor}`,
                                                    borderRadius: "6px",
                                                    padding: "8px",
                                                    color: colors.textPrimary,
                                                }}
                                            />
                                        </>
                                    )}
                                    {selectedCondition && (
                                        <div style={{ color: colors.textSecondary, fontSize: "13px", marginTop: "6px" }}>
                                            {CONDITION_DESCRIPTIONS[selectedCondition] ?? "조건에 맞을 때 실행"}
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 2 && (
                                <div style={{ display: "grid", gap: "8px" }}>
                                    <label style={{ color: colors.textSecondary, fontSize: "11px" }}>Action</label>
                                    <ActionEditor
                                        action={actionDraft}
                                        availableActions={availableActions}
                                        actionLabels={ACTION_LABELS}
                                        variables={variables}
                                        entities={otherEntities}
                                        modules={modules}
                                        scenes={sceneOptions}
                                        assets={assets}
                                        currentEntity={entity}
                                        onCreateVariable={ensureVariable}
                                        onUpdateModuleVariable={handleUpdateModuleVariable}
                                        onUpdate={(updated) => {
                                            setActionDraft(updated);
                                            setStepError("");
                                        }}
                                        onRemove={() => {
                                            setActionDraft({ type: "" });
                                            setStepError("");
                                        }}
                                        showRemove={false}
                                    />
                                    {actionDraft.type && (
                                        <div style={{ color: colors.textSecondary, fontSize: "13px" }}>
                                            {ACTION_DESCRIPTIONS[actionDraft.type] ?? "액션을 실행합니다"}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ flex: 1 }} />
                            {stepError && (
                                <div style={{ marginBottom: "8px", color: "#f87171", fontSize: "11px" }}>
                                    {stepError}
                                </div>
                            )}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "8px",
                                    marginTop: "auto",
                                }}
                            >
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                        type="button"
                                        onClick={() => setStep((prev) => (prev > 0 ? ((prev - 1) as Step) : prev))}
                                        disabled={step === 0}
                                        style={{
                                            padding: "8px 12px",
                                            fontSize: "12px",
                                            background: colors.bgTertiary,
                                            border: `1px solid ${colors.borderColor}`,
                                            color: colors.textPrimary,
                                            borderRadius: "6px",
                                            cursor: step === 0 ? "not-allowed" : "pointer",
                                            opacity: step === 0 ? 0.5 : 1,
                                        }}
                                    >
                                        이전
                                    </button>
                                    {step < 2 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (step === 0 && !selectedEvent) {
                                                    setStepError("아직 선택을 안 했다! 이 바퀴벌레 뒷다리 같은 녀석!!");
                                                    return;
                                                }
                                                if (step === 1 && !selectedCondition) {
                                                    setStepError("아직 선택을 안 했다! 이 바퀴벌레 뒷다리 같은 녀석!!");
                                                    return;
                                                }
                                                setStepError("");
                                                setStep((prev) => ((prev + 1) as Step));
                                            }}
                                            style={{
                                                padding: "8px 12px",
                                                fontSize: "12px",
                                                background: colors.bgTertiary,
                                                border: `1px solid ${colors.borderColor}`,
                                                color: colors.textPrimary,
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                            }}
                                        >
                                            다음
                                        </button>
                                    )}
                                </div>

                                {step === 2 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!actionDraft.type) {
                                                setStepError("아직 선택을 안 했다! 이 바퀴벌레 뒷다리 같은 녀석!!");
                                                return;
                                            }
                                            setStepError("");
                                            handleAddComponent();
                                        }}
                                        style={{
                                            padding: "8px 14px",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            background: colors.accent,
                                            border: `1px solid ${colors.borderColor}`,
                                            color: colors.textPrimary,
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Add Component
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
