/**
 * UniForge ECA (Event-Condition-Action) 시스템 타입 정의
 * 
 * 지원 장르: RPG, 플랫포머, 탄막, 비주얼노벨, 디펜스
 * 
 * ============================================================
 * 사용 예시 1: 플랫포머 점프
 * ============================================================
 * const jumpRule: ECARule = {
 *   id: "player-jump",
 *   trigger: { type: "OnKeyDown", key: "Space" },
 *   conditions: [{ type: "IsGrounded", entityId: "player" }],
 *   actions: [{ type: "ApplyForce", entityId: "player", forceY: -500 }]
 * };
 * 
 * ============================================================
 * 사용 예시 2: RPG 퀘스트 업데이트
 * ============================================================
 * const questUpdateRule: ECARule = {
 *   id: "quest-npc-talk",
 *   trigger: { type: "OnEventSignal", signalName: "NPC_TALK_COMPLETE" },
 *   conditions: [
 *     { type: "Compare", variable: "questStep", operator: "Equals", value: 2, scope: "Global" }
 *   ],
 *   actions: [
 *     { type: "Set", variable: "questStep", value: 3, scope: "Global" },
 *     { type: "ShowDialog", dialogId: "quest_updated", speaker: "System" }
 *   ]
 * };
 */

// ============================================================
// 공통 타입
// ============================================================

/** 변수 범위 - 전역 또는 엔티티 로컬 */
export type VariableScope = "Global" | "Entity";

/** 비교 연산자 */
export type CompareOperator = "Equals" | "NotEquals" | "Greater" | "Less" | "GreaterOrEqual" | "LessOrEqual";

/** 키 입력 타입 */
export type InputKey =
    | "Space" | "Enter" | "Escape" | "Shift" | "Control" | "Alt"
    | "W" | "A" | "S" | "D" | "E" | "Z" | "X" | "C"
    | "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"
    | "Mouse0" | "Mouse1" | "Mouse2";

/** 축 입력 타입 (조이패드/WASD) */
export type AxisType = "Horizontal" | "Vertical";

/** 충돌 태그 - CollisionSystem에서 정의된 타입 재사용 */
import { type CollisionTag as _CollisionTag } from "../CollisionSystem";
export type CollisionTag = _CollisionTag;

// ============================================================
// TRIGGER (이벤트 - When)
// ============================================================

/** 입력 트리거: 키 누름 */
export interface OnKeyDownTrigger {
    type: "OnKeyDown";
    key: InputKey;
}

/** 입력 트리거: 키 뗌 */
export interface OnKeyUpTrigger {
    type: "OnKeyUp";
    key: InputKey;
}

/** 입력 트리거: 클릭 */
export interface OnClickTrigger {
    type: "OnClick";
    button: 0 | 1 | 2;  // 좌클릭, 휠클릭, 우클릭
}

/** 입력 트리거: 축 입력 (연속) */
export interface OnAxisTrigger {
    type: "OnAxis";
    axis: AxisType;
    threshold?: number;  // 기본값 0.1
}

/** 물리 트리거: 충돌 시작 */
export interface OnCollisionEnterTrigger {
    type: "OnCollisionEnter";
    withTag?: CollisionTag;  // 특정 태그만 감지
}

/** 물리 트리거: 충돌 종료 */
export interface OnCollisionExitTrigger {
    type: "OnCollisionExit";
    withTag?: CollisionTag;
}

/** 물리 트리거: 트리거 영역 진입 (통과 가능한 충돌) */
export interface OnTriggerEnterTrigger {
    type: "OnTriggerEnter";
    withTag?: CollisionTag;
}

/** 라이프사이클 트리거: 생성 시 */
export interface OnStartTrigger {
    type: "OnStart";
}

/** 라이프사이클 트리거: 매 프레임 */
export interface OnUpdateTrigger {
    type: "OnUpdate";
}

/** 라이프사이클 트리거: 타이머 */
export interface OnTimerTrigger {
    type: "OnTimer";
    interval: number;    // ms 단위
    repeat: boolean;     // 반복 여부
}

/** 라이프사이클 트리거: 삭제 시 */
export interface OnDestroyTrigger {
    type: "OnDestroy";
}

