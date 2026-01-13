import Phaser from "phaser";
import type { IRenderer, Vector3, ScreenCoord, SpawnOptions } from "./IRenderer";
// EAC ?쒖뒪??import
import { EventBus, ActionRegistry, ConditionRegistry } from "../core/events";
import { splitLogicItems } from "../types/Logic";
import { KeyboardAdapter } from "../core/events/adapters/KeyboardAdapter";
import type { EditorState } from "../EditorCore";
import type { ActionContext } from "../core/events/ActionRegistry";
import type { GameEvent } from "../core/events";
// 臾쇰━ ?붿쭊 (?붿쭊 ?낅┰??
import { runtimePhysics, type InputState } from "../core/RuntimePhysics";
import type { RuntimeContext } from "../core/RuntimeContext";
import type { LogicComponent } from "../types/Component";
// 紐⑤뱢 ?⑺넗由?
// 寃뚯엫 ?ㅼ젙
import { type GameConfig, defaultGameConfig, hasRole } from "../core/GameConfig";
import type { SpriteSheetMetadata } from "../../AssetsEditor/services/SpriteSheetExporter";
// 파티클 시스템
import { ParticleManager } from "../core/ParticleManager";
import { initParticleTextures } from "../../AssetsEditor/services/simpleParticleService";

/**
 * Phaser ???대? ?대옒??
 * PhaserRenderer媛€ 愿€由ы븯???ㅼ젣 ??
 */
class PhaserRenderScene extends Phaser.Scene {
    public phaserRenderer!: PhaserRenderer;
    public particleManager!: ParticleManager;

    get editorCore(): EditorState {
        return this.phaserRenderer.core;
    }
    private _keyboardAdapter!: KeyboardAdapter;

    // RPG ?ㅽ????대룞???꾪븳 ???곹깭
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private keyState: Record<string, boolean> = {};

    constructor() {
        super("PhaserRenderScene");
    }

    create() {
        console.log("[PhaserRenderScene] create() called");

        // 파티클 시스템 초기화 (텍스처 먼저 로드해야 함)
        initParticleTextures(this);
        this.particleManager = new ParticleManager(this);

        // 커스텀 파티클 에셋 등록 (Particle 태그)
        const assets = this.phaserRenderer?.core?.getAssets?.() ?? [];
        const particleAssets = assets.filter((a: { tag: string }) => a.tag === 'Particle');
        for (const asset of particleAssets) {
            this.particleManager.registerCustomTexture(asset.id, asset.url);
        }

        // RPG 이동용 키 생성
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasd = {
                W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
                A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
                D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            };
            // 스페이스바 별도 생성 (JustDown 활성화)
            this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        }

        // EAC 시스템 초기화 (이벤트 기반 액션)
        this._keyboardAdapter = new KeyboardAdapter(this);

        // EventBus handler helpers moved to class methods for optimization and reuse
        // See: shouldSkipEntity, matchesEvent, passesConditions

        // EventBus handler
        EventBus.on((event) => {
            if (event.type === "KEY_DOWN") {
                const code = event.data?.key as string;
                if (code) this.keyState[code] = true;
            }
            if (event.type === "KEY_UP") {
                const code = event.data?.key as string;
                if (code) this.keyState[code] = false;
            }

            // [System Event] AI Attack Handling
            if (event.type === "AI_ATTACK") {
                const data = event.data || {};
                const attackerId = data.attackerId as string;
                const targetId = data.targetId as string;

                if (attackerId) {
                    const ctx: ActionContext = {
                        entityId: attackerId,
                        eventData: data,
                        globals: {
                            scene: this,
                            renderer: this.phaserRenderer,
                            entities: this.phaserRenderer.core.getEntities(),
                            gameCore: this.phaserRenderer.gameCore
                        }
                    };
                    ActionRegistry.run("Attack", ctx, { targetId });
                }
            }

            // [System Event] Entity Died - Auto Particle (엔티티의 deathEffect 변수 사용)
            if (event.type === "ENTITY_DIED") {
                const data = event.data || {};
                const entityId = data.entityId as string;
                const gameObject = this.phaserRenderer?.getGameObject?.(entityId);

                if (gameObject) {
                    // 기본값 없음, "none"이 아니면 재생
                    const entities = this.phaserRenderer?.core?.getEntities?.();
                    const entity = entities?.get(entityId);
                    const deathEffectVar = entity?.variables?.find((v: { name: string }) => v.name === "deathEffect");
                    const deathEffect = (deathEffectVar?.value as string);

                    if (deathEffect && deathEffect !== "none") {
                        this.particleManager?.playEffect(deathEffect, gameObject.x, gameObject.y, 1);
                    }
                }
            }

            // [Optimized] TICK event is now ignored here to prevent GC overhead.
            // It is handled directly in the update() loop using reusable objects.
            if (event.type === "TICK") return;

            // runtime only - handle other events (OnCollision, Signals, etc.)
            if (!this.phaserRenderer.isRuntimeMode) {
                return;
            }
            if (this.phaserRenderer.getAllEntityIds().length === 0) {
                return;
            }

            this.phaserRenderer.core.getEntities().forEach((entity) => {
                const components = splitLogicItems(entity.logic);
                const logicComponents = components.filter((component): component is LogicComponent => component.type === "Logic");
                if (logicComponents.length === 0) return;
                const runtimeContext = this.phaserRenderer.getRuntimeContext?.();
                const input = runtimeContext?.getInput();
                const entityCtx = runtimeContext?.getEntityContext(entity.id);

                const ctx: ActionContext = {
                    entityId: entity.id,
                    eventData: event.data || {},
                    input,
                    entityContext: entityCtx,
                    globals: { scene: this, renderer: this.phaserRenderer, entities: this.phaserRenderer.gameCore?.getAllEntities?.() ?? this.phaserRenderer.core.getEntities(), gameCore: this.phaserRenderer.gameCore }
                };

                if (this.shouldSkipEntity(ctx, event)) {
                    return;
                }

                for (const component of logicComponents) {
                    if (!this.matchesEvent(component, event)) continue;
                    if (!this.passesConditions(component, ctx)) continue;

                    if (event.type === "OnStart") {
                        console.log("[OnStart] component triggered", {
                            entityId: ctx.entityId,
                            event: component.event,
                        });
                    }

                    for (const action of component.actions ?? []) {
                        const { type, ...params } = action;
                        ActionRegistry.run(type, ctx, params);
                    }
                }
            });
        });
        console.log("[PhaserRenderScene] EAC System initialized with RPG movement");

