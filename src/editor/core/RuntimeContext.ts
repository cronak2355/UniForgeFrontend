import type { InputState } from "./RuntimePhysics";

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

export class RuntimeContext {
    private input: InputState = { left: false, right: false, up: false, down: false, jump: false };
    private entities: Map<string, EntityRuntimeContext> = new Map();
    private groundTags: Set<string> = new Set(["Wall"]);

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
        for (const ctx of this.entities.values()) {
            ctx.collisions.entered = [];
            ctx.collisions.exited = [];
        }
    }

    getEntityContext(entityId: string): EntityRuntimeContext {
        const existing = this.entities.get(entityId);
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
        this.entities.set(entityId, created);
        return created;
    }

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
