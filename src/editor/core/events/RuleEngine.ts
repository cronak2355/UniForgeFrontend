import { ActionRegistry, type ActionContext } from "./ActionRegistry";
import { ConditionRegistry } from "./ConditionRegistry";
import type { GameEvent } from "./EventBus";

/**
 * 게임 규칙 (JSON 데이터 구조)
 * 이 구조는 에디터에서 생성되어 저장됩니다.
 */
export interface GameRule {
    /** 트리거할 이벤트 타입 (예: "KEY_DOWN") */
    event: string;

    /** 이벤트 파라미터 매칭 (예: { key: "Space" }) */
    eventParams?: Record<string, unknown>;

    /** 실행 조건 목록 */
    conditions?: {
        type: string;
        [key: string]: unknown
    }[];

    /** 실행할 액션 목록 */
    actions: {
        type: string;
        [key: string]: unknown
    }[];
}

class RuleEngineClass {
    private rules: GameRule[] = [];

    /**
     * 규칙 로드 (에디터/게임 초기화 시 호출)
     */
    loadRules(rules: GameRule[]) {
        this.rules = rules;
        console.log(`[RuleEngine] Loaded ${rules.length} rules.`);
    }

    /**
     * 규칙 추가
     */
    addRule(rule: GameRule) {
        this.rules.push(rule);
    }

    /**
     * 이벤트 처리 및 규칙 실행
     * @param event 게임 이벤트
     * @param ctx 액션 컨텍스트
     * @param entityRules 엔티티별 규칙 (없으면 전역 규칙 사용)
     */
    handleEvent(event: GameEvent, ctx: ActionContext, entityRules?: GameRule[]) {
        // 엔티티별 규칙이 있으면 그것을 사용, 없으면 전역 규칙 사용
        const rulesToCheck = entityRules || this.rules;

        // 1. 이벤트 타입 및 파라미터 매칭
        const matchingRules = rulesToCheck.filter(rule => {
            if (rule.event !== event.type) return false;

            // 파라미터가 있다면 모두 일치해야 함
            if (rule.eventParams) {
                for (const [key, value] of Object.entries(rule.eventParams)) {
                    if (event.data?.[key] !== value) return false;
                }
            }
            return true;
        });

        if (matchingRules.length === 0) return;

        // 2. 매칭된 각 규칙에 대해
        for (const rule of matchingRules) {
            // 3. 모든 조건 검사 (하나라도 실패하면 중단)
            const passed = rule.conditions?.every(c => {
                const { type, ...params } = c;
                return ConditionRegistry.check(type, ctx, params);
            }) ?? true;

            if (!passed) continue;

            // 4. 모든 액션 실행
            for (const action of rule.actions) {
                const { type, ...params } = action;
                console.log(`[RuleEngine] Executing action: ${type}`, params);
                ActionRegistry.run(type, ctx, params);
            }
        }
    }
}

export const RuleEngine = new RuleEngineClass();
