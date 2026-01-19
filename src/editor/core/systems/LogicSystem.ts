import { System } from "../ExecutionPipeline";
import { RuntimeContext } from "../RuntimeContext";
import { ModuleRuntime } from "../flow/ModuleRuntime";
import { ActionRegistry, type ActionContext } from "../events/ActionRegistry";
import { ConditionRegistry } from "../events/ConditionRegistry";
import { EventBus } from "../events/EventBus"; // Import EventBus
import type { LogicComponent } from "../../types/Component";

import type { GameCore } from "../GameCore";

export class LogicSystem implements System {
    name = "LogicSystem";
    private readonly instanceId = Math.floor(Math.random() * 10000); // [DEBUG] Trace Instance
    private moduleRuntime: ModuleRuntime;
    private gameCore?: GameCore;

    // Performance monitoring
    private frameCount = 0;
    private accFrameTime = 0;

    constructor(moduleRuntime: ModuleRuntime) {
        this.moduleRuntime = moduleRuntime;
    }

    setGameCore(core: GameCore) {
        this.gameCore = core;
    }

    // [FIX] Track processed collisions per frame to prevent duplicate execution
    private executedCollisions = new Set<string>();

    // [FIX] Track executed components per frame (for OnUpdate/TICK)
    private executedComponents = new Set<import("../RuntimeComponent").RuntimeComponent>();

    // [FIX] Track executed actions per frame to prevent duplicate action execution
    private executedActions = new Set<string>();


    private OnStartListener?: (event: any) => void;
    private CollisionListener?: (event: any) => void;
    private OnClickListener?: (event: any) => void;
    private runtimeContext?: RuntimeContext;

    onInit(context: RuntimeContext): void {
        this.runtimeContext = context;

        // Listen for OnStart events (e.g. from SpawnEntity)
        this.OnStartListener = (event: any) => {
            if (event.type === "OnStart") {
                // Cast or access data safely. 
                const entityId = (event.data as any)?.entityId;
                if (entityId) {
                    this.handleOnStart(context, entityId);
                }
            }
        };
        EventBus.on(this.OnStartListener);

        // Listen for COLLISION_ENTER events
        this.CollisionListener = (event: any) => {
            if (event.type === "COLLISION_ENTER" || event.type === "COLLISION_STAY") {
                this.handleCollisionEvent(context, event);
            }
        };
        EventBus.on(this.CollisionListener);

        // Listen for OnClick events (UI Buttons, etc.)
        this.OnClickListener = (event: any) => {
            if (event.type === "OnClick") {
                const targetId = event.targetId;
                if (targetId) {
                    this.handleOnClick(context, targetId, event.data);
                }
            }
        };
        EventBus.on(this.OnClickListener);
    }

    onDestroy(): void {
        if (this.OnStartListener) {
            EventBus.off(this.OnStartListener);
            this.OnStartListener = undefined;
        }
        if (this.CollisionListener) {
            EventBus.off(this.CollisionListener);
            this.CollisionListener = undefined;
        }
        if (this.OnClickListener) {
            EventBus.off(this.OnClickListener);
            this.OnClickListener = undefined;
        }
        this.runtimeContext = undefined;
    }

    private handleCollisionEvent(context: RuntimeContext, event: any) {
        // [GUARD] Stop if GameCore is destroyed (Zombie Listener Protection)
        if (this.gameCore?.isDestroyed) return;

        const renderer = this.gameCore?.getRenderer();
        const isRuntime = renderer?.isRuntimeMode;

        if (!isRuntime) return;

        const data = event.data || event;
        const entityA = data.entityA as string;
        const entityB = data.entityB as string;
        const tagA = data.tagA as string;
        const tagB = data.tagB as string;
        const type = event.type || "COLLISION_ENTER";

        // [FIX] Deduplicate Collision Events per Frame
        // CollisionSystem emits ENTER once per pair. LogicSystem handles it.
        // We ensure we don't process the exact same A-B collision twice in one frame
        // (e.g. if emitted twice or listener duplicated)

        // Use a frame-based or unique key. Since we clear set on update, 
        // we just need A|B|Type unique key.
        // Sort IDs to ensure A|B is same as B|A for the Pair Execution check?
        // No, we want to execute Logic for A vs B, and B vs A. 
        // But we want to ensure we don't do A vs B TWICE.

        const collisionKey = `${entityA}:${entityB}:${type}`;
        if (this.executedCollisions.has(collisionKey)) {
            // console.warn(`[LogicSystem] Skipping duplicate collision event: ${collisionKey}`);
            return;
        }
        this.executedCollisions.add(collisionKey);

        // Execute OnCollision logic for both entities involved
        this.executeCollisionLogic(context, entityA, entityB, tagA, tagB, data);
        this.executeCollisionLogic(context, entityB, entityA, tagB, tagA, data);
    }

