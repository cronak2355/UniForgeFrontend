import type { InputState } from "./RuntimePhysics";
import type { RuntimeEntity } from "./RuntimeEntity";
import type { RuntimeComponent } from "./RuntimeComponent";
import { ModuleLiteral } from "../types/Module";

export type CollisionContact = {
    otherId: string;
    otherTag?: string;
    selfTag?: string;
    overlapX?: number;
    overlapY?: number;
    normalX?: number;
    normalY?: number;
};

export type EntityCollisionContext = {
    current: CollisionContact[];
    entered: CollisionContact[];
    exited: CollisionContact[];
    grounded: boolean;
};

export type EntitySignalContext = {
    flags: Record<string, boolean>;
    values: Record<string, number | string | boolean | null>;
};

export type EntityRuntimeContext = {
    collisions: EntityCollisionContext;
    signals: EntitySignalContext;
};

export type RuntimeVariable = {
    name: string;
    type: string;
    value: ModuleLiteral;
}

/**
 * RuntimeContext
 * 
 * Central Data Container for the Runtime.
 * Holds all Entities, Components, and Runtime States.
 * Acts as the "Database" for the Query System.
 */
export class RuntimeContext {
    // =========================================================================
    // Core Data Stores
    // =========================================================================

    /** All Active Runtime Entities mapped by ID */
    public entities: Map<string, RuntimeEntity> = new Map();

    /** 
     * Components grouped by Type.
     * Map<ComponentType, ComponentArray> 
     * Useful for iterating all components of a specific type (System query).
     */
    public componentsByType: Map<string, RuntimeComponent[]> = new Map();

    /**
     * Map helper to find specific components by Entity ID.
     * Map<EntityId, Component[]>
     */
    public componentsByEntity: Map<string, RuntimeComponent[]> = new Map();

    /** Global and Local Variables */
    public variables: Map<string, RuntimeVariable> = new Map();
    public entityVariables: Map<string, Map<string, RuntimeVariable>> = new Map();


    // =========================================================================
    // Legacy / Subsystem States (Physics, Input, Signals)
    // =========================================================================
    private input: InputState = { left: false, right: false, up: false, down: false, jump: false };
    private entityContexts: Map<string, EntityRuntimeContext> = new Map();
    private groundTags: Set<string> = new Set(["Wall"]);

    // =========================================================================
    // Data Management
    // =========================================================================

    public registerEntity(entity: RuntimeEntity) {
        this.entities.set(entity.id, entity);
    }

    public unregisterEntity(id: string) {
        this.entities.delete(id);
        this.componentsByEntity.delete(id);
        // Clean up entity variables
        this.entityVariables.delete(id);
        // Clean up entity context
        this.entityContexts.delete(id);
    }

    public registerComponent(component: RuntimeComponent) {
        // Index by Type
        if (!this.componentsByType.has(component.type)) {
            this.componentsByType.set(component.type, []);
        }
        this.componentsByType.get(component.type)!.push(component);

        // Index by Entity
        if (!this.componentsByEntity.has(component.entityId)) {
            this.componentsByEntity.set(component.entityId, []);
        }
        this.componentsByEntity.get(component.entityId)!.push(component);
    }

    public unregisterComponent(component: RuntimeComponent) {
        // Remove from Type Index
        const typeList = this.componentsByType.get(component.type);
        if (typeList) {
            const idx = typeList.indexOf(component);
            if (idx !== -1) typeList.splice(idx, 1);
        }

        // Remove from Entity Index
        const entityList = this.componentsByEntity.get(component.entityId);
        if (entityList) {
            const idx = entityList.indexOf(component);
            if (idx !== -1) entityList.splice(idx, 1);
        }
    }

    public getAllComponentsOfType(type: string): RuntimeComponent[] {
        return this.componentsByType.get(type) ?? [];
    }

    public getEntityComponents(entityId: string): RuntimeComponent[] {
        return this.componentsByEntity.get(entityId) ?? [];
    }

    // =========================================================================
    // Variable Access
    // =========================================================================

    public setEntityVariable(entityId: string, name: string, value: ModuleLiteral, type: string = "any") {
        if (!this.entityVariables.has(entityId)) {
            this.entityVariables.set(entityId, new Map());
        }
        this.entityVariables.get(entityId)!.set(name, { name, value, type });
    }

    public getEntityVariable(entityId: string, name: string): ModuleLiteral | undefined {
        return this.entityVariables.get(entityId)?.get(name)?.value;
    }


    // =========================================================================
    // Input & System Hooks
    // =========================================================================

    setInput(next: InputState): void {
        this.input = { ...next };
    }

    getInput(): InputState {
        return { ...this.input };
    }

    setGroundTags(tags: string[]): void {
        this.groundTags = new Set(tags);
    }

    beginFrame(): void {
        for (const ctx of this.entityContexts.values()) {
            ctx.collisions.entered = [];
            ctx.collisions.exited = [];
        }
    }

    // =========================================================================
    // Entity Context (Physics/Collision/Signal Buffer)
    // =========================================================================

    getEntityContext(entityId: string): EntityRuntimeContext {
        const existing = this.entityContexts.get(entityId);
        if (existing) {
            return existing;
        }
        const created: EntityRuntimeContext = {
            collisions: {
                current: [],
                entered: [],
                exited: [],
                grounded: false,
            },
            signals: {
                flags: {},
                values: {},
            },
        };
        this.entityContexts.set(entityId, created);
        return created;
    }

    clearEntities(): void {
        this.entities.clear();
        this.componentsByType.clear();
        this.componentsByEntity.clear();
        this.entityVariables.clear();
        this.entityContexts.clear();
        this.variables.clear();
    }

    // Pass-through for Physics System
    recordCollisionEnter(entityId: string, contact: CollisionContact): void {
        const ctx = this.getEntityContext(entityId);
        this.upsertContact(ctx.collisions.current, contact);
        ctx.collisions.entered.push(contact);
        this.updateGrounded(ctx.collisions);
    }

    recordCollisionStay(entityId: string, contact: CollisionContact): void {
        const ctx = this.getEntityContext(entityId);
        this.upsertContact(ctx.collisions.current, contact);
        this.updateGrounded(ctx.collisions);
    }

    recordCollisionExit(entityId: string, otherId: string): void {
        const ctx = this.getEntityContext(entityId);
        const removed = this.removeContact(ctx.collisions.current, otherId);
        ctx.collisions.exited.push(removed ?? { otherId });
        this.updateGrounded(ctx.collisions);
    }

    setSignal(entityId: string, key: string, value: number | string | boolean | null): void {
        const ctx = this.getEntityContext(entityId);
        ctx.signals.flags[key] = true;
        ctx.signals.values[key] = value;
    }

    clearSignal(entityId: string, key: string): void {
        const ctx = this.getEntityContext(entityId);
        ctx.signals.flags[key] = false;
    }

    private upsertContact(list: CollisionContact[], contact: CollisionContact): void {
        const idx = list.findIndex((c) => c.otherId === contact.otherId);
        if (idx >= 0) {
            list[idx] = { ...list[idx], ...contact };
            return;
        }
        list.push(contact);
    }

    private removeContact(list: CollisionContact[], otherId: string): CollisionContact | null {
        const idx = list.findIndex((c) => c.otherId === otherId);
        if (idx < 0) return null;
        const [removed] = list.splice(idx, 1);
        return removed;
    }

    private updateGrounded(ctx: EntityCollisionContext): void {
        ctx.grounded = ctx.current.some((c) => c.otherTag && this.groundTags.has(c.otherTag));
    }
}
