import { ActionRegistry, type ActionContext } from "../ActionRegistry";
import { EventBus } from "../EventBus";
import Phaser from "phaser";

type VariableEntry = { id: string; name: string; type: string; value: number | string | boolean };
type RuntimeEntity = {
    variables?: VariableEntry[];
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    rotationZ?: number;
};

function getEntity(ctx: ActionContext): RuntimeEntity | undefined {
    const entities = ctx.globals?.entities as Map<string, RuntimeEntity> | undefined;
    if (!entities) return undefined;
    return entities.get(ctx.entityId);
}

function getEntityById(ctx: ActionContext, id: string): RuntimeEntity | undefined {
    const entities = ctx.globals?.entities as Map<string, RuntimeEntity> | undefined;
    if (!entities) return undefined;
    return entities.get(id);
}

function getNumberVar(entity: RuntimeEntity | undefined, name: string): number | undefined {
    const variable = entity?.variables?.find((v) => v.name === name);
    return typeof variable?.value === "number" ? variable.value : undefined;
}

function coerceBool(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return Boolean(value);
}

function setVar(entity: RuntimeEntity | undefined, name: string, value: number | string | boolean): void {
    if (!entity) return;
    if (!entity.variables) entity.variables = [];
    const existing = entity.variables.find((v) => v.name === name);
    if (existing) {
        if (existing.type === "int" || existing.type === "float") {
            const num = typeof value === "number" ? value : Number(value);
            existing.value = Number.isNaN(num) ? 0 : num;
        } else if (existing.type === "bool") {
            existing.value = coerceBool(value);
        } else {
            existing.value = String(value);
        }
        return;
    }
    if (typeof value === "boolean" || (typeof value === "string" && (value === "true" || value === "false"))) {
        entity.variables.push({
            id: crypto.randomUUID(),
            name,
            type: "bool",
            value: coerceBool(value),
        });
        return;
    }
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isNaN(numeric)) {
        entity.variables.push({
            id: crypto.randomUUID(),
            name,
            type: "float",
            value: numeric,
        });
    } else {
        entity.variables.push({
            id: crypto.randomUUID(),
            name,
            type: "string",
            value: String(value),
        });
    }
}

function isAlive(ctx: ActionContext): boolean {
    const entity = getEntity(ctx);
    const hp = getNumberVar(entity, "hp");
    if (hp === undefined) return true;
    return hp > 0;
}

function applyDamage(
    ctx: ActionContext,
    targetId: string,
    damage: number,
    renderer: ActionContext["globals"] extends { renderer: infer R } ? R : any
): boolean {
    const target = getEntityById(ctx, targetId);
    if (!target) return false;

    let hp = getNumberVar(target, "hp");
    let maxHp = getNumberVar(target, "maxHp");
    if (hp === undefined && maxHp === undefined) {
        // [Fix] Auto-initialize HP if missing so Attack works by default
        console.log(`[Action] Initializing default HP (100) for entity ${targetId}`);
        hp = 100;
        maxHp = 100;
        setVar(target, "maxHp", 100);
        setVar(target, "hp", 100);
    }
    const nextHp = Math.max(0, (hp ?? maxHp ?? 100) - damage);
    setVar(target, "hp", nextHp);




    EventBus.emit("HP_CHANGED", {
        entityId: targetId,
        hp: nextHp,
        maxHp: maxHp ?? nextHp,
        damage,
    });

    return true;
}

// --- Movement Actions ---

ActionRegistry.register("Move", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return;
    if (!isAlive(ctx)) return;

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const entity = getEntity(ctx);
    const speed =
        getNumberVar(entity, "speed") ??
        getNumberVar(entity, "maxSpeed") ??
        (params.speed as number) ??
        200;
    const dt = (ctx.eventData.dt as number) ?? 0.016;
    const x = (params.x as number) ?? 0;
    const y = (params.y as number) ?? 0;

    gameObject.x += x * speed * dt;
    gameObject.y += y * speed * dt;

    if (entity) {
        entity.x = gameObject.x;
        entity.y = gameObject.y;
    }
});

ActionRegistry.register("Jump", (_ctx: ActionContext, _params: Record<string, unknown>) => {
    console.log("[Action] Jump: handled by runtime physics");
});

ActionRegistry.register("MoveToward", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;
    if (!isAlive(ctx)) return;

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const targetX = params.x as number;
    const targetY = params.y as number;
    const entity = getEntity(ctx);
    const speed =
        getNumberVar(entity, "speed") ??
        getNumberVar(entity, "maxSpeed") ??
        (params.speed as number) ??
        100;
    const dt = (ctx.eventData.dt as number) ?? 0.016;

    const dx = targetX - gameObject.x;
    const dy = targetY - gameObject.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
        const nx = dx / distance;
        const ny = dy / distance;
        gameObject.x += nx * speed * dt;
        gameObject.y += ny * speed * dt;
        if (entity) {
            entity.x = gameObject.x;
            entity.y = gameObject.y;
        }
    }
});

