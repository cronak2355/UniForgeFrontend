import { ConditionRegistry } from "../ConditionRegistry";
import type { ActionContext } from "../ActionRegistry";

type VariableEntry = { name: string; value: unknown };

function getEntityVariables(ctx: ActionContext): VariableEntry[] {
    const entities = ctx.globals?.entities as Map<string, { variables?: VariableEntry[] }> | undefined;
    return entities?.get(ctx.entityId)?.variables ?? [];
}

// Get variable value with support for "varName.x" or "varName.y" for vector2 variables
function getVariableValue(ctx: ActionContext, name: string): unknown {
    // Support "varName.x" or "varName.y" for vector2 variables
    if (name.endsWith(".x") || name.endsWith(".y")) {
        const baseName = name.slice(0, -2);
        const axis = name.slice(-1) as "x" | "y";
        const variable = getEntityVariables(ctx).find((v) => v.name === baseName);
        if (variable?.value && typeof variable.value === "object" && axis in (variable.value as any)) {
            return (variable.value as any)[axis];
        }
        return undefined;
    }

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

// --- Variable Conditions ---

ConditionRegistry.register("VarEquals", (ctx: ActionContext, params: Record<string, unknown>) => {
    const varName = params.name as string;
    const expectedValue = params.value;
    const value = getVariableValue(ctx, varName);
    if (value === undefined) return false;

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
    if (value === undefined) return true; // Variable doesn't exist = not equal

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