    private executeCollisionLogic(
        context: RuntimeContext,
        entityId: string,
        otherId: string,
        myTag: string,
        otherTag: string,
        collisionData: any
    ) {
        const entity = context.entities.get(entityId);
        if (!entity || !entity.active) return;

        // Determine which event types to look for based on the actual event
        const eventType = collisionData.type || "COLLISION_ENTER"; // Fallback if type missing
        const targetEvents = ["OnCollision"]; // Always include base 'OnCollision'

        if (eventType === "COLLISION_ENTER") {
            targetEvents.push("OnCollisionEnter");
        } else if (eventType === "COLLISION_STAY") {
            targetEvents.push("OnCollisionStay");
        }

        // Get OnCollision logic components for this entity (checking all aliases)
        const logicComponents: import("../RuntimeComponent").RuntimeComponent[] = [];

        for (const evt of targetEvents) {
            const comps = context.getComponentsByEvent(evt);
            for (const c of comps) {
                if (c.entityId === entityId) {
                    logicComponents.push(c);
                }
            }
        }

        if (logicComponents.length > 1) {
            console.warn(`[LogicSystem] Entity ${entityId} has ${logicComponents.length} collision logic components! Duplicate execution likely.`);
        }

        for (const comp of logicComponents) {
            const logicData = comp.data as import("../../types/Component").LogicComponent;

            // Build ActionContext with collision event data
            const ctx: ActionContext = {
                entityId,
                eventData: {
                    ...collisionData,
                    type: eventType, // Ensure type is explicitly passed
                    entityA: collisionData.entityA,
                    entityB: collisionData.entityB,
                    tagA: collisionData.tagA,
                    tagB: collisionData.tagB,
                    otherTag,
                    otherId,
                    dt: 0
                },
                input: context.getInput(),
                entityContext: context.getEntityContext(entityId),
                globals: {
                    entities: context.entities,
                    renderer: this.gameCore?.getRenderer(),
                    gameCore: this.gameCore,
                }
            };

            // Execute using the same logic as executeLogicComponent
            const conditions = logicData.conditions ?? [];
            const logic = logicData.conditionLogic ?? "AND";

            if (logic === "BRANCH") {
                let handled = false;

                for (const c of conditions) {

                    if (ConditionRegistry.check(c.type, ctx, c)) {

                        for (const action of (c.then ?? [])) {
                            const { type, ...params } = action;

                            ActionRegistry.run(type, ctx, params);
                        }
                        handled = true;
                        break;
                    }
                }
                if (!handled) {

                    for (const action of (logicData.elseActions ?? [])) {
                        const { type, ...params } = action;
                        ActionRegistry.run(type, ctx, params);
                    }
                }
                continue;
            }

            // AND/OR logic
            let pass = true;
            if (conditions.length > 0) {
                if (logic === "OR") {
                    pass = conditions.some(c => ConditionRegistry.check(c.type, ctx, c));
                } else {
                    pass = conditions.every(c => ConditionRegistry.check(c.type, ctx, c));
                }
            }

            const actionsToRun = pass
                ? (logicData.actions ?? [])
                : (logicData.elseActions ?? []);

            for (const action of actionsToRun) {
                const { type, ...params } = action;
                ActionRegistry.run(type, ctx, params);
            }
        }
    }

