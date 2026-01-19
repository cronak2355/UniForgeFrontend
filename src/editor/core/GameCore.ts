/**
 * GameCore - Runtime Engine Facade
 * 
 * Acts as the entry point and coordinator for the runtime engine.
 * Delegates execution to the ExecutionPipeline and manages the RuntimeContext.
 */

import type { IRenderer } from "../renderer/IRenderer";
import type { EditorComponent } from "../types/Component";
import type { EditorVariable } from "../types/Variable";
import type { InputState } from "./RuntimePhysics";
import { EventBus } from "./events/EventBus";
import { ActionRegistry } from "./events/ActionRegistry";
import { ConditionRegistry } from "./events/ConditionRegistry";
import { RuntimeContext } from "./RuntimeContext";
import { ExecutionPipeline } from "./ExecutionPipeline";
import { RuntimeEntity } from "./RuntimeEntity";
import { RuntimeComponent } from "./RuntimeComponent";
import { TransformSystem } from "./systems/TransformSystem";
import { LogicSystem } from "./systems/LogicSystem";
import { PhysicsSystem } from "./systems/PhysicsSystem";
import { type GameConfig, defaultGameConfig } from "./GameConfig";
import { ModuleRuntime } from "./flow/ModuleRuntime"; // Keep for now, might need refactor later
import type { ModuleGraph, ModuleLiteral } from "../types/Module";
import { collisionSystem } from "./CollisionSystem"; // Legacy Wrapper
import type { EditorLogicItem } from "../types/Logic";

// Legacy Type Aliases for compatibility during migration (or future deprecation)
export type GameEntity = RuntimeEntity;

/**
 * Entity Creation Options
 */
export interface CreateEntityOptions {
    name?: string;
    z?: number;
    rotationX?: number;
    rotationY?: number;
    rotationZ?: number;
    scaleX?: number;
    scaleY?: number;
    scaleZ?: number;
    variables?: EditorVariable[];
    components?: EditorComponent[];
    texture?: string;
    width?: number;
    height?: number;
    color?: number;
    role?: string;
    tags?: string[]; // [ADD] Entity tags for collision/filtering
    modules?: ModuleGraph[];
    logic?: EditorLogicItem[];
    events?: any[]; // Legacy support for renderer spawn
}

export class GameCore {
    private renderer: IRenderer;
    private runtimeContext: RuntimeContext;
    private pipeline: ExecutionPipeline;

    // Module Runtime (Legacy Logic Integration)
    // We plan to move logic to a LogicSystem eventually, but keep it accessible for now.
    private moduleRuntime: ModuleRuntime;
    private moduleLibrary: ModuleGraph[] = [];
    private onModuleUpdate?: (module: ModuleGraph) => void;
    /*
        private logicActionStates: Map<string, LogicActionState> = new Map();
        private clickedEntities: Set<string> = new Set();
    */

    // Game Config
    private gameConfig: GameConfig = defaultGameConfig;

    // Event Handler
    private eventHandler?: (event: import("./events/EventBus").GameEvent) => void;

