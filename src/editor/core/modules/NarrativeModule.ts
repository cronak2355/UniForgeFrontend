/**
 * NarrativeModule - 대사 및 스토리 관리 모듈
 * 
 * 비주얼 노벨, RPG 대화 시스템 등 스토리텔링을 위한 모듈입니다.
 * 
 * 주요 기능:
 * - 대사 표시 및 진행
 * - 선택지 분기
 * - 조건부 대화
 * - 변수 관리 (플래그, 카운터)
 * 
 * Unity 호환: serialize() 메서드로 C# 구조와 1:1 매핑
 */

import type { IModule } from "./IModule";
import { serializeForUnity } from "./IModule";

/**
 * 선택지 인터페이스
 */
export interface DialogueChoice {
    /** 선택지 ID */
    id: string;
    /** 선택지 텍스트 */
    text: string;
    /** 다음 대사 ID */
    nextDialogueId: string;
    /** 조건식 (선택적, 예: "flag_met_hero == true") */
    condition?: string;
    /** 선택 시 실행할 액션 (예: "set:flag_met_hero=true") */
    action?: string;
}

/**
 * 대사 라인 인터페이스
 */
export interface DialogueLine {
    /** 대사 ID */
    id: string;
    /** 화자 이름 */
    speaker: string;
    /** 화자 표시명 (다국어 지원용) */
    speakerDisplayName?: string;
    /** 대사 내용 */
    text: string;
    /** 캐릭터 이미지 키 */
    portrait?: string;
    /** 표정/포즈 (예: "happy", "angry") */
    emotion?: string;
    /** 다음 대사 ID (선택지가 없을 경우) */
    nextId?: string;
    /** 선택지 목록 */
    choices?: DialogueChoice[];
    /** 자동 진행 시간 (초, 0이면 수동 진행) */
    autoAdvanceTime?: number;
    /** 음성 파일 키 */
    voiceKey?: string;
    /** 배경 음악 변경 */
    bgmKey?: string;
    /** 배경 이미지 변경 */
    backgroundKey?: string;
}

/**
 * 스토리 변수 타입
 */
export type NarrativeVarValue = string | number | boolean;

/**
 * 내러티브 데이터 인터페이스
 */
export interface NarrativeData {
    /** 대사 목록 */
    dialogues: DialogueLine[];
    /** 현재 대사 ID */
    currentDialogueId: string | null;
    /** 스토리 변수 (플래그, 카운터 등) */
    variables: Record<string, NarrativeVarValue>;
    /** 대화 히스토리 (백로그용) */
    history: string[];
    /** 히스토리 최대 길이 */
    maxHistoryLength: number;
    /** 자동 진행 모드 */
    autoMode: boolean;
    /** 스킵 모드 */
    skipMode: boolean;
}

/**
 * 대사 이벤트 타입
 */
export type DialogueEventType =
    | "start"           // 대화 시작
    | "advance"         // 다음 대사
    | "choice"          // 선택지 선택
    | "end"             // 대화 종료
    | "variableChange"; // 변수 변경

/**
 * 대사 이벤트 콜백
 */
export type DialogueCallback = (
    event: DialogueEventType,
    data: { dialogue?: DialogueLine; choice?: DialogueChoice; variable?: { key: string; value: NarrativeVarValue } }
) => void;

/**
 * NarrativeModule 클래스
 * 
 * 게임의 스토리와 대화를 관리하는 모듈입니다.
 * 엔진 독립적으로 설계되어 UI 렌더링은 외부에서 처리합니다.
 */
export class NarrativeModule implements IModule {
    readonly type = "Narrative";
    readonly id: string;

    private data: NarrativeData;
    private dialogueMap: Map<string, DialogueLine> = new Map();
    private onEvent?: DialogueCallback;

    constructor(id: string, initialData: Partial<NarrativeData> = {}) {
        this.id = id;

        this.data = {
            dialogues: initialData.dialogues ?? [],
            currentDialogueId: initialData.currentDialogueId ?? null,
            variables: initialData.variables ?? {},
            history: initialData.history ?? [],
            maxHistoryLength: initialData.maxHistoryLength ?? 100,
            autoMode: initialData.autoMode ?? false,
            skipMode: initialData.skipMode ?? false,
        };

        // 대사 맵 생성 (빠른 조회용)
        this.rebuildDialogueMap();
    }

    // ===== Getters =====

    /** 현재 대사 */
    get currentDialogue(): DialogueLine | null {
        if (!this.data.currentDialogueId) return null;
        return this.dialogueMap.get(this.data.currentDialogueId) ?? null;
    }