    private handleOnStart(context: RuntimeContext, specificEntityId?: string) {
        const renderer = this.gameCore?.getRenderer();
        const isRuntime = renderer?.isRuntimeMode;

        // [CHECK] Only run logic if in Runtime Mode. 
        // Prevents drag-and-drop in Editor from triggering game logic.
        if (!isRuntime) {
            return;
        }

        // If a specific entity ID is provided, we only run OnStart for that entity.
        // Otherwise, we might run it for all (but OnStart is usually per-entity lifecycle).

        let componentsToRun: import("../RuntimeComponent").RuntimeComponent[] = [];

        if (specificEntityId) {
            // Get all Logic components for this entity
            const entityComps = context.getEntityComponents(specificEntityId);
            componentsToRun = entityComps.filter(c =>
                c.type === "Logic" && (c.data as LogicComponent).event === "OnStart"
            );
        } else {
            // Fallback: Run all OnStart components (rarely used globally, but safe)
            componentsToRun = context.getComponentsByEvent("OnStart");
        }

        if (componentsToRun.length > 0) {
            // OnStart logging removed for performance
        }

        for (const comp of componentsToRun) {
            this.executeLogicComponent(context, comp, 0); // dt=0 for OnStart
        }
    }

    private handleOnClick(context: RuntimeContext, entityId: string, data: any) {
        const renderer = this.gameCore?.getRenderer();
        const isRuntime = renderer?.isRuntimeMode;

        // Ensure we are in runtime
        if (!isRuntime) return;

        const entity = context.entities.get(entityId);
        if (!entity || !entity.active) return;

        // Get OnClick logic components for this entity
        const clickComponents = context.getComponentsByEvent("OnClick")
            .filter(c => c.entityId === entityId);

        // console.log(`[LogicSystem] Handling OnClick for ${entityId}. Found ${clickComponents.length} components.`);

        for (const comp of clickComponents) {
            this.executeLogicComponent(context, comp, 0);
        }
    }

    private lastUpdateTimestamp = 0;

    onUpdate(context: RuntimeContext, dt: number) {
        // [GUARD] Stop if GameCore is destroyed
        if (this.gameCore?.isDestroyed) return;

        const currentTimestamp = performance.now();
        // If time difference is significant (e.g. > 2ms), it's a new frame. 
        // Otherwise, it's likely a duplicate call in the same frame.
        const isNewFrame = (currentTimestamp - this.lastUpdateTimestamp) > 2;

        if (isNewFrame) {
            // New frame: Clear trackers
            this.executedCollisions.clear();
            this.executedComponents.clear();
            this.executedActions.clear();
            this.lastUpdateTimestamp = currentTimestamp;
        } else {
            // Same frame duplicate call: Do NOT clear trackers
        }

        // [CHECK] Only run logic if in Runtime Mode. 
        const isRuntime = this.gameCore?.getRenderer().isRuntimeMode;
        if (!isRuntime) return;

        const frameStart = performance.now();

        // 1. Execute Logic Components (OnUpdate/TICK)
        const logicComponents = context.getAllComponentsOfType("Logic");
        // console.log(`[LogicSystem ${this.instanceId}] Update. Components: ${logicComponents.length} | Destroyed: ${this.gameCore?.isDestroyed}`);

        if (logicComponents.length === 0 && context.entities.size > 0) {
            // console.warn(`[LogicSystem] No Logic components found! (Entities: ${context.entities.size})`);
        }

        let processedCount = 0;

        for (const comp of logicComponents) {
            const logicData = comp.data as LogicComponent | undefined;
            if (!logicData) continue;

            // Filter: OnUpdate or TICK only
            if (logicData.event !== "OnUpdate" && logicData.event !== "TICK") continue;

            // [FIX] Deduplicate Component Execution
            if (this.executedComponents.has(comp)) {
                // console.warn(`[LogicSystem ${this.instanceId}] Skipping duplicate component execution for ${comp.entityId}`);
                continue;
            }
            this.executedComponents.add(comp);

            // console.log(`[LogicSystem ${this.instanceId}] Executing Update Logic for ${comp.entityId}`);

            // Check entity exists and is alive
            const entity = context.entities.get(comp.entityId);
            if (!entity || !entity.active) continue;

            const hpVar = context.getEntityVariable(comp.entityId, "hp");
            if (typeof hpVar === "number" && hpVar <= 0) continue;

            this.executeLogicComponent(context, comp, dt);
            processedCount++;
        }

        // 2. Delegate Module logic execution
        const results = this.moduleRuntime.update(0, dt);
        for (const result of results) {
            if (result.status === "failed") {
                // console.warn("[LogicSystem] Module execution failed", result);
            }
        }

        // 3. Performance Reporting
        const frameDuration = performance.now() - frameStart;
        this.accFrameTime += frameDuration;
        this.frameCount++;

        const REPORT_INTERVAL = 300;
        if (this.frameCount >= REPORT_INTERVAL) {
            const avgTime = this.accFrameTime / this.frameCount;
            // console.log(`[LogicSystem] Performance Report (Avg over ${this.frameCount} frames):`);
            // console.log(` - Avg Logic Update Time: ${avgTime.toFixed(4)} ms`);
            // console.log(` - Logic Components Executed: ${processedCount}`);

            this.accFrameTime = 0;
            this.frameCount = 0;
        }
    }