    constructor(renderer: IRenderer) {
        this.renderer = renderer;

        // 1. Initialize Context & Pipeline
        this.runtimeContext = new RuntimeContext();
        this.pipeline = new ExecutionPipeline(this.runtimeContext);

        // 2. Initialize Legacy Module Wrapper
        // This connects the legacy module system specific lookups to the new Data Context
        this.moduleRuntime = new ModuleRuntime({
            getEntity: (id) => {
                const entity = this.runtimeContext.entities.get(id);
                if (!entity) return undefined;

                // Adapter: Reconstruct variables array from Context Map
                const vars: Array<{ name: string; value: unknown }> = [];
                const entityVars = this.runtimeContext.entityVariables.get(id);
                if (entityVars) {
                    for (const v of entityVars.values()) {
                        vars.push({ name: v.name, value: v.value });
                    }
                }

                // Return adapted object matching ModuleRuntimeEntity interface
                return {
                    id: entity.id,
                    x: entity.x,
                    y: entity.y,
                    rotationZ: entity.rotation, // Map rotation to rotationZ
                    variables: vars
                };
            },
            setVar: (entityId, name, value) => {
                // Determine type if possible, or default to check existing
                // Since this is runtime set, we might infer type or just set "any"
                this.pipeline.queueSetVariable(entityId, name, value);
            },
            getActionContext: (entityId, dt) => this.buildActionContext(entityId, dt),
            onModuleVarChange: (entityId, moduleId, name, value) =>
                this.handleModuleVarChange(entityId, moduleId, name, value),
        });

        // 3. Register Systems
        this.pipeline.addSystem(new TransformSystem());
        this.pipeline.addSystem(new PhysicsSystem());

        const logicSystem = new LogicSystem(this.moduleRuntime);
        logicSystem.setGameCore(this);
        this.pipeline.addSystem(logicSystem);

        // 4. Setup Global Events
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.eventHandler = (event) => {
            if (!event || !event.type) return;

            // Simple Collision Bridge
            // In a full pure ECS, Collision would be a System producing events
            if (event.type.startsWith("COLLISION")) {
                this.handleCollisionEvent(event);
            }

            // Execute Logic components based on event type
            this.executeEventLogicComponents(event);
        };
        EventBus.on(this.eventHandler);
    }

    /**
     * Execute Logic components that match the given event type.
     * Maps EventBus events to Logic component event types.
     */
    private executeEventLogicComponents(event: any) {
        const eventType = event.type;
        const entityId = event.entityId ?? event.data?.entityA ?? event.data?.entityId;

        // Map EventBus event types to Logic component event types
        // NOTE: OnStart is handled by LogicSystem directly, not here (to avoid duplicate execution)
        const eventMapping: Record<string, string[]> = {
            // [FIX] Removed COLLISION_ENTER and COLLISION_STAY to avoid double execution.
            // These are now handled exclusively by LogicSystem.
            // "COLLISION_ENTER": ["OnCollision", "OnCollisionEnter"],
            // "COLLISION_STAY": ["OnCollision", "OnCollisionStay"],
            "COLLISION_EXIT": ["OnCollisionExit"],
            "ENTITY_DIED": ["OnDestroy"],
            "EVENT_SIGNAL": ["OnSignalReceive"],
        };

        const mappedEvents = eventMapping[eventType];
        if (!mappedEvents) return;

        // For collision events, execute for both entities
        // For signal events, broadcast to all entities
        const entityIds: string[] = [];
        if (eventType.startsWith("COLLISION") && event.data?.entityA && event.data?.entityB) {
            entityIds.push(event.data.entityA, event.data.entityB);
        } else if (eventType === "EVENT_SIGNAL") {
            // Signal events are broadcast to ALL entities
            for (const id of this.runtimeContext.entities.keys()) {
                entityIds.push(id);
            }
        } else if (entityId) {
            entityIds.push(entityId);
        }

        // Get Logic components and execute matching ones
        const allLogicComps = this.runtimeContext.getAllComponentsOfType("Logic");

        for (const comp of allLogicComps) {
            if (!entityIds.includes(comp.entityId)) continue;

            const logicData = comp.data as import("./RuntimeComponent").RuntimeComponent["data"] & { event?: string; actions?: any[]; conditions?: any[] };
            if (!logicData?.event || !mappedEvents.includes(logicData.event)) continue;

            // console.log(`[GameCore] Executing Logic component '${logicData.event}' for entity ${comp.entityId} (Event: ${eventType})`);

            // Build action context
            const ctx = {
                entityId: comp.entityId,
                eventData: event.data ?? {},
                input: this.runtimeContext.getInput(),
                entityContext: this.runtimeContext.getEntityContext(comp.entityId),
                globals: {
                    gameCore: this,
                    entities: this.runtimeContext.entities,
                    renderer: this.renderer,
                }
            };

            // Check conditions before executing
            const conditions = logicData.conditions ?? [];
            const logic = (logicData as any).conditionLogic ?? "AND";

            let pass = true;
            if (conditions.length > 0) {
                if (logic === "OR") {
                    pass = conditions.some((c: any) => ConditionRegistry.check(c.type, ctx, c));
                } else {
                    pass = conditions.every((c: any) => ConditionRegistry.check(c.type, ctx, c));
                }
            }

            if (!pass) continue;

            // Execute actions
            for (const action of logicData.actions ?? []) {
                const { type, ...params } = action;
                ActionRegistry.run(type, ctx, params);
            }
        }
    }

