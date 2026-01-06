/**
 * RuleSection - ECA Rule 편집 UI
 * 
 * 엔티티의 게임 로직을 정의하는 Rule을 추가/편집합니다.
 * Event → Conditions → Actions 구조
 */

import { memo, useState } from "react";
import type { EditorEntity } from "../types/Entity";
import type { GameRule } from "../core/events/RuleEngine";
import { ActionRegistry } from "../core/events/ActionRegistry";
import { ConditionRegistry } from "../core/events/ConditionRegistry";
import { colors } from "../constants/colors";
import { useEditorCoreSnapshot } from "../../contexts/EditorCoreContext";
import * as styles from "./RuleSection.styles";

// 조건 한국어 라벨
const CONDITION_LABELS: Record<string, string> = {
    IsGrounded: "땅에 있음",
    IsAlive: "살아 있음",
    HpBelow: "HP 미만",
    HpAbove: "HP 초과",
    InRange: "거리 내",
    OutOfRange: "거리 밖",
    HasModule: "모듈 보유",
    VarEquals: "변수 같음",
    VarGreaterThan: "변수 큼",
    OnEventSignal: "이벤트 신호",
};

// 조건 설명
const CONDITION_TOOLTIPS: Record<string, string> = {
    IsGrounded: "땅에 닿아 있는지 확인 (플랫포머용)",
    IsAlive: "HP가 0보다 큰지 확인",
    HpBelow: "HP가 지정값 미만인지 확인",
    HpAbove: "HP가 지정값 초과인지 확인",
    InRange: "대상이 지정 거리 내에 있는지 확인",
    OutOfRange: "대상이 지정 거리 밖에 있는지 확인",
    HasModule: "특정 모듈을 가지고 있는지 확인",
    VarEquals: "변수가 특정 값과 같은지 확인",
    VarGreaterThan: "변수가 특정 값보다 큰지 확인",
    OnEventSignal: "커스텀 이벤트 신호를 받았는지 확인",
};

// 액션 한국어 라벨
const ACTION_LABELS: Record<string, string> = {
    Move: "이동",
    Jump: "점프",
    MoveToward: "좌표로 이동",
    ChaseTarget: "추적",
    Attack: "공격",
    FireProjectile: "투사체 발사",
    TakeDamage: "피해 입기",
    Heal: "회복",
    SetVar: "변수 설정",
    Enable: "활성화/비활성화",
    ChangeScene: "씬 전환",
    Rotate: "회전",
    Pulse: "펄스 효과",
    ShowDialogue: "대화 표시",
    PlaySound: "사운드 재생",
    EmitEventSignal: "이벤트 발행",
};

// 액션 설명
const ACTION_TOOLTIPS: Record<string, string> = {
    Move: "지정 방향으로 이동 (x, y: 방향, speed: 속도)",
    Jump: "점프 (플랫포머용)",
    MoveToward: "지정 좌표를 향해 이동",
    ChaseTarget: "대상 엔티티를 추적",
    Attack: "범위 내 적에게 근접 공격",
    FireProjectile: "투사체 발사",
    TakeDamage: "지정량 데미지 받기",
    Heal: "지정량 HP 회복",
    SetVar: "변수 값 설정",
    Enable: "엔티티 활성화/비활성화",
    ChangeScene: "다른 씬으로 전환",
    Rotate: "지정 속도로 회전",
    Pulse: "크기가 커졌다 작아지는 애니메이션",
    ShowDialogue: "화면에 대화 텍스트 표시",
    PlaySound: "효과음 재생",
    EmitEventSignal: "커스텀 이벤트 신호 발행",
};

type Props = {
    entity: EditorEntity;
    onUpdateEntity: (entity: EditorEntity) => void;
};

// 사용 가능한 이벤트 타입
const EVENT_TYPES = [
    { value: "TICK", label: "TICK (매 프레임)", tooltip: "게임이 실행되는 동안 매 프레임마다 반복 실행됩니다. 이동, 회전 등 지속적인 동작에 사용" },
    { value: "KEY_DOWN", label: "KEY_DOWN (키 누름)", tooltip: "플레이어가 특정 키를 누르는 순간 한 번 실행됩니다" },
    { value: "KEY_UP", label: "KEY_UP (키 뗌)", tooltip: "플레이어가 특정 키에서 손을 떼는 순간 한 번 실행됩니다" },
    { value: "ATTACK_HIT", label: "ATTACK_HIT (공격 적중)", tooltip: "이 엔티티의 공격이 다른 대상에게 적중했을 때 실행됩니다" },
    { value: "COLLISION", label: "COLLISION (충돌)", tooltip: "다른 엔티티와 충돌했을 때 실행됩니다. NPC 대화 등에 활용" },
    { value: "HP_CHANGED", label: "HP_CHANGED (HP 변화)", tooltip: "HP가 변경되었을 때 실행됩니다. 피격 효과 등에 활용" },
    { value: "ENTITY_DIED", label: "ENTITY_DIED (사망)", tooltip: "이 엔티티가 사망(HP 0)했을 때 실행됩니다" },
];

