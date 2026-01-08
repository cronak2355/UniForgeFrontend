/**
 * GameCore - ?붿쭊 ?낅┰??寃뚯엫 濡쒖쭅 怨꾩링
 * 
 * 紐⑤뱺 寃뚯엫 濡쒖쭅(罹먮┃???대룞, ?곹깭 愿由? 寃뚯엫 洹쒖튃 ??? ???대옒?ㅼ뿉??愿由ы빀?덈떎.
 * Phaser ???뚮뜑留??붿쭊??????섏〈?깆씠 ?놁쑝硫? IRenderer ?명꽣?섏씠?ㅻ쭔 ?ъ슜?⑸땲??
 */

import type { IRenderer } from "../renderer/IRenderer";
import type {
    EditorComponent,
    TransformComponent,
    SignalComponent,
    LogicComponent
} from "../types/Component";

import type { Trigger } from "../types/Trigger";
import type { Condition } from "../types/Condition";
import type { EditorVariable } from "../types/Variable";
import type { InputState } from "./RuntimePhysics";
import { EventBus } from "./events/EventBus";
import { ConditionRegistry } from "./events/ConditionRegistry";
import { ActionRegistry, type ActionContext } from "./events/ActionRegistry";
import { RuntimeContext } from "./RuntimeContext";
import { collisionSystem } from "./CollisionSystem";
import { type GameConfig, defaultGameConfig } from "./GameConfig";

/**
 * 寃뚯엫 ?뷀떚???곗씠??援ъ“ (?쒖닔 JavaScript 媛앹껜)
 */
export interface GameEntity {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    z: number;  // 湲곕낯媛?0, Phaser?먯꽌??depth濡??ъ슜
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    variables: EditorVariable[];
    components: EditorComponent[];
    width?: number;
    height?: number;
    /** ?뷀떚????븷 (寃뚯엫 濡쒖쭅 ?寃잜똿?? */
    role: string;
}

/**
 * ?뷀떚???앹꽦 ?듭뀡
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
}

interface TriggerRuntime {
    entityId: string;
    component: Trigger;
    triggered: boolean;
}

/**
 * 而댄룷?뚰듃 ?고????곗씠??
 */
interface ComponentRuntime {
    entityId: string;
    component: EditorComponent;
    // Pulse 而댄룷?뚰듃??珥덇린 ?ㅼ???
    initialScale?: { x: number; y: number };
}

/**
 * GameCore - ?붿쭊 ?낅┰??濡쒖쭅 怨꾩링
 * 
 * ?ㅺ퀎 ?먯튃:
 * 1. ID ?숆린?? ?몃??먯꽌 ?꾨떖諛쏆? ID瑜??ъ슜?섎ŉ, 以묐났 寃???섑뻾
 * 2. ?쒖닔 ?곗씠?? 紐⑤뱺 ?곹깭???쒖닔 JavaScript 媛앹껜濡?愿由?
 * 3. ?뚮뜑??異붿긽?? IRenderer ?명꽣?섏씠?ㅻ쭔 ?몄텧
 */
export class GameCore {
    private renderer: IRenderer;

    // ===== ?뷀떚??愿由?- ID ?숆린??蹂댁옣 =====
    private entities: Map<string, GameEntity> = new Map();

    // ===== 而댄룷?뚰듃 ?고???(理쒖쟻?붾맂 ?낅뜲?댄듃 猷⑦봽) =====
    private componentRuntimes: ComponentRuntime[] = [];
    private triggerRuntimes: TriggerRuntime[] = [];
    private inputState: InputState = { left: false, right: false, up: false, down: false, jump: false };
    private runtimeContext = new RuntimeContext();
    private eventHandler?: (event: import("./events/EventBus").GameEvent) => void;
    private variableSnapshots: Map<string, Map<string, unknown>> = new Map();
    private startedComponents: Set<string> = new Set();
    private groundY = 500;

    // ===== 援щ룆??(?곹깭 蹂寃??뚮┝) =====
    private listeners: Set<() => void> = new Set();

    // ===== 寃뚯엫 ?ㅼ젙 =====
    private gameConfig: GameConfig = defaultGameConfig;