/** 시스템 트리거: 커스텀 이벤트 수신 */
export interface OnEventSignalTrigger {
    type: "OnEventSignal";
    signalName: string;
}

/** 트리거 유니온 타입 */
export type Trigger =
    | OnKeyDownTrigger
    | OnKeyUpTrigger
    | OnClickTrigger
    | OnAxisTrigger
    | OnCollisionEnterTrigger
    | OnCollisionExitTrigger
    | OnTriggerEnterTrigger
    | OnStartTrigger
    | OnUpdateTrigger
    | OnTimerTrigger
    | OnDestroyTrigger
    | OnEventSignalTrigger;

// ============================================================
// CONDITION (조건 - If)
// ============================================================

/** 변수 조건: 값 비교 (HP, MP, 퀘스트 단계 등) */
export interface CompareCondition {
    type: "Compare";
    variable: string;
    operator: CompareOperator;
    value: number | string | boolean;
    scope: VariableScope;
    entityId?: string;  // Entity 스코프일 때 대상 ID
}

/** 물리 조건: 바닥에 닿아있는지 (플랫포머 필수) */
export interface IsGroundedCondition {
    type: "IsGrounded";
    entityId?: string;  // 생략 시 self
}

/** 물리 조건: 레이캐스트 충돌 */
export interface RaycastHitCondition {
    type: "RaycastHit";
    direction: { x: number; y: number };
    distance: number;
    withTag?: CollisionTag;
}

/** 상태 조건: 특정 태그 보유 */
export interface HasTagCondition {
    type: "HasTag";
    tag: string;
    entityId?: string;
}

/** 상태 조건: 활성화 상태 */
export interface IsActiveCondition {
    type: "IsActive";
    entityId?: string;
    expected: boolean;  // true면 활성화 상태일 때 통과
}

/** 상태 조건: 쿨다운 체크 */
export interface CooldownReadyCondition {
    type: "CooldownReady";
    cooldownId: string;
}

/** 조건 유니온 타입 */
export type Condition =
    | CompareCondition
    | IsGroundedCondition
    | RaycastHitCondition
    | HasTagCondition
    | IsActiveCondition
    | CooldownReadyCondition;

// ============================================================
// ACTION (실행 - Do)
// ============================================================

// --- 변수 액션 ---

/** 변수 액션: 값 설정 */
export interface SetAction {
    type: "Set";
    variable: string;
    value: number | string | boolean;
    scope: VariableScope;
    entityId?: string;
}

/** 변수 액션: 값 더하기 */
export interface AddAction {
    type: "Add";
    variable: string;
    amount: number;
    scope: VariableScope;
    entityId?: string;
}

/** 변수 액션: 값 빼기 */
export interface SubtractAction {
    type: "Subtract";
    variable: string;
    amount: number;
    scope: VariableScope;
    entityId?: string;
}

// --- 물리 액션 ---

/** 물리 액션: 즉시 힘 적용 (점프 등) */
export interface ApplyForceAction {
    type: "ApplyForce";
    entityId?: string;
    forceX?: number;
    forceY?: number;
}

/** 물리 액션: 속도 설정 (지속 이동) */
export interface SetVelocityAction {
    type: "SetVelocity";
    entityId?: string;
    velocityX?: number;
    velocityY?: number;
}

/** 물리 액션: 순간이동 */
export interface TeleportAction {
    type: "Teleport";
    entityId?: string;
    x: number;
    y: number;
    relative?: boolean;  // true면 상대 좌표
}

// --- 오브젝트 액션 ---

/** 오브젝트 액션: 스폰 (오브젝트 풀링 지원) */
export interface SpawnAction {
    type: "Spawn";
    templateId: string;       // 스폰할 엔티티 템플릿 ID
    x?: number;
    y?: number;
    relativeToEntity?: string;  // 특정 엔티티 기준 상대 좌표
    usePool?: boolean;         // 풀링 사용 (탄막 성능 최적화)
    poolSize?: number;         // 풀 사이즈
}

/** 오브젝트 액션: 삭제 */
export interface DestroyAction {
    type: "Destroy";
    entityId?: string;  // 생략 시 self
    delay?: number;     // ms 딜레이
}

