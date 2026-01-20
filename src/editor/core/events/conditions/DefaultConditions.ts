import { ConditionRegistry } from "../ConditionRegistry";
import type { ActionContext } from "../ActionRegistry";

type VariableEntry = { name: string; value: unknown };

function getEntityVariables(ctx: ActionContext): VariableEntry[] {
    const entities = ctx.globals?.entities as Map<string, { variables?: VariableEntry[] }> | undefined;
    return entities?.get(ctx.entityId)?.variables ?? [];
}

// Helper to coerce values to boolean logic
function coerceBool(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return Boolean(value);
}

// Get variable value with support for "varName.x" or "varName.y" and RuntimeContext
function getVariableValue(ctx: ActionContext, name: string): unknown {
    const gameCore = ctx.globals?.gameCore as any;

    // Support "varName.x" or "varName.y" for vector2 variables
    if (name.endsWith(".x") || name.endsWith(".y")) {
        const baseName = name.slice(0, -2);
        const axis = name.slice(-1) as "x" | "y";

        let parentValue: unknown = undefined;

        // 1. Try RuntimeContext
        if (gameCore?.getRuntimeContext && ctx.entityId) {
            parentValue = gameCore.getRuntimeContext().getEntityVariable(ctx.entityId, baseName);
        }

        // 2. Fallback to initial state
        if (parentValue === undefined) {
            const variable = getEntityVariables(ctx).find((v) => v.name === baseName);
            parentValue = variable?.value;
        }

        if (parentValue && typeof parentValue === "object" && axis in (parentValue as any)) {
            return (parentValue as any)[axis];
        }
        return undefined;
    }

    // Normal variable
    // 1. Try RuntimeContext
    if (gameCore?.getRuntimeContext && ctx.entityId) {
        const val = gameCore.getRuntimeContext().getEntityVariable(ctx.entityId, name);
        if (val !== undefined) return val;
    }

    // 2. Fallback
    const variable = getEntityVariables(ctx).find((v) => v.name === name);
    return variable?.value;
}

function getNumberVar(ctx: ActionContext, name: string): number | undefined {
    const value = getVariableValue(ctx, name);
    return typeof value === "number" ? value : undefined;
}

// --- Ground / Status Conditions ---

ConditionRegistry.register("IsGrounded", (ctx: ActionContext) => {
    return ctx.entityContext?.collisions.grounded === true;
});

ConditionRegistry.register("IsAlive", (ctx: ActionContext) => {
    const hp = getNumberVar(ctx, "hp");
    if (hp === undefined) return true;
    return hp > 0;
});

ConditionRegistry.register("HpBelow", (ctx: ActionContext, params: Record<string, unknown>) => {
    const hp = getNumberVar(ctx, "hp") ?? 0;
    const limit = (params.value as number) ?? 0;
    return hp < limit;
});

ConditionRegistry.register("HpAbove", (ctx: ActionContext, params: Record<string, unknown>) => {
    const hp = getNumberVar(ctx, "hp") ?? 0;
    const limit = (params.value as number) ?? 0;
    return hp > limit;
});

// --- Distance Conditions ---

