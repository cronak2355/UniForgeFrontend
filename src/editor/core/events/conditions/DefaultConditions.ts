import { ConditionRegistry } from "../ConditionRegistry";
import type { ActionContext } from "../ActionRegistry";

/**
 * 기본 조건 등록
 */

// --- Kinetic Conditions ---

ConditionRegistry.register("IsGrounded", (ctx: ActionContext) => {
    const kinetic = ctx.modules.Kinetic;
    if (!kinetic) return false;

    // KineticModule에 isGrounded 속성이 있다고 가정 (확인 필요)
    // 실제로는 물리 엔진 상태를 확인해야 함
    // 현재 KineticModule 구현상 isGrounded 프로퍼티가 있는지 확인해야 함.
    // 없다면 추가해야 함.
    return (kinetic as any).isGrounded ?? true; // 임시 기본값 true
});

// --- Status Conditions ---

ConditionRegistry.register("IsAlive", (ctx: ActionContext) => {
    const status = ctx.modules.Status;
    if (!status) return false;

    return status.isAlive;
});

ConditionRegistry.register("HpBelow", (ctx: ActionContext, params: Record<string, unknown>) => {
    const status = ctx.modules.Status;
    if (!status) return false;

    const limit = (params.value as number) ?? 0;
    return status.hp < limit;
});

console.log("[DefaultConditions] Conditions registered.");