// 키 옵션
const KEY_OPTIONS = [
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "KeyW", "KeyA", "KeyS", "KeyD",
    "Space", "Enter", "KeyZ", "KeyX"
];

// Rule 템플릿 정의
const RULE_TEMPLATES: { label: string; description: string; rule: GameRule }[] = [
    {
        label: "➡️ 오른쪽 이동",
        description: "TICK마다 오른쪽으로 이동",
        rule: { event: "TICK", conditions: [], actions: [{ type: "Move", x: 1, y: 0, speed: 150 }] }
    },
    {
        label: "⬅️ 왼쪽 이동",
        description: "TICK마다 왼쪽으로 이동",
        rule: { event: "TICK", conditions: [], actions: [{ type: "Move", x: -1, y: 0, speed: 150 }] }
    },
    {
        label: "🎯 플레이어 추적",
        description: "범위 내 플레이어 추적",
        rule: {
            event: "TICK",
            conditions: [{ type: "InRange", targetRole: "player", range: 300 }],
            actions: [{ type: "ChaseTarget", targetRole: "player" }]
        }
    },
    {
        label: "⚔️ 근접 공격",
        description: "가까우면 공격",
        rule: {
            event: "TICK",
            conditions: [{ type: "InRange", targetRole: "player", range: 60 }],
            actions: [{ type: "Attack", targetRole: "player" }]
        }
    },
    {
        label: "💀 HP 0 → 비활성화",
        description: "HP가 0이하면 사라짐",
        rule: {
            event: "TICK",
            conditions: [{ type: "HpBelow", value: 1 }],
            actions: [{ type: "Enable", enabled: false }]
        }
    },
    {
        label: "💬 대화 표시",
        description: "충돌 시 대화창 표시",
        rule: {
            event: "COLLISION",
            conditions: [],
            actions: [{ type: "ShowDialogue", text: "안녕하세요!" }]
        }
    },
    {
        label: "🔊 사운드 재생",
        description: "공격 시 효과음",
        rule: {
            event: "ATTACK_HIT",
            conditions: [],
            actions: [{ type: "PlaySound", soundId: "hit" }]
        }
    },
    {
        label: "📡 이벤트 신호",
        description: "사망 시 커스텀 이벤트",
        rule: {
            event: "ENTITY_DIED",
            conditions: [],
            actions: [{ type: "EmitEventSignal", signalKey: "ENEMY_KILLED" }]
        }
    },
    {
        label: "🔄 회전 효과",
        description: "매 프레임 회전",
        rule: {
            event: "TICK",
            conditions: [],
            actions: [{ type: "Rotate", speed: 90 }]
        }
    },
    {
        label: "💫 펄스 효과",
        description: "크기 펄스 애니메이션",
        rule: {
            event: "TICK",
            conditions: [],
            actions: [{ type: "Pulse", speed: 2, minScale: 0.9, maxScale: 1.1 }]
        }
    },
];

