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

/**
 * Phaser ???대? ?대옒??
 * PhaserRenderer媛 愿由ы븯???ㅼ젣 ??
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
        this._keyboardAdapter = new KeyboardAdapter(this);

        // EventBus handler helpers
        const eventAliases: Record<string, string[]> = {
            TICK: ["OnUpdate", "TICK"],
            KEY_DOWN: ["OnSignalReceive", "KEY_DOWN"],
            KEY_UP: ["OnSignalReceive", "KEY_UP"],
            COLLISION_ENTER: ["OnCollision", "COLLISION_ENTER"],
            COLLISION_STAY: ["OnCollision", "COLLISION_STAY"],
            COLLISION_EXIT: ["OnCollision", "COLLISION_EXIT"],
            ENTITY_DIED: ["OnDestroy", "ENTITY_DIED"],
        };

        const shouldSkipEntity = (ctx: ActionContext, event: GameEvent) => {
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
        };

        const matchesEvent = (component: LogicComponent, event: GameEvent) => {
            const allowedEvents = eventAliases[event.type] ?? [event.type];
            if (!allowedEvents.includes(component.event)) return false;
            if (component.eventParams) {
                for (const [key, value] of Object.entries(component.eventParams)) {
                    if (event.data?.[key] !== value) return false;
                }
            }
            return true;
        };

        const passesConditions = (component: LogicComponent, ctx: ActionContext) => {
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
        };

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



            // runtime only
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

                if (shouldSkipEntity(ctx, event)) {
                    return;
                }

                for (const component of logicComponents) {
                    if (!matchesEvent(component, event)) continue;
                    if (!passesConditions(component, ctx)) continue;

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

        // ??以鍮??꾨즺 ?뚮┝
        this.phaserRenderer.onSceneReady();
    }

    // 臾쇰━ ?곹깭??RuntimePhysics?먯꽌 愿由щ맖

    update(time: number, delta: number) {
        // 遺紐??낅뜲?댄듃 ?몄텧
        this.phaserRenderer.onUpdate(time, delta);

        // TICK ?대깽??諛쒗뻾 (?고???紐⑤뱶?먯꽌留?
        if (this.phaserRenderer.isRuntimeMode) {
            EventBus.emit("TICK", { time, delta, dt: delta / 1000 });

            // 移대찓??異붿쟻: cameraFollowRoles???ы븿????븷 ?뷀떚???곕씪媛湲?
            const cameraRoles = this.phaserRenderer.gameConfig?.cameraFollowRoles ?? defaultGameConfig.cameraFollowRoles;
            const playerEntity = Array.from(this.phaserRenderer.core.getEntities().values())
                .find(e => hasRole(e.role, cameraRoles));

            if (playerEntity) {
                const playerObj = this.phaserRenderer.getGameObject(playerEntity.id) as Phaser.GameObjects.Sprite | null;
                if (playerObj && this.cameras?.main) {
                    // 遺?쒕윭??移대찓??異붿쟻
                    const cam = this.cameras.main;
                    const targetX = playerObj.x - cam.width / 2;
                    const targetY = playerObj.y - cam.height / 2;
                    const lerp = 0.1; // 遺?쒕윭? ?뺣룄
                    cam.scrollX += (targetX - cam.scrollX) * lerp;
                    cam.scrollY += (targetY - cam.scrollY) * lerp;
                }
            }
        }

        // ?ㅻ낫?쒓? 珥덇린?붾릺吏 ?딆븯?쇰㈃ ?ㅽ궢
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

        // Kinetic 紐⑤뱢??媛吏?controllableRoles ??븷 ?뷀떚?곕쭔 ?ㅻ낫???낅젰?쇰줈 ?낅뜲?댄듃
        const controllableRoles = this.phaserRenderer.gameConfig?.controllableRoles ?? defaultGameConfig.controllableRoles;
        this.phaserRenderer.core.getEntities().forEach((entity) => {
            // controllableRoles???놁쑝硫??ㅻ낫???낅젰 ?ㅽ궢
            if (!hasRole(entity.role, controllableRoles)) return;

            const hasPhysicsVars = (entity.variables ?? []).some((v) =>
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
 * 1. ID ?숆린?? spawn ???몃? ID瑜?洹몃?濡??ъ슜, 以묐났 寃???꾩닔
 * 2. 醫뚰몴 蹂?? Phaser??醫뚯긽??湲곗? 醫뚰몴怨??ъ슜
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

    // ===== ?뷀떚??愿由?- ID ?숆린??蹂댁옣 =====
    private entities: Map<string, Phaser.GameObjects.GameObject> = new Map();

    // ===== ??쇰㏊ 愿??=====
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
    isRuntimeMode = false;

    /** GameCore instance for role-based targeting (set by runtime) */
    gameCore?: {
        getEntitiesByRole?(role: string): { id: string; x: number; y: number; role: string }[];
        getNearestEntityByRole?(role: string, fromX: number, fromY: number, excludeId?: string): { id: string; x: number; y: number; role: string } | undefined;
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

        // ??以鍮??湲?
        return new Promise((resolve) => {
            this.initResolve = resolve;
        });
    }

    /**
     * ??以鍮??꾨즺 ???몄텧 (?대???
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

        // 2. ??쇰㏊ ?뺣━
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

        // ID 以묐났 寃??- EditorState????숆린??蹂댁옣
        if (this.entities.has(id)) {
            console.error(`[PhaserRenderer] Entity with id "${id}" already exists! ID sync violation.`);
            return;
        }

        let obj: Phaser.GameObjects.GameObject;

        // ?띿뒪泥섍? ?덉쑝硫??ㅽ봽?쇱씠?? ?놁쑝硫??ш컖??
        if (options?.texture && this.scene.textures.exists(options.texture)) {
            const sprite = this.scene.add.sprite(x, y, options.texture);
            sprite.setDepth(Math.max(z, 10));
            obj = sprite;
        } else {
            const width = options?.width ?? 40;
            const height = options?.height ?? 40;
            const color = options?.color ?? 0xffffff;
            const rect = this.scene.add.rectangle(x, y, width, height, color);
            // Enforce minimum depth for entities
            rect.setDepth(Math.max(z, 10));
            obj = rect;
        }

        // ID ???諛??명꽣?숈뀡 ?ㅼ젙
        obj.setData("id", id);
        obj.setData("type", type);
        (obj as Phaser.GameObjects.Rectangle).setInteractive({ useHandCursor: true });

        // ?대┃ ?대깽??
        obj.on("pointerdown", () => {
            if (this.onEntityClick) {
                this.onEntityClick(id);
            }
        });

        // Map?????
        this.entities.set(id, obj);

        console.log(`[PhaserRenderer] Spawned entity: ${id} at (${x}, ${y}, ${z})`);
    }

    hasEntity(id: string): boolean {
        return this.entities.has(id);
    }

    getAllEntityIds(): string[] {
        return Array.from(this.entities.keys());
    }

    /**
     * ID濡?寃뚯엫 ?ㅻ툕?앺듃 諛섑솚 (Actions?먯꽌 ?ъ슜)
     */
    getGameObject(id: string): Phaser.GameObjects.GameObject | null {
        return this.entities.get(id) ?? null;
    }

    update(id: string, x: number, y: number, z?: number, rotation?: number): void {
        const obj = this.entities.get(id);
        if (!obj) {
            console.warn(`[PhaserRenderer] Cannot update: entity "${id}" not found`);
            return;
        }

        const gameObj = obj as Phaser.GameObjects.Rectangle;
        gameObj.setPosition(x, y);

        if (z !== undefined) {
            gameObj.setDepth(Math.max(z, 10));
        }

        if (rotation !== undefined) {
            gameObj.setAngle(rotation);
        }
    }

    setScale(id: string, scaleX: number, scaleY: number, _scaleZ?: number): void {
        const obj = this.entities.get(id);
        if (!obj) {
            console.warn(`[PhaserRenderer] Cannot set scale: entity "${id}" not found`);
            return;
        }

        const gameObj = obj as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
        if (typeof gameObj.setScale === "function") {
            gameObj.setScale(scaleX, scaleY);
        }
    }

    setAlpha(id: string, alpha: number): void {
        const obj = this.entities.get(id);
        if (!obj) {
            console.warn(`[PhaserRenderer] Cannot set alpha: entity "${id}" not found`);
            return;
        }

        const gameObj = obj as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Alpha;
        if (typeof gameObj.setAlpha === "function") {
            gameObj.setAlpha(alpha);
        }
    }

    setTint(id: string, color: number): void {
        const obj = this.entities.get(id);
        if (!obj) {
            console.warn(`[PhaserRenderer] Cannot set tint: entity "${id}" not found`);
            return;
        }

        const gameObj = obj as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Tint;
        if (typeof gameObj.setTint === "function") {
            gameObj.setTint(color);
        }
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

    playAnim(id: string, name: string): void {
        const obj = this.entities.get(id);
        if (!obj) {
            console.warn(`[PhaserRenderer] Cannot play anim: entity "${id}" not found`);
            return;
        }

        const sprite = obj as Phaser.GameObjects.Sprite;
        if (sprite.play) {
            sprite.play(name);
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
     * ?붾뱶 醫뚰몴 ???붾㈃ 醫뚰몴 蹂??
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
     * ?붾㈃ 醫뚰몴 ???붾뱶 醫뚰몴 蹂??
     */
    screenToWorld(screenX: number, screenY: number): Vector3 {
        if (!this.scene) return { x: screenX, y: screenY, z: 0 };

        const cam = this.scene.cameras.main;
        const point = cam.getWorldPoint(screenX, screenY);

        return { x: point.x, y: point.y, z: 0 };
    }

    // ===== Tile System =====

    /**
     * ??쇰㏊ 珥덇린??(?몃??먯꽌 ?몄텧)
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
    loadTexture(key: string, url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.scene) {
                reject(new Error("Scene not initialized"));
                return;
            }

            if (this.scene.textures.exists(key)) {
                resolve();
                return;
            }

            this.scene.load.image(key, url);
            this.scene.load.once("complete", () => resolve());
            this.scene.load.once("loaderror", () => reject(new Error(`Failed to load texture: ${key}`)));
            this.scene.load.start();
        });
    }

    /**
     * 罹붾쾭?ㅻ줈遺???띿뒪泥??앹꽦 (Phaser ?꾩슜)
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
     * @deprecated 吏곸젒 ???묎렐? 沅뚯옣?섏? ?딆쓬
     */
    getScene(): Phaser.Scene | null {
        return this.scene;
    }
}







