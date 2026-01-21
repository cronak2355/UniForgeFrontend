import Phaser from "phaser";
import type { IRenderer, Vector3, ScreenCoord, SpawnOptions } from "./IRenderer";
// EAC ?쒖뒪??import
import { EventBus, ActionRegistry, ConditionRegistry, type EventHandler } from "../core/events";
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
 * Phaser 씬을 담당하는 클래스
 * PhaserRenderer가 관리하는 실제 씬
 */
class PhaserRenderScene extends Phaser.Scene {
    public phaserRenderer!: PhaserRenderer;
    public particleManager!: ParticleManager;
    public runtimeMainCameraFollowed = false; // Public for PhaserRenderer access
    get editorCore(): EditorState {
        return this.phaserRenderer.core;
    }
    private _keyboardAdapter!: KeyboardAdapter;

    // RPG 스타일 이동을 위한 키 상태
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private keyState: Record<string, boolean> = {};
    private keysDownState: Record<string, boolean> = {};
    private eventHandler?: EventHandler;

    constructor() {
        super("PhaserRenderScene");
    }

    // Assets to load in preload() phase - set by PhaserRenderer before scene starts
    public assetsToPreload: Array<{ id: string; name: string; url: string; tag: string; metadata?: any }> = [];

    /**
     * Phaser preload lifecycle - loads all sprite assets before create()
     * Tiles are handled separately via canvas texture in React useEffect
     */
    preload() {


        for (const asset of this.assetsToPreload) {
            // Skip tiles - they use canvas-based tileset
            if (asset.tag === "Tile") continue;

            const metadata = asset.metadata;

            // Load as spritesheet if metadata specifies frame dimensions
            if (metadata?.frameWidth > 0 && metadata?.frameHeight > 0) {
                this.load.spritesheet(asset.name, asset.url, {
                    frameWidth: metadata.frameWidth,
                    frameHeight: metadata.frameHeight
                });
                // Also load with asset.id if different from name
                if (asset.id !== asset.name) {
                    this.load.spritesheet(asset.id, asset.url, {
                        frameWidth: metadata.frameWidth,
                        frameHeight: metadata.frameHeight
                    });
                }
            } else if (asset.tag === "Sound" || asset.tag === "Audio" || asset.tag === "BGM" || asset.tag === "SFX") {
                // [NEW] Load Audio Assets
                this.load.audio(asset.name, asset.url);
                if (asset.id !== asset.name) {
                    this.load.audio(asset.id, asset.url);
                }
            } else {
                // Load as regular image
                this.load.image(asset.name, asset.url);

                if (asset.id !== asset.name) {
                    this.load.image(asset.id, asset.url);
                }
            }
        }
    }