        // 준?비? 완료 ? 알림
        this.phaserRenderer.onSceneReady();
    }

    // -------------------------------------------------------------------------
    // [Optimization] Helper methods moved to class scope
    // -------------------------------------------------------------------------

    private eventAliases: Record<string, string[]> = {
        TICK: ["OnUpdate", "TICK"],
        KEY_DOWN: ["OnSignalReceive", "KEY_DOWN"],
        KEY_UP: ["OnSignalReceive", "KEY_UP"],
        COLLISION_ENTER: ["OnCollision", "COLLISION_ENTER"],
        COLLISION_STAY: ["OnCollision", "COLLISION_STAY"],
        COLLISION_EXIT: ["OnCollision", "COLLISION_EXIT"],
        ENTITY_DIED: ["OnDestroy", "ENTITY_DIED"],
    };

    private shouldSkipEntity(ctx: ActionContext, event: GameEvent): boolean {
        const entities = ctx.globals?.entities as Map<string, { variables?: Array<{ name: string; value: unknown }> }> | undefined;
        const entity = entities?.get(ctx.entityId);
        const hpValue = entity?.variables?.find((v) => v.name === "hp")?.value;
        if (typeof hpValue === "number" && hpValue <= 0) {
            return true;
        }

        if (event.targetId && event.targetId !== ctx.entityId) {
            return true;
        }

        return false;
    }

    private matchesEvent(component: LogicComponent, event: GameEvent): boolean {
        const allowedEvents = this.eventAliases[event.type] ?? [event.type];
        if (!allowedEvents.includes(component.event)) return false;
        if (component.eventParams) {
            for (const [key, value] of Object.entries(component.eventParams)) {
                if (event.data?.[key] !== value) return false;
            }
        }
        return true;
    }

    private passesConditions(component: LogicComponent, ctx: ActionContext): boolean {
        const conditions = component.conditions ?? [];
        if (conditions.length === 0) return true;

        const logic = component.conditionLogic ?? "AND";
        if (logic === "OR") {
            for (const c of conditions) {
                const { type, ...params } = c;
                if (ConditionRegistry.check(type, ctx, params)) {
                    return true;
                }
            }
            return false;
        }

        for (const c of conditions) {
            const { type, ...params } = c;
            if (!ConditionRegistry.check(type, ctx, params)) {
                return false;
            }
        }
        return true;
    }

    // [Optimization] Reusable Context Objects to reduce GC
    private reusableCtx: ActionContext = {
        entityId: "",
        eventData: {},
        globals: {}
    };
    private reusableEvent: GameEvent = { type: "TICK", data: {}, timestamp: Date.now() };

    // 물리 상태는 RuntimePhysics에서 관리됨

    update(time: number, delta: number) {
        // 부모 업데이트 호출
        this.phaserRenderer.onUpdate(time, delta);

        if (this.phaserRenderer.isRuntimeMode) {
            // [Optimized Update Loop]
            // Direct iteration with reused objects instead of EventBus.emit("TICK")

            // TICK 이벤트는 레거시 호환성을 위해 남겨두되, 주요 로직은 직접 처리
            // EventBus.emit("TICK", { time, delta, dt: delta / 1000 }); // Disabled for perf

            const dt = delta / 1000;
            const entities = this.phaserRenderer.core.getEntities();

            // Prepare reused objects
            this.reusableCtx.globals = {
                scene: this,
                renderer: this.phaserRenderer,
                entities: entities, // Map ref
                gameCore: this.phaserRenderer.gameCore
            };
            this.reusableEvent.data = { time, delta, dt };

            const runtimeContext = this.phaserRenderer.getRuntimeContext?.();
            const input = runtimeContext?.getInput();

            // Iterate entities directly
            entities.forEach((entity) => {
                // Optimization: inline simple alive check
                const hpVar = entity.variables?.find((v: any) => v.name === "hp");
                if (hpVar && (hpVar.value as number) <= 0) return;

                const components = splitLogicItems(entity.logic);
                // Filter only OnUpdate/TICK logic to avoid checking other types needlessly
                const updateComponents = components.filter((component): component is LogicComponent =>
                    component.type === "Logic" && (component.event === "OnUpdate" || component.event === "TICK")
                );

                if (updateComponents.length === 0) return;

                // Reuse Context
                this.reusableCtx.entityId = entity.id;
                this.reusableCtx.input = input;
                this.reusableCtx.entityContext = runtimeContext?.getEntityContext(entity.id);
                this.reusableCtx.eventData = this.reusableEvent.data ?? {};

                // Process Logic
                for (const component of updateComponents) {
                    // We know the event matches because we filtered by it, but conditions still apply
                    if (!this.passesConditions(component, this.reusableCtx)) continue;

                    for (const action of component.actions ?? []) {
                        const { type, ...params } = action;
                        ActionRegistry.run(type, this.reusableCtx, params);
                    }
                }
            });

            // 카메라 추적: tags에 cameraFollowRoles가 포함된 엔티티 따라가기
            const cameraRoles = this.phaserRenderer.gameConfig?.cameraFollowRoles ?? defaultGameConfig.cameraFollowRoles;
            const allEntities = Array.from(this.phaserRenderer.core.getEntities().values());

            // tags 배열에서 찾기 (1순위: tags, 2순위: role, 3순위: 이름)
            let playerEntity = allEntities.find(e =>
                e.tags?.some(tag => cameraRoles.includes(tag))
            );
            if (!playerEntity) {
                playerEntity = allEntities.find(e => hasRole(e.role, cameraRoles));
            }
            if (!playerEntity) {
                playerEntity = allEntities.find(e =>
                    e.name?.toLowerCase().includes('player')
                );
            }

            if (playerEntity) {
                const playerObj = this.phaserRenderer.getGameObject(playerEntity.id) as Phaser.GameObjects.Sprite | null;
                if (playerObj && this.cameras?.main) {
                    // 부드러운 카메라 추적
                    const cam = this.cameras.main;
                    const targetX = playerObj.x - cam.width / 2;
                    const targetY = playerObj.y - cam.height / 2;
                    const lerp = 0.1; // 부드러움 정도
                    cam.scrollX += (targetX - cam.scrollX) * lerp;
                    cam.scrollY += (targetY - cam.scrollY) * lerp;
                }
            }
        }

        // ?ㅻ낫?쒓? 珥덇린?붾릺吏€ ?딆븯?쇰㈃ ?ㅽ궢
        if (!this.cursors || !this.wasd) return;

        const dt = delta / 1000; // 珥??⑥쐞

        // ?낅젰 ?곹깭 ?섏쭛 (?붿쭊 ?낅┰??
        const input: InputState = {
            left: this.cursors.left.isDown || this.wasd.A.isDown,
            right: this.cursors.right.isDown || this.wasd.D.isDown,
            up: this.cursors.up.isDown || this.wasd.W.isDown,
            down: this.cursors.down.isDown || this.wasd.S.isDown,
            jump: (this.spaceKey?.isDown === true) ||
                (this.cursors?.up?.isDown === true) ||
                (this.wasd?.W?.isDown === true),
            keys: { ...this.keyState }
        };
        this.phaserRenderer.onInputState?.(input);

        if (this.phaserRenderer.isEditableFocused()) {
            return;
        }

        if (!this.phaserRenderer.useEditorCoreRuntimePhysics) {
            return;
        }

        // Kinetic 紐⑤뱢??媛€吏?controllableRoles ??븷 ?뷀떚?곕쭔 ?ㅻ낫???낅젰?쇰줈 ?낅뜲?댄듃
        const controllableRoles = this.phaserRenderer.gameConfig?.controllableRoles ?? defaultGameConfig.controllableRoles;
        this.phaserRenderer.core.getEntities().forEach((entity) => {
            // controllableRoles???놁쑝硫??ㅻ낫???낅젰 ?ㅽ궢
            if (!hasRole(entity.role, controllableRoles)) return;

            const hasPhysicsVars = (entity.variables ?? []).some((v: any) =>
                v.name === "physicsMode" ||
                v.name === "maxSpeed" ||
                v.name === "gravity" ||
                v.name === "jumpForce"
            );
            if (!hasPhysicsVars) return;

            // Kinetic 紐⑤뱢???놁쑝硫??ㅽ궢
            const gameObject = this.phaserRenderer.getGameObject(entity.id) as Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite | null;
            if (!gameObject) return;

            // RuntimePhysics濡?臾쇰━ 怨꾩궛 (?붿쭊 ?낅┰??
            const result = runtimePhysics.updateEntity(entity, dt, input);

            // 寃곌낵瑜?寃뚯엫 ?ㅻ툕?앺듃???곸슜
            gameObject.x = result.x;
            gameObject.y = result.y;

            // EditorCore ?뷀떚???곗씠???숆린??
            entity.x = result.x;
            entity.y = result.y;
        });
    }
}