    constructor(renderer: IRenderer) {
        this.renderer = renderer;
        this.eventHandler = (event) => {
            if (!event || !event.type) return;

            if (event.type === "COLLISION_ENTER" || event.type === "COLLISION_STAY") {
                const data = event.data as {
                    entityA?: string;
                    entityB?: string;
                    tagA?: string;
                    tagB?: string;
                    overlapX?: number;
                    overlapY?: number;
                    normalX?: number;
                    normalY?: number;
                } | undefined;
                if (!data?.entityA || !data.entityB) return;

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
                return;
            }

            if (event.type === "COLLISION_EXIT") {
                const data = event.data as { entityA?: string; entityB?: string } | undefined;
                if (!data?.entityA || !data.entityB) return;
                this.runtimeContext.recordCollisionExit(data.entityA, data.entityB);
                this.runtimeContext.recordCollisionExit(data.entityB, data.entityA);
            }
        };
        EventBus.on(this.eventHandler);
    }

    // ===== Entity Management - ID ?숆린??蹂댁옣 =====



    /**
     * ?뷀떚???앹꽦
     * @param id ?몃??먯꽌 ?꾨떖諛쏆? ID (?먯껜 ?앹꽦 湲덉?)
     * @param type ?뷀떚?????
     * @param x X 醫뚰몴
     * @param y Y 醫뚰몴
     * @param z Z 醫뚰몴
     * @param options 異붽? ?듭뀡
     * @returns ?앹꽦 ?깃났 ?щ?
     */
    createEntity(
        id: string,
        type: string,
        x: number,
        y: number,
        options: CreateEntityOptions = {}
    ): boolean {
        // ID 以묐났 寃??- EditorState????숆린??蹂댁옣
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
            rotationX: options.rotationX ?? 0,
            rotationY: options.rotationY ?? 0,
            rotationZ: options.rotationZ ?? 0,
            scaleX: options.scaleX ?? 1,
            scaleY: options.scaleY ?? 1,
            scaleZ: options.scaleZ ?? 1,
            variables: options.variables ?? [],
            components: options.components ?? [],
            role: options.role ?? "neutral",
            width: options.width ?? 40,
            height: options.height ?? 40,
        };

        // 1. 濡쒖뺄 ?곹깭?????
        this.entities.set(id, entity);

        // 2. ?뚮뜑?ъ뿉 ?ㅽ룿 ?붿껌
        this.renderer.spawn(id, type, x, y, entity.z, {
            texture: options.texture,
            width: options.width,
            height: options.height,
            color: options.color,
        });
        this.renderer.update(id, entity.x, entity.y, entity.z, entity.rotationZ);
        this.renderer.setScale(id, entity.scaleX, entity.scaleY, entity.scaleZ);
        const baseWidth = entity.width ?? 40;
        const baseHeight = entity.height ?? 40;
        collisionSystem.register(
            id,
            entity.type,
            {
                x: entity.x,
                y: entity.y,
                width: baseWidth * (entity.scaleX ?? 1),
                height: baseHeight * (entity.scaleY ?? 1),
            },
            { isSolid: true }
        );

        // 3. 而댄룷?뚰듃 ?고????깅줉
        this.registerComponentRuntimes(entity);

        // 4. 援щ룆???뚮┝
        this.notify();