export const RuleSection = memo(function RuleSection({ entity, onUpdateEntity }: Props) {
    const { entities: allEntities } = useEditorCoreSnapshot();
    const rules = entity.rules || [];

    // 다른 엔티티 목록 (현재 엔티티 제외)
    const otherEntities = Array.from(allEntities.values())
        .filter(e => e.id !== entity.id)
        .map(e => ({ id: e.id, name: e.name }));

    const handleAddRule = () => {
        const newRule: GameRule = {
            event: "TICK",
            conditions: [],
            actions: []
        };
        onUpdateEntity({
            ...entity,
            rules: [...rules, newRule]
        });
    };

    const handleAddTemplate = (template: GameRule) => {
        onUpdateEntity({
            ...entity,
            rules: [...rules, JSON.parse(JSON.stringify(template))] // deep copy
        });
    };

    const handleUpdateRule = (index: number, rule: GameRule) => {
        const newRules = [...rules];
        newRules[index] = rule;
        onUpdateEntity({ ...entity, rules: newRules });
    };

    const handleRemoveRule = (index: number) => {
        onUpdateEntity({
            ...entity,
            rules: rules.filter((_, i) => i !== index)
        });
    };

    return (
        <div style={styles.sectionContainer}>
            {/* 헤더 */}
            <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>
                    🎮 Rules ({rules.length})
                </div>
                <div style={styles.headerButtons}>
                    <select
                        style={styles.templateSelect}
                        value=""
                        onChange={(e) => {
                            const idx = parseInt(e.target.value);
                            if (!isNaN(idx)) handleAddTemplate(RULE_TEMPLATES[idx].rule);
                        }}
                    >
                        <option value="">📋 템플릿 추가</option>
                        {RULE_TEMPLATES.map((t, i) => (
                            <option key={i} value={i}>{t.label}</option>
                        ))}
                    </select>
                    <button onClick={handleAddRule} style={styles.addButton}>
                        + 직접 추가
                    </button>
                </div>
            </div>

            {/* Rule 목록 */}
            <div style={styles.ruleList}>
                {rules.map((rule, index) => (
                    <RuleItem
                        key={index}
                        rule={rule}
                        index={index}
                        entities={otherEntities}
                        onUpdate={(r) => handleUpdateRule(index, r)}
                        onRemove={() => handleRemoveRule(index)}
                    />
                ))}
                {rules.length === 0 && (
                    <div style={styles.emptyState}>
                        Rule이 없습니다.<br />
                        <span style={{ color: colors.accentLight }}>템플릿</span> 또는 <span style={{ color: colors.accentLight }}>+ 직접 추가</span>를 눌러 게임 로직을 만들어보세요!
                    </div>
                )}
            </div>
        </div>
    );
});

/**
 * 개별 Rule 편집 UI
 */