    create() {


        // 파티클 시스템 초기화 (텍스처 먼저 로드해야 함)
        initParticleTextures(this);
        this.particleManager = new ParticleManager(this);

        // [FIX] Create animations for all preloaded spritesheet assets
        for (const asset of this.assetsToPreload) {
            if (asset.tag === "Tile") continue;

            const key = asset.name;
            let metadata = asset.metadata;

            // If metadata specifies frame dimensions, use them
            if (metadata?.frameWidth > 0 && metadata?.frameHeight > 0) {
                this.phaserRenderer.createAnimationsFromMetadata(key, metadata);
                if (asset.id !== asset.name) {
                    this.phaserRenderer.createAnimationsFromMetadata(asset.id, metadata);
                }
            } else {
                // [FIX] Heuristic slicing for images loaded without metadata
                // Check if the texture is a horizontal strip that should be sliced
                const texture = this.textures.get(key);
                if (texture && texture.frameTotal <= 1) {
                    const img = texture.getSourceImage();
                    if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement || (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap)) {
                        const width = img.width;
                        const height = img.height;

                        // Heuristic: If width > height and width % height === 0, it's a horizontal strip
                        if (width > height && width % height === 0 && width / height > 1) {
                            const frameCount = width / height;
                            const frameWidth = height; // Square frames assumed
                            const frameHeight = height;

                            // Manually add frames to the texture
                            for (let i = 0; i < frameCount; i++) {
                                texture.add(String(i), 0, i * frameWidth, 0, frameWidth, frameHeight);
                            }

                            // Create metadata for animation creation
                            const heuristicMetadata = {
                                frameWidth: frameWidth,
                                frameHeight: frameHeight,
                                frameCount: frameCount
                            };

                            this.phaserRenderer.createAnimationsFromMetadata(key, heuristicMetadata as any);
                            if (asset.id !== asset.name) {
                                // Also slice for asset.id texture if it exists
                                const idTexture = this.textures.get(asset.id);
                                if (idTexture && idTexture.frameTotal <= 1) {
                                    for (let i = 0; i < frameCount; i++) {
                                        idTexture.add(String(i), 0, i * frameWidth, 0, frameWidth, frameHeight);
                                    }
                                    this.phaserRenderer.createAnimationsFromMetadata(asset.id, heuristicMetadata as any);
                                }
                            }
                        }
                    }
                }
            }
        }

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
        this.eventHandler = (event) => {
            if (event.type === "KEY_DOWN") {
                const code = event.data?.key as string;
                if (code) {
                    // console.log(`[PhaserRenderer] KEY_DOWN: ${code}`);
                    this.keyState[code] = true;
                    this.keysDownState[code] = true;
                }
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

            // [Editor Event] Camera Move
            if (event.type === "EDITOR_CAMERA_MOVE") {
                const x = event.data?.x as number;
                const y = event.data?.y as number;
                if (typeof x === "number" && typeof y === "number") {
                    this.phaserRenderer.setCameraPosition(x, y);
                }
            }

            // [System Event] Entity Died - Auto Particle
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

            // [Action Event] Play Sound
            if (event.type === "PLAY_SOUND") {
                const data = event.data || {};
                // Support both soundKey and soundId
                const soundKey = (data.soundKey as string) || (data.soundId as string);
                const volume = (data.volume as number) ?? 1.0;
                const loop = (data.loop as boolean) ?? false;

                if (soundKey) {
                    try {
                        this.sound.play(soundKey, { volume, loop });
                    } catch (e) {
                        console.warn(`[PhaserRenderer] Failed to play sound '${soundKey}':`, e);
                    }
                }
            }

            // [Action Event] Stop Sound
            if (event.type === "STOP_SOUND") {
                this.sound.stopAll();
            }


            // [Optimized] TICK event is now ignored here to prevent GC overhead.
            // It is handled directly in the update() loop using reusable objects.
            if (event.type === "TICK") return;

            // [DISABLED] Logic execution is now handled EXCLUSIVELY by LogicSystem via GameCore pipeline.
            // This prevents duplicate execution (4x issue) when conditions like InputDown are used.
            // Keeping this section disabled. LogicSystem handles OnUpdate, OnStart, OnCollision, etc.
            // Only system-level events (AI_ATTACK, ENTITY_DIED particles) are processed above.
        };
        EventBus.on(this.eventHandler);


        // 준비 완료 알림
        this.phaserRenderer.onSceneReady();

        const cleanup = () => {
            this._keyboardAdapter?.destroy();
            if (this.eventHandler) {
                if (this.eventHandler) {
                    // console.log("[PhaserRenderer] Cleanup: Removing EventBus listeners");
                    EventBus.off(this.eventHandler);
                    this.eventHandler = undefined;
                }
            }
        };

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
        this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
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
        // Optimization: Access RuntimeEntity variables directly if possible
        const entities = ctx.globals?.entities as Map<string, any>;
        const entity = entities?.get(ctx.entityId);

        let hpValue: any;
        if (this.phaserRenderer.isRuntimeMode && this.phaserRenderer.gameCore) {
            // Direct Runtime Access
            hpValue = this.phaserRenderer.gameCore?.getRuntimeContext?.()?.getEntityVariable(ctx.entityId, "hp");
        } else {
            // Fallback to Editor adapter structure
            hpValue = entity?.variables?.find((v: any) => v.name === "hp")?.value;
        }

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

    // Performance Monitoring
    private frameCount = 0;
    private accFrameTime = 0;

    // 물리 상태는 RuntimePhysics에서 관리됨

    update(time: number, delta: number) {
        // [CRITICAL FIX] Set input BEFORE onUpdate() so game logic sees current frame's input
        if (this.phaserRenderer.isRuntimeMode) {
            const runtimeContext = this.phaserRenderer.getRuntimeContext?.();
            if (runtimeContext) {
                // Capture Input for Runtime - MUST be set before gameCore.update() runs
                const input: InputState = {
                    left: this.cursors?.left.isDown || this.wasd?.A.isDown || false,
                    right: this.cursors?.right.isDown || this.wasd?.D.isDown || false,
                    up: this.cursors?.up.isDown || this.wasd?.W.isDown || false,
                    down: this.cursors?.down.isDown || this.wasd?.S.isDown || false,
                    jump: (this.spaceKey?.isDown === true) || (this.cursors?.up?.isDown === true) || (this.wasd?.W?.isDown === true),
                    mouseX: this.input.activePointer?.worldX ?? 0,
                    mouseY: this.input.activePointer?.worldY ?? 0,
                    mouseScreenX: this.input.activePointer?.x ?? 0,
                    mouseScreenY: this.input.activePointer?.y ?? 0,
                    keys: { ...this.keyState },
                    keysDown: { ...this.keysDownState }
                };
                // Reset keysDownState after consuming it
                this.keysDownState = {};

                // Sync Input to RuntimeContext BEFORE game logic runs
                runtimeContext.setInput(input);
            }
        }

        // 부모 업데이트 호출 - Now gameCore.update() sees the new input
        this.phaserRenderer.onUpdate(time, delta);

        if (this.phaserRenderer.isRuntimeMode) {
            // [RuntimeContext Query-Based Update Loop]
            // Input was already set above before onUpdate()

            const runtimeContext = this.phaserRenderer.getRuntimeContext?.();
            if (!runtimeContext) return;

            // [Optimized] Logic execution is handled by LogicSystem via GameCore pipeline.
            // Input is already set above before onUpdate().

            // Camera Sync: Find "Main Camera" and sync position & zoom
            let cameraEntity: any = null;

            // Search for Main Camera
            for (const e of runtimeContext.entities.values()) {
                if (e.name === "Main Camera") {
                    cameraEntity = e;
                    break;
                }
            }

            try {
                if (cameraEntity && this.cameras?.main) {
                    const cam = this.cameras.main;

                    // 1. Sync Zoom
                    if (cameraEntity.components) {
                        const camComp = cameraEntity.components.find((c: any) => c.type === "Camera");
                        if (camComp && camComp.props) {
                            const targetZoom = Number(camComp.props.zoom) || 1;
                            if (Math.abs(cam.zoom - targetZoom) > 0.001) {
                                cam.setZoom(targetZoom);
                            }
                        }
                    }
                    // Fallback to variable for backwards compatibility if component prop missing
                    if (!cameraEntity.components?.some((c: any) => c.type === "Camera")) {
                        const zoomVar = runtimeContext.getEntityVariable(cameraEntity.id, "zoom");
                        if (zoomVar !== undefined) {
                            const targetZoom = Number(zoomVar) || 1;
                            if (Math.abs(cam.zoom - targetZoom) > 0.001) {
                                cam.setZoom(targetZoom);
                            }
                        }
                    }

                    // 2. Sync Follow / Position
                    if (!this.runtimeMainCameraFollowed) {
                        // Find corresponding GameObject
                        const cameraObj = this.phaserRenderer.getGameObject(cameraEntity.id);
                        if (cameraObj) {
                            cam.startFollow(cameraObj, true);
                            this.runtimeMainCameraFollowed = true;
                            // console.log("[PhaserRenderer] Runtime Camera following 'Main Camera'");
                        } else {
                            // If GameObject not found, just center on entity's position
                            const cx = Number(cameraEntity.x) || 0;
                            const cy = Number(cameraEntity.y) || 0;
                            cam.centerOn(cx, cy);
                        }
                    } else {
                        // If following, check if we need to stop following (e.g. invalid target?)
                        // For now, assume startFollow works.
                        // But if visual object was destroyed, we might need to re-bind.
                        // Phaser handles destruction of target by stopping follow automatically usually?
                        // Let's re-verify existence?
                        const cameraObj = this.phaserRenderer.getGameObject(cameraEntity.id);
                        if (!cameraObj) {
                            this.runtimeMainCameraFollowed = false; // Re-trigger search next frame

                            // Fallback Position
                            const cx = Number(cameraEntity.x) || 0;
                            const cy = Number(cameraEntity.y) || 0;
                            cam.centerOn(cx, cy);
                        }
                    }
                } else if (!cameraEntity && this.cameras?.main) {
                    // If no "Main Camera" entity, ensure camera is not following anything
                    if (this.runtimeMainCameraFollowed) {
                        this.cameras.main.stopFollow();
                        this.runtimeMainCameraFollowed = false;
                    }
                }
            } catch (e) {
                // Silent fail for camera sync
            }

            // [CRITICAL FIX] Exit early for runtime mode - don't execute editor physics below
            return;
        }

        // 컨트롤러가 초기화되지 않았다면 스킵
        if (!this.cursors || !this.wasd) return;

        const dt = delta / 1000; // 초단위

        // 입력 상태 수집 (엔진 독립적)
        const input: InputState = {
            left: this.cursors.left.isDown || this.wasd.A.isDown,
            right: this.cursors.right.isDown || this.wasd.D.isDown,
            up: this.cursors.up.isDown || this.wasd.W.isDown,
            down: this.cursors.down.isDown || this.wasd.S.isDown,
            jump: (this.spaceKey?.isDown === true) ||
                (this.cursors?.up?.isDown === true) ||
                (this.wasd?.W?.isDown === true),
            mouseX: this.input.activePointer?.worldX ?? 0,
            mouseY: this.input.activePointer?.worldY ?? 0,
            keys: { ...this.keyState },
            keysDown: { ...this.keysDownState }
        };
        // Reset keysDownState after consuming it for this frame
        this.keysDownState = {};

        this.phaserRenderer.onInputState?.(input);

        if (this.phaserRenderer.isEditableFocused()) {
            return;
        }

        if (!this.phaserRenderer.useEditorCoreRuntimePhysics) {
            return;
        }

        // Kinetic 모듈을 가진 controllableRoles 역할 엔티티만 에디터 입력으로 업데이트
        const controllableRoles = this.phaserRenderer.gameConfig?.controllableRoles ?? defaultGameConfig.controllableRoles;
        this.phaserRenderer.core.getEntities().forEach((entity) => {
            // controllableRoles에 없으면 스킵
            if (!hasRole(entity.role, controllableRoles)) return;

            const hasPhysicsVars = (entity.variables ?? []).some((v: any) =>
                v.name === "physicsMode" ||
                v.name === "maxSpeed" ||
                v.name === "gravity" ||
                v.name === "jumpForce"
            );
            if (!hasPhysicsVars) return;

            // Kinetic 모듈이 없으면 스킵
            const gameObject = this.phaserRenderer.getGameObject(entity.id) as Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite | null;
            if (!gameObject) return;

            // RuntimePhysics로 물리 계산 (엔진 독립적)
            const result = runtimePhysics.updateEntity(entity, dt, input);

            // 결과를 게임 오브젝트에 적용
            gameObject.x = result.x;
            gameObject.y = result.y;

            // EditorCore 엔티티 데이터 동기화
            entity.x = result.x;
            entity.y = result.y;
        });
    }
}

/**
 * Phaser 렌더러 구현체
 * 
 * 설계 원칙:
 * 1. ID 동기화: spawn 시 엔티티 ID를 그대로 사용, 중복 검사 필수
 * 2. 좌표 변환: Phaser의 좌상단 기준 좌표계 사용
 * 3. Lifecycle: destroy 시 모든 리소스 해제
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
    private particleManager!: ParticleManager;

    public isEditableFocused(): boolean {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement)) return false;
        const tag = active.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
        return active.isContentEditable === true;
    }

    // ===== 엔티티 관리 - ID 동기화 보장 =====
    private entities: Map<string, Phaser.GameObjects.GameObject> = new Map();

    // ===== 타일맵 관련 =====
    private map: Phaser.Tilemaps.Tilemap | null = null;
    private tileset: Phaser.Tilemaps.Tileset | null = null;
    private baseLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private previewLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private tileOffsetX = 0;
    private tileOffsetY = 0;

    // ===== 그리드 =====
    private gridGraphics: Phaser.GameObjects.Graphics | null = null;
    private gridVisible = true;

    // ===== 초기화 콜백 =====
    private initResolve: (() => void) | null = null;

    // ===== 상수 =====
    private readonly TILE_SIZE = 100;
    private readonly MAP_SIZE = 200;

    // ===== Interaction Callbacks =====
    onEntityClick?: (id: string, worldX: number, worldY: number) => void;
    onPointerDown?: (worldX: number, worldY: number, worldZ: number) => void;
    onPointerMove?: (worldX: number, worldY: number, worldZ: number, isInside: boolean) => void;
    onPointerUp?: (worldX: number, worldY: number, worldZ: number) => void;
    onScroll?: (deltaY: number, screenX: number, screenY: number) => void;
    onUpdateCallback?: (time: number, delta: number) => void;
    onInputState?: (input: InputState) => void;
    getRuntimeContext?: () => RuntimeContext | null;
    useEditorCoreRuntimePhysics = true;

    /** Runtime Camera Initial Position (for UI absolute positioning) */
    private _runtimeCameraStartPos: { x: number, y: number, zoom: number } | null = null;

    /** Runtime mode flag - logic components and TICK only run when true */
    private _isRuntimeMode = false;

    get isRuntimeMode(): boolean {
        return this._isRuntimeMode;
    }

    set isRuntimeMode(value: boolean) {
        this._isRuntimeMode = value;
        if (!value) {
            if (this.scene) this.scene.runtimeMainCameraFollowed = false; // Reset flag when exiting runtime
            this._runtimeCameraStartPos = null;
        } else {
            if (this.scene) this.scene.runtimeMainCameraFollowed = false; // Reset flag when entering runtime to trigger search
            this._runtimeCameraStartPos = null;
        }
        this.updateInputState();
    }

