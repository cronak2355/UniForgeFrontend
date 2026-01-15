import { RuntimeContext } from "./RuntimeContext";

/**
 * Interface for all runtime systems.
 */
export interface System {
    /** Unique name for debugging/profiling */
    name: string;

    /** Called once when the system is added */
    onInit?(context: RuntimeContext): void;

    /** Called every frame */
    onUpdate?(context: RuntimeContext, dt: number): void;

    /** Called after all onUpdates, before rendering/end-frame */
    onLateUpdate?(context: RuntimeContext, dt: number): void;

    /** Called when the pipeline is destroyed */
    onDestroy?(): void;
}

/**
 * Execution Pipeline
 * 
 * Manages the execution order of systems and the frame lifecycle.
 * Handles Deferred Actions (EndFrame Apply).
 */
export class ExecutionPipeline {
    private systems: System[] = [];
    private context: RuntimeContext;

    // Deferred Action Queues
    private deferredEntityVariables: Array<{ entityId: string, name: string, value: any }> = [];
    private deferredCreateEntities: Array<import("./RuntimeEntity").RuntimeEntity> = [];
    private deferredDestroyEntities: Array<string> = [];
    private deferredAddComponent: Array<import("./RuntimeComponent").RuntimeComponent> = [];
    private deferredRemoveComponent: Array<import("./RuntimeComponent").RuntimeComponent> = [];

    // =========================================================================
    // Action Queueing
    // =========================================================================

    public queueCreateEntity(entity: import("./RuntimeEntity").RuntimeEntity) {
        this.deferredCreateEntities.push(entity);
    }

    public queueDestroyEntity(entityId: string) {
        this.deferredDestroyEntities.push(entityId);
    }

    public queueAddComponent(component: import("./RuntimeComponent").RuntimeComponent) {
        this.deferredAddComponent.push(component);
    }

    public queueRemoveComponent(component: import("./RuntimeComponent").RuntimeComponent) {
        this.deferredRemoveComponent.push(component);
    }

    public queueSetVariable(entityId: string, name: string, value: any) {
        this.deferredEntityVariables.push({ entityId, name, value });
    }

    // =========================================================================
    // Pipeline Execution
    // =========================================================================

    constructor(context: RuntimeContext) {
        this.context = context;
    }

    public addSystem(system: System) {
        this.systems.push(system);
        if (system.onInit) {
            system.onInit(this.context);
        }
    }

    public executeFrame(dt: number) {
        // 1. Begin Frame
        this.context.beginFrame();

        // 2. Update Loop
        for (const system of this.systems) {
            if (system.onUpdate) {
                // TODO: Add try-catch for safety?
                system.onUpdate(this.context, dt);
            }
        }

        // 3. Late Update Loop
        for (const system of this.systems) {
            if (system.onLateUpdate) {
                system.onLateUpdate(this.context, dt);
            }
        }

        // 4. End Frame / Deferred Apply
        this.applyDeferredActions();
    }

    /**
     * Force apply deferred actions immediately.
     * Useful for Editor tools or setup phases where no frame loop is running.
     */
    public flush() {
        this.applyDeferredActions();
    }

    private applyDeferredActions() {
        // 1. Create Entities
        for (const entity of this.deferredCreateEntities) {
            this.context.registerEntity(entity);
        }
        this.deferredCreateEntities = [];

        // 2. Add Components
        for (const comp of this.deferredAddComponent) {
            this.context.registerComponent(comp);
        }
        this.deferredAddComponent = [];

        // 3. Apply Variables (Immediate/Deferred mixed policy? Reqs say Variable changes are Immediate, but we safeguard here just in case)
        for (const action of this.deferredEntityVariables) {
            this.context.setEntityVariable(action.entityId, action.name, action.value);
        }
        this.deferredEntityVariables = [];

        // 4. Remove Components
        for (const comp of this.deferredRemoveComponent) {
            this.context.unregisterComponent(comp);
        }
        this.deferredRemoveComponent = [];

        // 5. Destroy Entities
        for (const id of this.deferredDestroyEntities) {
            this.context.unregisterEntity(id);
        }
        this.deferredDestroyEntities = [];
    }

    /**
     * Cleanup all systems
     */
    public destroy() {
        for (const system of this.systems) {
            if (system.onDestroy) {
                system.onDestroy();
            }
        }
        this.systems = [];
    }
}
