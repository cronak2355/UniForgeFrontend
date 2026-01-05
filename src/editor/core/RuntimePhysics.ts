/**
 * RuntimePhysics - 엔진 독립적 물리 계산 모듈
 * 
 * 모든 물리 계산(이동, 중력, 점프 등)을 처리합니다.
 * Phaser, Unity 등 어떤 엔진에서도 동일하게 동작해야 합니다.
 */

import type { EditorEntity } from "../types/Entity";
import type { KineticModuleData } from "../types/Module";

/**
 * 입력 상태 인터페이스 (엔진 독립적)
 */
export interface InputState {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
}

/**
 * 물리 상태 (엔티티별)
 */
export interface PhysicsState {
    velocityX: number;
    velocityY: number;
    isGrounded: boolean;
    wasJumpPressed: boolean;
}

/**
 * 물리 업데이트 결과
 */
export interface PhysicsResult {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    isGrounded: boolean;
}

/**
 * RuntimePhysics - 엔진 독립적 물리 엔진
 */
export class RuntimePhysics {
    // 엔티티별 물리 상태
    private states: Map<string, PhysicsState> = new Map();

    // 바닥 높이 (나중에 타일맵 기반으로 확장 가능)
    private groundY = 500;

    // 물리 상수
    private readonly MAX_FALL_SPEED = 600;
    private readonly FALL_GRAVITY_MULTIPLIER = 1.5;

    /**
     * 엔티티의 물리 상태 가져오기 (없으면 생성)
     */
    getState(entityId: string): PhysicsState {
        if (!this.states.has(entityId)) {
            this.states.set(entityId, {
                velocityX: 0,
                velocityY: 0,
                isGrounded: false,
                wasJumpPressed: false
            });
        }
        return this.states.get(entityId)!;
    }

    /**
     * 엔티티 물리 상태 제거
     */
    removeState(entityId: string): void {
        this.states.delete(entityId);
    }

    /**
     * 엔티티 물리 업데이트
     * @param entity 엔티티 데이터
     * @param dt 델타 타임 (초)
     * @param input 입력 상태
     * @returns 업데이트된 위치 및 상태
     */
    updateEntity(
        entity: EditorEntity,
        dt: number,
        input: InputState
    ): PhysicsResult {
        // Kinetic 모듈 찾기
        const kineticModule = entity.modules?.find(m => m.type === "Kinetic") as KineticModuleData | undefined;

        if (!kineticModule) {
            // Kinetic 모듈이 없으면 현재 위치 유지
            return {
                x: entity.x,
                y: entity.y,
                velocityX: 0,
                velocityY: 0,
                isGrounded: true
            };
        }

        const state = this.getState(entity.id);
        const isPlatformer = kineticModule.mode === "Platformer";
        const speed = kineticModule.maxSpeed || 200;
        const gravity = kineticModule.gravity || 800;
        const jumpForce = kineticModule.jumpForce || 400;

        let x = entity.x;
        let y = entity.y;
        let velocityY = state.velocityY;

        // === 바닥 감지 ===
        const isGrounded = y >= this.groundY;
        if (isGrounded && velocityY > 0) {
            y = this.groundY;
            velocityY = 0;
        }

        // === 방향 계산 ===
        let dx = 0;
        let dy = 0;

        // 좌우 이동 (Platformer와 TopDown 모두)
        if (input.left) dx -= 1;
        if (input.right) dx += 1;

        // 상하 이동 (TopDown 전용)
        if (!isPlatformer) {
            if (input.up) dy -= 1;
            if (input.down) dy += 1;

            // 대각선 속도 정규화
            if (dx !== 0 && dy !== 0) {
                const len = Math.sqrt(dx * dx + dy * dy);
                dx /= len;
                dy /= len;
            }
        }

        // === Platformer 전용 로직 ===
        if (isPlatformer) {
            // 중력 적용 (낙하 시 더 빠르게)
            const gravityMultiplier = velocityY > 0 ? this.FALL_GRAVITY_MULTIPLIER : 1.0;
            velocityY += gravity * gravityMultiplier * dt;

            // 최대 낙하 속도 제한
            if (velocityY > this.MAX_FALL_SPEED) {
                velocityY = this.MAX_FALL_SPEED;
            }

            // 점프 (수동 상태 추적으로 한 번만 점프)
            const jumpPressed = input.jump;
            if (jumpPressed && !state.wasJumpPressed && isGrounded) {
                velocityY = -jumpForce;
            }
            state.wasJumpPressed = jumpPressed;

            // Y축 이동 (중력 기반)
            y += velocityY * dt;
        }

        // === 이동 적용 ===
        x += dx * speed * dt;
        if (!isPlatformer) {
            y += dy * speed * dt;
        }

        // 상태 업데이트
        state.velocityY = velocityY;
        state.isGrounded = isGrounded;

        return {
            x,
            y,
            velocityX: dx * speed,
            velocityY,
            isGrounded
        };
    }

    /**
     * 바닥 높이 설정
     */
    setGroundY(y: number): void {
        this.groundY = y;
    }

    /**
     * 모든 물리 상태 초기화
     */
    reset(): void {
        this.states.clear();
    }
}

// 싱글톤 인스턴스 (GameCore에서 사용)
export const runtimePhysics = new RuntimePhysics();