    private handleCollisionEvent(event: any) {
        // Forward collision events to RuntimeContext
        // ... (Similar implementation to previous, just adapting to Context API)
        if (event.type === "COLLISION_ENTER" || event.type === "COLLISION_STAY") {
            const data = event.data;
            if (!data?.entityA || !data.entityB) return;
            // ... Construct contact info ...
            const contactA = {
                otherId: data.entityB,
                otherTag: data.tagB,
                selfTag: data.tagA,
                overlapX: data.overlapX,
                overlapY: data.overlapY,
                normalX: data.normalX,
                normalY: data.normalY,
            };
            const contactB = {
                otherId: data.entityA,
                otherTag: data.tagA,
                selfTag: data.tagB,
                overlapX: data.overlapX,
                overlapY: data.overlapY,
                normalX: data.normalX !== undefined ? -data.normalX : undefined,
                normalY: data.normalY !== undefined ? -data.normalY : undefined,
            };

            if (event.type === "COLLISION_ENTER") {
                this.runtimeContext.recordCollisionEnter(data.entityA, contactA);
                this.runtimeContext.recordCollisionEnter(data.entityB, contactB);
            } else {
                this.runtimeContext.recordCollisionStay(data.entityA, contactA);
                this.runtimeContext.recordCollisionStay(data.entityB, contactB);
            }
        }
        else if (event.type === "COLLISION_EXIT") {
            const data = event.data;
            if (!data?.entityA || !data.entityB) return;
            this.runtimeContext.recordCollisionExit(data.entityA, data.entityB);
            this.runtimeContext.recordCollisionExit(data.entityB, data.entityA);
        }
    }

    public getRenderer(): IRenderer {
        return this.renderer;
    }

    // =========================================================================
    // Systems & Lifecycle
    // =========================================================================

    update(time: number, deltaTime: number): void {
        const dt = deltaTime / 1000;

        // Pipeline Execution
        // The pipeline now manages Input -> Logic -> Physics -> LateUpdate order via its Systems list.
        this.pipeline.executeFrame(dt);
    }

    /**
     * Forces the application of queued deferred actions (Entity creation, etc.).
     * Use this ONLY in Editor mode or initialization where the game loop is not driving the state.
     */
    flush(): void {
        this.pipeline.flush();
        // Also might need to update renderer? Renderer is immediate in createEntity currently.
        // So just pipeline flush is enough to sync RuntimeContext.
    }

    // =========================================================================
    // Public API (Facade)
    // =========================================================================