        EventBus.emit("OnStart", {}, id);
        console.log(`[GameCore] Created entity: ${id} (${type}) at (${x}, ${y}, ${entity.z})`);
        return true;
    }

    /**
     * ?뷀떚???대룞
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

        this.renderer.update(id, x, y, entity.z, entity.rotationZ);
        collisionSystem.updatePosition(id, entity.x, entity.y);
        this.notify();
    }

    /**
     * ?몃? ?몄쭛湲곗뿉???꾨떖??Transform???숆린??
     */
    setEntityTransform(
        id: string,
        next: {
            x: number;
            y: number;
            z: number;
            rotationX?: number;
            rotationY?: number;
            rotationZ?: number;
            scaleX: number;
            scaleY: number;
            scaleZ?: number;
        }
    ): void {
        const entity = this.entities.get(id);
        if (!entity) {
            console.warn(`[GameCore] Cannot set transform: entity "${id}" not found`);
            return;
        }

        entity.x = next.x;
        entity.y = next.y;
        entity.z = next.z;
        if (next.rotationX !== undefined) entity.rotationX = next.rotationX;
        if (next.rotationY !== undefined) entity.rotationY = next.rotationY;
        if (next.rotationZ !== undefined) entity.rotationZ = next.rotationZ;
        entity.scaleX = next.scaleX;
        entity.scaleY = next.scaleY;
        if (next.scaleZ !== undefined) entity.scaleZ = next.scaleZ;

        this.renderer.update(id, entity.x, entity.y, entity.z, entity.rotationZ);
        this.renderer.setScale(id, entity.scaleX, entity.scaleY, entity.scaleZ);
        collisionSystem.updatePosition(id, entity.x, entity.y);
        const width = (entity.width ?? 40) * (entity.scaleX ?? 1);
        const height = (entity.height ?? 40) * (entity.scaleY ?? 1);
        collisionSystem.updateSize(id, width, height);
        this.notify();
    }

    /**
     * Update entity logic (components and variables) dynamically
     */
    updateEntityLogic(id: string, components: EditorComponent[], variables: EditorVariable[]): void {
        const entity = this.entities.get(id);
        if (!entity) return;

        // Update variables
        entity.variables = variables; // Reference update or deep copy? Reference is fine for editor sync

        // Update Components
        this.unregisterComponentRuntimes(id);
        entity.components = components;
        this.registerComponentRuntimes(entity);

        this.notify();
    }

    /**
     * ?뷀떚???뚯쟾
     */
    rotateEntity(id: string, rotation: number): void {
        const entity = this.entities.get(id);
        if (!entity) return;

        entity.rotationZ = rotation;
        this.renderer.update(id, entity.x, entity.y, entity.z, rotation);
        this.notify();
    }

    /**
     * ?뷀떚???쒓굅
     */
    removeEntity(id: string): void {
        const entity = this.entities.get(id);
        if (!entity) {
            console.warn(`[GameCore] Cannot remove: entity "${id}" not found`);
            return;
        }

        EventBus.emit("OnDestroy", {}, id);

        // 1. 而댄룷?뚰듃 ?고????쒓굅
        this.unregisterComponentRuntimes(id);

        // 2. ?뚮뜑?ъ뿉???쒓굅
        this.renderer.remove(id);
        collisionSystem.unregister(id);

        // 3. 濡쒖뺄 ?곹깭?먯꽌 ?쒓굅
        this.entities.delete(id);
        this.variableSnapshots.delete(id);
        for (const key of this.startedComponents) {
            if (key.startsWith(`${id}:`)) {
                this.startedComponents.delete(key);
            }
        }

        // 4. 援щ룆???뚮┝
        this.notify();

        console.log(`[GameCore] Removed entity: ${id}`);
    }

    /**
     * ?뷀떚??議고쉶
     */
    getEntity(id: string): GameEntity | undefined {
        return this.entities.get(id);
    }

    /**
     * ?뷀떚??議댁옱 ?щ? ?뺤씤
     */
    hasEntity(id: string): boolean {
        return this.entities.has(id);
    }

    /**
     * 紐⑤뱺 ?뷀떚??諛섑솚
     */
    getAllEntities(): Map<string, GameEntity> {
        return new Map(this.entities);
    }

    /**
     */
    /**
     * ?뷀떚????諛섑솚
     */
    getEntityCount(): number {
        return this.entities.size;
    }

    private isEntityAlive(entity: GameEntity): boolean {
        const hpVar = entity.variables?.find((v) => v.name === "hp");
        if (!hpVar || typeof hpVar.value !== "number") return true;
        return hpVar.value > 0;
    }

    /**
     * ??븷(Role)濡??뷀떚??議고쉶
     * @param role 李얠쓣 ??븷 (?? "player", "enemy", "npc")
     * @returns ?대떦 ??븷???뷀떚??諛곗뿴
     */
    getEntitiesByRole(role: string): GameEntity[] {
        const result: GameEntity[] = [];
        for (const entity of this.entities.values()) {
            if (entity.role === role) {
                result.push(entity);
            }
        }
        return result;
    }

    /**
     * ??븷(Role)濡?媛??媛源뚯슫 ?뷀떚??李얘린
     * @param role 李얠쓣 ??븷
     * @param fromX 湲곗? X 醫뚰몴
     * @param fromY 湲곗? Y 醫뚰몴
     * @returns 媛??媛源뚯슫 ?뷀떚???먮뒗 undefined
     */
    getNearestEntityByRole(role: string, fromX: number, fromY: number, excludeId?: string): GameEntity | undefined {
        const candidates = this.getEntitiesByRole(role);
        if (candidates.length === 0) return undefined;

        let nearest: GameEntity | undefined;
        let minDist = Infinity;

        for (const entity of candidates) {
            // 蹂몄씤 ?쒖쇅
            if (excludeId && entity.id === excludeId) continue;

            // ?댁븘?덈뒗 ?뷀떚?곕쭔 怨좊젮
            if (!this.isEntityAlive(entity)) continue;

            const dx = entity.x - fromX;
            const dy = entity.y - fromY;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                nearest = entity;
            }
        }
        return nearest;
    }

    /**
     * ID ?숆린??寃利?
     * GameCore? Renderer???뷀떚??ID媛 ?쇱튂?섎뒗吏 ?뺤씤
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

    /**
     * ?고????낅젰 ?곹깭 媛깆떊
     */
    setInputState(input: InputState): void {
        this.inputState = { ...input };
        this.runtimeContext.setInput(this.inputState);
    }

    /**
     * Platformer 諛붾떏 ?믪씠 ?ㅼ젙
     */
    setGroundY(y: number): void {
        this.groundY = y;
    }

    setGameConfig(config: GameConfig): void {
        this.gameConfig = config;
    }

    getGameConfig(): GameConfig {
        return this.gameConfig;
    }

    // ===== Component System =====

    /**
     * ?뷀떚?곗뿉 而댄룷?뚰듃 異붽?
     */
    addComponent(entityId: string, component: EditorComponent): void {
        const entity = this.entities.get(entityId);
        if (!entity) {
            console.warn(`[GameCore] Cannot add component: entity "${entityId}" not found`);
            return;
        }

        entity.components.push(component);

        // ?고????깅줉
        this.componentRuntimes.push({
            entityId,
            component,
            initialScale: { x: entity.scaleX, y: entity.scaleY },
        });

        this.notify();
    }

    /**
     * ?뷀떚?곗뿉??而댄룷?뚰듃 ?쒓굅
     */
    removeComponent(entityId: string, componentId: string): void {
        const entity = this.entities.get(entityId);
        if (!entity) return;

        const idx = entity.components.findIndex(c => c.id === componentId);
        if (idx >= 0) {
            entity.components.splice(idx, 1);
        }

        // ?고????쒓굅
        this.componentRuntimes = this.componentRuntimes.filter(
            r => !(r.entityId === entityId && r.component.id === componentId)
        );

        this.notify();
    }

    /**
     * 而댄룷?뚰듃 ?고????깅줉 (?대???
     */
    private registerComponentRuntimes(entity: GameEntity): void {
        for (const comp of entity.components) {
            // 1截뤴깵 紐⑤뱺 而댄룷?뚰듃??ComponentRuntime?쇰줈 ?깅줉
            this.componentRuntimes.push({
                entityId: entity.id,
                component: comp,
                initialScale: { x: entity.scaleX, y: entity.scaleY },
            });
            // 2截뤴깵 Trigger媛 ?덈뒗 而댄룷?뚰듃留?TriggerRuntime ?깅줉
            if (comp.trigger) {
                this.triggerRuntimes.push({
                    entityId: entity.id,
                    component: comp as any, // ?뵦 Trigger瑜?媛吏?"而댄룷?뚰듃"
                    triggered: false,
                });
            }
        }
    }

    /**
     * 而댄룷?뚰듃 ?고????쒓굅 (?대???
     */
    private unregisterComponentRuntimes(entityId: string): void {
        this.componentRuntimes = this.componentRuntimes.filter(r => r.entityId !== entityId);
    }

    private updateTriggers(): void {
        for (const runtime of this.triggerRuntimes) {
            if (runtime.triggered && runtime.component.once) continue;

            const owner = this.entities.get(runtime.entityId);
            if (!owner) continue;

            for (const target of this.entities.values()) {
                if (target.id === owner.id) continue;

                if (!this.isTriggerActivated(owner, target, runtime.component)) continue;

                runtime.triggered = true;
                EventBus.emit("TRIGGER_ENTER", {
                    from: owner.id,
                    to: target.id,
                    triggerId: runtime.component.id,
                });
            }
        }
    }

    // ===== Update Loop =====

    /**
     * ?꾨젅???낅뜲?댄듃 (?뚮뜑?ъ쓽 update?먯꽌 ?몄텧)
     * @param time ?꾩옱 ?쒓컙 (ms)
     * @param deltaTime ?댁쟾 ?꾨젅?꾩쑝濡쒕??곗쓽 ?쒓컙 (珥?
     */
    update(time: number, deltaTime: number): void {
        const dt = deltaTime / 1000;
        this.runtimeContext.beginFrame();
        collisionSystem.update();
        this.updateTriggers();

        for (const runtime of this.componentRuntimes) {
            const entity = this.entities.get(runtime.entityId);
            if (!entity) continue;



            this.processComponent(entity, runtime, time, dt);
        }
    }

    private isTriggerActivated(
        a: GameEntity,
        b: GameEntity,
        trigger: Trigger
    ): boolean {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return dx * dx + dy * dy <= trigger.radius * trigger.radius;
    }

    /**
     * 而댄룷?뚰듃 泥섎━ (?쒖닔 濡쒖쭅)
     */
    private processComponent(
        entity: GameEntity,
        runtime: ComponentRuntime,
        time: number,
        dt: number
    ): void {
        const comp = runtime.component;

        // 1截뤴깵 ?몃━嫄??먮퀎
        if (!this.matchTrigger(comp.trigger, entity, time, dt, comp.id)) return;

        // 2截뤴깵 議곌굔 ?먮퀎
        if (!this.matchCondition(comp.condition, entity)) return;

        // 3截뤴깵 ?ㅼ젣 而댄룷?뚰듃 ?숈옉
        switch (comp.type) {
            case "Transform": {
                const t = comp as TransformComponent;

                entity.x += t.x * dt;
                entity.y += t.y * dt;
                entity.rotationZ += t.rotation * dt;
                entity.scaleX = t.scaleX;
                entity.scaleY = t.scaleY;

                this.renderer.update(
                    entity.id,
                    entity.x,
                    entity.y,
                    entity.z,
                    entity.rotationZ
                );
                this.renderer.setScale(
                    entity.id,
                    entity.scaleX,
                    entity.scaleY,
                    entity.scaleZ
                );
                collisionSystem.updatePosition(entity.id, entity.x, entity.y);
                const width = (entity.width ?? 40) * (entity.scaleX ?? 1);
                const height = (entity.height ?? 40) * (entity.scaleY ?? 1);
                collisionSystem.updateSize(entity.id, width, height);
                break;
            }

            case "Signal": {
                const s = comp as SignalComponent;
                const signalKey = s.signalKey?.trim();
                if (!signalKey) break;

                const targetId = s.targetEntityId?.trim() || entity.id;
                if (!this.entities.has(targetId)) {
                    console.warn(`[GameCore] Signal target not found: ${targetId}`);
                    break;
                }

                let value: number | string | boolean | null = null;
                const signalVal = s.signalValue;
                if (signalVal?.kind === "EntityVariable" && "name" in signalVal) {
                    const variable = entity.variables?.find(v => v.name === signalVal.name);
                    if (variable) {
                        value = variable.value as number | string | boolean;
                    }
                } else if (signalVal?.kind === "Literal") {
                    value = signalVal.value ?? null;
                }

                this.runtimeContext.setSignal(targetId, signalKey, value);
                break;
            }

            case "Render":
                // 현재 런타임 처리 없음
                break;

            case "Logic": {
                const logic = comp as LogicComponent;

                // 1. 이벤트(트리거) 체크
                if (logic.event === "OnStart") {
                    const key = `${entity.id}:${comp.id}`;
                    if (this.startedComponents.has(key)) break;
                    this.startedComponents.add(key);
                } // OnUpdate는 항상 통과

                // 2. 조건 배열 평가
                const conditions = logic.conditions || [];
                const conditionLogic = logic.conditionLogic ?? "AND";

                const ctx: ActionContext = {
                    entityId: entity.id,
                    eventData: {},
                    globals: {
                        entities: this.entities,
                        gameCore: this,
                        renderer: this.renderer,
                    },
                    input: this.inputState,
                    entityContext: this.runtimeContext.getEntityContext(entity.id),
                };

                let conditionsPassed = false;
                if (conditions.length === 0) {
                    conditionsPassed = true;
                } else if (conditionLogic === "AND") {
                    conditionsPassed = conditions.every(c =>
                        ConditionRegistry.check(c.type, ctx, c as Record<string, unknown>)
                    );
                } else {
                    conditionsPassed = conditions.some(c =>
                        ConditionRegistry.check(c.type, ctx, c as Record<string, unknown>)
                    );
                }

                if (!conditionsPassed) break;

                // 3. 액션 배열 실행
                for (const action of logic.actions) {
                    ActionRegistry.run(action.type, ctx, action as Record<string, unknown>);
                }
                break;
            }
        }
    }

    // ===== Subscription =====

    /**
     * ?곹깭 蹂寃?援щ룆
     */
    subscribe(callback: () => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * 援щ룆?먯뿉寃??뚮┝
     */
    private notify(): void {
        for (const cb of this.listeners) {
            cb();
        }
    }
    private matchTrigger(
        trigger: Trigger | undefined,
        entity: GameEntity,
        time: number,
        dt: number,
        componentId?: string
    ): boolean {
        if (!trigger) return true;

        switch (trigger.type) {
            case "OnUpdate":
                return true;

            case "OnStart":
                if (!componentId) return false;
                {
                    const key = `${entity.id}:${componentId}`;
                    if (this.startedComponents.has(key)) return false;
                    this.startedComponents.add(key);
                    console.log("[OnStart] component triggered", {
                        entityId: entity.id,
                        componentId,
                        name: entity.name,
                        type: entity.type,
                    });
                    return true;
                }

            case "VariableOnChanged": {
                const name = trigger.params?.name as string | undefined;
                if (!name) return false;
                const current = entity.variables?.find((v) => v.name === name)?.value;
                const entityMap = this.variableSnapshots.get(entity.id) ?? new Map();
                const hasPrev = entityMap.has(name);
                const prevValue = entityMap.get(name);
                entityMap.set(name, current);
                this.variableSnapshots.set(entity.id, entityMap);
                return hasPrev && prevValue !== current;
            }

            default:
                return false;
        }
    }

    private matchCondition(
        condition: Condition | undefined,
        entity: GameEntity
    ): boolean {
        if (!condition) return true;
        if (condition.type === "Always") return true;

        // Build ActionContext for ConditionRegistry
        const ctx = {
            entityId: entity.id,
            eventData: {},
            globals: {
                entities: this.entities,
                gameCore: this,
                renderer: this.renderer,
            },
            input: this.inputState,
            entityContext: this.runtimeContext.getEntityContext(entity.id),
        };

        return ConditionRegistry.check(condition.type, ctx, condition as unknown as Record<string, unknown>);
    }
    // ===== Lifecycle =====

    /**
     * GameCore ?뺣━
     * 紐⑤뱺 ?뷀떚?곗? 而댄룷?뚰듃 ?고????댁젣
     */
    destroy(): void {
        if (this.eventHandler) {
            EventBus.off(this.eventHandler);
            this.eventHandler = undefined;
        }
        // 1. 紐⑤뱺 ?뷀떚?곕? ?뚮뜑?ъ뿉???쒓굅
        for (const id of this.entities.keys()) {
            this.renderer.remove(id);
        }

        // 2. 濡쒖뺄 ?곹깭 ?뺣━
        this.entities.clear();
        this.componentRuntimes = [];
        collisionSystem.clear();
        this.variableSnapshots.clear();
        this.startedComponents.clear();
        this.listeners.clear();

        console.log("[GameCore] Destroyed - all entities and runtimes cleaned up");
    }

    getRuntimeContext(): RuntimeContext {
        return this.runtimeContext;
    }

    // ===== Serialization (???遺덈윭?ㅺ린?? =====

    /**
     * 紐⑤뱺 ?뷀떚???곗씠?곕? JSON?쇰줈 吏곷젹??
     */
    serialize(): GameEntity[] {
        return Array.from(this.entities.values());
    }

    /**
     * JSON ?곗씠?곕줈遺???뷀떚??蹂듭썝
     */
    deserialize(data: GameEntity[]): void {
        // 湲곗〈 ?뷀떚???뺣━
        this.destroy();

        // ???뷀떚???앹꽦
        for (const entityData of data) {
            this.createEntity(entityData.id, entityData.type, entityData.x, entityData.y, {
                name: entityData.name,
                z: entityData.z,
                rotationX: entityData.rotationX,
                rotationY: entityData.rotationY,
                rotationZ: entityData.rotationZ,
                scaleX: entityData.scaleX,
                scaleY: entityData.scaleY,
                scaleZ: entityData.scaleZ,
                variables: entityData.variables,
                components: entityData.components,
            });
        }
    }
}








