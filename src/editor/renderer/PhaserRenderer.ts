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

/**
 * Phaser ???대? ?대옒??
 * PhaserRenderer媛€ 愿€由ы븯???ㅼ젣 ??
 */
class PhaserRenderScene extends Phaser.Scene {
    public phaserRenderer!: PhaserRenderer;

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

        // RPG ?대룞?????앹꽦
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasd = {
                W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
                A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
                D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            };
            // ?ㅽ럹?댁뒪諛?蹂꾨룄 ?앹꽦 (JustDown ?명솚??
            this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        }

        // EAC ?쒖뒪??珥덇린??(?대깽??湲곕컲 ?≪뀡??
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

            // 移대찓?? 異붿쟻: cameraFollowRoles???ы븿????븷 ?뷀떚???곕씪媛€湲?
            const cameraRoles = this.phaserRenderer.gameConfig?.cameraFollowRoles ?? defaultGameConfig.cameraFollowRoles;
            const playerEntity = Array.from(this.phaserRenderer.core.getEntities().values())
                .find(e => hasRole(e.role, cameraRoles));

            if (playerEntity) {
                const playerObj = this.phaserRenderer.getGameObject(playerEntity.id) as Phaser.GameObjects.Sprite | null;
                if (playerObj && this.cameras?.main) {
                    // 遺€?쒕윭??移대찓??異붿쟻
                    const cam = this.cameras.main;
                    const targetX = playerObj.x - cam.width / 2;
                    const targetY = playerObj.y - cam.height / 2;
                    const lerp = 0.1; // 遺€?쒕윭?€ ?뺣룄
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
    onEntityClick?: (id: string) => void;
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

        // 3. 洹몃━??洹몃옒?쎌뒪 ?뺣━
        if (this.gridGraphics) {
            this.gridGraphics.destroy();
            this.gridGraphics = null;
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

        obj.setData('id', id);
        obj.setData('type', uiType || type);

        // Interactive
        obj.setInteractive();

        obj.on('pointerdown', (_pointer: Phaser.Input.Pointer) => {
            if (this.onEntityClick) this.onEntityClick(id);
        });

        // Dragging logic
        if (!this.isPreviewMode && !this.isRuntimeMode) {
            this.scene.input.setDraggable(obj);

            obj.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                // Double check runtime mode in case it changed during drag start
                if (this.isRuntimeMode) return;

                const snappedX = Math.round(dragX / this.gridSize) * this.gridSize;
                const snappedY = Math.round(dragY / this.gridSize) * this.gridSize;

                const gameObj = obj as any;
                gameObj.x = snappedX;
                gameObj.y = snappedY;

                if (this.onEntityDrag) this.onEntityDrag(id, snappedX, snappedY);
            });
        }
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

    // ===== Animation =====

    // ===== Animation =====

    playAnim(id: string, name: string): void {
        const obj = this.entities.get(id);
        if (!obj) {
            console.warn(`[PhaserRenderer] Cannot play anim: entity "${id}" not found`);
            return;
        }

        const sprite = obj as Phaser.GameObjects.Sprite;
        if (sprite.play && sprite.texture) {
            const textureKey = sprite.texture.key;
            const prefixedName = `${textureKey}_${name}`;

            console.log(`[PhaserRenderer] playAnim request: id=${id}, name=${name}, texture=${textureKey}, prefixed=${prefixedName}`);

            if (this.scene?.anims.exists(prefixedName)) {
                console.log(`[PhaserRenderer] Playing prefixed: ${prefixedName}`);
                sprite.play(prefixedName);
            } else if (this.scene?.anims.exists(name)) {
                console.log(`[PhaserRenderer] Playing raw: ${name}`);
                sprite.play(name);
            } else {
                // Fallback: If the user asked for "Idle" but we only have "Hero_default", play "Hero_default"
                // Only if the asset seems to be a single-action asset (common for user-created sprites)
                const available = this.scene?.anims.toJSON()?.anims
                    ?.map((a: any) => a.key)
                    .filter((k: string) => k.startsWith(textureKey + "_")) || [];

                if (available.length > 0) {
                    const fallback = available[0];
                    console.warn(`[PhaserRenderer] Animation '${name}' not found. Falling back to '${fallback}'`);
                    sprite.play(fallback);
                } else {
                    console.warn(`[PhaserRenderer] Animation not found: ${name} (tried ${prefixedName}). No fallbacks available.`);
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

        const cam = this.scene.cameras.main;
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

        this.baseLayer.setDepth(0);
        this.previewLayer.setDepth(5);
    }

    setTile(x: number, y: number, tileIndex: number): void {
        if (!this.baseLayer || !this.map) return;

        const tx = x + this.tileOffsetX;
        const ty = y + this.tileOffsetY;

        if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return;

        this.baseLayer.putTileAt(tileIndex, tx, ty);
    }

    removeTile(x: number, y: number): void {
        if (!this.baseLayer || !this.map) return;

        const tx = x + this.tileOffsetX;
        const ty = y + this.tileOffsetY;

        if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return;

        this.baseLayer.putTileAt(-1, tx, ty);
    }

    setPreviewTile(x: number, y: number, tileIndex: number): void {
        if (!this.previewLayer || !this.map) return;

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
            if (this.scene.textures.exists(key)) {
                // Critical Check: If the existing texture is static (1 frame) but we now have metadata for animations,
                // we must REMOVE the old texture and reload it as a spritesheet.
                // This handles the case where a user has duplicate asset names (one static, one animated) or re-imports fixes.
                const texture = this.scene.textures.get(key);
                const needsAnimations = metadata && metadata.animations && Object.keys(metadata.animations).length > 0;

                if (needsAnimations) {
                    // Check if animations already exist
                    const hasPrefixAnims = this.scene.anims.toJSON()?.anims?.some((a: any) => a.key.startsWith(key + "_"));

                    if (texture.frameTotal <= 1 && !hasPrefixAnims) {
                        console.warn(`[PhaserRenderer] Texture '${key}' exists but is static. Reloading as spritesheet for animations.`);
                        this.scene.textures.remove(key);
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
                this.scene.load.spritesheet(key, url, {
                    frameWidth: metadata.frameWidth,
                    frameHeight: metadata.frameHeight,
                });
            } else {
                this.scene.load.image(key, url);
            }

            this.scene.load.once("complete", () => {
                this.createAnimationsFromMetadata(key, metadata);
                resolve();
            });
            this.scene.load.once("loaderror", () => reject(new Error(`Failed to load texture: ${key}`)));
            this.scene.load.start();
        });
    }

    private createAnimationsFromMetadata(key: string, metadata?: SpriteSheetMetadata) {
        if (metadata && metadata.animations && this.scene) {
            for (const [animName, config] of Object.entries(metadata.animations)) {
                const animKey = `${key}_${animName}`;
                if (!this.scene.anims.exists(animKey)) {
                    this.scene.anims.create({
                        key: animKey,
                        frames: this.scene.anims.generateFrameNumbers(key, { frames: config.frames }),
                        frameRate: config.fps,
                        repeat: config.loop ? -1 : 0
                    });
                    console.log(`[PhaserRenderer] Created animation: ${animKey}`);
                }
            }
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

    update(id: string, x: number, y: number, z?: number, rotation?: number, scaleX: number = 1, scaleY: number = 1, _scaleZ?: number): void {
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

        if (typeof obj.setScale === "function") {
            obj.setScale(scaleX, scaleY);
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