    createEntity(
        id: string,
        type: string,
        x: number,
        y: number,
        options: CreateEntityOptions = {}
    ): boolean {
        // Construct Primitive Data
        const entity: RuntimeEntity = {
            id,
            // Core
            x, y,
            rotation: options.rotationZ ?? 0,
            scaleX: options.scaleX ?? 1,
            scaleY: options.scaleY ?? 1,
            // 3D/Layer
            z: options.z ?? 0,
            rotationX: options.rotationX ?? 0,
            rotationY: options.rotationY ?? 0,
            scaleZ: options.scaleZ ?? 1,
            // Meta
            name: options.name ?? `Entity_${id.slice(0, 8)}`,
            active: true,
            role: options.role,
            modules: options.modules,
            // Variables (CRITICAL: must copy from options)
            variables: options.variables ?? [],
        };

        // Queue Creation
        // IMPORTANT: For initial setup, we might want immediate for Renderer.
        // But per spec, we should buffer. 
        // However, Renderer needs to be notified. 
        // The previous GameCore mixed Renderer calls. We should decouple, 
        // but for now we keep Renderer calls here for visual continuity.

        // 1. Renderer Spawn (Immediate Visuals)
        this.renderer.spawn(id, type, x, y, entity.z, {
            texture: options.texture,
            width: options.width,
            height: options.height,
            color: options.color,
            events: options.events,
        });
        this.renderer.update(id, entity.x, entity.y, entity.z, entity.rotation); // Sync initial transform
        // [FIX] Only apply scale if it differs from default (1,1) to avoid overriding setDisplaySize
        if (entity.scaleX !== 1 || entity.scaleY !== 1) {
            this.renderer.setScale(id, entity.scaleX, entity.scaleY, entity.scaleZ);
        }

        // 2. Physics Reg (Immediate) - Skip for cameras and global entities
        const isCamera = entity.name?.toLowerCase().includes("camera");
        const isGlobalEntity = id.startsWith("global-");
        if (!isCamera && !isGlobalEntity) {
            const baseWidth = options.width ?? 40;
            const baseHeight = options.height ?? 40;
            // [FIX] Use first tag from tags array, fallback to type
            const collisionTag = (options.tags && options.tags.length > 0) ? options.tags[0] : type;
            collisionSystem.register(
                id,
                collisionTag,
                {
                    x: entity.x,
                    y: entity.y,
                    width: baseWidth * entity.scaleX,
                    height: baseHeight * entity.scaleY,
                },
                { isSolid: true }
            );
        }

        // 3. Queue Logic Data
        this.pipeline.queueCreateEntity(entity);

        // 4. Queue Components (from options.components - legacy)
        // [FIX] Prevent duplicate Logic components if options.logic is provided
        const logicComponentTypes = new Set(
            options.logic?.filter(item => item.kind === "component").map(item => item.component.type) || []
        );

        if (options.components) {
            // console.log(`[GameCore] CreateEntity ${id}: Processing options.components (${options.components.length})`);
            for (const c of options.components) {
                // Skip if this component type is already provided by options.logic (specifically Logic components)
                // Note: Logic items usually have type 'Logic' but unique data. 
                // We mainly want to avoid adding the EXACT SAME Logic component sourced from legacy path.
                if (c.type === "Logic" && options.logic && options.logic.length > 0) {
                    continue;
                }

                const runtimeComp: RuntimeComponent = {
                    entityId: id,
                    type: c.type,
                    data: c
                };
                this.pipeline.queueAddComponent(runtimeComp);
            }
        }

        // 4b. Queue Components from logic array (EditorLogicItem[])
        if (options.logic) {
            // console.log(`[GameCore] CreateEntity ${id}: Queuing ${options.logic.length} logic items.`);
            const addedSignatures = new Set<string>();
            for (const item of options.logic) {
                if (item.kind === "component") {
                    const comp = item.component;
                    // Prevent duplicates within options.logic itself
                    let eventType = (comp as any).event || 'null';
                    // [FIX] Normalize TICK/OnUpdate aliases to prevent duplication
                    if (eventType === 'TICK') eventType = 'OnUpdate';

                    const sig = `${comp.type}:${eventType}`;
                    if (addedSignatures.has(sig)) {
                        console.warn(`[GameCore] ⚠️ Duplicate logic filtered in options.logic for ${id}: ${sig}`);
                        continue;
                    }
                    console.log(`[GameCore] ✓ Adding logic component for ${id}: ${sig}`);
                    addedSignatures.add(sig);

                    const runtimeComp: RuntimeComponent = {
                        entityId: id,
                        type: item.component.type,
                        data: item.component
                    };
                    this.pipeline.queueAddComponent(runtimeComp);
                }
            }
        }


        // 5. Setup Variables
        if (options.variables) {
            for (const v of options.variables) {
                this.pipeline.queueSetVariable(id, v.name, v.value);
            }
        }

        // 6. Modules are NOT auto-started at spawn.
        // Modules are only executed via "RunModule" action.
        // The modules array is stored on the entity for reference by RunModule action.
        // if (options.modules) {
        //     for (const module of options.modules) {
        //         this.moduleRuntime.startModule(id, module);
        //     }
        // }

        // [FIX] Defer OnStart emission to ensure Entity is fully registered in RuntimeContext
        // This prevents race condition where LogicSystem tries to run OnStart on a non-existent entity.
        // [FIX] Only emit OnStart if we are in Runtime Mode (prevents Editor drag-drop from running logic)
        if (this.renderer.isRuntimeMode) {
            setTimeout(() => {
                EventBus.emit("OnStart", { entityId: id }, id);
            }, 0);
        }

        return true;
    }

