import type { ActionContext } from "./ActionRegistry";

/**
 * Condition 함수 타입
 * true를 반환하면 액션 실행, false면 중단
 */
export type ConditionFn = (ctx: ActionContext, params: Record<string, unknown>) => boolean;

class ConditionRegistryClass {
    private conditions = new Map<string, ConditionFn>();

    register(name: string, fn: ConditionFn) {
        if (this.conditions.has(name)) {
            console.warn(`[ConditionRegistry] Condition '${name}' is being overwritten.`);
        }
        this.conditions.set(name, fn);
    }

    check(name: string, ctx: ActionContext, params: Record<string, unknown>): boolean {
        const condition = this.conditions.get(name);
        if (!condition) {
            console.warn(`[ConditionRegistry] Condition '${name}' not found. Defaulting to true.`);
            return true;
        }

        try {
            return condition(ctx, params);
        } catch (e) {
            console.error(`[ConditionRegistry] Error checking condition '${name}':`, e);
            return false;
        }
    }

    getAvailableConditions(): string[] {
        return Array.from(this.conditions.keys());
    }
}

export const ConditionRegistry = new ConditionRegistryClass();
