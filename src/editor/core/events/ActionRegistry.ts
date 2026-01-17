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
        playAnim?(id: string, name: string, loop?: boolean): void;
        // 파티클 시스템
        playParticle?(presetId: string, x: number, y: number, scale?: number): void;
        playCustomParticle?(textureId: string, x: number, y: number, scale?: number): void;
        registerCustomParticle?(id: string, url: string): void;
        getCustomParticles?(): string[];
        createParticleEmitter?(id: string, presetId: string, x: number, y: number): void;
        stopParticleEmitter?(id: string): void;
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
        startModule?(entityId: string, moduleId: string, initialVariables?: Record<string, any>): boolean;
        createEntity?(
            id: string,
            type: string,
            x: number,
            y: number,
            options?: Record<string, unknown>
        ): boolean;
    };
    hitTag?: string;
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
    scope?: Map<string, any>; // Local scope for module variables
}

export type ActionFn = (ctx: ActionContext, params: Record<string, unknown>) => void;

class ActionRegistryClass {
    private actions = new Map<string, ActionFn>();

    constructor() {
        this.registerDefaults();
    }

    register(name: string, fn: ActionFn) {
        if (this.actions.has(name)) {
            console.warn(`[ActionRegistry] Action '${name}' is being overwritten.`);
        }
        this.actions.set(name, fn);
    }

    private registerDefaults() {
        this.register("PlayAnimation", (ctx, params) => {
            const animName = params.animationName as string;
            const loopParam = params.loop;
            const loop = typeof loopParam === 'boolean' ? loopParam : undefined;

            if (animName && ctx.globals?.renderer?.playAnim) {
                ctx.globals.renderer.playAnim(ctx.entityId, animName, loop);
            }
        });


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