ActionRegistry.register("ChaseTarget", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return;
    if (!isAlive(ctx)) return;

    const entityId = ctx.entityId;

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
        const gameObject = renderer.getGameObject?.(entityId);
        if (gameCore && gameObject) {
            const nearest = gameCore.getNearestEntityByRole?.(targetRole, gameObject.x, gameObject.y, entityId);
            if (nearest) {
                targetId = nearest.id;
            }
        }
    }

    if (!targetId) return;

    const gameObject = renderer.getGameObject?.(entityId);
    const targetObject = renderer.getGameObject?.(targetId);
    if (!gameObject || !targetObject) return;

    const entity = getEntity(ctx);
    const speed =
        getNumberVar(entity, "speed") ??
        getNumberVar(entity, "maxSpeed") ??
        (params.speed as number) ??
        100;
    const dt = (ctx.eventData.dt as number) ?? 0.016;

    const dx = targetObject.x - gameObject.x;
    const dy = targetObject.y - gameObject.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
        const nx = dx / distance;
        const ny = dy / distance;
        gameObject.x += nx * speed * dt;
        gameObject.y += ny * speed * dt;

        if (entity) {
            entity.x = gameObject.x;
            entity.y = gameObject.y;
        }
    }
});

// --- Combat Actions ---

const attackCooldowns = new Map<string, number>();

ActionRegistry.register("Attack", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return;
    if (!isAlive(ctx)) return;

    const attackerId = ctx.entityId;
    const now = Date.now();
    const cooldown = (params.cooldown as number) ?? 500;
    const lastAttack = attackCooldowns.get(attackerId) ?? 0;
    if (now - lastAttack < cooldown) return;

    const attackerObj = renderer.getGameObject?.(attackerId);
    if (!attackerObj) return;

    const attackerEntity = getEntity(ctx);
    const range =
        getNumberVar(attackerEntity, "attackRange") ??
        (params.range as number) ??
        100;
    const damage =
        getNumberVar(attackerEntity, "attack") ??
        getNumberVar(attackerEntity, "damage") ??
        (params.damage as number) ??
        10;

    let targetIds: string[] = [];
    let targetId = ((params.targetId as string) ?? "").trim() || undefined;
    const targetRole = params.targetRole as string | undefined;

    if (targetId) {
        const targetObj = renderer.getGameObject?.(targetId);
        if (!targetObj) {
            targetId = undefined;
        }
    }

    if (targetId) {
        targetIds = [targetId];
    } else if (targetRole) {
        const gameCore = ctx.globals?.gameCore;
        if (gameCore?.getEntitiesByRole) {
            const roleEntities = gameCore.getEntitiesByRole(targetRole);
            targetIds = roleEntities.map((e) => e.id);
        }
    } else {
        targetIds = renderer.getAllEntityIds?.() || [];
    }

    let hitSomething = false;

    for (const id of targetIds) {
        if (id === attackerId) continue;
        const targetObj = renderer.getGameObject?.(id);
        if (!targetObj) continue;

        const distance = Phaser.Math.Distance.Between(
            attackerObj.x,
            attackerObj.y,
            targetObj.x,
            targetObj.y
        );

        if (distance <= range) {
            const targetEntity = getEntityById(ctx, id);
            const hp = getNumberVar(targetEntity, "hp");
            if (hp !== undefined && hp <= 0) continue;

            if (applyDamage(ctx, id, damage, renderer)) {
                hitSomething = true;
            }
        }
    }

    if (hitSomething) {
        attackCooldowns.set(attackerId, now);
    }
});

ActionRegistry.register("FireProjectile", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    const ownerId = ctx.entityId;
    const ownerObj = renderer.getGameObject?.(ownerId);
    if (!ownerObj) return;

    let targetX = params.targetX as number | undefined;
    let targetY = params.targetY as number | undefined;

    if (params.targetId) {
        const targetObj = renderer.getGameObject?.(params.targetId as string);
        if (targetObj) {
            targetX = targetObj.x;
            targetY = targetObj.y;
        }
    }

    if (targetX === undefined || targetY === undefined) {
        console.warn("[Action] FireProjectile: No target specified");
        return;
    }

    const ownerEntity = getEntity(ctx);
    const speed =
        getNumberVar(ownerEntity, "projectileSpeed") ??
        (params.speed as number) ??
        300;
    const damage =
        getNumberVar(ownerEntity, "attack") ??
        getNumberVar(ownerEntity, "damage") ??
        (params.damage as number) ??
        10;

    const dx = targetX - ownerObj.x;
    const dy = targetY - ownerObj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / distance;
    const ny = dy / distance;

    EventBus.emit("SPAWN_PROJECTILE", {
        ownerId,
        x: ownerObj.x,
        y: ownerObj.y,
        velX: nx * speed,
        velY: ny * speed,
        damage,
    });
});

// --- Status Actions ---