    /**
     * Start a module for an entity by module ID or name.
     * Called by RunModule action.
     */
    startModule(entityId: string, moduleIdOrName: string, initialVariables?: Record<string, any>): boolean {
        // Find the module from moduleLibrary
        const module = this.moduleLibrary.find(
            (m) => m.id === moduleIdOrName || m.name === moduleIdOrName
        );
        if (!module) {
            console.warn(`[GameCore] Module not found in library: ${moduleIdOrName}`);
            return false;
        }

        this.moduleRuntime.startModule(entityId, module, initialVariables);
        return true;
    }

    removeEntity(id: string): void {
        this.pipeline.queueDestroyEntity(id);

        // Immediate Cleanup for Renderer/Physics preventing ghost frames?
        // Or wait for EndFrame?
        // Spec says "Deferred". But Renderer might need immediate hide to prevent glitches.
        // Let's stick to Deferred for Logic, but Renderer usually handles remove immediately or next frame.
        // Safe approach: Queue it. Pipeline will handle Context removal.
        // We need a RenderSystem to sync removal.
        // Since we don't have a full RenderSystem yet, we call renderer here?
        // No, let's strictly follow "EndFrame Apply".
        // BUT, we need to ensure Renderer is synced at EndFrame too.
        // For this refactor step, I will call renderer.remove immediately for safety, 
        // OR add a specific "queueRendererAction".
        // Let's do immediate renderer remove for now to keep visual feedback snappy,
        // acknowledging that a full RenderSystem would read the Context changes later.
        this.renderer.remove(id);
        collisionSystem.unregister(id);
    }

    // ... Additional compatibility methods ...

    getEntity(id: string) {
        const entity = this.runtimeContext.entities.get(id);
        if (!entity) return undefined;

        // Legacy Adapter: Attach variables for Editor compatibility
        const vars: any[] = [];
        const entityVars = this.runtimeContext.entityVariables.get(id);
        if (entityVars) {
            for (const v of entityVars.values()) {
                vars.push({ name: v.name, value: v.value, type: v.type });
            }
        }

        return {
            ...entity,
            rotationZ: entity.rotation, // Compatibility alias
            variables: vars
        };
    }

    getAllEntities() {
        // Expensive Adapter for Legacy Editor UI
        // TODO: Refactor RunTimeCanvas to use RuntimeContext directly
        const adapterMap = new Map();
        for (const [id, entity] of this.runtimeContext.entities) {
            const vars: any[] = [];
            const entityVars = this.runtimeContext.entityVariables.get(id);
            if (entityVars) {
                for (const v of entityVars.values()) {
                    vars.push({ name: v.name, value: v.value, type: v.type });
                }
            }
            adapterMap.set(id, {
                ...entity,
                rotationZ: entity.rotation, // Compatibility alias
                variables: vars
            });
        }
        return adapterMap;
    }

    resetRuntime() {
        // Clear all runtime data
        this.runtimeContext.clearEntities();

        // Clear renderer entities
        if (this.renderer && this.renderer.clear) {
            this.renderer.clear();
        }
    }

    hasEntity(id: string): boolean {
        return this.runtimeContext.entities.has(id);
    }

    getRuntimeContext() {
        return this.runtimeContext;
    }

    setInputState(input: InputState) {
        // [FIX] Removed executeFrame(0) call - it was causing duplicate logic execution!
        // The input state is updated here and will be used in the next normal frame.
        this.runtimeContext.setInput(input);
    }

    setGameConfig(config: GameConfig) {
        this.gameConfig = config;
    }

    getGameConfig(): GameConfig {
        return this.gameConfig;
    }

