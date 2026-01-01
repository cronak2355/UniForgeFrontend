/**
 * PhaserRenderer - Phaser 전용 IRenderer 구현체
 * 
 * 모든 Phaser API 호출을 이 클래스 내부로 격리합니다.
 * z축 값은 Phaser의 setDepth()로 매핑됩니다.
 */

import Phaser from "phaser";
import type { IRenderer, Vector3, ScreenCoord, SpawnOptions } from "./IRenderer";

/**
 * Phaser 씬 내부 클래스
 * PhaserRenderer가 관리하는 실제 씬
 */
class PhaserRenderScene extends Phaser.Scene {
    public phaserRenderer!: PhaserRenderer;

    constructor() {
        super("PhaserRenderScene");
    }

    create() {
        // 씬 준비 완료 알림
        this.phaserRenderer.onSceneReady();
    }

    update(time: number, delta: number) {
        this.phaserRenderer.onUpdate(time, delta);
    }
}

/**
 * Phaser 렌더러 구현체
 * 
 * 설계 원칙:
 * 1. ID 동기화: spawn 시 외부 ID를 그대로 사용, 중복 검사 필수
 * 2. 좌표 변환: Phaser의 좌상단 기준 좌표계 사용
 * 3. Lifecycle: destroy 시 모든 리소스 완벽 해제
 */
export class PhaserRenderer implements IRenderer {
    private game: Phaser.Game | null = null;
    private scene: PhaserRenderScene | null = null;
    private container: HTMLElement | null = null;

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
    private readonly TILE_SIZE = 32;
    private readonly MAP_SIZE = 200;

    // ===== Interaction Callbacks =====
    onEntityClick?: (id: string) => void;
    onPointerDown?: (worldX: number, worldY: number, worldZ: number) => void;
    onPointerMove?: (worldX: number, worldY: number, worldZ: number) => void;
    onPointerUp?: (worldX: number, worldY: number, worldZ: number) => void;
    onScroll?: (deltaY: number) => void;

    // ===== Lifecycle =====

    async init(container: HTMLElement): Promise<void> {
        this.container = container;

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

        // 그리드 그래픽스 초기화
        this.gridGraphics = this.scene.add.graphics();
        this.gridGraphics.setDepth(9999);

        // 입력 이벤트 설정
        this.setupInputEvents();

        // 초기화 완료 알림
        if (this.initResolve) {
            this.initResolve();
            this.initResolve = null;
        }
    }

    /**
     * 업데이트 루프 (내부용)
     */
    onUpdate(_time: number, _delta: number): void {
        if (this.gridVisible) {
            this.redrawGrid();
        }
    }

    /**
     * 렌더러 정리 - 완벽한 리소스 해제
     */
    destroy(): void {
        // 1. 모든 엔티티 정리
        for (const [_id, obj] of this.entities) {
            if (obj && obj.active) {
                obj.destroy();
            }
        }
        this.entities.clear();

        // 2. 타일맵 정리
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

        // 4. 씬 참조 해제
        this.scene = null;

        // 5. Phaser Game 인스턴스 정리
        if (this.game) {
            this.game.destroy(true); // removeCanvas = true
            this.game = null;
        }

        // 6. 컨테이너 참조 해제
        this.container = null;

        // 7. 콜백 해제
        this.onEntityClick = undefined;
        this.onPointerDown = undefined;
        this.onPointerMove = undefined;
        this.onPointerUp = undefined;
        this.onScroll = undefined;

        console.log("[PhaserRenderer] Destroyed - all resources cleaned up");
    }

    // ===== Entity Management - ID 동기화 보장 =====