const RuleItem = memo(function RuleItem({
    rule,
    index,
    entities,
    onUpdate,
    onRemove
}: {
    rule: GameRule;
    index: number;
    entities: { id: string; name: string }[];
    onUpdate: (rule: GameRule) => void;
    onRemove: () => void;
}) {
    const [expanded, setExpanded] = useState(true);

    const handleEventChange = (event: string) => {
        onUpdate({ ...rule, event, eventParams: {} });
    };

    const handleAddCondition = () => {
        const availableConditions = ConditionRegistry.getAvailableConditions();
        const condType = availableConditions[0] || "IsAlive";
        onUpdate({
            ...rule,
            conditions: [...(rule.conditions || []), { type: condType }]
        });
    };

    const handleAddAction = () => {
        const availableActions = ActionRegistry.getAvailableActions();
        const actionType = availableActions[0] || "Move";
        onUpdate({
            ...rule,
            actions: [...rule.actions, { type: actionType }]
        });
    };

    return (
        <div style={styles.ruleItemContainer}>
            {/* Header */}
            <div style={styles.ruleItemHeader} onClick={() => setExpanded(!expanded)}>
                <span style={styles.ruleItemTitle}>
                    {expanded ? "▼" : "▶"} Rule #{index + 1}: {rule.event}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    style={styles.removeButton}
                >
                    Remove
                </button>
            </div>

            {expanded && (
                <div style={styles.ruleItemBody}>
                    {/* Event Type */}
                    <div>
                        <label style={styles.label}>📢 Event</label>
                        <select
                            value={rule.event}
                            onChange={(e) => handleEventChange(e.target.value)}
                            style={styles.selectField}
                            title={EVENT_TYPES.find(et => et.value === rule.event)?.tooltip}
                        >
                            {EVENT_TYPES.map(et => (
                                <option key={et.value} value={et.value} title={et.tooltip}>{et.label}</option>
                            ))}
                        </select>
                        <div style={{ fontSize: "10px", color: colors.textSecondary, marginTop: "2px", fontStyle: "italic" }}>
                            💡 {EVENT_TYPES.find(et => et.value === rule.event)?.tooltip || ""}
                        </div>
                    </div>

                    {/* Event Params (for KEY_DOWN) */}
                    {rule.event === "KEY_DOWN" || rule.event === "KEY_UP" ? (
                        <div>
                            <label style={{ fontSize: "10px", color: colors.textSecondary, display: "block", marginBottom: "4px" }}>
                                ⌨️ Key
                            </label>
                            <select
                                value={(rule.eventParams?.key as string) || "Space"}
                                onChange={(e) => onUpdate({ ...rule, eventParams: { ...rule.eventParams, key: e.target.value } })}
                                style={styles.selectField}
                            >
                                {KEY_OPTIONS.map(k => (
                                    <option key={k} value={k}>{k}</option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {/* Conditions */}
                    <div>
                        <div style={styles.sectionHeader}>
                            <label style={styles.label}>❓ Conditions ({rule.conditions?.length || 0})</label>
                            <button onClick={handleAddCondition} style={styles.smallAddButton}>+ Add</button>
                        </div>
                        {rule.conditions?.map((cond, i) => (
                            <ConditionEditor
                                key={i}
                                condition={cond}
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

                    {/* Actions */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label style={{ fontSize: "10px", color: colors.textSecondary }}>
                                ⚡ Actions ({rule.actions.length})
                            </label>
                            <button
                                onClick={handleAddAction}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: colors.accentLight,
                                    cursor: "pointer",
                                    fontSize: "10px"
                                }}
                            >
                                + Add
                            </button>
                        </div>
                        {rule.actions.map((action, i) => (
                            <ActionEditor
                                key={i}
                                action={action}
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

/**
 * Condition 편집기
 */
function ConditionEditor({
    condition,
    onUpdate,
    onRemove
}: {
    condition: { type: string;[key: string]: unknown };
    onUpdate: (c: { type: string;[key: string]: unknown }) => void;
    onRemove: () => void;
}) {
    const availableConditions = ConditionRegistry.getAvailableConditions();

    return (
        <div style={styles.conditionRow}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <select
                    value={condition.type}
                    onChange={(e) => onUpdate({ type: e.target.value })}
                    style={styles.smallSelect}
                    title={CONDITION_TOOLTIPS[condition.type]}
                >
                    {availableConditions.map(c => (
                        <option key={c} value={c} title={CONDITION_TOOLTIPS[c]}>{CONDITION_LABELS[c] || c} ({c})</option>
                    ))}
                </select>
                <div style={{ fontSize: "9px", color: colors.textSecondary, marginTop: "2px", fontStyle: "italic" }}>
                    💡 {CONDITION_TOOLTIPS[condition.type] || ""}
                </div>
            </div>

            {/* InRange 등 파라미터가 필요한 조건 */}
            {(condition.type === "InRange" || condition.type === "OutOfRange") && (
                <>
                    <input
                        type="text"
                        placeholder="targetId"
                        value={(condition.targetId as string) || ""}
                        onChange={(e) => onUpdate({ ...condition, targetId: e.target.value })}
                        style={styles.textInput}
                    />
                    <input
                        type="number"
                        placeholder="range"
                        value={(condition.range as number) || 100}
                        onChange={(e) => onUpdate({ ...condition, range: parseFloat(e.target.value) })}
                        style={styles.numberInput}
                    />
                </>
            )}

            {(condition.type === "HpBelow" || condition.type === "HpAbove") && (
                <input
                    type="number"
                    placeholder="value"
                    value={(condition.value as number) || 50}
                    onChange={(e) => onUpdate({ ...condition, value: parseFloat(e.target.value) })}
                    style={styles.numberInput}
                />
            )}

            {condition.type === "SignalFlag" && (
                <input
                    type="text"
                    placeholder="signalKey"
                    value={(condition.key as string) || ""}
                    onChange={(e) => onUpdate({ ...condition, key: e.target.value })}
                    style={styles.textInput}
                />
            )}

            <button
                onClick={onRemove}
                style={styles.removeButton}
            >
                ✕
            </button>
        </div>
    );
}

/**
 * Action 편집기
 */
function ActionEditor({
    action,
    onUpdate,
    onRemove
}: {
    action: { type: string;[key: string]: unknown };
    onUpdate: (a: { type: string;[key: string]: unknown }) => void;
    onRemove: () => void;
}) {
    const availableActions = ActionRegistry.getAvailableActions();

    return (
        <div style={styles.actionRow}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <select
                    value={action.type}
                    onChange={(e) => onUpdate({ type: e.target.value })}
                    style={styles.selectField}
                    title={ACTION_TOOLTIPS[action.type]}
                >
                    {availableActions.map(a => (
                        <option key={a} value={a} title={ACTION_TOOLTIPS[a]}>{ACTION_LABELS[a] || a} ({a})</option>
                    ))}
                </select>
                <div style={{ fontSize: "9px", color: colors.textSecondary, marginTop: "2px", fontStyle: "italic" }}>
                    💡 {ACTION_TOOLTIPS[action.type] || ""}
                </div>
            </div>

            {/* Move 파라미터 */}
            {action.type === "Move" && (
                <>
                    <ParamInput label="x" value={action.x as number} onChange={(v) => onUpdate({ ...action, x: v })} />
                    <ParamInput label="y" value={action.y as number} onChange={(v) => onUpdate({ ...action, y: v })} />
                    <ParamInput label="speed" value={action.speed as number} defaultValue={200} onChange={(v) => onUpdate({ ...action, speed: v })} />
                </>
            )}

            {/* ChaseTarget 파라미터 */}
            {action.type === "ChaseTarget" && (
                <>
                    <input
                        type="text"
                        placeholder="targetId"
                        value={(action.targetId as string) || "player"}
                        onChange={(e) => onUpdate({ ...action, targetId: e.target.value })}
                        style={styles.textInput}
                    />
                    <ParamInput label="speed" value={action.speed as number} defaultValue={80} onChange={(v) => onUpdate({ ...action, speed: v })} />
                </>
            )}

            {/* TakeDamage/Heal 파라미터 */}
            {(action.type === "TakeDamage" || action.type === "Heal") && (
                <ParamInput label="amount" value={action.amount as number} defaultValue={10} onChange={(v) => onUpdate({ ...action, amount: v })} />
            )}

            {/* Attack 파라미터 */}
            {action.type === "Attack" && (
                <>
                    <ParamInput label="range" value={action.range as number} defaultValue={100} onChange={(v) => onUpdate({ ...action, range: v })} />
                    <ParamInput label="damage" value={action.damage as number} defaultValue={10} onChange={(v) => onUpdate({ ...action, damage: v })} />
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

            {/* ShowDialogue 파라미터 */}
            {action.type === "ShowDialogue" && (
                <input
                    type="text"
                    placeholder="대화 텍스트"
                    value={(action.text as string) || ""}
                    onChange={(e) => onUpdate({ ...action, text: e.target.value })}
                    style={styles.textInput}
                />
            )}

            {/* PlaySound 파라미터 */}
            {action.type === "PlaySound" && (
                <input
                    type="text"
                    placeholder="soundId"
                    value={(action.soundId as string) || ""}
                    onChange={(e) => onUpdate({ ...action, soundId: e.target.value })}
                    style={styles.textInput}
                />
            )}

            {/* EmitEventSignal 파라미터 */}
            {action.type === "EmitEventSignal" && (
                <input
                    type="text"
                    placeholder="signalKey"
                    value={(action.signalKey as string) || ""}
                    onChange={(e) => onUpdate({ ...action, signalKey: e.target.value })}
                    style={styles.textInput}
                />
            )}

            {/* Rotate 파라미터 */}
            {action.type === "Rotate" && (
                <ParamInput label="speed" value={action.speed as number} defaultValue={90} onChange={(v) => onUpdate({ ...action, speed: v })} />
            )}

            {/* Pulse 파라미터 */}
            {action.type === "Pulse" && (
                <>
                    <ParamInput label="speed" value={action.speed as number} defaultValue={2} onChange={(v) => onUpdate({ ...action, speed: v })} />
                    <ParamInput label="min" value={action.minScale as number} defaultValue={0.9} onChange={(v) => onUpdate({ ...action, minScale: v })} />
                    <ParamInput label="max" value={action.maxScale as number} defaultValue={1.1} onChange={(v) => onUpdate({ ...action, maxScale: v })} />
                </>
            )}

            {/* Enable 파라미터 */}
            {action.type === "Enable" && (
                <select
                    value={action.enabled === false ? "false" : "true"}
                    onChange={(e) => onUpdate({ ...action, enabled: e.target.value === "true" })}
                    style={styles.smallSelect}
                >
                    <option value="true">활성화</option>
                    <option value="false">비활성화</option>
                </select>
            )}

            <button
                onClick={onRemove}
                style={styles.removeButton}
            >
                ✕
            </button>
        </div>
    );
}

/**
 * 파라미터 입력 필드
 */
function ParamInput({
    label,
    value,
    defaultValue = 0,
    onChange
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