/**
 * Phaser ?뚮뜑??援ы쁽泥?
 * 
 * ?ㅺ퀎 ?먯튃:
 * 1. ID ?숆린?? spawn ???몃? ID瑜?洹몃?濡??ъ슜, 以묐났 寃€???꾩닔
 * 2. 醫뚰몴 蹂€?? Phaser??醫뚯긽??湲곗? 醫뚰몴怨??ъ슜
 * 3. Lifecycle: destroy ??紐⑤뱺 由ъ냼???꾨꼍 ?댁젣
 */
export class PhaserRenderer implements IRenderer {
    public readonly core: EditorState;

    constructor(core: EditorState) {
        this.core = core;
    }

    private game: Phaser.Game | null = null;
    private scene: PhaserRenderScene | null = null;
    private _container: HTMLElement | null = null;
    private keyboardCaptureEnabled = true;
    private onGlobalFocusIn?: (event: FocusEvent) => void;
    private onGlobalFocusOut?: (event: FocusEvent) => void;
    public isEditableFocused(): boolean {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement)) return false;
        const tag = active.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
        return active.isContentEditable === true;
    }

    // ===== ?뷀떚??愿€由?- ID ?숆린??蹂댁옣 =====
    private entities: Map<string, Phaser.GameObjects.GameObject> = new Map();

    // ===== ?€?쇰㏊ 愿€??=====
    private map: Phaser.Tilemaps.Tilemap | null = null;
    private tileset: Phaser.Tilemaps.Tileset | null = null;
    private baseLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private previewLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private tileOffsetX = 0;
    private tileOffsetY = 0;

    // ===== 洹몃━??=====
    private gridGraphics: Phaser.GameObjects.Graphics | null = null;
    private gridVisible = true;

    // ===== 珥덇린??肄쒕갚 =====
    private initResolve: (() => void) | null = null;

    // ===== ?곸닔 =====
    private readonly TILE_SIZE = 32;
    private readonly MAP_SIZE = 200;

    // ===== Interaction Callbacks =====
    onEntityClick?: (id: string, worldX: number, worldY: number) => void;
    onPointerDown?: (worldX: number, worldY: number, worldZ: number) => void;
    onPointerMove?: (worldX: number, worldY: number, worldZ: number) => void;
    onPointerUp?: (worldX: number, worldY: number, worldZ: number) => void;
    onScroll?: (deltaY: number) => void;
    onUpdateCallback?: (time: number, delta: number) => void;
    onInputState?: (input: InputState) => void;
    getRuntimeContext?: () => RuntimeContext | null;
    useEditorCoreRuntimePhysics = true;

    /** Runtime mode flag - logic components and TICK only run when true */
    private _isRuntimeMode = false;

    get isRuntimeMode(): boolean {
        return this._isRuntimeMode;
    }

    set isRuntimeMode(value: boolean) {
        this._isRuntimeMode = value;
        this.updateInputState();
    }

    private updateInputState() {
        if (!this.scene || !this.scene.input) return;

        const draggable = !this._isRuntimeMode && !this.isPreviewMode;

        for (const entity of this.entities.values()) {
            if (draggable) {
                this.scene.input.setDraggable(entity);
            } else {
                this.scene.input.setDraggable(entity, false);
            }
        }

        // Also toggle grid visibility or interaction?
        // Usually grid remains.
    }

    private attachEntityInteraction(obj: Phaser.GameObjects.GameObject, id: string, type: string) {
        if (!this.scene) return;
        const anyObj = obj as Phaser.GameObjects.GameObject & {
            setInteractive?: () => void;
            off?: (event: string) => void;
            on?: (event: string, callback: (pointer: Phaser.Input.Pointer) => void) => void;
            setData?: (key: string, value: unknown) => void;
        };

        anyObj.setData?.("id", id);
        anyObj.setData?.("type", type);
        anyObj.setInteractive?.();

        const draggable = !this._isRuntimeMode && !this.isPreviewMode;
        if (this.scene.input) {
            this.scene.input.setDraggable(obj, draggable);
        }

        anyObj.off?.("pointerdown");
        anyObj.on?.("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (!this.onEntityClick || !this.scene) return;
            const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.onEntityClick(id, world.x, world.y);
        });
    }

    /** Editor Preview Mode flag - disables dragging if true */
    public isPreviewMode = false;

    /** Grid Size for snapping */
    public gridSize = 32;

    /** Callback for entity dragging in editor */
    onEntityDrag?: (id: string, x: number, y: number) => void;

    /** GameCore instance for role-based targeting (set by runtime) */
    gameCore?: {
        getEntitiesByRole?(role: string): { id: string; x: number; y: number; role: string }[];
        getNearestEntityByRole?(role: string, fromX: number, fromY: number, excludeId?: string): { id: string; x: number; y: number; role: string } | undefined;
        getAllEntities?(): Map<string, any>;
    };

    /** 寃뚯엫 ?ㅼ젙 (??븷蹂?湲곕뒫 留ㅽ븨) */
    gameConfig?: GameConfig;

    // ===== Lifecycle =====

    async init(container: HTMLElement): Promise<void> {
        this._container = container;

        const scene = new PhaserRenderScene();
        scene.phaserRenderer = this;
        this.scene = scene;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            scale: { mode: Phaser.Scale.RESIZE },
            parent: container,
            scene: [scene],
            audio: { noAudio: true },
        };

        this.game = new Phaser.Game(config);

        // ??以€鍮??€湲?
        return new Promise((resolve) => {
            this.initResolve = resolve;
        });
    }

    /**
     * ??以€鍮??꾨즺 ???몄텧 (?대???
     */
    onSceneReady(): void {
        if (!this.scene) return;

        this.scene.load.setCORS("anonymous");

        // 洹몃━??洹몃옒?쎌뒪 珥덇린??
        this.gridGraphics = this.scene.add.graphics();
        this.gridGraphics.setDepth(9999);

        // ?낅젰 ?대깽???ㅼ젙
        this.setupInputEvents();
        this.setupKeyboardCaptureGuards();

        // 珥덇린???꾨즺 ?뚮┝
        if (this.initResolve) {
            this.initResolve();
            this.initResolve = null;
        }
    }

    /**
     * ?낅뜲?댄듃 猷⑦봽 (?대???
     */
    onUpdate(_time: number, _delta: number): void {
        if (this.gridVisible) {
            this.redrawGrid();
        }
        if (this.onUpdateCallback) {
            this.onUpdateCallback(_time, _delta);
        }
    }

    /**
     * ?뚮뜑???뺣━ - ?꾨꼍??由ъ냼???댁젣
     */
    destroy(): void {
        // 1. 紐⑤뱺 ?뷀떚???뺣━
        for (const [_id, obj] of this.entities) {
            if (obj && obj.active) {
                obj.destroy();
            }
        }
        this.entities.clear();

        // 2. ?€?쇰㏊ ?뺣━
        if (this.baseLayer) {
            this.baseLayer.destroy();
            this.baseLayer = null;
        }
        if (this.previewLayer) {
            this.previewLayer.destroy();
            this.previewLayer = null;
        }
        if (this.map) {
            this.map.destroy();
            this.map = null;
        }
        this.tileset = null;

        // 3. 그리드 그래픽스 정리
        if (this.gridGraphics) {
            this.gridGraphics.destroy();
            this.gridGraphics = null;
        }

        // 3.5. 파티클 매니저 정리
        if (this.scene?.particleManager) {
            this.scene.particleManager.destroy();
        }

        // 4. ??李몄“ ?댁젣
        this.teardownKeyboardCaptureGuards();
        this.scene = null;

        // 5. Phaser Game ?몄뒪?댁뒪 ?뺣━
        if (this.game) {
            this.game.destroy(true); // removeCanvas = true
            this.game = null;
        }

        // 6. 而⑦뀒?대꼫 李몄“ ?댁젣
        this._container = null;

        // 7. 肄쒕갚 ?댁젣
        this.onEntityClick = undefined;
        this.onPointerDown = undefined;
        this.onPointerMove = undefined;
        this.onPointerUp = undefined;
        this.onScroll = undefined;

        console.log("[PhaserRenderer] Destroyed - all resources cleaned up");
    }

    // ===== Entity Management - ID ?숆린??蹂댁옣 =====

    spawn(id: string, type: string, x: number, y: number, z: number = 10, options?: SpawnOptions): void {
        if (!this.scene || !this.scene.textures) {
            console.error("[PhaserRenderer] Cannot spawn: scene not initialized");
            return;
        }

        // ID 중복 검사
        if (this.entities.has(id)) {
            console.error(`[PhaserRenderer] Entity with id "${id}" already exists! ID sync violation.`);
            return;
        }

        // EditorCore에서 엔티티 데이터 가져오기 (변수 접근용)
        const entity = this.core.getEntity(id);
        const isUI = entity?.variables?.some(v => v.name === "isUI" && v.value === true);
        const uiTypeVar = entity?.variables?.find(v => v.name === "uiType");
        const uiType = uiTypeVar ? String(uiTypeVar.value) : (entity?.variables?.some(v => v.name === "uiText") ? "text" : "sprite");

        const uiTextVar = entity?.variables?.find(v => v.name === "uiText");
        const uiText = uiTextVar ? String(uiTextVar.value) : "Text";

        const uiFontSizeVar = entity?.variables?.find(v => v.name === "uiFontSize");
        const uiFontSize = uiFontSizeVar ? String(uiFontSizeVar.value) : '16px';

        const uiColorVar = entity?.variables?.find(v => v.name === "uiColor");
        const uiColor = uiColorVar ? String(uiColorVar.value) : '#ffffff';

        const uiBgColorVar = entity?.variables?.find(v => v.name === "uiBackgroundColor");
        const uiBackgroundColor = uiBgColorVar ? String(uiBgColorVar.value) : undefined;

        const uiBarColorVar = entity?.variables?.find(v => v.name === "uiBarColor");
        const uiBarColor = uiBarColorVar ? String(uiBarColorVar.value) : '#e74c3c';

        const uiAlignVar = entity?.variables?.find(v => v.name === "uiAlign");
        const uiAlign = uiAlignVar ? String(uiAlignVar.value) : "center";

        const widthVar = entity?.variables?.find(v => v.name === "width");
        const width = widthVar ? Number(widthVar.value) : (options?.width ?? 100);

        const heightVar = entity?.variables?.find(v => v.name === "height");
        const height = heightVar ? Number(heightVar.value) : (options?.height ?? 20);

        let obj: Phaser.GameObjects.GameObject;

        if (uiType === "text") {
            const textObj = this.scene.add.text(x, y, uiText, {
                fontSize: uiFontSize.includes('px') ? uiFontSize : `${uiFontSize}px`,
                color: uiColor,
                fontFamily: 'monospace',
                backgroundColor: uiBackgroundColor,
                padding: { x: 4, y: 2 }
            });
            textObj.setOrigin(0.5); // Center origin for consistency
            obj = textObj;
        } else if (uiType === "panel") {
            // Panel is just a rectangle container
            const rect = this.scene.add.rectangle(x, y, width, height,
                uiBackgroundColor ? parseInt(uiBackgroundColor.replace('#', '0x'), 16) : 0x444444
            );
            obj = rect;
        } else if (uiType === "bar") {
            // Bar is a container with BG and FG
            const container = this.scene.add.container(x, y);

            // Background
            const bg = this.scene.add.rectangle(0, 0, width, height,
                uiBackgroundColor ? parseInt(uiBackgroundColor.replace('#', '0x'), 16) : 0x2c3e50
            );

            // Foreground (The actual gauge)
            // Start centered, but we need left-aligned for proper scaling effect usually, 
            // but for simplicity in Phaser Container, let's keep it centered relative to container and offset it?
            // Actually, for a bar, left-aligned origin is easier for scaling width.
            const fg = this.scene.add.rectangle(-width / 2, -height / 2, width, height,
                uiBarColor ? parseInt(uiBarColor.replace('#', '0x'), 16) : 0xe74c3c
            ).setOrigin(0, 0); // Top-left origin relative to container center offset

            // Name them for easy access
            bg.setName("bg");
            fg.setName("fg");

            container.add([bg, fg]);
            container.setSize(width, height);

            obj = container;
        } else if (options?.texture && this.scene.textures.exists(options.texture)) {
            // Default Sprite fallthrough
            const sprite = this.scene.add.sprite(x, y, options.texture);



            obj = sprite;
        } else {
            // Fallback Placeholder
            const rect = this.scene.add.rectangle(x, y, width, height, 0xff00ff);
            obj = rect;
        }

        (obj as any).setDepth(Math.max(z, 10));

        // UI Element Common Settings
        if (isUI) {
            const uiObj = obj as any;
            if (uiObj.setScrollFactor) uiObj.setScrollFactor(0);

            if (z < 100) uiObj.setDepth(100);
            else uiObj.setDepth(z);
        }

        // Add to collections
        this.entities.set(id, obj);
        this.scene.add.existing(obj);

        const opts = options as any;
        if (opts?.role === "projectile" || opts?.role === "enemy" || opts?.role === "player") {
            this.scene.physics.add.existing(obj);
        }

        // Set initial color if provided (and supported)
        let color = options?.color ?? 0xffffff;
        if (isUI) {
            // For Text
            if (obj instanceof Phaser.GameObjects.Text) {
                const align = uiAlign || "center";
                const originX = align === "left" ? 0 : align === "right" ? 1 : 0.5;
                obj.setOrigin(originX, 0.5);
            }
        } else {
            if ('setTint' in obj) {
                // @ts-ignore
                obj.setTint(color);
            }
        }

        this.attachEntityInteraction(obj, id, uiType || type);

        // Dragging handled by editor pointer logic to keep offsets stable.
    }

    /**
     * Get available animation names for a given entity based on its texture
     */
    getAvailableAnimations(entityId: string): string[] {
        if (!this.scene) return [];
        const obj = this.entities.get(entityId);
        if (!obj) return [];

        // Assume texture key is stored in data or name?
        // In spawn(), we used options.texture or options.name
        // Phaser GameObject has texture property if it is a Sprite
        const sprite = obj as Phaser.GameObjects.Sprite;
        if (!sprite.texture) return [];

        const textureKey = sprite.texture.key;

        // Filter animations that start with the texture key
        // Note: We will prefix animations with textureKey + "_" when creating them
        const anims = this.scene.anims;
        // Phaser 3.60: anims.create returns false if exists?
        // We can iterate anims.
        // Phaser 3 does not easily expose all keys as array in common interface, 
        // but we can access the cache.
        // Actually, `this.scene.anims` has `exists(key)`.
        // It doesn't allow easy iteration of ALL keys unless we check internal `anims.anims.entries`.
        // Let's use a workaround: check if `{textureKey}_default` exists.
        // Or if possible, list all.
        // Accessing internal `entries` Map
        // @ts-ignore
        const allAnimKeys: string[] = Array.from(anims.anims.entries.keys());

        return allAnimKeys.filter(k => k.startsWith(textureKey + "_") || k === textureKey + "_default");
    }

    remove(id: string): void {
        const obj = this.entities.get(id);
        if (obj) {
            obj.destroy();
            this.entities.delete(id);
            console.log(`[PhaserRenderer] Removed entity: ${id}`);
        } else {
            console.warn(`[PhaserRenderer] Cannot remove: entity "${id}" not found`);
        }
    }

    refreshEntityTexture(id: string, textureKey: string): void {
        if (!this.scene || !this.scene.textures.exists(textureKey)) return;
        const obj = this.entities.get(id);
        if (!obj) return;

        if (obj instanceof Phaser.GameObjects.Sprite) {
            if (!obj.texture || obj.texture.key !== textureKey) {
                obj.setTexture(textureKey);
            }
            return;
        }

        if (!(obj instanceof Phaser.GameObjects.Rectangle)) return;

        const x = obj.x;
        const y = obj.y;
        const depth = obj.depth ?? 0;
        const rotation = obj.rotation ?? 0;
        const scaleX = obj.scaleX ?? 1;
        const scaleY = obj.scaleY ?? 1;

        obj.destroy();

        const sprite = this.scene.add.sprite(x, y, textureKey);
        sprite.setDepth(depth);
        sprite.setRotation(rotation);
        sprite.setScale(scaleX, scaleY);

        const entity = this.core.getEntity(id);
        if (entity?.role === "projectile" || entity?.role === "enemy" || entity?.role === "player") {
            this.scene.physics.add.existing(sprite);
        }

        this.entities.set(id, sprite);
        this.attachEntityInteraction(sprite, id, entity?.type ?? "sprite");
    }

    // ===== Animation =====

    // ===== Animation =====

    playAnim(id: string, name: string): void {
        const obj = this.entities.get(id);
        if (!obj) {
            console.warn(`[PhaserRenderer] Cannot play anim: entity "${id}" not found`);
            return;
        }

        const sprite = obj as Phaser.GameObjects.Sprite;
        if (!sprite.play || !sprite.texture) return;

        // Parse animation name: format is "AssetName_AnimName" (e.g., "Zombie_walk" or "Zombie_default")
        // If name contains underscore, first part might be asset/texture key
        const underscoreIdx = name.lastIndexOf('_');
        let targetTexture = sprite.texture.key;
        let targetAnimKey = name;

        if (underscoreIdx > 0) {
            const potentialTexture = name.substring(0, underscoreIdx);
            // Check if this texture exists
            if (this.scene?.textures.exists(potentialTexture)) {
                targetTexture = potentialTexture;
                targetAnimKey = name; // Keep full name as anim key
            }
        }

        // If target texture is different from current, switch the sprite's texture
        if (targetTexture !== sprite.texture.key && this.scene?.textures.exists(targetTexture)) {
            console.log(`[PhaserRenderer] Switching texture: ${sprite.texture.key} -> ${targetTexture}`);
            sprite.setTexture(targetTexture, 0);
        }

        // Now try to play the animation
        if (this.scene?.anims.exists(targetAnimKey)) {
            sprite.play(targetAnimKey, true);
        } else {
            // Try with current texture prefix
            const prefixedName = `${targetTexture}_${name.split('_').pop()}`;
            if (this.scene?.anims.exists(prefixedName)) {
                sprite.play(prefixedName, true);
            } else {
                // Fallback: find any animation for this texture
                let available: string[] = [];
                try {
                    const json = this.scene?.anims.toJSON();
                    if (json && json.anims) {
                        available = json.anims.map((a: any) => a.key).filter((k: string) => k.startsWith(targetTexture + "_"));
                    }
                } catch (e) { console.warn("[PhaserRenderer] Failed to list anims", e); }

                if (available.length > 0) {
                    const fallback = available[0];
                    sprite.play(fallback, true);
                    console.log(`[PhaserRenderer] Using fallback animation: ${fallback}`);
                }
            }
        }
    }

    // ===== UI Methods =====

    setText(id: string, text: string): void {
        const obj = this.entities.get(id);
        if (obj && obj instanceof Phaser.GameObjects.Text) {
            obj.setText(text);
        }
    }

    setTextAlignment(id: string, align: "left" | "center" | "right"): void {
        const obj = this.entities.get(id);
        if (obj && obj instanceof Phaser.GameObjects.Text) {
            const originX = align === "left" ? 0 : align === "right" ? 1 : 0.5;
            obj.setOrigin(originX, 0.5);
        }
    }

    setBarValue(id: string, value: number, max: number): void {
        const obj = this.entities.get(id);
        if (obj && obj instanceof Phaser.GameObjects.Container) {
            const fg = obj.getByName('fg') as Phaser.GameObjects.Rectangle;
            const bg = obj.getByName('bg') as Phaser.GameObjects.Rectangle;

            if (fg && bg) {
                const clampedValue = Math.max(0, Math.min(value, max));
                const ratio = max > 0 ? clampedValue / max : 0;
                const fullWidth = bg.width;
                fg.width = fullWidth * ratio;
            }
        }
    }

    // ===== Particle Effects =====

    /**
     * 파티클 이펙트 재생
     * @param presetId 프리셋 ID (예: 'hit_spark', 'explosion', 'rain')
     * @param x 월드 X 좌표
     * @param y 월드 Y 좌표
     * @param scale 크기 배율 (기본값 1)
     */
    playParticle(name: string, x: number, y: number, scale: number = 1): void {
        const pm = this.scene?.particleManager;
        if (!pm) {
            console.warn("[PhaserRenderer] Cannot play particle: particle manager not initialized");
            return;
        }

        if (name.startsWith("custom:")) {
            const assetName = name.replace(/^custom:/, "");
            const assets = this.core.getAssets(); // core는 생성자 주입됨

            const asset = assets.find(a =>
                (a.name === assetName || a.id === assetName) &&
                (a.tag === 'Particle' || a.tag === 'Effect')
            );

            if (asset) {
                const motionType = asset.metadata?.motionType || 'explode';
                pm.playCustomEffect(asset.id, x, y, scale, motionType);
            } else {
                console.warn(`[PhaserRenderer] Custom particle asset not found: ${assetName}`);
            }
        } else {
            pm.playEffect(name, x, y, scale);
        }
    }

    /**
     * 커스텀 파티클 텍스처 등록
     */
    registerCustomParticle(id: string, url: string): void {
        if (!this.scene?.particleManager) return;
        this.scene.particleManager.registerCustomTexture(id, url);
    }

    /**
     * 커스텀 파티클 재생
     */
    playCustomParticle(textureId: string, x: number, y: number, scale: number = 1): void {
        if (!this.scene?.particleManager) return;
        this.scene.particleManager.playCustomEffect(textureId, x, y, scale);
    }

    /**
     * 등록된 커스텀 파티클 목록
     */
    getCustomParticles(): string[] {
        return this.scene?.particleManager?.getCustomTextures() ?? [];
    }

    /**
     * 지속 파티클 이미터 생성
     */
    createParticleEmitter(id: string, presetId: string, x: number, y: number): void {
        if (!this.scene?.particleManager) return;
        this.scene.particleManager.createEmitter(id, presetId, x, y);
    }

    /**
     * 파티클 이미터 중지
     */
    stopParticleEmitter(id: string): void {
        if (!this.scene?.particleManager) return;
        this.scene.particleManager.stopEmitter(id);
    }



    // ===== Camera =====

    setCameraPosition(x: number, y: number, _z?: number): void {
        if (!this.scene) return;
        this.scene.cameras.main.centerOn(x, y);
    }

    setCameraZoom(zoom: number): void {
        if (!this.scene) return;
        this.scene.cameras.main.setZoom(zoom);
    }

    getCameraPosition(): Vector3 {
        if (!this.scene) return { x: 0, y: 0, z: 0 };
        const cam = this.scene.cameras.main;
        return {
            x: cam.worldView.centerX,
            y: cam.worldView.centerY,
            z: 0,
        };
    }

    getCameraZoom(): number {
        if (!this.scene) return 1;
        return this.scene.cameras.main.zoom;
    }

    // ===== Coordinate Transformation =====

    /**
     * ?붾뱶 醫뚰몴 ???붾㈃ 醫뚰몴 蹂€??
     * Phaser: 醫뚯긽??湲곗? 醫뚰몴怨?
     */
    worldToScreen(x: number, y: number, _z: number = 0): ScreenCoord {
        if (!this.scene) return { x, y };

        const cam = this.scene.cameras.main;
        const screenX = (x - cam.worldView.x) * cam.zoom;
        const screenY = (y - cam.worldView.y) * cam.zoom;

        return { x: screenX, y: screenY };
    }

    /**
     * ?붾㈃ 醫뚰몴 ???붾뱶 醫뚰몴 蹂€??
     */
    screenToWorld(screenX: number, screenY: number): Vector3 {
        if (!this.scene) return { x: screenX, y: screenY, z: 0 };

        const cam = this.scene.cameras?.main;
        if (!cam || typeof cam.getWorldPoint !== "function") {
            return { x: screenX, y: screenY, z: 0 };
        }
        const point = cam.getWorldPoint(screenX, screenY);

        return { x: point.x, y: point.y, z: 0 };
    }

    // ===== Tile System =====

    /**
     * ?€?쇰㏊ 珥덇린??(?몃??먯꽌 ?몄텧)
     */
    initTilemap(tilesetKey: string): void {
        if (!this.scene) return;

        this.map = this.scene.make.tilemap({
            tileWidth: this.TILE_SIZE,
            tileHeight: this.TILE_SIZE,
            width: this.MAP_SIZE,
            height: this.MAP_SIZE,
        });

        this.tileset = this.map.addTilesetImage("tiles", tilesetKey, this.TILE_SIZE, this.TILE_SIZE)!;

        this.baseLayer = this.map.createBlankLayer("base", this.tileset, 0, 0)!;
        this.previewLayer = this.map.createBlankLayer("preview", this.tileset, 0, 0)!;

        this.tileOffsetX = Math.floor(this.map.width / 2);
        this.tileOffsetY = Math.floor(this.map.height / 2);

        const offsetX = -this.tileOffsetX * this.TILE_SIZE;
        const offsetY = -this.tileOffsetY * this.TILE_SIZE;

        this.baseLayer.setPosition(offsetX, offsetY);
        this.previewLayer.setPosition(offsetX, offsetY);

        // 타일은 항상 엔티티 아래에 표시 (엔티티는 최소 depth 10)
        this.baseLayer.setDepth(-100);
        this.previewLayer.setDepth(-50);
    }

    setTile(x: number, y: number, tileIndex: number): void {
        if (!this.baseLayer || !this.map || !this.tileset || !this.baseLayer.layer) return;

        const tx = x + this.tileOffsetX;
        const ty = y + this.tileOffsetY;

        if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return;

        this.baseLayer.putTileAt(tileIndex, tx, ty);
    }

    removeTile(x: number, y: number): void {
        if (!this.baseLayer || !this.map || !this.tileset || !this.baseLayer.layer) return;

        const tx = x + this.tileOffsetX;
        const ty = y + this.tileOffsetY;

        if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return;

        this.baseLayer.putTileAt(-1, tx, ty);
    }

    setPreviewTile(x: number, y: number, tileIndex: number): void {
        if (!this.previewLayer || !this.map || !this.tileset || !this.previewLayer.layer) return;

        // 湲곗〈 ?꾨━酉??쒓굅
        this.previewLayer.fill(-1);

        const tx = x + this.tileOffsetX;
        const ty = y + this.tileOffsetY;

        if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return;

        this.previewLayer.putTileAt(tileIndex, tx, ty);
    }

    clearPreviewTile(): void {
        if (!this.previewLayer) return;
        this.previewLayer.fill(-1);
    }

    // ===== Grid =====

    setGridVisible(visible: boolean): void {
        this.gridVisible = visible;
        if (!visible && this.gridGraphics) {
            this.gridGraphics.clear();
        }
    }

    private redrawGrid(): void {
        if (!this.scene || !this.gridGraphics) return;

        const cam = this.scene.cameras.main;
        const view = cam.worldView;

        const left = Math.floor(view.x / this.TILE_SIZE) * this.TILE_SIZE;
        const right = Math.ceil((view.x + view.width) / this.TILE_SIZE) * this.TILE_SIZE;
        const top = Math.floor(view.y / this.TILE_SIZE) * this.TILE_SIZE;
        const bottom = Math.ceil((view.y + view.height) / this.TILE_SIZE) * this.TILE_SIZE;

        this.gridGraphics.clear();
        this.gridGraphics.lineStyle(1, 0xffffff, 0.15);

        for (let x = left; x <= right; x += this.TILE_SIZE) {
            this.gridGraphics.beginPath();
            this.gridGraphics.moveTo(x, top);
            this.gridGraphics.lineTo(x, bottom);
            this.gridGraphics.strokePath();
        }

        for (let y = top; y <= bottom; y += this.TILE_SIZE) {
            this.gridGraphics.beginPath();
            this.gridGraphics.moveTo(left, y);
            this.gridGraphics.lineTo(right, y);
            this.gridGraphics.strokePath();
        }
    }

    // ===== Input Events =====

    private setupInputEvents(): void {
        if (!this.scene || !this.game) return;

        const canvas = this.game.canvas;
        if (!canvas) return;

        const getWorldPos = (clientX: number, clientY: number): { world: Vector3; inside: boolean } | null => {
            if (!canvas) return null;

            const rect = canvas.getBoundingClientRect();
            const inside = clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top && clientY <= rect.bottom;

            const screenX = (clientX - rect.left) * (canvas.width / rect.width);
            const screenY = (clientY - rect.top) * (canvas.height / rect.height);

            return { world: this.screenToWorld(screenX, screenY), inside };
        };

        const onPointerDown = (e: PointerEvent) => {
            const result = getWorldPos(e.clientX, e.clientY);
            if (result?.inside && this.onPointerDown) {
                const { world } = result;
                this.onPointerDown(world.x, world.y, world.z);
            }
        };

        const onPointerMove = (e: PointerEvent) => {
            const result = getWorldPos(e.clientX, e.clientY);
            if (result && this.onPointerMove) {
                const { world } = result;
                this.onPointerMove(world.x, world.y, world.z);
            }
        };

        const onPointerUp = (e: PointerEvent) => {
            const result = getWorldPos(e.clientX, e.clientY);
            if (result && this.onPointerUp) {
                const { world } = result;
                this.onPointerUp(world.x, world.y, world.z);
            }
        };

        const onWheel = (e: WheelEvent) => {
            const result = getWorldPos(e.clientX, e.clientY);
            if (result?.inside && this.onScroll) {
                e.preventDefault();
                this.onScroll(e.deltaY);
            }
        };

        window.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointermove", onPointerMove, { capture: true });
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("wheel", onWheel, { passive: false });

        // Cleanup on scene shutdown
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("wheel", onWheel);
        });

        this.scene.events.once(Phaser.Scenes.Events.DESTROY, () => {
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("wheel", onWheel);
        });
    }

    private setupKeyboardCaptureGuards(): void {
        if (!this.scene || !this.scene.input || !this.scene.input.keyboard) return;

        const isEditable = (target: EventTarget | null) => {
            if (!(target instanceof HTMLElement)) return false;
            const tag = target.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
            return target.isContentEditable === true;
        };

        const disableCapture = () => {
            if (!this.scene?.input?.keyboard) return;
            if (!this.keyboardCaptureEnabled) return;
            this.keyboardCaptureEnabled = false;
            this.scene.input.keyboard.disableGlobalCapture?.();
        };

        const enableCapture = () => {
            if (!this.scene?.input?.keyboard) return;
            if (this.keyboardCaptureEnabled) return;
            this.keyboardCaptureEnabled = true;
            this.scene.input.keyboard.enableGlobalCapture?.();
        };

        this.onGlobalFocusIn = (event: FocusEvent) => {
            if (isEditable(event.target)) {
                disableCapture();
            }
        };

        this.onGlobalFocusOut = () => {
            const active = document.activeElement;
            if (isEditable(active)) return;
            enableCapture();
        };

        window.addEventListener("focusin", this.onGlobalFocusIn);
        window.addEventListener("focusout", this.onGlobalFocusOut);
    }

    private teardownKeyboardCaptureGuards(): void {
        if (this.onGlobalFocusIn) {
            window.removeEventListener("focusin", this.onGlobalFocusIn);
            this.onGlobalFocusIn = undefined;
        }
        if (this.onGlobalFocusOut) {
            window.removeEventListener("focusout", this.onGlobalFocusOut);
            this.onGlobalFocusOut = undefined;
        }
        if (this.scene?.input?.keyboard) {
            this.scene.input.keyboard.enableGlobalCapture?.();
        }
        this.keyboardCaptureEnabled = true;
    }



    // ===== Texture Loading (Phaser-specific helper) =====

    /**
     * ?띿뒪泥?濡쒕뱶 (Phaser ?꾩슜)
     */
    loadTexture(key: string, url: string, metadata?: SpriteSheetMetadata): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.scene) {
                reject(new Error("Scene not initialized"));
                return;
            }
            const scene = this.scene;

            if (scene.textures.exists(key)) {
                // Critical Check: If the existing texture is static (1 frame) but we now have metadata for animations,
                // we must REMOVE the old texture and reload it as a spritesheet.
                // This handles the case where a user has duplicate asset names (one static, one animated) or re-imports fixes.
                const texture = scene.textures.get(key);
                // Check if this metadata implies a spritesheet (frames or explicit animations)
                const isSpritesheetMetadata = metadata && (
                    (metadata.frameWidth && metadata.frameWidth > 0) ||
                    (metadata.frameCount && metadata.frameCount > 1) ||
                    (metadata.animations && Object.keys(metadata.animations).length > 0)
                );

                if (isSpritesheetMetadata) {
                    // Check if animations already exist
                    const hasPrefixAnims = scene.anims.toJSON()?.anims?.some((a: any) => a.key.startsWith(key + "_"));

                    if (texture.frameTotal <= 1 && !hasPrefixAnims) {
                        console.warn(`[PhaserRenderer] Texture '${key}' exists but is static. Reloading as spritesheet for animations.`);
                        scene.textures.remove(key);
                        // Proceed to load below...
                    } else {
                        // Texture seems fine (or already animated), but let's ensure specific anims from this metadata exist
                        // Call only the creation part? 
                        // For safety, if frames match, we just fall through to creation check.
                        // But we can't 'load' again without removing. 
                        // If frames are sufficient, we just skip 'load.spritesheet' and go to anim creation.
                        this.createAnimationsFromMetadata(key, metadata);
                        resolve();
                        return;
                    }
                } else {
                    resolve();
                    return;
                }
            }

            console.log(`[PhaserRenderer] Loading texture: ${key}`, metadata);

            if (metadata && metadata.frameWidth > 0 && metadata.frameHeight > 0) {
                scene.load.spritesheet(key, url, {
                    frameWidth: metadata.frameWidth,
                    frameHeight: metadata.frameHeight,
                });
            } else {
                scene.load.image(key, url);
            }

            this.scene.load.once("complete", () => {
                const texture = this.scene.textures.get(key);
                let framesToSlice = 0;
                let frameWidth = 0;
                let frameHeight = 0;

                if (texture && texture.frameTotal <= 1) {
                    const img = texture.getSourceImage();
                    if (img instanceof ImageBitmap || img instanceof HTMLImageElement || img instanceof HTMLCanvasElement) {
                        const width = img.width;
                        const height = img.height;

                        // 1. Metadata based slicing
                        if (metadata && metadata.frameCount && metadata.frameCount > 1) {
                            framesToSlice = metadata.frameCount;
                            frameWidth = Math.floor(width / framesToSlice);
                            frameHeight = height;
                        }
                        // 2. Heuristic slicing: If width is multiple of height (Horizontal Strip)
                        else if (width > height && width % height === 0) {
                            framesToSlice = width / height;
                            frameWidth = height; // Assuming square frames
                            frameHeight = height;
                            console.log(`[PhaserRenderer] Heuristic detection: '${key}' seems to be a spritesheet (${framesToSlice} frames). Auto-slicing.`);
                        }

                        // Execute manual slicing if determined
                        if (framesToSlice > 1 && frameWidth > 0) {
                            console.log(`[PhaserRenderer] Manually slicing texture '${key}': ${width}x${height} -> ${framesToSlice} frames of ${frameWidth}x${frameHeight}`);
                            for (let i = 0; i < framesToSlice; i++) {
                                // Add frame with string key "0", "1", ...
                                texture.add(String(i), 0, i * frameWidth, 0, frameWidth, frameHeight);
                            }
                        }
                    }
                }

                // Pass the heuristic frame count to animation creator
                if (framesToSlice > 0 && (!metadata || !metadata.frameCount)) {
                    if (!metadata) metadata = {} as any;
                    if (metadata) {
                        metadata.frameCount = framesToSlice;
                        metadata.frameWidth = frameWidth; // Update metadata for animator
                    }
                }

                this.createAnimationsFromMetadata(key, metadata);
                resolve();
            });
            scene.load.once("loaderror", () => reject(new Error(`Failed to load texture: ${key}`)));
            scene.load.start();
        });
    }

    private createAnimationsFromMetadata(key: string, metadata?: SpriteSheetMetadata) {
        if (!this.scene) return;

        const texture = this.scene.textures.get(key);
        // frameTotal includes __BASE which is a single frame, so actual frame count is frameTotal - 1
        const rawTextureFrames = texture ? texture.frameTotal - 1 : 0;
        // Prioritize metadata.frameCount for validation (manual slicing may not update texture.frameTotal)
        const effectiveFrameCount = (metadata && metadata.frameCount && metadata.frameCount > 1)
            ? metadata.frameCount
            : rawTextureFrames;

        // If metadata has explicit animations, create them
        if (metadata && metadata.animations) {
            for (const [animName, config] of Object.entries(metadata.animations)) {
                const animKey = `${key}_${animName}`;

                // Validate Frame Indices using effectiveFrameCount
                const validFrames = config.frames.filter(f => f < effectiveFrameCount);
                if (validFrames.length !== config.frames.length) {
                    console.warn(`[PhaserRenderer] Animation '${animKey}' has invalid frames. Filtered ${config.frames.length} -> ${validFrames.length}. Effective frame count: ${effectiveFrameCount}`);
                }

                if (validFrames.length === 0) {
                    console.warn(`[PhaserRenderer] Animation '${animKey}' skipped: No valid frames (effectiveFrameCount: ${effectiveFrameCount}).`);
                    continue;
                }

                // Remove existing animation to ensure clean slate (especially if texture was reloaded/sliced)
                if (this.scene.anims.exists(animKey)) {
                    this.scene.anims.remove(animKey);
                }

                this.scene.anims.create({
                    key: animKey,
                    frames: validFrames.map(f => ({ key: key, frame: String(f) })), // Direct mapping safer for manual slices
                    frameRate: config.fps,
                    repeat: config.loop ? -1 : 0
                });
                console.log(`[PhaserRenderer] Created/Updated animation: ${animKey}`);
            }
        }
        // AUTO-GENERATE: If no explicit animations but spritesheet has multiple frames, create "default" animation
        // Use effectiveFrameCount computed earlier

        if (effectiveFrameCount > 1) {
            const defaultAnimKey = `${key}_default`;

            if (this.scene.anims.exists(defaultAnimKey)) {
                this.scene.anims.remove(defaultAnimKey);
            }

            let framesConfig: Phaser.Types.Animations.AnimationFrame[] = [];

            // Use string frame keys for manually sliced textures, numeric otherwise
            if (texture && texture.has("0")) {
                framesConfig = Array.from({ length: effectiveFrameCount }, (_, i) => ({ key: key, frame: String(i) }));
            } else if (metadata && metadata.frameCount && metadata.frameCount > 1) {
                framesConfig = Array.from({ length: effectiveFrameCount }, (_, i) => ({ key: key, frame: String(i) }));
            } else {
                framesConfig = this.scene.anims.generateFrameNumbers(key, { start: 0, end: effectiveFrameCount - 1 });
            }

            // Get FPS from metadata.animations.default.fps or fallback to 8 (matching SpriteSheetExporter default)
            const defaultFps = (metadata as any)?.animations?.default?.fps ?? 8;

            this.scene.anims.create({
                key: defaultAnimKey,
                frames: framesConfig,
                frameRate: defaultFps,
                repeat: -1
            });
            console.log(`[PhaserRenderer] Auto-created default animation: ${defaultAnimKey} (${effectiveFrameCount} frames, ${defaultFps} FPS)`);
        }
    }



    /**
     * 罹붾쾭?ㅻ줈遺€???띿뒪泥??앹꽦 (Phaser ?꾩슜)
     */
    addCanvasTexture(key: string, canvas: HTMLCanvasElement): void {
        if (!this.scene) return;

        if (this.scene.textures.exists(key)) {
            this.scene.textures.remove(key);
        }

        this.scene.textures.addCanvas(key, canvas);
    }

    /**
     * ???몄뒪?댁뒪 諛섑솚 (?섏쐞 ?명솚??- ?먯쭊??留덉씠洹몃젅?댁뀡)
     * @deprecated 吏곸젒 ???묎렐?€ 沅뚯옣?섏? ?딆쓬
     */
    getScene(): Phaser.Scene | null {
        return this.scene;
    }



    // ===== IRenderer Implementation =====

    getGameObject(id: string): any {
        return this.entities.get(id) ?? null;
    }

    getAllEntityIds(): string[] {
        return Array.from(this.entities.keys());
    }

    hasEntity(id: string): boolean {
        return this.entities.has(id);
    }

    update(id: string, x: number, y: number, z?: number, rotation?: number): void {
        const obj = this.entities.get(id) as any;
        if (!obj) return;

        obj.x = x;
        obj.y = y;

        if (typeof z === "number" && typeof obj.setDepth === "function") {
            obj.setDepth(z);
        }

        if (typeof rotation === "number") {
            obj.rotation = rotation;
        }

    }

    /**
     * 에셋 목록 업데이트 (런타임 동적 등록용)
     */
    updateAssets(assets: any[]): void {
        if (!this.scene?.particleManager) return;

        const particleAssets = assets.filter((a: any) => a.tag === 'Particle');
        for (const asset of particleAssets) {
            // 이미 등록된 건 내부에서 무시함
            this.scene.particleManager.registerCustomTexture(asset.id, asset.url);
        }
    }

    setScale(id: string, scaleX: number, scaleY: number, _scaleZ?: number): void {
        const obj = this.entities.get(id) as any;
        if (obj && typeof obj.setScale === "function") {
            obj.setScale(scaleX, scaleY);
        }
    }

    setAlpha(id: string, alpha: number): void {
        const obj = this.entities.get(id) as any;
        if (obj && typeof obj.setAlpha === "function") {
            obj.setAlpha(alpha);
        }
    }

    setTint(id: string, color: number): void {
        const obj = this.entities.get(id) as any;
        if (obj && typeof obj.setTint === "function") {
            obj.setTint(color);
        }
    }
}