    spawn(id: string, type: string, x: number, y: number, z: number = 0, options?: SpawnOptions): void {
        if (!this.scene) {
            console.error("[PhaserRenderer] Cannot spawn: scene not initialized");
            return;
        }

        // ID 중복 검사 - EditorState와의 동기화 보장
        if (this.entities.has(id)) {
            console.error(`[PhaserRenderer] Entity with id "${id}" already exists! ID sync violation.`);
            return;
        }

        let obj: Phaser.GameObjects.GameObject;

        // 텍스처가 있으면 스프라이트, 없으면 사각형
        if (options?.texture && this.scene.textures.exists(options.texture)) {
            const sprite = this.scene.add.sprite(x, y, options.texture);
            sprite.setDepth(z);
            obj = sprite;
        } else {
            const width = options?.width ?? 40;
            const height = options?.height ?? 40;
            const color = options?.color ?? 0xffffff;
            const rect = this.scene.add.rectangle(x, y, width, height, color);
            rect.setDepth(z);
            obj = rect;
        }

        // ID 저장 및 인터랙션 설정
        obj.setData("id", id);
        obj.setData("type", type);
        (obj as Phaser.GameObjects.Rectangle).setInteractive({ useHandCursor: true });

        // 클릭 이벤트
        obj.on("pointerdown", () => {
            if (this.onEntityClick) {
                this.onEntityClick(id);
            }
        });

        // Map에 저장
        this.entities.set(id, obj);

        console.log(`[PhaserRenderer] Spawned entity: ${id} at (${x}, ${y}, ${z})`);
    }

    hasEntity(id: string): boolean {
        return this.entities.has(id);
    }

    getAllEntityIds(): string[] {
        return Array.from(this.entities.keys());
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
            gameObj.setDepth(z);
        }

        if (rotation !== undefined) {
            gameObj.setAngle(rotation);
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
     * 월드 좌표 → 화면 좌표 변환
     * Phaser: 좌상단 기준 좌표계
     */
    worldToScreen(x: number, y: number, _z: number = 0): ScreenCoord {
        if (!this.scene) return { x, y };

        const cam = this.scene.cameras.main;
        const screenX = (x - cam.worldView.x) * cam.zoom;
        const screenY = (y - cam.worldView.y) * cam.zoom;

        return { x: screenX, y: screenY };
    }

    /**
     * 화면 좌표 → 월드 좌표 변환
     */
    screenToWorld(screenX: number, screenY: number): Vector3 {
        if (!this.scene) return { x: screenX, y: screenY, z: 0 };

        const cam = this.scene.cameras.main;
        const point = cam.getWorldPoint(screenX, screenY);

        return { x: point.x, y: point.y, z: 0 };
    }

    // ===== Tile System =====

    /**
     * 타일맵 초기화 (외부에서 호출)
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
        this.previewLayer.setDepth(1);
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

        // 기존 프리뷰 제거
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

        const getWorldPos = (clientX: number, clientY: number): Vector3 | null => {
            if (!canvas) return null;

            const rect = canvas.getBoundingClientRect();
            const inside = clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top && clientY <= rect.bottom;

            if (!inside) return null;

            const screenX = (clientX - rect.left) * (canvas.width / rect.width);
            const screenY = (clientY - rect.top) * (canvas.height / rect.height);

            return this.screenToWorld(screenX, screenY);
        };

        const onPointerDown = (e: PointerEvent) => {
            const world = getWorldPos(e.clientX, e.clientY);
            if (world && this.onPointerDown) {
                this.onPointerDown(world.x, world.y, world.z);
            }
        };

        const onPointerMove = (e: PointerEvent) => {
            const world = getWorldPos(e.clientX, e.clientY);
            if (world && this.onPointerMove) {
                this.onPointerMove(world.x, world.y, world.z);
            }
        };

        const onPointerUp = (e: PointerEvent) => {
            const world = getWorldPos(e.clientX, e.clientY);
            if (world && this.onPointerUp) {
                this.onPointerUp(world.x, world.y, world.z);
            }
        };

        const onWheel = (e: WheelEvent) => {
            const world = getWorldPos(e.clientX, e.clientY);
            if (world && this.onScroll) {
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

    // ===== Texture Loading (Phaser-specific helper) =====

    /**
     * 텍스처 로드 (Phaser 전용)
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
     * 캔버스로부터 텍스처 생성 (Phaser 전용)
     */
    addCanvasTexture(key: string, canvas: HTMLCanvasElement): void {
        if (!this.scene) return;

        if (this.scene.textures.exists(key)) {
            this.scene.textures.remove(key);
        }

        this.scene.textures.addCanvas(key, canvas);
    }

    /**
     * 씬 인스턴스 반환 (하위 호환용 - 점진적 마이그레이션)
     * @deprecated 직접 씬 접근은 권장하지 않음
     */
    getScene(): Phaser.Scene | null {
        return this.scene;
    }
}