    private updateInputState() {
        if (!this.scene || !this.scene.input) return;

        const draggable = !this._isRuntimeMode && !this.isPreviewMode;

        for (const [id, entity] of this.entities) {
            if (draggable) {
                this.scene.input.setDraggable(entity);
            } else {
                this.scene.input.setDraggable(entity, false);
            }

            // [FIX] UI Camera Sync Logic
            // When entering Runtime: UI elements should stay fixed on screen (ScrollFactor 0)
            // When exiting Runtime: UI elements should return to World Space (ScrollFactor 1) & restore Editor Position
            const isUI = entity.getData('isUI') === true;
            if (isUI) {
                const gameObj = entity as any;
                if (this._isRuntimeMode) {
                    // Runtime: Fixed to Screen
                    if (gameObj.setScrollFactor) {
                        gameObj.setScrollFactor(0);
                    }
                } else {
                    // Editor: Moves with Camera (World Space)
                    if (gameObj.setScrollFactor) {
                        gameObj.setScrollFactor(1);
                    }

                    // Restore Editor Position (World Coordinates)
                    // syncRuntimeVisuals() may have moved it to Screen Coordinates (relative to 0,0)
                    const editorEntity = this.core.getEntity(id) || this.core.getGlobalEntity(id);
                    if (editorEntity) {
                        if (gameObj.setPosition) {
                            gameObj.setPosition(editorEntity.x, editorEntity.y);
                        } else {
                            gameObj.x = editorEntity.x;
                            gameObj.y = editorEntity.y;
                        }
                    }
                }
            }
        }
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

        // In Runtime, we skip Editor interactions (Selection, Dragging)
        // so that Game logic (e.g. Button clicks) works without interference.
        if (this.isRuntimeMode) return;

        anyObj.setInteractive?.();

        const draggable = !this.isPreviewMode;
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
        getRuntimeContext?(): RuntimeContext;
    };

    /** 게임 설정 (역할별기능 매핑) */
    gameConfig?: GameConfig;

    // ===== Lifecycle =====

    /**
     * Set assets to preload before calling init()
     * These will be loaded in the scene's preload() phase
     */
    setPreloadAssets(assets: Array<{ id: string; name: string; url: string; tag: string; metadata?: any }>): void {
        this._pendingAssets = assets;
    }

    private _pendingAssets: Array<{ id: string; name: string; url: string; tag: string; metadata?: any }> = [];

    async init(container: HTMLElement, options?: { width?: number, height?: number }): Promise<void> {
        this._container = container;

        const scene = new PhaserRenderScene();
        scene.phaserRenderer = this;
        // Pass pending assets to scene for preload()
        scene.assetsToPreload = this._pendingAssets;
        this.scene = scene;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            scale: options?.width && options?.height ? {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: options.width,
                height: options.height,
            } : {
                mode: Phaser.Scale.RESIZE
            },
            parent: container,
            scene: [scene],
            audio: { noAudio: false },
        };


        this.game = new Phaser.Game(config);

