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

    return (kinetic as any).isGrounded ?? true;
});

// --- Status Conditions ---

ConditionRegistry.register("IsAlive", (ctx: ActionContext) => {
    const status = ctx.modules.Status as StatusModule | undefined;
    if (!status) return false;

    if (typeof status.isAlive === 'boolean') {
        return status.isAlive;
    }
    // 폴백: 데이터 객체인 경우
    const hp = (status as any).hp;
    return hp !== undefined && hp > 0;
});

ConditionRegistry.register("HpBelow", (ctx: ActionContext, params: Record<string, unknown>) => {
    const status = ctx.modules.Status as StatusModule | undefined;
    if (!status) return false;

    const limit = (params.value as number) ?? 0;
    const hp = (status as any).hp ?? status.hp;
    return hp < limit;
});

ConditionRegistry.register("HpAbove", (ctx: ActionContext, params: Record<string, unknown>) => {
    const status = ctx.modules.Status as StatusModule | undefined;
    if (!status) return false;

    const limit = (params.value as number) ?? 0;
    const hp = (status as any).hp ?? status.hp;
    return hp > limit;
});

// --- Distance Conditions ---

/**
 * InRange - 타겟이 지정 거리 내에 있는지 확인
 * params: { targetId: string, range: number }
 */
ConditionRegistry.register("InRange", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return false;

    const entityId = ctx.entityId;
    const targetId = params.targetId as string;
    const range = (params.range as number) ?? 100;

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
 * params: { targetId: string, range: number }
 */
ConditionRegistry.register("OutOfRange", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return false;

    const entityId = ctx.entityId;
    const targetId = params.targetId as string;
    const range = (params.range as number) ?? 100;

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

console.log("[DefaultConditions] 9 conditions registered: IsGrounded, IsAlive, HpBelow, HpAbove, InRange, OutOfRange, HasModule, VarEquals, VarGreaterThan");