    /** 현재 선택지 목록 */
    get currentChoices(): DialogueChoice[] {
        const dialogue = this.currentDialogue;
        if (!dialogue?.choices) return [];

        // 조건 필터링
        return dialogue.choices.filter(choice => this.evaluateCondition(choice.condition));
    }

    /** 대화 진행 중 여부 */
    get isActive(): boolean {
        return this.data.currentDialogueId !== null;
    }

    /** 히스토리 */
    get history(): string[] {
        return [...this.data.history];
    }

    // ===== 이벤트 =====

    /**
     * 이벤트 콜백 등록
     */
    setOnEvent(callback: DialogueCallback): void {
        this.onEvent = callback;
    }

    // ===== 대사 관리 =====

    /**
     * 대사 목록 설정
     */
    setDialogues(dialogues: DialogueLine[]): void {
        this.data.dialogues = dialogues;
        this.rebuildDialogueMap();
    }

    /**
     * 대사 추가
     */
    addDialogue(dialogue: DialogueLine): void {
        this.data.dialogues.push(dialogue);
        this.dialogueMap.set(dialogue.id, dialogue);
    }

    /**
     * 대사 맵 재구축
     */
    private rebuildDialogueMap(): void {
        this.dialogueMap.clear();
        for (const d of this.data.dialogues) {
            this.dialogueMap.set(d.id, d);
        }
    }

    // ===== 대화 진행 =====

    /**
     * 대화 시작
     * @param startId 시작 대사 ID
     */
    startDialogue(startId: string): boolean {
        const dialogue = this.dialogueMap.get(startId);
        if (!dialogue) {
            console.warn(`[NarrativeModule] Dialogue not found: ${startId}`);
            return false;
        }

        this.data.currentDialogueId = startId;
        this.addToHistory(dialogue);
        this.onEvent?.("start", { dialogue });

        return true;
    }

    /**
     * 다음 대사로 진행
     */
    advance(): DialogueLine | null {
        const current = this.currentDialogue;
        if (!current) return null;

        // 선택지가 있으면 선택 대기
        if (current.choices && current.choices.length > 0) {
            return current;
        }

        // 다음 대사로 이동
        if (current.nextId) {
            return this.goToDialogue(current.nextId);
        }

        // 대화 종료
        this.endDialogue();
        return null;
    }

    /**
     * 선택지 선택
     * @param choiceId 선택지 ID
     */
    selectChoice(choiceId: string): DialogueLine | null {
        const current = this.currentDialogue;
        if (!current?.choices) return null;

        const choice = current.choices.find(c => c.id === choiceId);
        if (!choice) {
            console.warn(`[NarrativeModule] Choice not found: ${choiceId}`);
            return null;
        }

        // 조건 검사
        if (!this.evaluateCondition(choice.condition)) {
            console.warn(`[NarrativeModule] Choice condition not met: ${choice.condition}`);
            return null;
        }

        // 액션 실행
        if (choice.action) {
            this.executeAction(choice.action);
        }

        this.onEvent?.("choice", { choice });

        // 다음 대사로 이동
        return this.goToDialogue(choice.nextDialogueId);
    }

    /**
     * 특정 대사로 이동
     */
    goToDialogue(dialogueId: string): DialogueLine | null {
        const dialogue = this.dialogueMap.get(dialogueId);
        if (!dialogue) {
            console.warn(`[NarrativeModule] Dialogue not found: ${dialogueId}`);
            this.endDialogue();
            return null;
        }

        this.data.currentDialogueId = dialogueId;
        this.addToHistory(dialogue);
        this.onEvent?.("advance", { dialogue });

        return dialogue;
    }

    /**
     * 대화 종료
     */
    endDialogue(): void {
        this.data.currentDialogueId = null;
        this.onEvent?.("end", {});
    }

    /**
     * 히스토리에 추가
     */
    private addToHistory(dialogue: DialogueLine): void {
        const entry = `${dialogue.speaker}: ${dialogue.text}`;
        this.data.history.push(entry);

        // 최대 길이 유지
        while (this.data.history.length > this.data.maxHistoryLength) {
            this.data.history.shift();
        }
    }

    // ===== 변수 관리 =====

    /**
     * 변수 조회
     */
    getVariable(key: string): NarrativeVarValue | undefined {
        return this.data.variables[key];
    }

    /**
     * 변수 설정
     */
    setVariable(key: string, value: NarrativeVarValue): void {
        const oldValue = this.data.variables[key];
        this.data.variables[key] = value;

        if (oldValue !== value) {
            this.onEvent?.("variableChange", { variable: { key, value } });
        }
    }