        // 씬 준비 대기
        return new Promise((resolve) => {
            this.initResolve = resolve;
        });
    }


    /**
     * 씬 준비 완료 시 호출 (내부용)
     */
    onSceneReady(): void {
        if (!this.scene) return;

        this.scene.load.setCORS("anonymous");

        // 그리드 그래픽스 초기화
        this.gridGraphics = this.scene.add.graphics();
        this.gridGraphics.setDepth(9999);

        // 입력 이벤트 설정
        this.setupInputEvents();
        this.setupKeyboardCaptureGuards();

        // 초기화 완료 알림
        if (this.initResolve) {
            this.initResolve();
            this.initResolve = null;
        }
    }

    /**
     * 업데이트 루프 (내부용)
     */
    onUpdate(time: number, delta: number): void {
        // console.log(`[PhaserRenderer] onUpdate. Runtime: ${this.isRuntimeMode}, Core: ${!!this.gameCore}`);

        if (this.gridVisible) {
            this.redrawGrid();
        }


        // [Fix] Execute GameCore loop (Logic, Physics, etc.)
        // This is critical for RuntimeContext-based systems (LogicSystem) to run.
        // [REMOVED] Direct call causes duplicate execution!
        // GameCore.update is now called via onUpdateCallback from RunTimeCanvas.tsx
        // if (this.isRuntimeMode && this.gameCore) {
        //     (this.gameCore as any).update(time, delta);
        // }

        if (this.isRuntimeMode && this.gameCore) {
            // [CRITICAL FIX] Sync Runtime Entity Data to Visuals
            this.syncRuntimeVisuals();
        } else {
            // console.warn("[PhaserRenderer] Skipping GameCore update. Runtime:", this.isRuntimeMode, "Core:", !!this.gameCore);
        }

        // Update UI Bars dynamically
        this.updateBars();

        // [Runtime Camera Follow]
        if (this.isRuntimeMode && this.scene && this.scene.cameras.main) {
            const entities = this.core.getEntities();
            // Find entity named "Main Camera"
            // [FIX] Search in RuntimeContext if available, otherwise fallback to core
            let mainCameraEntity: any = null;
            if (this.gameCore && this.gameCore.getRuntimeContext) {
                const ctx = this.gameCore.getRuntimeContext();
                for (const e of ctx.entities.values()) {
                    if (e.name === "Main Camera") {
                        mainCameraEntity = e;
                        break;
                    }
                }
            } else {
                mainCameraEntity = Array.from(entities.values()).find(e => e.name === "Main Camera");
            }

            if (mainCameraEntity) {
                if (!this.scene.runtimeMainCameraFollowed) {
                    // Find corresponding GameObject
                    const cameraObj = this.entities.get(mainCameraEntity.id);
                    if (cameraObj) {
                        this.scene.cameras.main.startFollow(cameraObj, true);
                        this.scene.runtimeMainCameraFollowed = true;
                    }
                }
            } else {
                // [FIX] Camera Fallback: If no "Main Camera", ensure camera is at 0,0 or centered
                if (this.scene.runtimeMainCameraFollowed) {
                    this.scene.cameras.main.stopFollow();
                    this.scene.runtimeMainCameraFollowed = false;
                }
                // Optional: Force center if desired, but 0,0 top-left is standard for no-camera setup
                // this.scene.cameras.main.centerOn(0, 0); 
            }

            // [DEBUG] Log Camera State
            // @ts-ignore
            if (!this._debugTimer) this._debugTimer = Date.now();
            // @ts-ignore
            if (Date.now() - this._debugTimer > 1000) {
                // @ts-ignore
                this._debugTimer = Date.now();

                const cam = this.scene.cameras.main;
                const rendererCount = this.entities.size;
                const runtimeCount = this.gameCore?.getRuntimeContext?.()?.entities.size ?? 0;

            } // END DEBUG
        }

        if (this.onUpdateCallback) {
            this.onUpdateCallback(time, delta);
        }
    }

    /**
     * [CRITICAL] Syncs RuntimeContext entity data (x, y, rotation, etc.) to Phaser GameObjects.
     * Without this, the visuals will never move even if the logic is running!
     */
    private syncRuntimeVisuals(): void {
        const context = this.gameCore?.getRuntimeContext?.();
        if (!context) return;

        // [UI Sync Prep] Find Main Camera for UI Offset Calculation
        let mainCamX = 0;
        let mainCamY = 0;
        let mainCamZoom = 1;
        let hasMainCamera = false;

        // [FIX] Use Initial Camera Position for UI Screen Offset Calculation
        // This ensures UI stays fixed on screen even if Camera moves.
        if (!this._runtimeCameraStartPos && this.isRuntimeMode) {
            for (const [id, entity] of context.entities) {
                if (entity.name === "Main Camera") {
                    const zVar = entity.variables.find((v: any) => v.name === "zoom");
                    this._runtimeCameraStartPos = {
                        x: Number(entity.x),
                        y: Number(entity.y),
                        zoom: zVar ? Number(zVar.value) : 1
                    };
                    break;
                }
            }
        }

        // Use cached start pos if available, otherwise current (fallback)
        if (this._runtimeCameraStartPos) {
            mainCamX = this._runtimeCameraStartPos.x;
            mainCamY = this._runtimeCameraStartPos.y;
            mainCamZoom = this._runtimeCameraStartPos.zoom;
            hasMainCamera = true;
        } else {
            for (const [id, entity] of context.entities) {
                if (entity.name === "Main Camera") {
                    mainCamX = Number(entity.x);
                    mainCamY = Number(entity.y);
                    const zVar = entity.variables.find((v: any) => v.name === "zoom");
                    mainCamZoom = zVar ? Number(zVar.value) : 1;
                    hasMainCamera = true;
                    break;
                }
            }
        }

        const screenCenterX = this.scene?.cameras.main.centerX ?? 0;
        const screenCenterY = this.scene?.cameras.main.centerY ?? 0;

        for (const [id, entity] of context.entities) {
            const obj = this.entities.get(id) as any;
            if (!obj) continue;

            // Check if UI
            const isUI = obj.getData('isUI') === true;

            // 1. Position & Rotation
            let targetX = entity.x;
            let targetY = entity.y;

            if (isUI && hasMainCamera) {
                // [UI Coordinate Transformation]
                // Match the logic in spawn():
                // ScreenOffset = (WorldPos - CameraPos) * Zoom
                // FinalPos = ScreenCenter + ScreenOffset
                // IMPORTANT: We use mainCamX/Y from START position to keep offset constant relative to screen
                const screenOffsetX = (entity.x - mainCamX) * mainCamZoom;
                const screenOffsetY = (entity.y - mainCamY) * mainCamZoom;
                targetX = screenCenterX + screenOffsetX;
                targetY = screenCenterY + screenOffsetY;
            }

            if (obj.setPosition) {
                obj.setPosition(targetX, targetY);
            } else {
                obj.x = targetX;
                obj.y = targetY;
            }

            if (obj.setRotation) {
                obj.setRotation(entity.rotation);
            } else {
                obj.rotation = entity.rotation;
            }

            if (obj.setScale) {
                obj.setScale(entity.scaleX, entity.scaleY);
            }

            // 2. Visibility / Active
            if (obj.setVisible) obj.setVisible(entity.active);
            if (obj.setActive) obj.setActive(entity.active);

            // 3. Depth (Z-index)
            if (entity.z !== undefined && obj.depth !== entity.z) {
                if (obj.setDepth) obj.setDepth(entity.z);
            }

            // 4. Alpha (Opacity)
            const opacityVar = entity.variables.find((v: any) => v.name === "opacity");
            if (opacityVar) {
                const alpha = Number(opacityVar.value);
                if (!isNaN(alpha)) {
                    if (obj.alpha !== alpha && obj.setAlpha) obj.setAlpha(alpha);
                }
            }
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

        // 3.1. 가이드 프레임 그래픽스 정리
        if (this.guideGraphics) {
            this.guideGraphics.destroy();
            this.guideGraphics = null;
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


    }

    // ===== Guide Frame =====
    private guideGraphics: Phaser.GameObjects.Graphics | null = null;

    public setGuideFrame(width: number, height: number, x: number = 0, y: number = 0) {
        if (!this.scene) return;

        // Lazy init
        if (!this.guideGraphics) {
            this.guideGraphics = this.scene.add.graphics();
            this.guideGraphics.setDepth(10000); // Top most
        }

        this.guideGraphics.clear();

        if (width <= 0 || height <= 0) return;

        // Draw White Frame with Top-Left at (x, y)
        // This matches Phaser's default origin for rectangles/containers
        this.guideGraphics.lineStyle(2, 0xffffff, 1);
        this.guideGraphics.strokeRect(x, y, width, height);

        // Optional: Crosshair at top-left corner (origin point)
        this.guideGraphics.lineStyle(1, 0xffffff, 0.5);
        this.guideGraphics.moveTo(x - 10, y);
        this.guideGraphics.lineTo(x + 10, y);
        this.guideGraphics.moveTo(x, y - 10);
        this.guideGraphics.lineTo(x, y + 10);
    }

    public getTextureSize(key: string): { width: number, height: number } | null {
        if (!this.scene || !this.scene.textures) return null;
        if (!this.scene.textures.exists(key)) return null;
        const frame = this.scene.textures.getFrame(key);
        if (!frame) return null;
        return { width: frame.width, height: frame.height };
    }

    // ===== Entity Management - ID ?숆린??蹂댁옣 =====

    spawn(id: string, type: string, x: number, y: number, z: number = 10, options?: SpawnOptions): void {
        if (!this.scene || !this.scene.textures) {
            console.error("[PhaserRenderer] Cannot spawn: scene not initialized");
            return;
        }

        // ID 중복 검사
        if (this.entities.has(id)) {
            // console.warn(`[PhaserRenderer] Entity with id "${id}" already exists. Skipping duplicate spawn.`);
            return;
        }

        // Helper to get variable from either Entity (Editor) or Options (Runtime)
        const getVar = (name: string) => {
            const opts = options as any;
            const fromOpts = opts?.variables?.find((v: any) => v.name === name);
            if (fromOpts) return fromOpts;
            const entity = this.core.getEntity(id) || this.core.getGlobalEntity(id);
            return entity?.variables?.find(v => v.name === name);
        };

        // Check if entity should be rendered (skip data-only entities like GameState)
        const isRenderableVar = getVar("isRenderable");
        if (isRenderableVar?.value === false) {

            return;
        }

        // Skip GameState entity (data container, should not render)
        const entityName = options?.name || this.core.getEntity(id)?.name || this.core.getGlobalEntity(id)?.name;
        if (entityName === "GameState") {

            return;
        }

        const isUIVar = getVar("isUI");
        let isUI = isUIVar?.value === true;

        const uiTypeVar = getVar("uiType");
        const uiType = uiTypeVar ? String(uiTypeVar.value) : (getVar("uiText") ? "text" : "sprite");

        // Force isUI if uiType is a known UI type (fallback for variable sync issues)
        if (["button", "text", "panel", "scrollPanel", "bar"].includes(uiType)) {
            isUI = true;
        }

        const uiTextVar = getVar("uiText");
        const uiText = uiTextVar ? String(uiTextVar.value) : "Text";

        const uiFontSizeVar = getVar("uiFontSize");
        const uiFontSize = uiFontSizeVar ? String(uiFontSizeVar.value) : '16px';

        const uiColorVar = getVar("uiColor");
        const uiColor = uiColorVar ? String(uiColorVar.value) : '#ffffff';

        const uiBgColorVar = getVar("uiBackgroundColor");
        const uiBackgroundColor = uiBgColorVar ? String(uiBgColorVar.value) : undefined;

        const uiBarColorVar = getVar("uiBarColor");
        const uiBarColor = uiBarColorVar ? String(uiBarColorVar.value) : '#e74c3c';

        const uiAlignVar = getVar("uiAlign");
        const uiAlign = uiAlignVar ? String(uiAlignVar.value) : "center";

        const widthVar = getVar("width");
        let width = widthVar ? Number(widthVar.value) : (options?.width); // Undefined if not set

        const heightVar = getVar("height");
        let height = heightVar ? Number(heightVar.value) : (options?.height); // Undefined if not set

        // Resolve Native Size if width/height are missing
        const textureKey = options?.texture || this.core.getEntity(id)?.texture || this.core.getGlobalEntity(id)?.texture;

        if ((width === undefined || height === undefined) && textureKey) {
            const native = this.getTextureSize(textureKey);
            if (native) {
                if (width === undefined) width = native.width;
                if (height === undefined) height = native.height;
            }
        }

        // Final Fallbacks
        if (width === undefined) width = 100;
        if (height === undefined) height = width; // Square fallback if only width exists, or 100 if neither

        const keepAspectRatioVar = getVar("keepAspectRatio");
        const keepAspectRatio = keepAspectRatioVar?.value === true;

        // Helper to set size with aspect ratio check
        const setSize = (sprite: Phaser.GameObjects.Sprite) => {
            if (keepAspectRatio) {
                const tex = sprite.texture.getSourceImage();
                if (tex) {
                    const ratio = tex.width / tex.height;
                    const targetRatio = (width as number) / (height as number);
                    if (ratio > targetRatio) {
                        sprite.setDisplaySize(width as number, (width as number) / ratio);
                    } else {
                        sprite.setDisplaySize((height as number) * ratio, height as number);
                    }
                } else {
                    sprite.setDisplaySize(width as number, height as number);
                }
            } else {
                sprite.setDisplaySize(width as number, height as number);
            }
        };

        // [UI COORDINATE TRANSFORMATION]
        // Editor: UI at world coordinates (user can drag position)
        // Runtime: UI uses scrollFactor(0), positioned relative to screen center
        let uiX = x;
        let uiY = y;

        if (isUI && this.isRuntimeMode && this.scene?.cameras?.main) {
            // Calculate screen offset from Main Camera position
            let mainCamera: any = null;

            // 1. Try finding in GameCore (Runtime)
            if (this.gameCore && this.gameCore.getAllEntities) {
                const all = this.gameCore.getAllEntities();
                mainCamera = Array.from(all.values()).find((e: any) => e.name === 'Main Camera');
            }

            // 2. Fallback to Editor Core
            if (!mainCamera) {
                mainCamera = this.core.getEntities().get('Main Camera') ||
                    Array.from(this.core.getEntities().values()).find(e => e.name === 'Main Camera') ||
                    this.core.getGlobalEntities().get('Main Camera') ||
                    Array.from(this.core.getGlobalEntities().values()).find(e => e.name === 'Main Camera');
            }

            if (mainCamera) {
                const cam = this.scene.cameras.main;
                const editorCamX = Number(mainCamera.x) || 0;
                const editorCamY = Number(mainCamera.y) || 0;

                // [FIX] Apply Zoom to Screen Offset
                // Identify Zoom variable from Main Camera entity variables
                const zoomVar = mainCamera.variables?.find((v: any) => v.name === "zoom");
                const zoom = zoomVar ? Number(zoomVar.value) : 1;

                // Calculate offset from Main Camera (this is the "screen offset")
                // Visual Distance = World Distance * Zoom
                const screenOffsetX = (x - editorCamX) * zoom;
                const screenOffsetY = (y - editorCamY) * zoom;

                // Apply offset from camera center
                uiX = cam.centerX + screenOffsetX;
                uiY = cam.centerY + screenOffsetY;

                // console.log(`[PhaserRenderer] UI Spawn: ${options?.name} (isUI=${isUI})`);
                // console.log(`  - Entity World Pos: (${x}, ${y})`);
                // console.log(`  - Main Camera: Pos(${editorCamX}, ${editorCamY}), Zoom(${zoom})`);
                // console.log(`  - Screen Offset (Zoomed): (${screenOffsetX}, ${screenOffsetY})`);
                // console.log(`  - Final Screen Pos: (${uiX}, ${uiY})`);
            } else {
                console.warn(`[PhaserRenderer] UI Coordinate Warning: 'Main Camera' entity not found. UI may appear misplaced.`);
            }
        }

        let obj: Phaser.GameObjects.GameObject;

        if (uiType === "text") {
            const textObj = this.scene.add.text(uiX, uiY, uiText, {
                fontSize: uiFontSize.includes('px') ? uiFontSize : `${uiFontSize}px`,
                color: uiColor,
                fontFamily: 'monospace',
                backgroundColor: uiBackgroundColor,
                padding: { x: 4, y: 2 }
            });
            textObj.setOrigin(0.5);
            obj = textObj;
        } else if (uiType === "button") {
            const container = this.scene.add.container(uiX, uiY);
            const bgColorInt = uiBackgroundColor ? parseInt(uiBackgroundColor.replace('#', '0x'), 16) : 0x3498db;
            let bg: Phaser.GameObjects.GameObject;
            if (options?.texture && this.scene.textures.exists(options.texture)) {
                const sprite = this.scene.add.sprite(0, 0, options.texture);
                setSize(sprite);
                bg = sprite;
            } else {
                bg = this.scene.add.rectangle(0, 0, width, height, bgColorInt);
            }
            bg.setName("bg");

            const label = this.scene.add.text(0, 0, uiText, {
                fontSize: uiFontSize.includes('px') ? uiFontSize : `${uiFontSize}px`,
                color: uiColor,
                fontFamily: 'monospace',
            });
            label.setOrigin(0.5);
            label.setName("label");
            container.add([bg, label]);
            container.setSize(width, height);
            obj = container;

        } else if (uiType === "panel" || uiType === "scrollPanel") {
            // Panel/ScrollPanel Container
            const container = this.scene.add.container(uiX, uiY);
            const bgColorInt = uiBackgroundColor ? parseInt(uiBackgroundColor.replace('#', '0x'), 16) : 0x2c3e50;

            // Panel BG (Sprite or Rect)
            let bg: Phaser.GameObjects.GameObject;
            if (options?.texture && this.scene.textures.exists(options.texture)) {
                const sprite = this.scene.add.sprite(0, 0, options.texture);
                setSize(sprite);
                bg = sprite;
            } else {
                bg = this.scene.add.rectangle(0, 0, width, height, bgColorInt);
            }
            bg.setName("bg");
            container.add(bg);

            if (uiType === "scrollPanel") {
                // Visual Scroll Bar for Scroll Panel
                const barWidth = 10;
                const track = this.scene.add.rectangle((width / 2) - 10, 0, barWidth, height - 10, 0x000000, 0.3);
                const thumb = this.scene.add.rectangle((width / 2) - 10, -(height / 2) + 20, barWidth - 2, 40, 0xbdc3c7);
                container.add([track, thumb]);
            }

            container.setSize(width, height);
            obj = container;

        } else if (uiType === "image") {
            // UI Image - standard sprite but can be colored rect if no texture
            if (options?.texture && this.scene.textures.exists(options.texture)) {
                const sprite = this.scene.add.sprite(uiX, uiY, options.texture);
                setSize(sprite);
                obj = sprite;
            } else {
                // Fallback white rect for placeholder image
                const rect = this.scene.add.rectangle(uiX, uiY, width, height, 0xffffff);
                obj = rect;
            }

        } else if (uiType === "bar") {
            // Bar is a container with BG and FG
            const container = this.scene.add.container(uiX, uiY);

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

            // Assume default logic applies (stretch?) or default size?
            // Existing code:
            // sprite.setDisplaySize(width, height); -> Wait, previous code didn't setDisplaySize for default?
            // Ah, line 874 was empty in prev view? 
            // In original code (viewed earlier), it just created sprite.
            // But 'width'/'height' are derived from options?.width ?? 100.
            // If it's a generic sprite (non-UI), using width/height forces it.
            // Let's use setSize() here too if we want generic sprites to respect aspect ratio setting.
            // Note: Generic sprites usually don't have 'keepAspectRatio' variable unless they are UI.
            // But if they do, setSize handles it.
            // Wait, existing code didn't setDisplaySize 
            // line 872: const sprite = this.scene.add.sprite(x,y, options.texture);
            // It did NOT set size. Using native size.
            // But UI elements definitely need size.

            obj = sprite;
        } else if (type === "container" || type === "Camera" || entityName === "Main Camera") {
            // [Fix] Handle 'container' type explicitly (e.g. Main Camera)
            // Create empty container, no visual placeholder
            const container = this.scene.add.container(x, y);
            container.setSize(width, height);
            obj = container;
        } else {
            // Fallback Placeholder
            const rect = this.scene.add.rectangle(x, y, width, height, 0xff00ff);
            obj = rect;
        }

        (obj as any).setDepth(Math.max(z, 10));
        obj.setData('isUI', isUI);

        // Add to collections
        this.entities.set(id, obj);
        this.scene.add.existing(obj);

        const opts = options as any;
        if (opts?.role === "projectile" || opts?.role === "enemy" || opts?.role === "player") {
            this.scene.physics.add.existing(obj);
        }

        // console.log(`[PhaserRenderer] Spawned ${uiType} id=${id} x=${x} y=${y} z=${z} isUI=${isUI} runtime=${this.isRuntimeMode}`);

        this.attachEntityInteraction(obj, id, uiType || type);

        // [FIX] Auto-play default animation for sprites with spritesheets
        if (obj instanceof Phaser.GameObjects.Sprite && options?.texture) {
            const textureKey = options.texture;
            const defaultAnimKey = `${textureKey}_default`;

            // Check if default animation exists and play it
            if (this.scene.anims.exists(defaultAnimKey)) {
                obj.play(defaultAnimKey, true);
            }
        }

        // UI Element Common Settings
        if (isUI) {
            const uiObj = obj as any;

            // Apply ScrollFactor(0) for Runtime mode only
            // Editor mode: UI moves with camera (scrollFactor=1, default)
            // Runtime mode: UI fixed to screen (scrollFactor=0)
            if (this.isRuntimeMode) {
                if (uiObj.setScrollFactor) {
                    uiObj.setScrollFactor(0);
                }
            }

            if (z < 100) uiObj.setDepth(100);
            else uiObj.setDepth(z);

            // Re-apply Button Interactions (only in Runtime, to not interfere with Editor dragging)

            // Re-apply Button Interactions (Runtime Only)
            if (this.isRuntimeMode && uiType === "button" && obj instanceof Phaser.GameObjects.Container) {
                const bg = obj.getByName("bg");
                if (bg) {
                    const container = obj;

                    // Keep Background Origin 0.5 to ensure Text alignment (Visual Integrity)
                    (bg as any).setOrigin(0.5);

                    // User Feedback: "Move Hitbox Right and Down"
                    // Visuals appear to be rendering in Bottom-Right quadrant relative to Container (0,0).
                    // So we match HitArea to start at (0,0).
                    const hitArea = new Phaser.Geom.Rectangle(0, 0, width, height);

                    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
                    // this.scene.input.enableDebug(container); // Visual Debug
                    // console.log(`[Button] Setup Offset HitArea...`);

                    const opts = options as any;
                    const bgColorInt = opts?.uiBackgroundColor ? parseInt(opts.uiBackgroundColor.replace('#', '0x'), 16) : 0x3498db;

                    container.off('pointerover');
                    container.off('pointerout');
                    container.off('pointerdown');
                    container.off('pointerup');

                    container.on('pointerover', () => {
                        if ('setTint' in bg) (bg as any).setTint(0xcccccc);
                        else (bg as any).setFillStyle(0x2980b9);
                    });
                    container.on('pointerout', () => {
                        if ('setTint' in bg) (bg as any).clearTint();
                        else (bg as any).setFillStyle(bgColorInt);
                    });
                    container.on('pointerdown', () => {
                        if ('setTint' in bg) (bg as any).setTint(0x888888);
                        else (bg as any).setFillStyle(0x1abc9c);

                        // Trigger Game Logic "On Click"
                        EventBus.emit("OnClick", { button: 0 }, id);


                        if (this.onEntityClick && this.scene) {
                            const ptr = this.scene.input.activePointer;
                            const world = this.scene.cameras.main.getWorldPoint(ptr.x, ptr.y);
                            this.onEntityClick(id, world.x, world.y);
                        }
                    });
                    container.on('pointerup', () => {
                        if ('setTint' in bg) (bg as any).setTint(0xcccccc);
                        else (bg as any).setFillStyle(0x2980b9);
                    });
                }
            }
        } else {
            // Non-UI tinting
            if ('setTint' in obj) {
                // @ts-ignore
                obj.setTint(options?.color || 0xffffff);
            }
        }

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
            // console.log(`[PhaserRenderer] Removed entity: ${id}`);
        } else {
            // console.warn(`[PhaserRenderer] Cannot remove: entity "${id}" not found`);
        }
    }

    refreshEntityTexture(id: string, textureKey: string): void {
        // console.log(`[PhaserRenderer] refreshEntityTexture called for ${id} with ${textureKey}`);
        if (!this.scene) {
            // console.warn("[PhaserRenderer] No scene during refreshEntityTexture");
            return;
        }
        if (!this.scene.textures.exists(textureKey)) {
            // console.warn(`[PhaserRenderer] Texture ${textureKey} not found for refreshEntityTexture`);
            return;
        }

        const obj = this.entities.get(id);
        // console.log(`[PhaserRenderer] refreshEntityTexture found object for ${id}:`, obj ? obj.constructor.name : "null");

        if (!obj) return;

        const entity = this.core.getEntity(id);
        const keepAspectRatio = entity?.variables.find(v => v.name === "keepAspectRatio")?.value === true;
        // Re-read dimensions from variables to be safe, or use current object size if trusted?
        // Variables are source of truth.
        const wVar = entity?.variables.find(v => v.name === "width");
        const hVar = entity?.variables.find(v => v.name === "height");
        const baseW = wVar ? Number(wVar.value) : (obj as any).width;
        const baseH = hVar ? Number(hVar.value) : (obj as any).height;

        const setSize = (sprite: Phaser.GameObjects.Sprite) => {
            // [FIX] Only enforce display size if variables EXPLICITLY specify width/height.
            // Otherwise, respect the entity's current transform scale (set by GameCore).
            if (wVar || hVar || keepAspectRatio) {
                if (keepAspectRatio) {
                    const tex = sprite.texture.getSourceImage();
                    if (tex) {
                        const ratio = tex.width / tex.height;
                        const targetRatio = baseW / baseH;
                        if (ratio > targetRatio) {
                            sprite.setDisplaySize(baseW, baseW / ratio);
                        } else {
                            sprite.setDisplaySize(baseH * ratio, baseH);
                        }
                    } else {
                        sprite.setDisplaySize(baseW, baseH);
                    }
                } else {
                    sprite.setDisplaySize(baseW, baseH);
                }
            } else {
                // If no explicit size variables, DO NOT reset display size.
                // Phaser's setTexture automatically resets frame size, but we want to KEEP scale.
                // GameCore has already applied scaleX/scaleY.
                // If we setDisplaySize(w, h) using native w/h, we force scale to 1.
                // So we do nothing here, letting GameCore's scale prevail.
            }
        };

        // 1. Handle Sprite (Direct Entity)
        if (obj instanceof Phaser.GameObjects.Sprite) {
            if (!obj.texture || obj.texture.key !== textureKey) {
                const wasLoaded = this.scene.textures.exists(textureKey) &&
                    this.scene.textures.get(textureKey).key !== '__MISSING';

                obj.setTexture(textureKey);

                // [FIX] Auto-play default animation after texture change
                const defaultAnimKey = `${textureKey}_default`;
                if (this.scene.anims.exists(defaultAnimKey)) {
                    obj.play(defaultAnimKey, true);
                }

                // If texture wasn't loaded when setTexture was called,
                // recalculate size when it finishes loading
                if (!wasLoaded) {
                    const textureUrl = entity?.texture ? this.getAssetUrl(entity.texture) : undefined;
                    if (textureUrl) {
                        // Find asset for metadata
                        const assets = this.core.getAssets();
                        const asset = assets.find(a => a.name === entity?.texture || a.id === entity?.texture);
                        this.loadTexture(textureKey, textureUrl, asset?.metadata).then(() => {
                            if (obj && !obj.scene) return; // Sprite was destroyed
                            setSize(obj);
                            // [FIX] Play animation after texture loads
                            const animKey = `${textureKey}_default`;
                            if (this.scene?.anims.exists(animKey)) {
                                obj.play(animKey, true);
                            }
                        }).catch((err: Error) => {
                            console.error(`[updateEntityVisuals] Failed to load texture for recalculation:`, err);
                        });
                    } else {
                        setSize(obj);
                    }
                } else {
                    setSize(obj);
                }
            }
            return;
        }

        // 2. Handle Container (Button, Panel, Bar)
        if (obj instanceof Phaser.GameObjects.Container) {
            const bg = obj.getByName("bg");
            if (!bg) return;

            if (bg instanceof Phaser.GameObjects.Sprite) {
                if (bg.texture.key !== textureKey) {
                    const wasLoaded = this.scene.textures.exists(textureKey) &&
                        this.scene.textures.get(textureKey).key !== '__MISSING';

                    bg.setTexture(textureKey);

                    // [FIX] Auto-play default animation
                    const defaultAnimKey = `${textureKey}_default`;
                    if (this.scene.anims.exists(defaultAnimKey)) {
                        bg.play(defaultAnimKey, true);
                    }

                    // Recalculate size after texture loads if it wasn't loaded initially
                    if (!wasLoaded) {
                        const textureUrl = entity?.texture ? this.getAssetUrl(entity.texture) : undefined;
                        if (textureUrl) {
                            // Find asset for metadata
                            const assets = this.core.getAssets();
                            const asset = assets.find(a => a.name === entity?.texture || a.id === entity?.texture);
                            this.loadTexture(textureKey, textureUrl, asset?.metadata).then(() => {
                                if (bg && !bg.scene) return; // Sprite was destroyed
                                setSize(bg);
                                // [FIX] Play animation after texture loads
                                const animKey = `${textureKey}_default`;
                                if (this.scene?.anims.exists(animKey)) {
                                    bg.play(animKey, true);
                                }
                            }).catch((err: Error) => {
                                console.error(`[updateEntityVisuals] Container sprite texture load failed:`, err);
                            });
                        } else {
                            setSize(bg);
                        }
                    } else {
                        setSize(bg);
                    }
                }
            } else if (bg instanceof Phaser.GameObjects.Rectangle) {
                // Replace Rect with Sprite
                const x = bg.x;
                const y = bg.y;

                obj.remove(bg);
                bg.destroy();

                const sprite = this.scene.add.sprite(x, y, textureKey);
                sprite.setName("bg");

                // Check if texture is loaded
                const wasLoaded = this.scene.textures.exists(textureKey) &&
                    this.scene.textures.get(textureKey).key !== '__MISSING';

                if (!wasLoaded) {
                    const textureUrl = entity?.texture ? this.getAssetUrl(entity.texture) : undefined;
                    if (textureUrl) {
                        // Find asset for metadata
                        const assets = this.core.getAssets();
                        const asset = assets.find(a => a.name === entity?.texture || a.id === entity?.texture);
                        this.loadTexture(textureKey, textureUrl, asset?.metadata).then(() => {
                            if (sprite && !sprite.scene) return;
                            setSize(sprite);
                            // [FIX] Play animation after texture loads
                            const animKey = `${textureKey}_default`;
                            if (this.scene?.anims.exists(animKey)) {
                                sprite.play(animKey, true);
                            }
                        }).catch((err: Error) => {
                            console.error(`[updateEntityVisuals] New sprite texture load failed:`, err);
                        });
                    } else {
                        setSize(sprite);
                    }
                } else {
                    setSize(sprite);
                    // [FIX] Auto-play default animation
                    const defaultAnimKey = `${textureKey}_default`;
                    if (this.scene.anims.exists(defaultAnimKey)) {
                        sprite.play(defaultAnimKey, true);
                    }
                }

                obj.addAt(sprite, 0);
            }
            return;
        }

        // 3. Handle Rectangle (Fallback -> Sprite)
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

        // For root/non-UI sprite, keepAspectRatio usually not set, but if it is?
        // Logic mainly for UI Containers logic above.
        // But let's apply for consistency if entity has the variable.
        setSize(sprite);

        // [FIX] Auto-play default animation for new sprite
        const defaultAnimKey = `${textureKey}_default`;
        if (this.scene.anims.exists(defaultAnimKey)) {
            sprite.play(defaultAnimKey, true);
        }

        if (entity?.role === "projectile" || entity?.role === "enemy" || entity?.role === "player") {
            this.scene.physics.add.existing(sprite);
        }

        this.entities.set(id, sprite);
        this.attachEntityInteraction(sprite, id, entity?.type ?? "sprite");
    }

    // ===== Animation =====

    // ===== Animation =====

    playAnim(id: string, name: string, loop?: boolean): void {
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

        // If the requested name implies a texture prefix (e.g. "SomeAsset_Walk"), try to switch texture first
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
            // console.log(`[PhaserRenderer] Switching texture: ${sprite.texture.key} -> ${targetTexture}`);
            sprite.setTexture(targetTexture, 0);
        }

        // Define a helper to play and log
        const tryPlay = (key: string, isFallback: boolean = false): boolean => {
            if (this.scene?.anims.exists(key)) {
                sprite.play(key, true);
                if (isFallback) {

                }

                // [Loop Override]
                if (loop !== undefined && sprite.anims) {
                    sprite.anims.repeat = loop ? -1 : 0;
                }

                // [Debug]
                if (sprite.anims.currentAnim) {
                    // Log occasionally or if needed
                }
                return true;
            }
            return false;
        };

        // 1. Try Exact Match
        if (tryPlay(targetAnimKey)) return;

        // 2. Try prefixed match: "${TextureKey}_${AnimName}"
        // e.g. User asks for "Walk", texture is "Zombie". Try "Zombie_Walk".
        if (name.indexOf('_') === -1) {
            const prefixed = `${targetTexture}_${name}`;
            if (tryPlay(prefixed, true)) return;
        }

        // 3. Try Texture Key itself (sometimes anim key == texture key)
        if (tryPlay(targetTexture, true)) return;

        // 4. Try "${TextureKey}_default" (The standard auto-generated default)
        const defaultKey = `${targetTexture}_default`;
        if (tryPlay(defaultKey, true)) return;

        // 5. Deep Fallback: Find ANY animation starting with texture key
        // Use the cache directly to avoid expensive toJSON()
        if (this.scene?.anims) {
            // @ts-ignore - 'anims.entries' is internal but efficient. 
            // If strictly public API is needed, we'd have to use internal iteration or keep a side-map.
            // Using a safer iteration if possible.
            // Phaser 3.60+ has anims.get(key).

            // Note: iterating all animations might be slow if there are thousands. 
            // But usually this fallback is rare.
            // Let's try to construct a likely list or use the previous JSON method if we must, 
            // but let's try to be smarter.
            // Actually, we can just fail here safely.

            // console.warn(`[PhaserRenderer] Anim '${name}' not found for texture '${targetTexture}'. Fallbacks failed.`);
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

    private updateBars(): void {
        if (!this.scene) return;

        // Iterate LOCAL entities in Phaser to find bars
        // This is more efficient than iterating core.entities if we just want to update visuals
        // But we need data from Core/Runtime.

        // Strategy: Iterate over all Phaser entities. If it's a UI Bar, find its source and update.
        for (const [id, obj] of this.entities) {
            // Check if this object is a Bar Container
            const isUI = obj.getData('isUI');
            const type = obj.getData('type');

            if (!isUI || type !== 'bar') continue;

            // Retrieve configuration from Variable store (Editor vs Runtime)
            let entityData: any = null;
            let sourceEntityId: string = "";
            let valueVarName: string = "";
            let maxVarName: string = "";

            if (this.isRuntimeMode && this.gameCore?.getRuntimeContext) {
                const ctx = this.gameCore.getRuntimeContext();
                entityData = ctx?.entities.get(id); // RuntimeEntity
            } else {
                entityData = this.core.getEntity(id); // EditorEntity
            }

            if (!entityData) continue;

            // Get variable config (Bar needs 'uiSourceEntity', 'uiValueVar', 'uiMaxVar')
            const getVarVal = (name: string) => entityData.variables?.find((v: any) => v.name === name)?.value;

            sourceEntityId = String(getVarVal("uiSourceEntity") || "");
            valueVarName = String(getVarVal("uiValueVar") || "");
            maxVarName = String(getVarVal("uiMaxVar") || "");

            if (!sourceEntityId || !valueVarName || !maxVarName) continue;

            // Resolve Source Entity Variables
            let currentValue = 0;
            let maxValue = 1;

            if (this.isRuntimeMode && this.gameCore?.getRuntimeContext) {
                // RUNTIME: Use RuntimeContext's optimized lookup
                const ctx = this.gameCore.getRuntimeContext();
                currentValue = Number(ctx?.getEntityVariable(sourceEntityId, valueVarName) ?? 0);
                maxValue = Number(ctx?.getEntityVariable(sourceEntityId, maxVarName) ?? 1);
            } else {
                // EDITOR: Use Core Entities (Real-time updates from Inspector)
                const sourceEntity = this.core.getEntity(sourceEntityId) || this.core.getGlobalEntity(sourceEntityId);
                if (sourceEntity) {
                    currentValue = Number(sourceEntity.variables?.find((v: any) => v.name === valueVarName)?.value ?? 0);
                    maxValue = Number(sourceEntity.variables?.find((v: any) => v.name === maxVarName)?.value ?? 1);
                }
            }

            // Update parameters
            this.setBarValue(id, currentValue, maxValue);
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

    createAnimation(key: string, frames: string[], frameRate: number, repeat: number = -1): void {
        if (!this.scene || this.scene.anims.exists(key)) return;

        // Assuming frames are provided as an array of frame keys (e.g., ["frame0", "frame1"])
        // or if it's a spritesheet, frames[0] is the texture key and subsequent frames are indices.
        // For simplicity, let's assume frames are actual frame keys or a single texture key for generateFrameNumbers.
        // If frames is an array of frame names/indices, we need to map them.
        // If it's a spritesheet, we might need to generate frame numbers.

        // This implementation assumes `frames` is an array of frame names/indices for a single texture.
        // If `frames` contains multiple texture keys, a more complex animation creation is needed.
        // For now, let's assume the first element of `frames` is the texture key, and we generate frames from it.
        // Or, if `frames` are actual frame names, we can use `this.scene.anims.createFromAseprite` or similar.
        // Given the `frames: string[]` type, it's most likely a list of frame names or a texture key + frame indices.

        // Let's assume `frames` are frame names from a single texture.
        // If `frames` is meant to be a texture key and then frame numbers, the signature should be different.
        // For now, let's use `generateFrameNumbers` with the first frame as the texture key.
        // This is a common pattern for spritesheet animations.

        if (frames.length === 0) {
            console.warn(`[PhaserRenderer] Cannot create animation '${key}': no frames provided.`);
            return;
        }

        this.scene.anims.create({
            key: key,
            frames: this.scene.anims.generateFrameNumbers(frames[0], { start: 0, end: frames.length - 1 }),
            frameRate: frameRate,
            repeat: repeat
        });
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

    // ===== UI Update Helpers =====

    updateText(id: string, text: string): void {
        const entity = this.entities.get(id);
        if (!entity || !entity.active) return;

        let targetText: Phaser.GameObjects.Text | null = null;

        if (entity instanceof Phaser.GameObjects.Text) {
            targetText = entity;
        } else if (entity instanceof Phaser.GameObjects.Container) {
            // Try to find text child
            const txt = entity.getByName("text");
            if (txt && txt instanceof Phaser.GameObjects.Text) {
                targetText = txt;
            }
        }

        if (targetText) {
            targetText.setText(text);
        }
    }

    updateBar(id: string, ratio: number): void {
        const entity = this.entities.get(id);
        if (!entity || !entity.active) return;

        if (entity instanceof Phaser.GameObjects.Container) {
            // Expecting "fg" child for foreground bar
            const fg = entity.getByName("fg") as Phaser.GameObjects.Rectangle;
            if (fg && fg instanceof Phaser.GameObjects.Rectangle) {
                // Assuming left-aligned (origin 0,0) or centered
                // For simplicity, we just scale width relative to bg?
                // Or if we used scaleX. 
                // Let's assume we change scaleX if origin is 0, or width if we want.
                // In spawn logic: .setOrigin(0, 0) was used for bar fg.
                fg.setScale(Math.max(0, Math.min(1, ratio)), 1);
            }
        }
    }

    getCameraZoom(): number {
        if (!this.scene) return 1;
        return this.scene.cameras.main.zoom;
    }

    /**
     * 특정 화면 좌표를 기준으로 줌 설정
     * @param screenX 화면 X (픽셀)
     * @param screenY 화면 Y (픽셀)
     * @param targetZoom 목표 줌 레벨
     */
    zoomAt(screenX: number, screenY: number, targetZoom: number): void {
        if (!this.scene) return;
        const cam = this.scene.cameras.main;

        // 1. Get World Point BEFORE zoom
        // Note: getWorldPoint returns the world coordinate that corresponds to the screen coordinate
        // taking into account current zoom and scroll.
        const worldPoint = cam.getWorldPoint(screenX, screenY);

        // 2. Set Zoom
        cam.setZoom(targetZoom);

        // 3. Set Scroll to maintain Mouse anchor
        // Formula: WorldX = (ScreenX - CamX) / CamZoom + CamScrollX
        // We want CamScrollX = WorldX - (ScreenX - CamX) / CamZoom
        // Usually cam.x is 0 (viewport offset).
        cam.scrollX = worldPoint.x - (screenX - cam.x) / targetZoom;
        cam.scrollY = worldPoint.y - (screenY - cam.y) / targetZoom;
    }

    setCameraScroll(x: number, y: number): void {
        if (!this.scene) return;
        this.scene.cameras.main.scrollX = x;
        this.scene.cameras.main.scrollY = y;
    }

    getCameraScroll(): { x: number, y: number } {
        if (!this.scene) return { x: 0, y: 0 };
        return {
            x: this.scene.cameras.main.scrollX,
            y: this.scene.cameras.main.scrollY
        };
    }

    private getAssetUrl(key: string): string | undefined {
        const assets = this.core.getAssets();
        const asset = assets.find(a => a.name === key || a.id === key);
        return asset?.url;
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
        this.baseLayer.setDepth(-100);
        this.previewLayer.setDepth(-50);
        this.previewLayer.setAlpha(0.6); // Translucent preview
    }

    setTile(x: number, y: number, tileIndex: number): void {
        if (!this.baseLayer || !this.map || !this.tileset || !this.baseLayer.layer) return;
        if (!Number.isFinite(tileIndex) || tileIndex < 0) return;
        if (this.tileset.total !== undefined && tileIndex >= this.tileset.total) return;

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

        // 湲곗〈 ?꾨━酉??쒓굅 - Removed to allow multiple preview tiles (Shape Tool)
        // this.previewLayer.fill(-1);

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
                this.onPointerMove(world.x, world.y, world.z, result.inside);
            }
        };

        const onPointerUp = (e: PointerEvent) => {
            const result = getWorldPos(e.clientX, e.clientY);
            if (result && this.onPointerUp) {
                const { world } = result;
                this.onPointerUp(world.x, world.y, world.z);
            }
        };

        // Wheel event - use same coordinate calculation as other pointer events
        const onWheel = (e: WheelEvent) => {
            if (this.onScroll && canvas) {
                e.preventDefault();

                // Calculate screen coordinates the same way as getWorldPos
                const rect = canvas.getBoundingClientRect();
                const screenX = (e.clientX - rect.left) * (canvas.width / rect.width);
                const screenY = (e.clientY - rect.top) * (canvas.height / rect.height);

                this.onScroll(e.deltaY, screenX, screenY);
            }
        };

        window.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointermove", onPointerMove, { capture: true });
        window.addEventListener("pointerup", onPointerUp);

        // Attach wheel to canvas directly
        canvas.addEventListener("wheel", onWheel, { passive: false });

        // Cleanup on scene shutdown
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            canvas.removeEventListener("wheel", onWheel);
        });

        this.scene.events.once(Phaser.Scenes.Events.DESTROY, () => {
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            canvas.removeEventListener("wheel", onWheel);
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

    /**
     * [FIX] Before removing a texture, update all sprites using it to prevent glTexture null error.
     * This sets affected sprites to be invisible temporarily. They will be restored when the texture is reloaded.
     */
    private updateSpritesBeforeTextureRemove(textureKey: string): void {
        if (!this.scene) return;

        for (const [_id, obj] of this.entities) {
            if (obj instanceof Phaser.GameObjects.Sprite) {
                if (obj.texture && obj.texture.key === textureKey) {
                    // Store the original texture key and frame for restoration
                    obj.setData('__pendingTextureReload', { key: textureKey, frame: obj.frame?.name });
                    // Hide the sprite until texture is reloaded
                    obj.setVisible(false);
                }
            } else if (obj instanceof Phaser.GameObjects.Container) {
                // Check children of containers
                obj.each((child: Phaser.GameObjects.GameObject) => {
                    if (child instanceof Phaser.GameObjects.Sprite) {
                        if (child.texture && child.texture.key === textureKey) {
                            child.setData('__pendingTextureReload', { key: textureKey, frame: child.frame?.name });
                            child.setVisible(false);
                        }
                    }
                });
            }
        }
    }

    /**
     * [FIX] After a texture is reloaded, restore sprites that were hidden.
     */
    private restoreSpritesAfterTextureReload(textureKey: string): void {
        if (!this.scene) return;

        for (const [_id, obj] of this.entities) {
            if (obj instanceof Phaser.GameObjects.Sprite) {
                const pending = obj.getData('__pendingTextureReload');
                if (pending && pending.key === textureKey) {
                    // Re-apply the texture with the new spritesheet
                    obj.setTexture(textureKey, pending.frame || '0');
                    obj.setVisible(true);
                    obj.setData('__pendingTextureReload', null);
                }
            } else if (obj instanceof Phaser.GameObjects.Container) {
                obj.each((child: Phaser.GameObjects.GameObject) => {
                    if (child instanceof Phaser.GameObjects.Sprite) {
                        const pending = child.getData('__pendingTextureReload');
                        if (pending && pending.key === textureKey) {
                            child.setTexture(textureKey, pending.frame || '0');
                            child.setVisible(true);
                            child.setData('__pendingTextureReload', null);
                        }
                    }
                });
            }
        }
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
                // [FIX] Check if this metadata implies a REAL spritesheet (with actual frame data)
                // Simple animation settings (loop, fps) without frame data should NOT trigger spritesheet reload
                const hasRealSpriteSheetData = metadata && (
                    (metadata.frameWidth && metadata.frameWidth > 0 && metadata.frameHeight && metadata.frameHeight > 0) ||
                    (metadata.frameCount && metadata.frameCount > 1)
                );

                if (hasRealSpriteSheetData) {
                    // Check if animations already exist
                    const hasPrefixAnims = scene.anims.toJSON()?.anims?.some((a: any) => a.key.startsWith(key + "_"));
                    // [FIX] Also check for manually added frames via getFrameNames()
                    const existingFrameNames = texture.getFrameNames();
                    const hasMultipleFrames = existingFrameNames.length > 1 || texture.frameTotal > 1;

                    if (!hasMultipleFrames && !hasPrefixAnims) {
                        console.warn(`[PhaserRenderer] Texture '${key}' exists but is static. Reloading as spritesheet for animations.`);
                        // [FIX] Before removing texture, update all sprites using it to prevent glTexture null error
                        this.updateSpritesBeforeTextureRemove(key);
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
                    // [FIX] Without spritesheet metadata, do NOT attempt heuristic slicing on existing textures.
                    // The heuristic should only run on FIRST load (in the 'complete' callback below).
                    // For existing textures without metadata, just resolve immediately - they're static images.
                    resolve();
                    return;
                }
            }

            // console.log(`[PhaserRenderer] Loading texture: ${key}`, metadata);

            if (metadata && metadata.frameWidth > 0 && metadata.frameHeight > 0) {
                scene.load.spritesheet(key, url, {
                    frameWidth: metadata.frameWidth,
                    frameHeight: metadata.frameHeight!,
                });
            } else {
                scene.load.image(key, url);
            }

            this.scene.load.once("complete", () => {
                if (!this.scene) return;
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

                        }

                        // Execute manual slicing if determined
                        if (framesToSlice > 1 && frameWidth > 0) {

                            for (let i = 0; i < framesToSlice; i++) {
                                // [Fix] Use STRING keys to align with explicit animation creation and ensure lookup consistency
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
                // [FIX] Restore sprites that were hidden before texture removal
                this.restoreSpritesAfterTextureReload(key);
                resolve();
            });

            // [Robust Fallback] If loading fails (CORS, 404), Log warning but DO NOT crash.
            // Resolve anyway so the game can continue with other assets/logic.
            scene.load.once("loaderror", (file: any) => {
                if (file.key === key) {
                    console.warn(`[PhaserRenderer] Failed to load texture '${key}' (likely CORS or 404). Using fallback/placeholder behavior.`);
                    // We simply resolve. Phaser will use a missing texture placeholder automatically if referenced.
                    resolve();
                }
            });

            scene.load.start();
        });
    }

    public createAnimationsFromMetadata(key: string, metadata?: SpriteSheetMetadata) {
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

            }
        }
        // AUTO-GENERATE: If no explicit animations but spritesheet has multiple frames, create "default" animation
        // Use effectiveFrameCount computed earlier

        if (effectiveFrameCount > 1 && !metadata?.animations?.["default"]) {
            const defaultAnimKey = `${key}_default`;

            if (this.scene.anims.exists(defaultAnimKey)) {
                this.scene.anims.remove(defaultAnimKey);
            }

            let framesConfig: Phaser.Types.Animations.AnimationFrame[] = [];

            // [Robust] Use actual available frame names from texture to match keys exactly
            const availableFrames = texture ? texture.getFrameNames() : [];

            if (availableFrames.length > 0) {
                // Sort numeric frames correctly (0, 1, 2, 10...)
                availableFrames.sort((a, b) => {
                    const na = Number(a);
                    const nb = Number(b);
                    if (!isNaN(na) && !isNaN(nb)) return na - nb;
                    return a.localeCompare(b);
                });

                // Use effectiveFrameCount to limit or use all
                const count = Math.min(availableFrames.length, effectiveFrameCount);
                const usedFrames = availableFrames.slice(0, count);

                // [Fix] Use Standard String Keys from availableFrames to match Texture configuration
                framesConfig = usedFrames.map(f => {
                    return {
                        key: key,
                        frame: f
                    };
                });


            } else {
                // Fallback for non-loaded or numeric implicit frames
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
        if (!obj) {
            console.warn(`[PhaserRenderer] update failed: entity ${id} not found`);
            return;
        }

        // console.log(`[PhaserRenderer] update ${id} -> x=${x} y=${y}`);

        let finalX = x;
        let finalY = y;

        // [UI COORDINATE TRANSFORMATION - RUNTIME]
        // GameCore sends World Coordinates, but for UI with ScrollFactor(0), we need Screen Coordinates.
        if (this.isRuntimeMode && obj.getData('isUI') && this.scene?.cameras?.main) {
            let mainCamera: any = null;

            // 1. Try finding in GameCore (Runtime)
            if (this.gameCore && this.gameCore.getAllEntities) {
                const all = this.gameCore.getAllEntities();
                mainCamera = Array.from(all.values()).find((e: any) => e.name === 'Main Camera');
            }

            // 2. Fallback to Editor Core
            if (!mainCamera) {
                mainCamera = this.core.getEntities().get('Main Camera') ||
                    Array.from(this.core.getEntities().values()).find(e => e.name === 'Main Camera') ||
                    this.core.getGlobalEntities().get('Main Camera') ||
                    Array.from(this.core.getGlobalEntities().values()).find(e => e.name === 'Main Camera');
            }

            if (mainCamera) {
                const cam = this.scene.cameras.main;
                const editorCamX = Number(mainCamera.x) || 0;
                const editorCamY = Number(mainCamera.y) || 0;

                // Calculate offset from Main Camera
                const screenOffsetX = x - editorCamX;
                const screenOffsetY = y - editorCamY;

                // Apply offset from camera center
                finalX = cam.centerX + screenOffsetX;
                finalY = cam.centerY + screenOffsetY;
            }
        }

        obj.x = finalX;
        obj.y = finalY;

        if (typeof z === "number" && typeof obj.setDepth === "function") {
            const isUI = obj.getData('isUI');
            if (isUI) {
                obj.setDepth(Math.max(z, 100)); // Enforce UI on top
            } else {
                obj.setDepth(z);
            }
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

    public setZoom(zoom: number): void {
        if (this.scene && this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.setZoom(zoom);
        }
    }

    clear(): void {

        for (const [id, entity] of this.entities) {
            if (entity.destroy) entity.destroy();
        }
        this.entities.clear();

        if (this.scene && this.scene.children) {
            // Optional: Force clear logic if entities were not in map
        }
    }

}