/** 오브젝트 액션: 활성화/비활성화 */
export interface SetActiveAction {
    type: "SetActive";
    entityId?: string;
    active: boolean;
}

// --- 렌더 액션 ---

/** 렌더 액션: 애니메이션 재생 */
export interface PlayAnimationAction {
    type: "PlayAnimation";
    entityId?: string;
    animationName: string;
    loop?: boolean;
}

/** 렌더 액션: 스프라이트 변경 */
export interface SetSpriteAction {
    type: "SetSprite";
    entityId?: string;
    spriteKey: string;
}

/** 렌더 액션: 머티리얼 변경 (3D 지원) */
export interface SetMaterialAction {
    type: "SetMaterial";
    entityId?: string;
    materialId: string;
}

// --- UI/시스템 액션 ---

/** UI 액션: 대화창 표시 (비주얼노벨/RPG) */
export interface ShowDialogAction {
    type: "ShowDialog";
    dialogId: string;
    speaker?: string;
    portrait?: string;
    choices?: {
        text: string;
        signalOnSelect: string;
    }[];
}

/** 시스템 액션: 씬 로드 */
export interface LoadSceneAction {
    type: "LoadScene";
    sceneName: string;
    transition?: "Fade" | "Slide" | "None";
    data?: Record<string, unknown>;
}

/** 시스템 액션: 커스텀 이벤트 발생 */
export interface EmitSignalAction {
    type: "EmitSignal";
    signalName: string;
    data?: Record<string, unknown>;
}

/** 시스템 액션: 쿨다운 시작 */
export interface StartCooldownAction {
    type: "StartCooldown";
    cooldownId: string;
    duration: number;  // ms
}

// --- 오디오 액션 ---

/** 오디오 액션: 사운드 재생 */
export interface PlaySoundAction {
    type: "PlaySound";
    soundId: string;
    volume?: number;
    loop?: boolean;
}

/** 오디오 액션: 사운드 정지 */
export interface StopSoundAction {
    type: "StopSound";
    soundId: string;
}

/** 액션 유니온 타입 */
export type Action =
    // 변수
    | SetAction
    | AddAction
    | SubtractAction
    // 물리
    | ApplyForceAction
    | SetVelocityAction
    | TeleportAction
    // 오브젝트
    | SpawnAction
    | DestroyAction
    | SetActiveAction
    // 렌더
    | PlayAnimationAction
    | SetSpriteAction
    | SetMaterialAction
    // UI/시스템
    | ShowDialogAction
    | LoadSceneAction
    | EmitSignalAction
    | StartCooldownAction
    // 오디오
    | PlaySoundAction
    | StopSoundAction;

// ============================================================
// ECA RULE (전체 규칙)
// ============================================================

/**
 * ECA 규칙 정의
 * 
 * 하나의 트리거와 여러 조건/액션으로 구성
 * 모든 조건이 참일 때 액션들이 순차 실행됨
 */
export interface ECARule {
    /** 규칙 고유 ID */
    id: string;

    /** 규칙 이름 (에디터 표시용) */
    name?: string;

    /** 활성화 여부 */
    enabled?: boolean;

    /** 트리거 (이벤트 발생 조건) */
    trigger: Trigger;

    /** 조건 목록 (모두 참이어야 액션 실행) */
    conditions: Condition[];

    /** 액션 목록 (순차 실행) */
    actions: Action[];

    /** 우선순위 (낮을수록 먼저 실행) */
    priority?: number;
}

// ============================================================
// 헬퍼 타입
// ============================================================

/** 트리거 타입 이름 */
export type TriggerType = Trigger["type"];

/** 조건 타입 이름 */
export type ConditionType = Condition["type"];

/** 액션 타입 이름 */
export type ActionType = Action["type"];

/** 타입별 기본값 생성용 */
export type TriggerDefaults = {
    [K in TriggerType]: Extract<Trigger, { type: K }>;
};

export type ConditionDefaults = {
    [K in ConditionType]: Extract<Condition, { type: K }>;
};

export type ActionDefaults = {
    [K in ActionType]: Extract<Action, { type: K }>;
};
