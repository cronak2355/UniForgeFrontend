import { ConditionRegistry } from "../ConditionRegistry";
import type { ActionContext } from "../ActionRegistry";
import { getRuntimeEntity } from "../../modules/ModuleFactory";
import type { StatusModule } from "../../modules/StatusModule";

/**
 * 기본 조건 등록
 */

// --- Kinetic Conditions ---

ConditionRegistry.register("IsGrounded", (ctx: ActionContext) => {
    const kinetic = ctx.modules.Kinetic;
    if (!kinetic) return false;

    // KineticModule에서 isGrounded 속성 안전하게 접근
    return 'isGrounded' in kinetic ? (kinetic as { isGrounded?: boolean }).isGrounded ?? true : true;
});

// --- Status Conditions ---

ConditionRegistry.register("IsAlive", (ctx: ActionContext) => {
    const status = ctx.modules.Status;
    if (!status) return false;

    if (typeof status.isAlive === 'boolean') {
        return status.isAlive;
    }
    // 폴백: hp 속성 직접 접근
    return status.hp !== undefined && status.hp > 0;
});

ConditionRegistry.register("HpBelow", (ctx: ActionContext, params: Record<string, unknown>) => {
    const status = ctx.modules.Status;
    if (!status) return false;

    const limit = (params.value as number) ?? 0;
    const hp = status.hp ?? 0;
    return hp < limit;
});

ConditionRegistry.register("HpAbove", (ctx: ActionContext, params: Record<string, unknown>) => {
    const status = ctx.modules.Status;
    if (!status) return false;

    const limit = (params.value as number) ?? 0;
    const hp = status.hp ?? 0;
    return hp > limit;
});

// --- Distance Conditions ---

/**
 * InRange - 타겟이 지정 거리 내에 있는지 확인
 * params: { targetId?: string, targetRole?: string, range: number }
 */
ConditionRegistry.register("InRange", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return false;

    const entityId = ctx.entityId;
    const range = (params.range as number) ?? 100;

    // [Role-Based Targeting] targetId 또는 targetRole 지원
    // targetId에 공백만 있으면 무시 (trim 처리)
    let targetId = ((params.targetId as string) ?? "").trim() || undefined;
    const targetRole = params.targetRole as string | undefined;

    // targetId가 입력되었지만 실제 존재하지 않는 경우 (사용자 오타 방지)
    if (targetId) {
        const targetObj = renderer.getGameObject?.(targetId);
        if (!targetObj) {
            targetId = undefined; // ID로 못 찾으면 역할 기반 검색으로 폴백
        }
    }

    if (!targetId && targetRole) {
        // 역할로 가장 가까운 엔티티 찾기
        const gameCore = ctx.globals?.gameCore;
        const entityObj = renderer.getGameObject?.(entityId);
        if (gameCore?.getNearestEntityByRole && entityObj) {
            const nearest = gameCore.getNearestEntityByRole(targetRole, entityObj.x, entityObj.y, entityId);
            if (nearest) {
                targetId = nearest.id;
            }
        }
    }

    if (!targetId) return false;

    const entityObj = renderer.getGameObject?.(entityId);
    const targetObj = renderer.getGameObject?.(targetId);

    if (!entityObj || !targetObj) return false;

    const dx = targetObj.x - entityObj.x;
    const dy = targetObj.y - entityObj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= range;
});

/**
 * OutOfRange - 타겟이 지정 거리 밖에 있는지 확인
 * params: { targetId?: string, targetRole?: string, range: number }
 */
ConditionRegistry.register("OutOfRange", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return false;

    const entityId = ctx.entityId;
    const range = (params.range as number) ?? 100;

    // [Role-Based Targeting] targetId 또는 targetRole 지원
    // targetId에 공백만 있으면 무시 (trim 처리)
    let targetId = ((params.targetId as string) ?? "").trim() || undefined;
    const targetRole = params.targetRole as string | undefined;

    // targetId가 입력되었지만 실제 존재하지 않는 경우 (사용자 오타 방지)
    if (targetId) {
        const targetObj = renderer.getGameObject?.(targetId);
        if (!targetObj) {
            targetId = undefined; // ID로 못 찾으면 역할 기반 검색으로 폴백
        }
    }

    if (!targetId && targetRole) {
        // 역할로 가장 가까운 엔티티 찾기
        const gameCore = ctx.globals?.gameCore;
        const entityObj = renderer.getGameObject?.(entityId);
        if (gameCore?.getNearestEntityByRole && entityObj) {
            const nearest = gameCore.getNearestEntityByRole(targetRole, entityObj.x, entityObj.y, entityId);
            if (nearest) {
                targetId = nearest.id;
            }
        }
    }

    if (!targetId) return false;

    const entityObj = renderer.getGameObject?.(entityId);
    const targetObj = renderer.getGameObject?.(targetId);

    if (!entityObj || !targetObj) return false;

    const dx = targetObj.x - entityObj.x;
    const dy = targetObj.y - entityObj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance > range;
});

// --- Module Conditions ---

/**
 * HasModule - 특정 모듈을 가지고 있는지 확인
 * params: { moduleType: string }
 */
ConditionRegistry.register("HasModule", (ctx: ActionContext, params: Record<string, unknown>) => {
    const moduleType = params.moduleType as string;
    if (!moduleType) return false;

    return ctx.modules[moduleType] !== undefined;
});

// --- Variable Conditions ---

/**
 * VarEquals - 변수 값이 특정 값과 같은지 확인
 * params: { name: string, value: number | string }
 */
ConditionRegistry.register("VarEquals", (ctx: ActionContext, params: Record<string, unknown>) => {
    const entities = ctx.globals?.entities as Map<string, any> | undefined;
    if (!entities) return false;

    const entity = entities.get(ctx.entityId);
    if (!entity || !entity.variables) return false;

    const varName = params.name as string;
    const expectedValue = params.value;

    const variable = entity.variables.find((v: any) => v.name === varName);
    return variable?.value === expectedValue;
});

/**
 * VarGreaterThan - 변수 값이 특정 값보다 큰지 확인
 * params: { name: string, value: number }
 */
ConditionRegistry.register("VarGreaterThan", (ctx: ActionContext, params: Record<string, unknown>) => {
    const entities = ctx.globals?.entities as Map<string, any> | undefined;
    if (!entities) return false;

    const entity = entities.get(ctx.entityId);
    if (!entity || !entity.variables) return false;

    const varName = params.name as string;
    const compareValue = params.value as number;

    const variable = entity.variables.find((v: any) => v.name === varName);
    if (!variable || typeof variable.value !== 'number') return false;

    return variable.value > compareValue;
});

ConditionRegistry.register("SignalFlag", (ctx: ActionContext, params: Record<string, unknown>) => {
    const key = params.key as string;
    if (!key) return false;
    return ctx.entityContext?.signals.flags[key] === true;
});

console.log("[DefaultConditions] 10 conditions registered: IsGrounded, IsAlive, HpBelow, HpAbove, InRange, OutOfRange, HasModule, VarEquals, VarGreaterThan, SignalFlag");