ActionRegistry.register("TakeDamage", (ctx: ActionContext, params: Record<string, unknown>) => {
    const entity = getEntity(ctx);
    if (!entity) return;

    const amount = (params.amount as number) ?? 1;
    const hp = getNumberVar(entity, "hp") ?? 0;
    const maxHp = getNumberVar(entity, "maxHp") ?? hp;
    const nextHp = Math.max(0, hp - amount);
    setVar(entity, "hp", nextHp);

    EventBus.emit("HP_CHANGED", {
        entityId: ctx.entityId,
        hp: nextHp,
        maxHp,
        damage: amount,
    });

    if (nextHp <= 0) {
        EventBus.emit("ENTITY_DIED", { entityId: ctx.entityId });
    }
});

ActionRegistry.register("Heal", (ctx: ActionContext, params: Record<string, unknown>) => {
    const entity = getEntity(ctx);
    if (!entity) return;

    const amount = (params.amount as number) ?? 10;
    const hp = getNumberVar(entity, "hp") ?? 0;
    const maxHp = getNumberVar(entity, "maxHp") ?? hp;
    const nextHp = Math.min(maxHp, hp + amount);
    setVar(entity, "hp", nextHp);

    EventBus.emit("HP_CHANGED", {
        entityId: ctx.entityId,
        hp: nextHp,
        maxHp,
        healed: amount,
    });
});

// --- Variable Actions ---

ActionRegistry.register("SetVar", (ctx: ActionContext, params: Record<string, unknown>) => {
    const entity = getEntity(ctx);
    if (!entity) return;

    const varName = params.name as string;
    const value = params.value as number | string;
    if (!varName) return;

    setVar(entity, varName, value);
});

// --- Entity Control Actions ---

ActionRegistry.register("Enable", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    const targetId = (params.targetId as string) ?? ctx.entityId;
    const enabled = (params.enabled as boolean) ?? true;
    const gameObject = renderer.getGameObject?.(targetId);

    if (gameObject) {
        gameObject.setVisible(enabled);
        gameObject.setActive(enabled);
        EventBus.emit(enabled ? "ENTITY_ENABLED" : "ENTITY_DISABLED", { entityId: targetId });
    }
});

// --- Scene Actions ---

ActionRegistry.register("ChangeScene", (ctx: ActionContext, params: Record<string, unknown>) => {
    const scene = ctx.globals?.scene as Phaser.Scene | undefined;
    if (!scene) return;

    const sceneName = params.sceneName as string;
    const data = params.data as object | undefined;
    if (!sceneName) return;

    EventBus.emit("SCENE_CHANGING", { from: scene.scene.key, to: sceneName });
    scene.scene.start(sceneName, data);
});

ActionRegistry.register("Rotate", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return;

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const speed = (params.speed as number) ?? 90;
    const dt = 0.016;

    if (gameObject.rotation !== undefined) {
        gameObject.rotation += Phaser.Math.DegToRad(speed * dt);
    }

    const entity = getEntity(ctx) as { rotation?: number; rotationZ?: number } | undefined;
    if (entity && gameObject.rotation !== undefined) {
        const nextRotation = Phaser.Math.DegToRad(speed * dt);
        if (typeof entity.rotation === "number") {
            entity.rotation += nextRotation;
            gameObject.rotation = entity.rotation;
        } else if (typeof entity.rotationZ === "number") {
            entity.rotationZ += nextRotation;
            gameObject.rotation = entity.rotationZ;
        }
    }
});

ActionRegistry.register("Pulse", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return;

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const speed = (params.speed as number) ?? 2;
    const min = (params.minScale as number) ?? 0.8;
    const max = (params.maxScale as number) ?? 1.2;

    const time = performance.now() * 0.001;
    const t = Math.sin(time * speed) * 0.5 + 0.5;
    const scale = min + (max - min) * t;

    gameObject.setScale?.(scale);

    const entity = getEntity(ctx);
    if (entity) {
        entity.scaleX = scale;
        entity.scaleY = scale;
    }
});

ActionRegistry.register("ClearSignal", (ctx: ActionContext, params: Record<string, unknown>) => {
    const key = params.key as string;
    if (!key) return;
    if (!ctx.entityContext?.signals) return;
    ctx.entityContext.signals.flags[key] = false;
    ctx.entityContext.signals.values[key] = null;
});

// Disable Action: Remove entity from game
ActionRegistry.register("Disable", (ctx: ActionContext) => {
    const gameCore = ctx.globals?.gameCore as { removeEntity?: (id: string) => void } | undefined;
    if (gameCore?.removeEntity) {
        gameCore.removeEntity(ctx.entityId);
    } else {
        // Fallback: Hide via renderer
        const renderer = ctx.globals?.renderer;
        const obj = renderer?.getGameObject?.(ctx.entityId);
        if (obj?.setVisible) {
            obj.setVisible(false);
        }
        if (obj?.setActive) {
            obj.setActive(false);
        }
    }
});

console.log(
    "[DefaultActions] 14 actions registered: Move, Jump, MoveToward, ChaseTarget, Attack, FireProjectile, TakeDamage, Heal, SetVar, Enable, Disable, ChangeScene, ClearSignal"
);