    private executeLogicComponent(context: RuntimeContext, comp: import("../RuntimeComponent").RuntimeComponent, dt: number) {
        const logicData = comp.data as LogicComponent;
        // Build ActionContext
        const ctx: ActionContext = {
            entityId: comp.entityId,
            eventData: { dt },
            input: context.getInput(),
            entityContext: context.getEntityContext(comp.entityId),
            globals: {
                entities: context.entities,
                renderer: this.gameCore?.getRenderer(),
                gameCore: this.gameCore,
            }
        };

        // Check conditions
        const conditions = logicData.conditions ?? [];
        const logic = logicData.conditionLogic ?? "AND";

        if (logic === "BRANCH") {
            let handled = false;

            for (const c of conditions) {

                if (ConditionRegistry.check(c.type, ctx, c)) {

                    for (const action of (c.then ?? [])) {
                        const { type, ...params } = action;

                        ActionRegistry.run(type, ctx, params);
                    }
                    handled = true;
                    break;
                }
            }
            if (!handled) {

                for (const action of (logicData.elseActions ?? [])) {
                    const { type, ...params } = action;
                    ActionRegistry.run(type, ctx, params);
                }
            }
            return;
        }

        let pass = true;

        if (conditions.length > 0) {
            if (logic === "OR") {
                pass = conditions.some(c => ConditionRegistry.check(c.type, ctx, c));
            } else {
                pass = conditions.every(c => ConditionRegistry.check(c.type, ctx, c));
            }
        }

        // Execute Actions or ElseActions based on condition result
        const actionsToRun = pass
            ? (logicData.actions ?? [])
            : (logicData.elseActions ?? []);


        // Only log details when actions will actually execute
        if (actionsToRun.length > 0) {
            if (actionsToRun.length > 1) {
                console.warn(`[LogicSystem] ⚠️ MULTIPLE ACTIONS:`, actionsToRun.map((a, i) => `${i}: ${a.type}`));
            }

            for (const action of actionsToRun) {
                const { type, ...params } = action;

                // [FIX] Generate unique signature for this action execution
                const actionSignature = `${comp.entityId}:${type}:${JSON.stringify(params)}`;

                if (this.executedActions.has(actionSignature)) {
                    console.warn(`[LogicSystem] ⛔ Blocked duplicate action: ${type} for entity ${comp.entityId}`);
                    continue;
                }
                this.executedActions.add(actionSignature);

                console.log(`[LogicSystem #${this.instanceId}] ▶️ Action: ${type} on entity ${comp.entityId}`);
                ActionRegistry.run(type, ctx, params);
            }
        }
    }
}
