/**
 * GameCore - 엔진 독립적 게임 로직 계층
 * 
 * 모든 게임 로직(캐릭터 이동, 상태 관리, 게임 규칙 등)은 이 클래스에서 관리합니다.
 * Phaser 등 렌더링 엔진에 대한 의존성이 없으며, IRenderer 인터페이스만 사용합니다.
 */

import type { IRenderer } from "../renderer/IRenderer";
import type { EditorComponent, AutoRotateComponent, PulseComponent } from "../types/Component";

/**
 * 게임 엔티티 데이터 구조 (순수 JavaScript 객체)
 */
export interface GameEntity {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    z: number;  // 기본값 0, Phaser에서는 depth로 사용
    rotation: number;
    scaleX: number;
    scaleY: number;
    components: EditorComponent[];
}

/**
 * 엔티티 생성 옵션
 */
export interface CreateEntityOptions {
    name?: string;
    z?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    components?: EditorComponent[];
}

/**
 * 컴포넌트 런타임 데이터
 */
interface ComponentRuntime {
    entityId: string;
    component: EditorComponent;
    // Pulse 컴포넌트용 초기 스케일
    initialScale?: { x: number; y: number };
}

/**
 * GameCore - 엔진 독립적 로직 계층
 * 
 * 설계 원칙:
 * 1. ID 동기화: 외부에서 전달받은 ID를 사용하며, 중복 검사 수행
 * 2. 순수 데이터: 모든 상태는 순수 JavaScript 객체로 관리
 * 3. 렌더러 추상화: IRenderer 인터페이스만 호출
 */
export class GameCore {
    private renderer: IRenderer;

    // ===== 엔티티 관리 - ID 동기화 보장 =====
    private entities: Map<string, GameEntity> = new Map();

    // ===== 컴포넌트 런타임 (최적화된 업데이트 루프) =====
    private componentRuntimes: ComponentRuntime[] = [];

    // ===== 구독자 (상태 변경 알림) =====
    private listeners: Set<() => void> = new Set();

    constructor(renderer: IRenderer) {
        this.renderer = renderer;
    }

    // ===== Entity Management - ID 동기화 보장 =====

    /**
     * 엔티티 생성
     * @param id 외부에서 전달받은 ID (자체 생성 금지)
     * @param type 엔티티 타입
     * @param x X 좌표
     * @param y Y 좌표
     * @param options 추가 옵션
     * @returns 생성 성공 여부
     */
    createEntity(
        id: string,
        type: string,
        x: number,
        y: number,
        options: CreateEntityOptions = {}
    ): boolean {
        // ID 중복 검사 - EditorState와의 동기화 보장
        if (this.entities.has(id)) {
            console.error(`[GameCore] Entity with id "${id}" already exists! ID sync violation.`);
            return false;
        }

        const entity: GameEntity = {
            id,
            type,
            name: options.name ?? `Entity_${id.slice(0, 8)}`,
            x,
            y,
            z: options.z ?? 0,
            rotation: options.rotation ?? 0,
            scaleX: options.scaleX ?? 1,
            scaleY: options.scaleY ?? 1,
            components: options.components ?? [],
        };

        // 1. 로컬 상태에 저장
        this.entities.set(id, entity);

        // 2. 렌더러에 스폰 요청
        this.renderer.spawn(id, type, x, y, entity.z);

        // 3. 컴포넌트 런타임 등록
        this.registerComponentRuntimes(entity);

        // 4. 구독자 알림
        this.notify();

        console.log(`[GameCore] Created entity: ${id} (${type}) at (${x}, ${y}, ${entity.z})`);
        return true;
    }

    /**
     * 엔티티 이동
     */
    moveEntity(id: string, x: number, y: number, z?: number): void {
        const entity = this.entities.get(id);
        if (!entity) {
            console.warn(`[GameCore] Cannot move: entity "${id}" not found`);
            return;
        }

        entity.x = x;
        entity.y = y;
        if (z !== undefined) {
            entity.z = z;
        }

        this.renderer.update(id, x, y, entity.z, entity.rotation);
        this.notify();
    }

    /**
     * 엔티티 회전
     */
    rotateEntity(id: string, rotation: number): void {
        const entity = this.entities.get(id);
        if (!entity) return;

        entity.rotation = rotation;
        this.renderer.update(id, entity.x, entity.y, entity.z, rotation);
        this.notify();
    }

    /**
     * 엔티티 제거
     */
    removeEntity(id: string): void {
        const entity = this.entities.get(id);
        if (!entity) {
            console.warn(`[GameCore] Cannot remove: entity "${id}" not found`);
            return;
        }

        // 1. 컴포넌트 런타임 제거
        this.unregisterComponentRuntimes(id);

        // 2. 렌더러에서 제거
        this.renderer.remove(id);

        // 3. 로컬 상태에서 제거
        this.entities.delete(id);

        // 4. 구독자 알림
        this.notify();

        console.log(`[GameCore] Removed entity: ${id}`);
    }

    /**
     * 엔티티 조회
     */
    getEntity(id: string): GameEntity | undefined {
        return this.entities.get(id);
    }

    /**
     * 엔티티 존재 여부 확인
     */
    hasEntity(id: string): boolean {
        return this.entities.has(id);
    }

    /**
     * 모든 엔티티 반환
     */
    getAllEntities(): Map<string, GameEntity> {
        return new Map(this.entities);
    }

    /**
     * 엔티티 수 반환
     */
    getEntityCount(): number {
        return this.entities.size;
    }

