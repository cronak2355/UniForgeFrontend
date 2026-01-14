import { ActionRegistry, type ActionContext } from "../ActionRegistry";
import { EventBus } from "../EventBus";
import Phaser from "phaser";
import { splitLogicItems } from "../../../types/Logic";
import { assetToEntity } from "../../../utils/assetToEntity";
import type { Asset } from "../../../types/Asset";
import type { EditorEntity } from "../../../types/Entity";

type VariableEntry = { id: string; name: string; type: string; value: number | string | boolean };
type RuntimeEntity = {
    id?: string;
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

function cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function isAlive(ctx: ActionContext): boolean {
    const entity = getEntity(ctx);
    const hp = getNumberVar(entity, "hp");
    if (hp === undefined) return true;
    return hp > 0;
}

type RendererCoreWithAssets = {
    getEntity?: (id: string) => EditorEntity | undefined;
    getAssets?: () => Asset[];
};

type SpawnRenderer = {
    core?: RendererCoreWithAssets;
    getGameObject?: (id: string) => Phaser.GameObjects.GameObject | undefined;
    getAllEntityIds?: () => string[];
};

function resolvePrefabEntity(
    params: Record<string, unknown>,
    renderer: SpawnRenderer | undefined,
    x: number,
    y: number
): EditorEntity | undefined {
    const prefabId = ((params.prefabId as string) ?? "").trim();
    const sourceAssetId = ((params.sourceAssetId as string) ?? "").trim();
    const matchId = prefabId || sourceAssetId;
    if (!matchId) return undefined;
    const assets = renderer?.core?.getAssets?.();
    if (!assets) return undefined;
    const match = assets.find((asset) => asset.id === matchId || asset.name === matchId);
    if (!match || match.tag !== "Prefab") return undefined;
    return assetToEntity(match, x, y);
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

ActionRegistry.register("Wait", (_ctx: ActionContext, _params: Record<string, unknown>) => {
    // Placeholder action - runtime sequences in GameCore handle the wait timing.
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

                // 파티클 우선순위 로직:
                // 1. 액션 파라미터 (무기 특성)
                // 2. 타겟 엔티티 변수 (재질 특성)
                // 3. 기본값 없음 (설정 없으면 재생 안 함)

                const actionHitEffect = params.hitEffect as string;
                const targetHitEffectVar = targetEntity?.variables?.find((v) => v.name === "hitEffect");
                const targetHitEffect = targetHitEffectVar?.value as string;

                let effectToPlay: string | null = null;

                if (actionHitEffect) {
                    // 1순위: 액션 설정
                    effectToPlay = actionHitEffect;
                } else if (targetHitEffect) {
                    // 2순위: 타겟 설정
                    effectToPlay = targetHitEffect;
                }

                // "none"이면 재생 안 함, 설정 없어도 재생 안 함
                if (effectToPlay && effectToPlay !== "none" && typeof renderer.playParticle === 'function') {
                    renderer.playParticle(effectToPlay, targetObj.x, targetObj.y, 1);
                }
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

    // Priority 1: targetId (specific entity)
    if (params.targetId) {
        const targetObj = renderer.getGameObject?.(params.targetId as string);
        if (targetObj) {
            targetX = targetObj.x;
            targetY = targetObj.y;
        }
    }

    // Priority 2: targetRole (find nearest entity with that role)
    if (targetX === undefined || targetY === undefined) {
        const targetRole = params.targetRole as string | undefined;
        if (targetRole) {
            const gameCore = ctx.globals?.gameCore;
            if (gameCore?.getNearestEntityByRole) {
                const nearest = gameCore.getNearestEntityByRole(targetRole, ownerObj.x, ownerObj.y, ownerId);
                if (nearest) {
                    targetX = nearest.x;
                    targetY = nearest.y;
                }
            }
        }
    }

    if (targetX === undefined || targetY === undefined) {
        // No target found - silent return (common in bullet hell when no enemies exist)
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

type ValueSource = {
    type: "literal" | "variable" | "property" | "mouse";
    value?: any;
    name?: string;     // for variable
    targetId?: string; // for property (entity id)
    property?: string; // for property name
    axis?: "x" | "y";  // for mouse
};

function resolveValue(ctx: ActionContext, source: ValueSource | number | string): any {
    // 1. Legacy/Simple support (if source is just a primitive)
    if (typeof source !== "object" || source === null) {
        return source;
    }

    // 2. ValueSource object
    const src = source as ValueSource;
    if (src.type === "literal") {
        return src.value;
    }

    if (src.type === "variable") {
        if (!src.name) return 0;
        const entity = getEntity(ctx);
        const variable = entity?.variables?.find(v => v.name === src.name);
        return variable?.value ?? 0;
    }

    if (src.type === "property") {
        const targetId = src.targetId === "self" || !src.targetId ? ctx.entityId : src.targetId;
        const targetEntity = getEntityById(ctx, targetId);

        // Special case: "variables" are not properties on runtime entity in the same way, 
        // but let's assume property means core transforms or derived stats.
        if (!targetEntity || !src.property) return 0;

        // Check core transform
        if (src.property in targetEntity) {
            return (targetEntity as any)[src.property];
        }

        // Check variables as fallback (e.g. accessing another entity's HP)
        const v = targetEntity.variables?.find(v => v.name === src.property);
        return v?.value ?? 0;
    }

    if (src.type === "mouse") {
        const input = ctx.input;
        // RuntimeContext's input might not have mouse position yet in this version.
        // Assuming we might need to extend InputState or use a global mouse provider.
        // For now, let's assume InputState has mouseX/Y if standardized, or fallback to 0.
        // Checking RuntimePhysics.ts InputState: { left, right, up, down, jump } - No mouse.
        // TODO: Pass mouse position in ActionContext or InputState.
        // For now, use eventData as a hack if passed, or default 0 to avoid crash.
        // In the future: ctx.input.mouseX
        return (ctx.eventData as any)?.mouseX ?? 0;
    }

    return 0;
}

ActionRegistry.register("SetVar", (ctx: ActionContext, params: Record<string, unknown>) => {
    const entity = getEntity(ctx);
    if (!entity) return;

    const varName = params.name as string;
    if (!varName) return;

    // Enhanced SetVar: Variable = Op1 [Operation] Op2
    const operation = (params.operation as string) ?? "Set";
    const operand1 = params.operand1 as ValueSource | number | string;
    const operand2 = params.operand2 as ValueSource | number | string;

    // Check if using legacy mode (simple value param)
    if (params.value !== undefined && params.operand1 === undefined) {
        setVar(entity, varName, params.value as number | string);
        return;
    }

    const val1 = resolveValue(ctx, operand1 ?? 0);
    const val2 = resolveValue(ctx, operand2 ?? 0);

    let result: number | string | boolean | object = val1;

    // If string operation, simple concat for add, ignore others
    if (typeof val1 === "string" || typeof val2 === "string") {
        if (operation === "Add") {
            result = String(val1) + String(val2);
        } else {
            // For strings, Set is the only other valid op really
            result = val1;
        }
    }
    // If Vector2 operation
    else if ((typeof val1 === 'object' && val1 !== null && 'x' in val1 && 'y' in val1) &&
        (typeof val2 === 'object' && val2 !== null && 'x' in val2 && 'y' in val2)) {
        const v1 = val1 as { x: number, y: number };
        const v2 = val2 as { x: number, y: number };
        switch (operation) {
            case "Add": result = { x: v1.x + v2.x, y: v1.y + v2.y }; break;
            case "Sub": result = { x: v1.x - v2.x, y: v1.y - v2.y }; break;
            case "Multiply": result = { x: v1.x * v2.x, y: v1.y * v2.y }; break; // Element-wise
            case "Divide": result = { x: v1.x / (v2.x || 1), y: v1.y / (v2.y || 1) }; break;
            default: result = v1; break;
        }
    }
    // Numeric Operation
    else {
        const n1 = Number(val1);
        const n2 = Number(val2);

        switch (operation) {
            case "Add": result = n1 + n2; break;
            case "Sub": result = n1 - n2; break;
            case "Multiply": result = n1 * n2; break;
            case "Divide": result = n1 / (n2 !== 0 ? n2 : 1); break;
            case "Set": default: result = val1; break;
        }
    }

    setVar(entity, varName, result as any);

    // Sync to RuntimeContext map (for Modules/Global access)
    const gameCore = ctx.globals?.gameCore as any;
    if (gameCore?.getRuntimeContext) {
        const id = entity.id ?? ctx.entityId;
        if (id) {
            gameCore.getRuntimeContext().setEntityVariable(id, varName, result as any);
        }
    }
});

// IncrementVar: Add/subtract amount from a variable (for timers, counters, etc.)
ActionRegistry.register("IncrementVar", (ctx: ActionContext, params: Record<string, unknown>) => {
    const entity = getEntity(ctx);
    if (!entity) return;

    const varName = params.name as string;
    if (!varName) return;

    // Get current value
    const currentVar = entity.variables?.find(v => v.name === varName);
    const currentValue = typeof currentVar?.value === "number" ? currentVar.value : 0;

    // Get amount (default to deltaTime for timer usage)
    const dt = (ctx.eventData.dt as number) ?? 0.016;
    const amount = (params.amount as number) ?? dt;

    // Calculate new value
    const newValue = currentValue + amount;
    setVar(entity, varName, newValue);
});

ActionRegistry.register("RunModule", (ctx: ActionContext, params: Record<string, unknown>) => {
    const gameCore = ctx.globals?.gameCore as { startModule?: (entityId: string, moduleId: string) => boolean } | undefined;
    if (!gameCore?.startModule) return;
    const moduleId = (params.moduleId as string) ?? (params.moduleName as string) ?? (params.name as string);
    if (!moduleId) return;
    gameCore.startModule(ctx.entityId, moduleId);
});

ActionRegistry.register("SpawnEntity", (ctx: ActionContext, params: Record<string, unknown>) => {
    const gameCore = ctx.globals?.gameCore as { createEntity?: (...args: unknown[]) => boolean } | undefined;
    if (!gameCore?.createEntity) return;

    const entities = ctx.globals?.entities as Map<string, any> | undefined;
    const owner = entities?.get(ctx.entityId);
    const renderer = ctx.globals?.renderer as SpawnRenderer | undefined;

    const templateIdRaw = ((params.templateId as string) ?? "").trim();
    const templateId = templateIdRaw || "__self__";
    const editorTemplateId = templateId === "__self__" ? ctx.entityId : templateId;
    const template =
        templateId === "__self__"
            ? owner
            : (templateId ? entities?.get(templateId) : undefined);
    const editorTemplate = renderer?.core?.getEntity?.(editorTemplateId);

    const positionMode = (params.positionMode as string) ?? "relative";
    const offsetX = Number(params.offsetX ?? 0);
    const offsetY = Number(params.offsetY ?? 0);
    const absoluteX = Number(params.x ?? owner?.x ?? 0);
    const absoluteY = Number(params.y ?? owner?.y ?? 0);

    const spawnX = positionMode === "absolute" ? absoluteX : (Number(owner?.x ?? 0) + offsetX);
    const spawnY = positionMode === "absolute" ? absoluteY : (Number(owner?.y ?? 0) + offsetY);

    const sourceType = (params.sourceType as string) ?? "texture";
    const prefabEntity =
        sourceType === "prefab"
            ? resolvePrefabEntity(params, renderer, spawnX, spawnY)
            : undefined;
    const source = prefabEntity ?? template ?? editorTemplate;
    const sourceComponents =
        prefabEntity?.components ??
        template?.components ??
        editorTemplate?.components ??
        splitLogicItems(prefabEntity?.logic ?? editorTemplate?.logic);

    const id = crypto.randomUUID();
    const textureAssetId = sourceType === "texture" ? ((params.sourceAssetId as string) ?? "").trim() : "";
    const textureAsset = textureAssetId
        ? renderer?.core?.getAssets?.()?.find((asset) => asset.id === textureAssetId || asset.name === textureAssetId)
        : undefined;
    const texture =
        (textureAsset && textureAsset.tag !== "Prefab" ? textureAsset.name : ((params.texture as string) ?? "").trim()) ||
        (typeof prefabEntity?.texture === "string" ? prefabEntity.texture : "") ||
        (typeof source?.texture === "string" ? source.texture : "") ||
        (typeof editorTemplate?.texture === "string" ? editorTemplate.texture : "") ||
        (typeof editorTemplate?.name === "string" ? editorTemplate.name : "") ||
        (typeof source?.name === "string" ? source.name : "");

    const options = {
        name: (params.name as string) ?? (source?.name ? `${source.name}_spawn` : undefined),
        z: typeof source?.z === "number" ? source.z : (params.z as number | undefined),
        rotationX: source?.rotationX ?? 0,
        rotationY: source?.rotationY ?? 0,
        rotationZ: source?.rotationZ ?? source?.rotation ?? 0,
        scaleX: source?.scaleX ?? 1,
        scaleY: source?.scaleY ?? 1,
        scaleZ: source?.scaleZ ?? 1,
        variables: source?.variables ? cloneJson(source.variables) : [],
        components: sourceComponents ? cloneJson(sourceComponents) : [],
        role: ((params.role as string) ?? source?.role ?? "neutral"),
        modules: source?.modules ? cloneJson(source.modules) : [],
        width: source?.width ?? (params.width as number | undefined),
        height: source?.height ?? (params.height as number | undefined),
        texture: texture || undefined,
    };

    const type = (source?.type as string) ?? (params.type as string) ?? "sprite";
    gameCore.createEntity(id, type, spawnX, spawnY, options);
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
    const sceneId = (params.sceneId as string | undefined)?.trim() ?? "";
    const sceneName = (params.sceneName as string | undefined)?.trim() ?? "";
    const data = params.data as object | undefined;
    if (!sceneId && !sceneName) return;

    EventBus.emit("SCENE_CHANGE_REQUEST", {
        sceneId,
        sceneName,
        data,
        from: scene?.scene?.key,
    });

    if (!scene || !sceneName) return;
    const manager = scene.scene?.manager as { keys?: Record<string, Phaser.Scene> } | undefined;
    if (!manager?.keys || !manager.keys[sceneName]) return;
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

// --- Particle Actions ---

// 파티클 쿨다운 관리 (OnUpdate에서 사용해도 일정 간격만 재생)
const particleCooldowns = new Map<string, number>();
const PARTICLE_COOLDOWN_MS = 200; // 0.2초 간격

ActionRegistry.register("PlayParticle", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    const preset = (params.preset as string) ?? "hit_spark";

    // 쿨타임 체크 (엔티티 + 프리셋별로 개별 쿨다운)
    const cooldownKey = `${ctx.entityId}_${preset}`;
    const now = Date.now();
    const lastPlay = particleCooldowns.get(cooldownKey) ?? 0;

    // 강제 실행 옵션이 없으면 쿨다운 적용
    const force = params.force === true;
    if (!force && now - lastPlay < PARTICLE_COOLDOWN_MS) {
        return; // 쿨다운 중
    }
    particleCooldowns.set(cooldownKey, now);

    // 위치: params > gameObject > entity 데이터 순으로 시도
    const gameObject = renderer.getGameObject?.(ctx.entityId);
    const entity = getEntity(ctx);

    const x = (params.x as number) ?? gameObject?.x ?? entity?.x ?? 0;
    const y = (params.y as number) ?? gameObject?.y ?? entity?.y ?? 0;
    const scale = (params.scale as number) ?? 1;

    // 커스텀 파티클 체크 (custom: 접두어)
    if (preset.startsWith("custom:")) {
        const customId = preset.slice(7); // "custom:" 제거
        renderer.playCustomParticle?.(customId, x, y, scale);
    } else {
        if (typeof renderer.playParticle === 'function') {
            renderer.playParticle(preset, x, y, scale);
        }
    }
});

ActionRegistry.register("StartParticleEmitter", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer?.createParticleEmitter) return;

    const emitterId = (params.emitterId as string) ?? `emitter_${ctx.entityId}`;
    const preset = (params.preset as string) ?? "fire";

    // 위치: params > gameObject > entity 데이터 순으로 시도
    const gameObject = renderer.getGameObject?.(ctx.entityId);
    const entity = getEntity(ctx);

    const x = (params.x as number) ?? gameObject?.x ?? entity?.x ?? 0;
    const y = (params.y as number) ?? gameObject?.y ?? entity?.y ?? 0;

    renderer.createParticleEmitter(emitterId, preset, x, y);
});

ActionRegistry.register("StopParticleEmitter", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer?.stopParticleEmitter) return;

    const emitterId = (params.emitterId as string) ?? `emitter_${ctx.entityId}`;
    renderer.stopParticleEmitter(emitterId);
});

console.log(
    "[DefaultActions] 18 actions registered: Move, Jump, MoveToward, ChaseTarget, Attack, FireProjectile, TakeDamage, Heal, SetVar, RunModule, Enable, Disable, ChangeScene, ClearSignal, Rotate, Pulse, PlayParticle, StartParticleEmitter, StopParticleEmitter"
);