    /**
     * 조건식 평가
     * 간단한 조건식 지원: "key == value", "key != value", "key > value" 등
     */
    private evaluateCondition(condition?: string): boolean {
        if (!condition) return true;

        // 간단한 파싱
        const match = condition.match(/(\w+)\s*(==|!=|>|<|>=|<=)\s*(.+)/);
        if (!match) return true;

        const [, key, operator, valueStr] = match;
        const varValue = this.data.variables[key];

        // 값 파싱
        let compareValue: NarrativeVarValue;
        if (valueStr === "true") compareValue = true;
        else if (valueStr === "false") compareValue = false;
        else if (!isNaN(Number(valueStr))) compareValue = Number(valueStr);
        else compareValue = valueStr.replace(/['"]/g, "");

        switch (operator) {
            case "==": return varValue === compareValue;
            case "!=": return varValue !== compareValue;
            case ">": return Number(varValue) > Number(compareValue);
            case "<": return Number(varValue) < Number(compareValue);
            case ">=": return Number(varValue) >= Number(compareValue);
            case "<=": return Number(varValue) <= Number(compareValue);
            default: return true;
        }
    }

    /**
     * 액션 실행
     * 지원 형식: "set:key=value", "add:key=value"
     */
    private executeAction(action: string): void {
        const [command, keyValue] = action.split(":");
        if (!keyValue) return;

        const [key, valueStr] = keyValue.split("=");
        if (!key || valueStr === undefined) return;

        // 값 파싱
        let value: NarrativeVarValue;
        if (valueStr === "true") value = true;
        else if (valueStr === "false") value = false;
        else if (!isNaN(Number(valueStr))) value = Number(valueStr);
        else value = valueStr;

        switch (command) {
            case "set":
                this.setVariable(key, value);
                break;
            case "add":
                const current = Number(this.data.variables[key] ?? 0);
                this.setVariable(key, current + Number(value));
                break;
        }
    }

    // ===== 모드 제어 =====

    /**
     * 자동 진행 모드 토글
     */
    toggleAutoMode(): boolean {
        this.data.autoMode = !this.data.autoMode;
        return this.data.autoMode;
    }

    /**
     * 스킵 모드 토글
     */
    toggleSkipMode(): boolean {
        this.data.skipMode = !this.data.skipMode;
        return this.data.skipMode;
    }

    // ===== IModule 구현 =====

    /**
     * 프레임 업데이트 (자동 진행 처리)
     */
    update(_dt: number): void {
        // 자동 진행 또는 스킵 모드 구현 가능
        // 현재는 외부에서 advance() 호출로 처리
    }

    /**
     * Unity 호환 직렬화
     */
    serialize(): Record<string, unknown> {
        return serializeForUnity({
            type: this.type,
            id: this.id,
            dialogues: this.data.dialogues,
            currentDialogueId: this.data.currentDialogueId,
            variables: this.data.variables,
            history: this.data.history,
            maxHistoryLength: this.data.maxHistoryLength,
            autoMode: this.data.autoMode,
            skipMode: this.data.skipMode,
        });
    }

    /**
     * 역직렬화 (정적 팩토리)
     * Pascal/camelCase 모두 지원하며, 필수 필드 검증 포함
     */
    static deserialize(data: Record<string, unknown>): NarrativeModule {
        // ID 검증
        const id = (data.Id ?? data.id) as string | undefined;
        if (!id || typeof id !== "string") {
            throw new Error("[NarrativeModule] deserialize: id is required");
        }

        // 선택적 필드 추출 (타입 가드 적용)
        const dialogues = (data.Dialogues ?? data.dialogues) as DialogueLine[] | undefined;
        const currentDialogueId = (data.CurrentDialogueId ?? data.currentDialogueId) as string | null | undefined;
        const variables = (data.Variables ?? data.variables) as Record<string, NarrativeVarValue> | undefined;
        const history = (data.History ?? data.history) as string[] | undefined;
        const maxHistoryLength = (data.MaxHistoryLength ?? data.maxHistoryLength) as number | undefined;
        const autoMode = (data.AutoMode ?? data.autoMode) as boolean | undefined;
        const skipMode = (data.SkipMode ?? data.skipMode) as boolean | undefined;

        return new NarrativeModule(id, {
            dialogues: Array.isArray(dialogues) ? dialogues : [],
            currentDialogueId: currentDialogueId ?? null,
            variables: variables && typeof variables === "object" ? variables : {},
            history: Array.isArray(history) ? history : [],
            maxHistoryLength: typeof maxHistoryLength === "number" ? maxHistoryLength : 100,
            autoMode: typeof autoMode === "boolean" ? autoMode : false,
            skipMode: typeof skipMode === "boolean" ? skipMode : false,
        });
    }

    /**
     * 리소스 정리
     */
    destroy(): void {
        this.onEvent = undefined;
        this.dialogueMap.clear();
    }
}