    /**
     * ID 동기화 검증
     * GameCore와 Renderer의 엔티티 ID가 일치하는지 확인
     */
    validateIdSync(): boolean {
        const coreIds = Array.from(this.entities.keys()).sort();
        const rendererIds = this.renderer.getAllEntityIds().sort();

        if (coreIds.length !== rendererIds.length) {
            console.error(`[GameCore] ID sync mismatch: core=${coreIds.length}, renderer=${rendererIds.length}`);
            return false;
        }

        for (let i = 0; i < coreIds.length; i++) {
            if (coreIds[i] !== rendererIds[i]) {
                console.error(`[GameCore] ID mismatch at index ${i}: core="${coreIds[i]}", renderer="${rendererIds[i]}"`);
                return false;
            }
        }

        return true;
    }

    // ===== Component System =====

    /**
     * 엔티티에 컴포넌트 추가
     */
    addComponent(entityId: string, component: EditorComponent): void {
        const entity = this.entities.get(entityId);
        if (!entity) {
            console.warn(`[GameCore] Cannot add component: entity "${entityId}" not found`);
            return;
        }

        entity.components.push(component);

        // 런타임 등록
        this.componentRuntimes.push({
            entityId,
            component,
            initialScale: { x: entity.scaleX, y: entity.scaleY },
        });

        this.notify();
    }

    /**
     * 엔티티에서 컴포넌트 제거
     */
    removeComponent(entityId: string, componentId: string): void {
        const entity = this.entities.get(entityId);
        if (!entity) return;

        const idx = entity.components.findIndex(c => c.id === componentId);
        if (idx >= 0) {
            entity.components.splice(idx, 1);
        }

        // 런타임 제거
        this.componentRuntimes = this.componentRuntimes.filter(
            r => !(r.entityId === entityId && r.component.id === componentId)
        );

        this.notify();
    }

    /**
     * 컴포넌트 런타임 등록 (내부용)
     */
    private registerComponentRuntimes(entity: GameEntity): void {
        for (const comp of entity.components) {
            this.componentRuntimes.push({
                entityId: entity.id,
                component: comp,
                initialScale: { x: entity.scaleX, y: entity.scaleY },
            });
        }
    }

    /**
     * 컴포넌트 런타임 제거 (내부용)
     */
    private unregisterComponentRuntimes(entityId: string): void {
        this.componentRuntimes = this.componentRuntimes.filter(r => r.entityId !== entityId);
    }

    // ===== Update Loop =====

    /**
     * 프레임 업데이트 (렌더러의 update에서 호출)
     * @param time 현재 시간 (ms)
     * @param deltaTime 이전 프레임으로부터의 시간 (초)
     */
    update(time: number, deltaTime: number): void {
        for (const runtime of this.componentRuntimes) {
            const entity = this.entities.get(runtime.entityId);
            if (!entity) continue;

            this.processComponent(entity, runtime, time, deltaTime);
        }
    }

    /**
     * 컴포넌트 처리 (순수 로직)
     */
    private processComponent(
        entity: GameEntity,
        runtime: ComponentRuntime,
        time: number,
        dt: number
    ): void {
        const comp = runtime.component;

        switch (comp.type) {
            case "AutoRotate": {
                const c = comp as AutoRotateComponent;
                entity.rotation += c.speed * dt;
                this.renderer.update(entity.id, entity.x, entity.y, entity.z, entity.rotation);
                break;
            }

            case "Pulse": {
                const c = comp as PulseComponent;
                const t = (time / 1000) * c.speed;
                const scaleRange = (c.maxScale - c.minScale) / 2;
                const baseScale = (c.maxScale + c.minScale) / 2;
                const currentScale = baseScale + Math.sin(t) * scaleRange;

                entity.scaleX = currentScale;
                entity.scaleY = currentScale;
                // Note: 스케일 업데이트는 렌더러에서 별도 처리 필요
                break;
            }
        }
    }

    // ===== Subscription =====

    /**
     * 상태 변경 구독
     */
    subscribe(callback: () => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * 구독자에게 알림
     */
    private notify(): void {
        for (const cb of this.listeners) {
            cb();
        }
    }

    // ===== Lifecycle =====

    /**
     * GameCore 정리
     * 모든 엔티티와 컴포넌트 런타임 해제
     */
    destroy(): void {
        // 1. 모든 엔티티를 렌더러에서 제거
        for (const id of this.entities.keys()) {
            this.renderer.remove(id);
        }

        // 2. 로컬 상태 정리
        this.entities.clear();
        this.componentRuntimes = [];
        this.listeners.clear();

        console.log("[GameCore] Destroyed - all entities and runtimes cleaned up");
    }

    // ===== Serialization (저장/불러오기용) =====

    /**
     * 모든 엔티티 데이터를 JSON으로 직렬화
     */
    serialize(): GameEntity[] {
        return Array.from(this.entities.values());
    }

    /**
     * JSON 데이터로부터 엔티티 복원
     */
    deserialize(data: GameEntity[]): void {
        // 기존 엔티티 정리
        this.destroy();

        // 새 엔티티 생성
        for (const entityData of data) {
            this.createEntity(entityData.id, entityData.type, entityData.x, entityData.y, {
                name: entityData.name,
                z: entityData.z,
                rotation: entityData.rotation,
                scaleX: entityData.scaleX,
                scaleY: entityData.scaleY,
                components: entityData.components,
            });
        }
    }
}
