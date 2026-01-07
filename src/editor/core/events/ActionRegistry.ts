import type { InputState } from "../RuntimePhysics";

export type EntityVariable = { name: string; value: unknown };

export type EntityLike = {
    id: string;
    x?: number;
    y?: number;
    role?: string;
    rotation?: number;
    rotationZ?: number;
    scaleX?: number;
    scaleY?: number;
    variables?: EntityVariable[];
};

export interface ActionGlobals {
    renderer?: {
        getGameObject?(id: string): {
            x: number;
            y: number;
            rotation?: number;
            setScale?(s: number): void;
            setVisible?(v: boolean): void;
            setActive?(v: boolean): void;
        } | null;
        getAllEntityIds?(): string[];
        worldToScreen?(x: number, y: number, z?: number): { x: number; y: number };
    };
    scene?: unknown;
    entities?: Map<string, EntityLike>;
    gameCore?: {
        getEntitiesByRole?(role: string): { id: string; x: number; y: number; role: string }[];
        getNearestEntityByRole?(
            role: string,
            fromX: number,
            fromY: number,
            excludeId?: string
        ): { id: string; x: number; y: number; role: string } | undefined;
    };
}

export interface ActionContext {
    entityId: string;
    eventData: Record<string, unknown>;
    globals?: ActionGlobals;
    input?: InputState;
    entityContext?: {
        collisions: {
            current: Array<{
                otherId: string;
                otherTag?: string;
                selfTag?: string;
                overlapX?: number;
                overlapY?: number;
                normalX?: number;
                normalY?: number;
            }>;
            entered: Array<{
                otherId: string;
                otherTag?: string;
                selfTag?: string;
                overlapX?: number;
                overlapY?: number;
                normalX?: number;
                normalY?: number;
            }>;
            exited: Array<{
                otherId: string;
                otherTag?: string;
                selfTag?: string;
                overlapX?: number;
                overlapY?: number;
                normalX?: number;
                normalY?: number;
            }>;
            grounded: boolean;
        };
        signals: {
            flags: Record<string, boolean>;
            values: Record<string, number | string | boolean | null>;
        };
    };
}

export type ActionFn = (ctx: ActionContext, params: Record<string, unknown>) => void;

class ActionRegistryClass {
    private actions = new Map<string, ActionFn>();

    constructor() {
        console.log("[ActionRegistry] Initialized");
    }

    register(name: string, fn: ActionFn) {
        if (this.actions.has(name)) {
            console.warn(`[ActionRegistry] Action '${name}' is being overwritten.`);
        }
        this.actions.set(name, fn);
    }

    run(name: string, ctx: ActionContext, params: Record<string, unknown>) {
        const action = this.actions.get(name);
        if (!action) {
            console.warn(`[ActionRegistry] Action '${name}' not found.`);
            return;
        }

        try {
            action(ctx, params);
        } catch (e) {
            console.error(`[ActionRegistry] Error running action '${name}':`, e);
        }
    }

    getAvailableActions(): string[] {
        return Array.from(this.actions.keys());
    }
}

export const ActionRegistry = new ActionRegistryClass();
