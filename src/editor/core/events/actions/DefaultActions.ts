import { ActionRegistry, type ActionContext } from "../ActionRegistry";
import { EventBus } from "../EventBus";
import Phaser from "phaser";
import { splitLogicItems } from "../../../types/Logic";
import { assetToEntity } from "../../../utils/assetToEntity";
import type { Asset } from "../../../types/Asset";
import type { EditorEntity } from "../../../types/Entity";
import { collisionSystem } from "../../CollisionSystem";

type VariableEntry = { id: string; name: string; type: string; value: number | string | boolean | { x: number; y: number } };
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

function setVar(entity: RuntimeEntity | undefined, name: string, value: number | string | boolean | { x: number; y: number }): void {
    if (!entity) return;
    if (!entity.variables) entity.variables = [];
    const existing = entity.variables.find((v) => v.name === name);
    if (existing) {
        if (existing.type === "int" || existing.type === "float") {
            if (typeof value === 'object' && value !== null && 'x' in value && 'y' in value) {
                // [Auto-Upgrade] Assigning Vector2 to Number -> Upgrade variable to vector2
                existing.type = "vector2";
                existing.value = { x: Number((value as any).x), y: Number((value as any).y) };
                return;
            }
            const num = typeof value === "number" ? value : Number(value);
            existing.value = Number.isNaN(num) ? 0 : num;
        } else if (existing.type === "bool") {
            existing.value = coerceBool(value);
        } else if (existing.type === "vector2") {
            // Handle vector2 type
            if (typeof value === 'object' && value !== null && 'x' in value && 'y' in value) {
                existing.value = { x: Number(value.x), y: Number(value.y) };
            } else {
                // Fallback: treat as uniform scalar
                const num = typeof value === 'number' ? value : Number(value);
                existing.value = { x: num, y: num };
            }
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
        // Auto-initialize HP if missing so Attack works by default
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

// --- Movement Actions ---

ActionRegistry.register("Move", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) { console.warn("[Move] No renderer"); return; }
    if (!isAlive(ctx)) { console.warn("[Move] Not alive"); return; }

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const entity = getEntity(ctx);
    const speed = resolveValue(ctx, (params.speed ?? getNumberVar(entity, "speed") ?? 200) as any);
    const dt = (ctx.eventData.dt as number) ?? 0.016;

    let dirX = 0;
    let dirY = 0;

    if (params.direction) {
        const rawDir = params.direction as ValueSource;
        let direction = resolveValue(ctx, rawDir);

        // [FIX] Support "Follow" behavior when using "Prop" -> "position"
        // If the user selects a Target Position (via Prop), we calculate the direction towards it.
        if (
            rawDir &&
            typeof rawDir === 'object' &&
            rawDir.type === 'property' &&
            rawDir.property === 'position' &&
            direction &&
            typeof direction === 'object'
        ) {
            const targetX = Number((direction as any).x ?? 0);
            const targetY = Number((direction as any).y ?? 0);
            direction = {
                x: targetX - gameObject.x,
                y: targetY - gameObject.y
            };
        }

        // console.log("[Move Debug] Resolved Direction:", direction, "Type:", typeof direction);
        if (typeof direction === 'object' && direction !== null) {
            dirX = Number((direction as any).x ?? 0);
            dirY = Number((direction as any).y ?? 0);
        }
    } else {
        // Fallback: Legacy separate x/y parameters
        const x = resolveValue(ctx, (params.x ?? 0) as any);
        const y = resolveValue(ctx, (params.y ?? 0) as any);
        dirX = Number(x);
        dirY = Number(y);
    }

    // Normalize direction vector so speed is consistent
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len > 0) {
        dirX /= len;
        dirY /= len;
    }

    // console.log(`[Move Debug] dirX: ${dirX}, dirY: ${dirY}, speed: ${speed}, dt: ${dt}, Entity: ${entityId}`);

    gameObject.x += dirX * Number(speed) * dt;
    gameObject.y += dirY * Number(speed) * dt;

    if (entity) {
        entity.x = gameObject.x;
        entity.y = gameObject.y;
    }

    // [FIX] Sync collider position for collision detection
    collisionSystem.updatePosition(entityId, gameObject.x, gameObject.y);
});

