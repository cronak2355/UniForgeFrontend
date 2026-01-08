import type { EditorEntity } from "../types/Entity";

export interface InputState {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
    keys?: Record<string, boolean>;
}

export interface PhysicsState {
    velocityX: number;
    velocityY: number;
    isGrounded: boolean;
    wasJumpPressed: boolean;
}

export interface PhysicsResult {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    isGrounded: boolean;
}

function getNumberVar(entity: EditorEntity, name: string, fallback: number): number {
    const variable = entity.variables?.find((v) => v.name === name);
    return typeof variable?.value === "number" ? variable.value : fallback;
}

function getStringVar(entity: EditorEntity, name: string, fallback: string): string {
    const variable = entity.variables?.find((v) => v.name === name);
    return typeof variable?.value === "string" ? variable.value : fallback;
}

export class RuntimePhysics {
    private states: Map<string, PhysicsState> = new Map();
    private groundY = 500;
    private readonly MAX_FALL_SPEED = 600;
    private readonly FALL_GRAVITY_MULTIPLIER = 1.5;

    getState(entityId: string): PhysicsState {
        if (!this.states.has(entityId)) {
            this.states.set(entityId, {
                velocityX: 0,
                velocityY: 0,
                isGrounded: false,
                wasJumpPressed: false,
            });
        }
        return this.states.get(entityId)!;
    }

    removeState(entityId: string): void {
        this.states.delete(entityId);
    }

    updateEntity(entity: EditorEntity, dt: number, input: InputState): PhysicsResult {
        const state = this.getState(entity.id);
        const mode = getStringVar(entity, "physicsMode", "TopDown");
        const isPlatformer = mode === "Platformer";
        const speed = getNumberVar(entity, "maxSpeed", 200);
        const gravity = getNumberVar(entity, "gravity", 800);
        const jumpForce = getNumberVar(entity, "jumpForce", 400);

        let x = entity.x;
        let y = entity.y;
        let velocityY = state.velocityY;

        const isGrounded = y >= this.groundY;
        if (isGrounded && velocityY > 0) {
            y = this.groundY;
            velocityY = 0;
        }

        let dx = 0;
        let dy = 0;

        if (input.left) dx -= 1;
        if (input.right) dx += 1;

        if (!isPlatformer) {
            if (input.up) dy -= 1;
            if (input.down) dy += 1;

            if (dx !== 0 && dy !== 0) {
                const len = Math.sqrt(dx * dx + dy * dy);
                dx /= len;
                dy /= len;
            }
        }

        if (isPlatformer) {
            const gravityMultiplier = velocityY > 0 ? this.FALL_GRAVITY_MULTIPLIER : 1.0;
            velocityY += gravity * gravityMultiplier * dt;
            if (velocityY > this.MAX_FALL_SPEED) {
                velocityY = this.MAX_FALL_SPEED;
            }

            const jumpPressed = input.jump;
            if (jumpPressed && !state.wasJumpPressed && isGrounded) {
                velocityY = -jumpForce;
            }
            state.wasJumpPressed = jumpPressed;
            y += velocityY * dt;
        }

        x += dx * speed * dt;
        if (!isPlatformer) {
            y += dy * speed * dt;
        }

        state.velocityX = dx * speed;
        state.velocityY = velocityY;
        state.isGrounded = isGrounded;

        return {
            x,
            y,
            velocityX: state.velocityX,
            velocityY,
            isGrounded,
        };
    }

    setGroundY(y: number): void {
        this.groundY = y;
    }

    reset(): void {
        this.states.clear();
    }
}

export const runtimePhysics = new RuntimePhysics();