ConditionRegistry.register("InRange", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return false;

    const entityId = ctx.entityId;
    const range = (params.range as number) ?? 100;

    let targetId = ((params.targetId as string) ?? "").trim() || undefined;
    const targetRole = params.targetRole as string | undefined;

    if (targetId) {
        const targetObj = renderer.getGameObject?.(targetId);
        if (!targetObj) {
            targetId = undefined;
        }
    }

    if (!targetId && targetRole) {
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

ConditionRegistry.register("OutOfRange", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return false;

    const entityId = ctx.entityId;
    const range = (params.range as number) ?? 100;

    let targetId = ((params.targetId as string) ?? "").trim() || undefined;
    const targetRole = params.targetRole as string | undefined;

    if (targetId) {
        const targetObj = renderer.getGameObject?.(targetId);
        if (!targetObj) {
            targetId = undefined;
        }
    }

    if (!targetId && targetRole) {
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

ConditionRegistry.register("DistanceLessThan", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return false;

    const entityId = ctx.entityId;
    const limit = (params.value as number) ?? 0;
    const targetObjId = params.targetEntityId as string;

    if (!targetObjId) return false;

    const entityObj = renderer.getGameObject?.(entityId);
    const targetObj = renderer.getGameObject?.(targetObjId);

    if (!entityObj || !targetObj) return false;

    const dx = targetObj.x - entityObj.x;
    const dy = targetObj.y - entityObj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < limit;
});

ConditionRegistry.register("DistanceGreaterThan", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return false;

    const entityId = ctx.entityId;
    const limit = (params.value as number) ?? 0;
    const targetObjId = params.targetEntityId as string;

    if (!targetObjId) return false;

    const entityObj = renderer.getGameObject?.(entityId);
    const targetObj = renderer.getGameObject?.(targetObjId);

    if (!entityObj || !targetObj) return false;

    const dx = targetObj.x - entityObj.x;
    const dy = targetObj.y - entityObj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance > limit;
});

// --- Variable Conditions ---

ConditionRegistry.register("VarEquals", (ctx: ActionContext, params: Record<string, unknown>) => {
    const varName = params.name as string;
    const expectedValue = params.value;
    const value = getVariableValue(ctx, varName);
    // if (value === undefined) return false; // [Modified] Allow undefined to flow down for boolean coercion (undefined == false)

    // Vector2 comparison (only for full vector2, not .x/.y access)
    if (typeof value === "object" && value !== null && 'x' in value && 'y' in value) {
        const varX = (value as any).x;
        const varY = (value as any).y;

        // Compare with Vector2 expectedValue
        if (typeof expectedValue === "object" && expectedValue !== null && 'x' in expectedValue && 'y' in expectedValue) {
            return varX === (expectedValue as any).x && varY === (expectedValue as any).y;
        }
        // Compare with separate x, y params
        const expX = params.x !== undefined ? params.x : params.value;
        const expY = params.y !== undefined ? params.y : params.value;
        return varX == expX && varY == expY;
    }

    // Boolean comparison with coercion
    if (typeof value === "boolean" || typeof expectedValue === "boolean" || (typeof expectedValue === "string" && (expectedValue === "true" || expectedValue === "false"))) {
        const boolVal = coerceBool(value);
        const boolExp = coerceBool(expectedValue);
        // console.log(`[VarEquals] ${varName} (${value}) vs ${expectedValue} -> ${boolVal} == ${boolExp}?`);
        return boolVal === boolExp;
    }

    if (typeof value === "number") {
        return value == expectedValue;
    }
    return value === expectedValue;
});

ConditionRegistry.register("VarGreaterThan", (ctx: ActionContext, params: Record<string, unknown>) => {
    const varName = params.name as string;
    const compareValue = Number(params.value);
    const value = getVariableValue(ctx, varName);
    if (value === undefined) return false;
    const val = Number(value);
    if (isNaN(val)) return false;
    return val > compareValue;
});

ConditionRegistry.register("VarNotEquals", (ctx: ActionContext, params: Record<string, unknown>) => {
    const varName = params.name as string;
    const expectedValue = params.value;
    const value = getVariableValue(ctx, varName);
    // if (value === undefined) return true; // [Modified] Allow undefined to flow down for boolean coercion

    // Vector2 comparison (only for full vector2, not .x/.y access)
    if (typeof value === "object" && value !== null && 'x' in value && 'y' in value) {
        const varX = (value as any).x;
        const varY = (value as any).y;

        // Compare with Vector2 expectedValue
        if (typeof expectedValue === "object" && expectedValue !== null && 'x' in expectedValue && 'y' in expectedValue) {
            return varX !== (expectedValue as any).x || varY !== (expectedValue as any).y;
        }
        // Compare with separate x, y params
        const expX = params.x !== undefined ? params.x : params.value;
        const expY = params.y !== undefined ? params.y : params.value;
        return varX != expX || varY != expY;
    }

    // Boolean comparison with coercion
    if (typeof value === "boolean" || typeof expectedValue === "boolean" || (typeof expectedValue === "string" && (expectedValue === "true" || expectedValue === "false"))) {
        const boolVal = coerceBool(value);
        const boolExp = coerceBool(expectedValue);
        return boolVal !== boolExp;
    }

    if (typeof value === "number") {
        return value != expectedValue;
    }
    return value !== expectedValue;
});

ConditionRegistry.register("VarLessThan", (ctx: ActionContext, params: Record<string, unknown>) => {
    const varName = params.name as string;
    const compareValue = Number(params.value);
    const value = getVariableValue(ctx, varName);
    if (value === undefined) return false;
    const val = Number(value);
    if (isNaN(val)) return false;
    return val < compareValue;
});

ConditionRegistry.register("VarGreaterOrEqual", (ctx: ActionContext, params: Record<string, unknown>) => {
    const varName = params.name as string;
    const compareValue = Number(params.value);
    const value = getVariableValue(ctx, varName);
    if (value === undefined) return false;
    const val = Number(value);
    if (isNaN(val)) return false;
    return val >= compareValue;
});

ConditionRegistry.register("VarLessOrEqual", (ctx: ActionContext, params: Record<string, unknown>) => {
    const varName = params.name as string;
    const compareValue = Number(params.value);
    const value = getVariableValue(ctx, varName);
    if (value === undefined) return false;
    const val = Number(value);
    if (isNaN(val)) return false;
    return val <= compareValue;
});

// --- Input Conditions ---

ConditionRegistry.register("InputLeft", (ctx: ActionContext) => ctx.input?.left === true);
ConditionRegistry.register("InputRight", (ctx: ActionContext) => ctx.input?.right === true);
ConditionRegistry.register("InputUp", (ctx: ActionContext) => ctx.input?.up === true);
ConditionRegistry.register("InputDown", (ctx: ActionContext) => ctx.input?.down === true);
ConditionRegistry.register("InputJump", (ctx: ActionContext) => ctx.input?.jump === true);

ConditionRegistry.register("InputKey", (ctx: ActionContext, params: Record<string, unknown>) => {
    const key = (params.key as string) ?? "";
    const eventKey = ctx.eventData?.key as string | undefined;
    if (eventKey && eventKey === key) {
        return true;
    }
    // [Fix] Check extended keys map from InputSystem
    if (ctx.input?.keys?.[key] === true) {
        return true;
    }
    switch (key) {
        case "ArrowLeft":
        case "KeyA":
            return ctx.input?.left === true;
        case "ArrowRight":
        case "KeyD":
            return ctx.input?.right === true;
        case "ArrowUp":
        case "KeyW":
            return ctx.input?.up === true;
        case "ArrowDown":
        case "KeyS":
            return ctx.input?.down === true;
        case "Space":
            return ctx.input?.jump === true;
        default:
            return false;
    }
});

ConditionRegistry.register("SignalFlag", (ctx: ActionContext, params: Record<string, unknown>) => {
    const key = params.key as string;
    if (!key) return false;
    return ctx.entityContext?.signals.flags[key] === true;
});

// Signal Key Comparison - Used with OnSignalReceive event
// Checks if the received signal matches the expected signalKey
ConditionRegistry.register("SignalKeyEquals", (ctx: ActionContext, params: Record<string, unknown>) => {
    const expectedKey = (params.signalKey as string) ?? (params.key as string) ?? "";
    if (!expectedKey) return true; // No key filter = match all signals

    // Get the signal from the event data (passed from EVENT_SIGNAL)
    const receivedSignal = ctx.eventData?.signal as string;
    return receivedSignal === expectedKey;
});

// --- Tag Conditions ---

ConditionRegistry.register("CompareTag", (ctx: ActionContext, params: Record<string, unknown>) => {
    const targetTag = (params.tag as string) ?? "";
    if (!targetTag) return false;

    // Collision Event Check
    const eventData = ctx.eventData as any;

    if (eventData) {
        const myId = ctx.entityId;

        // Case A: Event has direct tagA/tagB (from CollisionSystem)
        if (eventData.entityA && eventData.entityB) {
            if (eventData.entityA === myId) {
                return eventData.tagB === targetTag;
            } else if (eventData.entityB === myId) {
                return eventData.tagA === targetTag;
            }
        }

        // Case B: Event might have otherTag (some systems pre-process it)
        if (eventData.otherTag) {
            return eventData.otherTag === targetTag;
        }

        // Case C: Explicit tag property
        if (eventData.tag === targetTag) {
            return true;
        }
    }

    // 2. Fallback: RaycastHit or other context that might supply 'hitTag'
    if (ctx.globals?.hitTag === targetTag) {
        return true;
    }

    return false;
});

ConditionRegistry.register("InputDown", (ctx: ActionContext, params: Record<string, unknown>) => {
    const key = (params.key as string) ?? "";
    if (!key) return false;

    // Check keysDown state from InputSystem (just pressed this frame)
    if (ctx.input?.keysDown?.[key] === true) {
        // console.log(`[Condition] InputDown TRUE for ${key}. KeysDown:`, JSON.stringify(ctx.input?.keysDown));
        return true;
    }
    // console.log(`[Condition] InputDown FALSE for ${key}. KeysDown:`, JSON.stringify(ctx.input?.keysDown));
    return false;
});