    // Legacy Support methods
    setModuleLibrary(modules: ModuleGraph[], onUpdate?: any) {
        this.moduleLibrary = modules;
        this.onModuleUpdate = onUpdate;
    }

    // ... other methods omitted for brevity, implementing minimum viable ...

    private buildActionContext(entityId: string, dt: number): any {
        // Build compatibility context for ModuleRuntime
        return {
            entityId,
            eventData: { dt },
            globals: {
                entities: this.runtimeContext.entities,
                gameCore: this,
                renderer: this.renderer,
            },
            input: this.runtimeContext.getInput(),
            entityContext: this.runtimeContext.getEntityContext(entityId),
        };
    }

    private handleModuleVarChange(entityId: string, moduleId: string, name: string, value: ModuleLiteral) {
        // Implementation for Module Variable Sync
    }

    // Required by Editor for drag/drop logic updates
    updateEntityLogic(id: string, components: EditorComponent[], variables: EditorVariable[]) {
        // This is tricky with deferred.
        // We queue updates.
        // Since this is Editor-time interaction mostly, we might want immediate?
        // Spec says "Immediate: Variable values". "Deferred: Component Add/Remove".

        // 1. Variables (Immediate allowed per spec 7.2? "Variable value changes")
        // But here we are replacing the LIST.
        // Let's queue them.
        for (const v of variables) {
            this.pipeline.queueSetVariable(id, v.name, v.value);
        }

        // 2. Components
        // We lack a "ReplaceAllComponents" queue.
        // We queue Remove All + Add New?
        const entityComponents = this.runtimeContext.getEntityComponents(id);
        for (const c of entityComponents) {
            this.pipeline.queueRemoveComponent(c);
        }
        for (const c of components) {
            this.pipeline.queueAddComponent({
                entityId: id,
                type: c.type,
                data: c
            });
        }
    }

    public isDestroyed = false;

    // Compatibility stub
    validateIdSync() { return true; }
    destroy() {
        this.isDestroyed = true;
        if (this.eventHandler) EventBus.off(this.eventHandler);
        this.pipeline.destroy(); // Cleanup systems (LogicSystem listeners etc)
        this.runtimeContext.clearEntities();
    }

    // Compatibility Methods

    moveEntity(id: string, x: number, y: number): void {
        const entity = this.runtimeContext.entities.get(id);
        if (entity) {
            (entity as any).x = x;
            (entity as any).y = y;
        }
        this.renderer.update(id, x, y, entity?.z ?? 0, entity?.rotation ?? 0);
        collisionSystem.updatePosition(id, x, y);
    }

    setEntityTransform(id: string, transform: {
        x: number; y: number; z: number;
        rotationX?: number; rotationY?: number; rotationZ?: number;
        scaleX: number; scaleY: number; scaleZ?: number;
    }): void {
        const entity = this.runtimeContext.entities.get(id);
        if (!entity) return;

        const e = entity as any;
        e.x = transform.x;
        e.y = transform.y;
        e.z = transform.z;
        e.rotation = transform.rotationZ ?? e.rotation;
        e.scaleX = transform.scaleX;
        e.scaleY = transform.scaleY;
        e.rotationX = transform.rotationX ?? e.rotationX;
        e.rotationY = transform.rotationY ?? e.rotationY;
        e.scaleZ = transform.scaleZ ?? e.scaleZ;

        this.renderer.update(id, e.x, e.y, e.z, e.rotation);
        this.renderer.setScale(id, e.scaleX, e.scaleY, e.scaleZ);
        collisionSystem.updatePosition(id, e.x, e.y);
        // Note: Not updating size in this quick patch, assuming scale doesn't change physics box often in Editor drag
    }

    updateEntityModules(id: string, modules: ModuleGraph[]): void {
        const entity = this.runtimeContext.entities.get(id);
        if (entity) {
            (entity as any).modules = modules;
            // Re-register with runtime
            this.moduleRuntime.removeEntity(id);
            for (const m of modules) {
                this.moduleRuntime.startModule(id, m);
            }
        }
    }
}