ActionRegistry.register("Jump", (_ctx: ActionContext, _params: Record<string, unknown>) => {
    // Jump: handled by runtime physics
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

    // Support Vector2 'position' parameter or legacy separate x/y
    let targetX: number;
    let targetY: number;

    if (params.position !== undefined) {
        const position = resolveValue(ctx, params.position as any);
        if (typeof position === 'object' && position !== null && 'x' in position && 'y' in position) {
            targetX = Number((position as any).x ?? 0);
            targetY = Number((position as any).y ?? 0);
        } else {
            targetX = Number(position ?? 0);
            targetY = Number(position ?? 0);
        }
    } else {
        targetX = Number(resolveValue(ctx, (params.x ?? 0) as any));
        targetY = Number(resolveValue(ctx, (params.y ?? 0) as any));
    }

    const entity = getEntity(ctx);
    const speed = resolveValue(ctx, (params.speed ?? getNumberVar(entity, "speed") ?? 100) as any);
    const dt = (ctx.eventData.dt as number) ?? 0.016;

    const dx = targetX - gameObject.x;
    const dy = targetY - gameObject.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
        const nx = dx / distance;
        const ny = dy / distance;
        gameObject.x += nx * Number(speed) * dt;
        gameObject.y += ny * Number(speed) * dt;
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
    const range = resolveValue(ctx, (params.range ?? getNumberVar(attackerEntity, "attackRange") ?? 100) as any);
    const damage = resolveValue(ctx, (params.damage ?? getNumberVar(attackerEntity, "attack") ?? 10) as any);

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

        if (distance <= Number(range)) {
            const targetEntity = getEntityById(ctx, id);
            const hp = getNumberVar(targetEntity, "hp");
            if (hp !== undefined && hp <= 0) continue;

            if (applyDamage(ctx, id, Number(damage), renderer)) {
                hitSomething = true;

                const actionHitEffect = params.hitEffect as string;
                const targetHitEffectVar = targetEntity?.variables?.find((v) => v.name === "hitEffect");
                const targetHitEffect = targetHitEffectVar?.value as string;

                let effectToPlay: string | null = null;

                if (actionHitEffect) {
                    effectToPlay = actionHitEffect;
                } else if (targetHitEffect) {
                    effectToPlay = targetHitEffect;
                }

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



// --- Status Actions ---

ActionRegistry.register("TakeDamage", (ctx: ActionContext, params: Record<string, unknown>) => {
    const entity = getEntity(ctx);
    if (!entity) return;

    const amount = Number(resolveValue(ctx, (params.amount ?? 1) as any));
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



// ... (omitted actions)

ActionRegistry.register("Rotate", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return;

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const speed = Number(resolveValue(ctx, (params.speed ?? 90) as any));
    const dt = 0.016;

    if (gameObject.rotation !== undefined) {
        gameObject.rotation += speed * (Math.PI / 180) * dt;
        const entity = getEntity(ctx);
        if (entity) entity.rotation = gameObject.rotation;
    }
});



// --- Variable Actions ---

type ValueSource = {
    type: "literal" | "variable" | "property" | "mouse";
    value?: any;
    name?: string;     // for variable
    targetId?: string; // for property (entity id)
    property?: string; // for property name
    axis?: "x" | "y";  // for mouse
    mode?: "absolute" | "relative" | "screen"; // for mouse
};

function resolveValue(ctx: ActionContext, source: ValueSource | number | string): any {
    // 1. Legacy/Simple support (if source is just a primitive)
    if (typeof source !== "object" || source === null) {
        return source;
    }

    // 1.5. Check for plain objects without 'type' (e.g. Vector2 literals passed directly)
    if (!('type' in source)) {
        return source;
    }

    // 2. ValueSource object
    const src = source as ValueSource;
    if (src.type === "literal") {
        return src.value;
    }

    if (src.type === "variable") {
        if (!src.name) return 0;

        // 1. Check Module/Local Scope
        if (ctx.scope?.has(src.name)) {
            const val = ctx.scope.get(src.name);
            // console.log(`[ResolveValue] Found in scope: ${src.name} =`, val);
            return val;
        }

        const entity = getEntity(ctx);
        const variable = entity?.variables?.find(v => v.name === src.name);

        // Fallback to entity variable (no logging for performance)
        return variable?.value ?? 0;
    }

    if (src.type === "property") {
        const targetId = src.targetId === "self" || !src.targetId ? ctx.entityId : src.targetId;
        const targetEntity = getEntityById(ctx, targetId);

        // Special case: "variables" are not properties on runtime entity in the same way, 
        // but let's assume property means core transforms or derived stats.
        if (!targetEntity || !src.property) return 0;

        // Special case: 'position' returns Vector2 { x, y }
        if (src.property === "position") {
            return { x: targetEntity.x ?? 0, y: targetEntity.y ?? 0 };
        }

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
        let x = input?.mouseX ?? 0;
        let y = input?.mouseY ?? 0;

        if (src.mode === "screen") {
            x = input?.mouseScreenX ?? 0;
            y = input?.mouseScreenY ?? 0;
        } else if (src.mode === "relative") {
            // Relative to Entity (World Mouse - Entity Pos)
            const entities = ctx.globals?.entities as Map<string, any>;
            const entity = entities?.get(ctx.entityId);
            if (entity) {
                x -= (entity.x ?? 0);
                y -= (entity.y ?? 0);
            }
        }

        // console.log(`[ResolveValue] Mouse (${src.mode ?? 'absolute'}): x=${x}, y=${y}, raw input:`, { mouseX: input?.mouseX, mouseY: input?.mouseY });

        if (src.axis === "x") return x;
        if (src.axis === "y") return y;

        return { x, y };
    }
    return 0;
}


// Static Cooldown Map to prevent duplicate execution of SetVar
const setVarGlobalCooldowns = new Map<string, number>();

ActionRegistry.register("SetVar", (ctx: ActionContext, params: Record<string, unknown>) => {
    const entity = getEntity(ctx);
    if (!entity) return;

    const varName = params.name as string;
    if (!varName) return;

    const operation = (params.operation as string) ?? "Set";
    const operand1 = params.operand1;
    const operand2 = params.operand2;

    // [GUARD] Duplicate Execution Prevention
    // Key based on Entity, Variable, Operation, and Operands.
    // If exact same operation happens on same entity/var within 1 frame (~1ms), we block it.
    // We use a safe margin (e.g., 2ms) to catch double-loops but allow 60fps updates (16ms).
    const opKey = `${ctx.entityId}:${varName}:${operation}:${JSON.stringify(operand1)}:${JSON.stringify(operand2)}`;
    const now = performance.now();
    const lastTime = setVarGlobalCooldowns.get(opKey) ?? 0;

    // 2ms throttle: Blocks almost-instant duplicates (same microtask/frame)
    // but allows next-frame updates (16ms+).
    if (now - lastTime < 2) {
        return;
    }
    setVarGlobalCooldowns.set(opKey, now);

    // Enhanced SetVar: Variable = Op1 [Operation] Op2
    // Check if using legacy mode (simple value param)
    if (params.value !== undefined && params.operand1 === undefined) {
        setVar(entity, varName, params.value as number | string);
        return;
    }

    const val1 = resolveValue(ctx, (operand1 ?? 0) as any);
    const val2 = resolveValue(ctx, (operand2 ?? 0) as any);

    // console.log(`[SetVar] ${varName} = ${JSON.stringify(val1)} (Op: ${operation}), Source: ${JSON.stringify(operand1)}`);


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
    // If Vector2 operation (either operand is Vector2)
    else if ((typeof val1 === 'object' && val1 !== null && 'x' in val1 && 'y' in val1) ||
        (typeof val2 === 'object' && val2 !== null && 'x' in val2 && 'y' in val2)) {

        const isVec2 = (v: any): v is { x: number, y: number } => typeof v === 'object' && v !== null && 'x' in v && 'y' in v;

        // Treat scalars as uniform vectors for arithmetic
        const v1 = isVec2(val1) ? val1 : { x: Number(val1), y: Number(val1) };
        const v2 = isVec2(val2) ? val2 : { x: Number(val2), y: Number(val2) };

        switch (operation) {
            case "Add": result = { x: v1.x + v2.x, y: v1.y + v2.y }; break;
            case "Sub": result = { x: v1.x - v2.x, y: v1.y - v2.y }; break;
            case "Multiply": result = { x: v1.x * v2.x, y: v1.y * v2.y }; break;
            case "Divide": result = { x: v1.x / (v2.x || 1), y: v1.y / (v2.y || 1) }; break;
            case "Set": default: result = val1; break;
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



ActionRegistry.register("RunModule", (ctx: ActionContext, params: Record<string, unknown>) => {
    const gameCore = ctx.globals?.gameCore as { startModule?: (entityId: string, moduleId: string, initialVariables?: Record<string, any>) => boolean } | undefined;
    if (!gameCore?.startModule) return;
    const moduleId = (params.moduleId as string) ?? (params.moduleName as string) ?? (params.name as string);
    if (!moduleId) return;

    // Extract variable overrides from initialVariables property
    const overrides = (params.initialVariables as Record<string, any>) ?? {};

    gameCore.startModule(ctx.entityId, moduleId, overrides);
});

ActionRegistry.register("SpawnEntity", (ctx: ActionContext, params: Record<string, unknown>) => {
    const gameCore = ctx.globals?.gameCore as { createEntity?: (...args: unknown[]) => boolean } | undefined;
    if (!gameCore?.createEntity) {
        console.error("[SpawnEntity] gameCore.createEntity not found!", ctx.globals);
        return;
    }

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
    // Safe Coordinate Calculation
    const safefloat = (val: unknown, def: number) => {
        const num = Number(val);
        return Number.isNaN(num) ? def : num;
    };

    const offsetX = safefloat(params.offsetX, 0);
    const offsetY = safefloat(params.offsetY, 0);
    const absoluteX = safefloat(params.x, safefloat(owner?.x, 0));
    const absoluteY = safefloat(params.y, safefloat(owner?.y, 0));

    const ownerX = safefloat(owner?.x, 0);
    const ownerY = safefloat(owner?.y, 0);

    const spawnX = positionMode === "absolute" ? absoluteX : (ownerX + offsetX);
    const spawnY = positionMode === "absolute" ? absoluteY : (ownerY + offsetY);

    const sourceType = (params.sourceType as string) ?? "texture";

    const prefabEntity =
        sourceType === "prefab"
            ? resolvePrefabEntity(params, renderer, spawnX, spawnY)
            : undefined;

    if (sourceType === "prefab") {
        if (!prefabEntity) {
            console.warn("[SpawnEntity] Failed to resolve prefab entity. Params:", params);
        }
    }

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
        variables: (() => {
            const baseVars = source?.variables ? cloneJson<{ name: string; value: any; type: string }[]>(source.variables) : [];
            const initialVars = params.initialVariables as Record<string, any> | undefined;

            if (initialVars) {
                // Apply overrides
                for (const [key, value] of Object.entries(initialVars)) {
                    const existing = baseVars.find(v => v.name === key);
                    if (existing) {
                        existing.value = value;
                    } else {
                        // Optional: Add disjoint variables? For now only override existing.
                        // But if we want to support injecting new vars, we can.
                        // For safety with Prefab structure, let's only override for now 
                        // unless we want to allow dynamic var creation.
                        // Let's allow dynamic creation as it's flexible.
                        // Infer type from value
                        const type = typeof value === "number" ? "float" : typeof value === "boolean" ? "bool" : typeof value === 'object' ? "vector2" : "string";
                        baseVars.push({
                            name: key,
                            value,
                            type,
                            id: crypto.randomUUID() // Fake ID for runtime
                        } as any);
                    }
                }
            }
            return baseVars;
        })(),
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

    const speed = Number(resolveValue(ctx, (params.speed ?? 90) as any));
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

    // Correctly resolve and coerce values to numbers
    const speed = Number(resolveValue(ctx, (params.speed ?? 2) as any));
    const min = Number(resolveValue(ctx, (params.minScale ?? 0.8) as any));
    const max = Number(resolveValue(ctx, (params.maxScale ?? 1.2) as any));

    const time = performance.now() * 0.001;
    const t = Math.sin(time * speed) * 0.5 + 0.5;
    const scale = min + (max - min) * t;

    if (gameObject.setScale) {
        gameObject.setScale(scale);
    }

    const entity = getEntity(ctx);
    if (entity) {
        entity.scaleX = scale;
        entity.scaleY = scale;
    }
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
    const scale = Number(resolveValue(ctx, (params.scale ?? 1) as any));

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

// --- Flow Control Actions ---


// --- Flow Control Actions ---

import { ConditionRegistry } from "../ConditionRegistry";

/**
 * If Action: 조건에 따라 then 또는 else 분기의 액션들을 실행
 * 
 * 사용 예시:
 * {
 *   type: "If",
 *   condition: { type: "VarEquals", name: "state", value: "attacking" },
 *   then: [{ type: "PlayAnimation", animationName: "attack" }],
 *   else: [{ type: "PlayAnimation", animationName: "idle" }]
 * }
 */
ActionRegistry.register("If", (ctx: ActionContext, params: Record<string, unknown>) => {
    const condition = params.condition as { type: string;[key: string]: unknown } | undefined;
    const thenActions = params.then as Array<{ type: string;[key: string]: unknown }> | undefined;
    const elseActions = params.else as Array<{ type: string;[key: string]: unknown }> | undefined;

    if (!condition || !condition.type) {
        console.warn("[Action:If] Missing condition");
        return;
    }

    // Evaluate condition using ConditionRegistry
    const { type: condType, ...condParams } = condition;
    const conditionResult = ConditionRegistry.check(condType, ctx, condParams);

    // Execute appropriate branch
    const actionsToRun = conditionResult ? thenActions : elseActions;
    if (!actionsToRun || actionsToRun.length === 0) return;

    for (const action of actionsToRun) {
        const { type: actionType, ...actionParams } = action;
        ActionRegistry.run(actionType, ctx, actionParams);
    }
});

console.log(
    "[DefaultActions] 19 actions registered: Move, Jump, MoveToward, ChaseTarget, Attack, FireProjectile, TakeDamage, Heal, SetVar, RunModule, Enable, Disable, ChangeScene, ClearSignal, Rotate, Pulse, PlayParticle, StartParticleEmitter, StopParticleEmitter, If"
);

