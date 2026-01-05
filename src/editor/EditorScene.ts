import Phaser from "phaser";
import { EditorMode, CameraMode, EntityEditMode, DragDropMode, TilingMode } from "./editorMode/editorModes";
import type { EditorEntity } from "./types/Entity";
import type { EditorState, EditorContext } from "./EditorCore";
import type { EditorComponent, AutoRotateComponent, PulseComponent } from "./types/Component";
import { editorCore } from "./EditorCore";
// events/index.ts를 import하면 DefaultActions와 DefaultConditions가 자동 등록됨
import { EventBus, RuleEngine } from "./core/events";
import { KeyboardAdapter } from "./core/events/adapters/KeyboardAdapter";
import type { EditorModule } from "./types/Module";

const tileSize = 32;

type RuntimeComponent = {
  comp: EditorComponent;
  target: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
  initialScale?: { x: number, y: number }; // for Pulse
};

export class EditorScene extends Phaser.Scene {

  public ready = false;
  private editorMode: EditorMode = new CameraMode();
  // optional reference to EditorState (injected by PhaserCanvas)
  public editorCore?: EditorState;

  private map!: Phaser.Tilemaps.Tilemap;
  private tileset!: Phaser.Tilemaps.Tileset;
  // private transformGizmo!: TransformGizmo;
  private _keyboardAdapter!: KeyboardAdapter;
  private gridGfx!: Phaser.GameObjects.Graphics;

  public baselayer!: Phaser.Tilemaps.TilemapLayer;
  public previewlayer!: Phaser.Tilemaps.TilemapLayer;
  public tileOffsetX = 0;
  public tileOffsetY = 0;

  public entityGroup!: Phaser.GameObjects.Group;
  public assetGroup!: Phaser.GameObjects.Group;

  // Optimization: Cached list of active components to avoid iterating all entities
  private runtimeComponents: RuntimeComponent[] = [];

  onReady!: (scene: EditorScene, callback: () => void) => Promise<void>;
  onSelectEntity?: (entity: EditorEntity) => void;
  constructor() {
    super("EditorScene");
  }

  // -----------------------
  // 紐⑤뱶 ?꾪솚
  // -----------------------
  private ensureTilingLayers(mode: TilingMode) {
    if (!mode.base && this.baselayer) {
      mode.base = this.baselayer;
    }
    if (!mode.preview && this.previewlayer) {
      mode.preview = this.previewlayer;
    }
  }

  setEditorMode(mode: EditorMode) {
    if (mode instanceof TilingMode) {
      this.ensureTilingLayers(mode);
    }
    if (this.editorMode.constructor === mode.constructor) {
      if (this.editorMode instanceof DragDropMode && mode instanceof DragDropMode) {
        this.editorMode.asset = mode.asset;
      }
      if (this.editorMode instanceof TilingMode && mode instanceof TilingMode) {
        this.editorMode.tile = mode.tile;
        if (mode.base && mode.preview) {
          this.editorMode.base = mode.base;
          this.editorMode.preview = mode.preview;
        } else {
          this.ensureTilingLayers(this.editorMode);
        }
        this.editorMode.curTilingType = mode.curTilingType;
      }
      return;
    }
    this.editorMode.exit(this);
    this.editorMode = mode;
    if (this.editorMode instanceof TilingMode) {
      this.ensureTilingLayers(this.editorMode);
    }
    this.editorMode.enter(this);
  }

  setCameraMode() {
    this.setEditorMode(new CameraMode());
  }

  setEntityEditMode() {
    this.setEditorMode(new EntityEditMode());
  }

  getEditorMode() {
    return this.editorMode;
  }

  worldToTileXY(worldX: number, worldY: number): { x: number; y: number } | null {
    if (!this.map) return null;
    const tx = Math.floor(worldX / tileSize) + this.tileOffsetX;
    const ty = Math.floor(worldY / tileSize) + this.tileOffsetY;
    if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return null;
    return { x: tx, y: ty };
  }

  // -----------------------
  // ?먯뀑 UI ?깅줉
  // -----------------------
  /**
   * ?먯뀑(?붾젅?? ?ㅻ툕?앺듃瑜??대┃/?쒕옒洹명뻽????EntityEditMode濡??ㅼ뼱媛寃??섎젮硫?
   * ?먯뀑 UI 留뚮뱾怨??섏꽌 ???⑥닔 ?몄텧?댁쨾.
   */
  registerAssetUI(obj: Phaser.GameObjects.GameObject, assetId: string) {
    const sprite = obj as Phaser.GameObjects.Sprite;
    sprite.setInteractive({ useHandCursor: true });
    sprite.setScrollFactor(0);
    sprite.setDepth(10000);

    sprite.setData("uiType", "asset");
    sprite.setData("assetId", assetId);

    this.assetGroup.add(obj);
  }

  // -----------------------
  // create
  // -----------------------
  create() {
    console.log("[EditorScene] create() called - starting initialization");
    this.ready = true;

    this.gridGfx = this.add.graphics();
    this.gridGfx.setDepth(9999);

    this.entityGroup = this.add.group();
    this.assetGroup = this.add.group();

    // --- EAC 시스템 초기화 (타일맵 로드와 무관하게 즉시 초기화) ---
    this._keyboardAdapter = new KeyboardAdapter(this);

    EventBus.on((event) => {
      // 씬에 있는 모든 엔티티에 대해 룰 체크
      editorCore.getEntities().forEach((entity) => {
        if (!entity.rules || entity.rules.length === 0) return;

        // ActionContext 생성
        const moduleMap: Record<string, EditorModule | undefined> = {};
        if (entity.modules) {
          entity.modules.forEach(m => {
            moduleMap[m.type] = m;
          });
        }

        const ctx = {
          entityId: entity.id,
          modules: moduleMap,
          eventData: event.data || {},
          globals: { scene: this }
        };

        RuleEngine.handleEvent(event, ctx as Parameters<typeof RuleEngine.handleEvent>[1], entity.rules);
      });
    });

    console.log("[EditorScene] EAC System initialized");
    // --- EAC 끝 ---

    const getCanvasPos = (clientX: number, clientY: number) => {

      if (!this.sys?.game?.canvas)
        return;
      const rect = this.sys.game.canvas.getBoundingClientRect();

      const inside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;

      const x = (clientX - rect.left) * (this.sys.game.canvas.width / rect.width);
      const y = (clientY - rect.top) * (this.sys.game.canvas.height / rect.height);

      return { x, y, inside, rect };
    };

    const feedPointer = (clientX: number, clientY: number) => {
      try {
        if (!this.input?.activePointer) {
          return { p: null as unknown as Phaser.Input.Pointer, inside: false };
        }
        const result = getCanvasPos(clientX, clientY);
        if (!result) {
          return { p: this.input.activePointer, inside: false };
        }
        const { x, y, inside } = result;

        const p = this.input.activePointer;
        p.x = x;
        p.y = y;

        return { p: this.input.activePointer, inside };
      } catch {
        return { p: null as unknown as Phaser.Input.Pointer, inside: false };
      }
    };

    const onWinPointerDown = (e: PointerEvent) => {
      if (!this.ready) return;
      const { p, inside } = feedPointer(e.clientX, e.clientY);
      if (!inside) return;

      const buildContext = (pointer: Phaser.Input.Pointer, mouse: "mousedown" | "mouseup" | "mousemove"): EditorContext => ({
        currentMode: this.editorMode,
        currentSelectedAsset: this.editorCore?.getSelectedAsset() ?? undefined,
        currentDraggingAsset: this.editorCore?.getDraggedAsset() ?? undefined,
        currentSelecedEntity: this.getEntityUnderPointer(pointer),
        mouse,
      });

      // If nothing is being dragged and no entity is selected, return to CameraMode
      const noDragged = !this.editorCore?.getDraggedAsset();
      const noSelectedEntity = !this.editorCore?.getSelectedEntity();
      const noSelectedAsset = !this.editorCore?.getSelectedAsset();
      if (noDragged && noSelectedEntity && noSelectedAsset) {
        this.setCameraMode();
        const cm: EditorContext = { currentMode: new CameraMode(), mouse: "mouseup" };
        this.editorCore?.sendContextToEditorModeStateMachine(cm);
      }


      // ??1) ?먯뀑 UI ?대┃/?쒕옒洹??쒖옉?대㈃ -> ?뷀떚??紐⑤뱶濡?吏꾩엯 + ?앹꽦(+?쒕옒洹??쒖옉)
      if (this.tryEnterEntityEditFromAsset(p)) {
        this.editorCore?.sendContextToEditorModeStateMachine({
          currentMode: new EntityEditMode(),
          currentSelectedAsset: this.editorCore?.getSelectedAsset() ?? undefined,
          currentDraggingAsset: this.editorCore?.getDraggedAsset() ?? undefined,
          currentSelecedEntity: this.getEntityUnderPointer(p),
          mouse: "mousedown",
        });
        const next = this.editorCore?.getEditorMode();
        if (next) this.setEditorMode(next);
        return;
      }

      // ??2) 湲곗〈 ?뷀떚?곕? ?뚮??쇰㈃ -> ?뷀떚??紐⑤뱶濡?吏꾩엯?댁꽌 ?쒕옒洹??쒖옉
      if (this.tryEnterEntityEditFromEntity(p)) {
        this.editorCore?.sendContextToEditorModeStateMachine({
          currentMode: new EntityEditMode(),
          currentSelectedAsset: this.editorCore?.getSelectedAsset() ?? undefined,
          currentDraggingAsset: this.editorCore?.getDraggedAsset() ?? undefined,
          currentSelecedEntity: this.getEntityUnderPointer(p),
          mouse: "mousedown",
        });
        const next = this.editorCore?.getEditorMode();
        if (next) this.setEditorMode(next);
        return;
      }

      // ??3) 洹??몃뒗 ?꾩옱 紐⑤뱶???꾩엫
      this.editorMode.onPointerDown(this, p);
      this.editorCore?.sendContextToEditorModeStateMachine(buildContext(p, "mousedown"));
      const next = this.editorCore?.getEditorMode();
      if (next) this.setEditorMode(next);
    };

    const onWinPointerMove = (e: PointerEvent) => {
      if (!this.ready) return;
      const { p, inside } = feedPointer(e.clientX, e.clientY);
      if (!inside) return;

      // 드래그 중에는 현재 선택된 엔티티를 유지 (포인터가 엔티티 바깥으로 나가도 선택 해제 안 함)
      const currentEntity = this.editorCore?.getSelectedEntity();
      const entityUnderPointer = this.getEntityUnderPointer(p);

      // update core FSM with refreshed context after pointer move
      const ctx: EditorContext = {
        currentMode: this.editorMode,
        currentSelectedAsset: this.editorCore?.getSelectedAsset() ?? undefined,
        currentDraggingAsset: this.editorCore?.getDraggedAsset() ?? undefined,
        // 드래그 중(EntityEditMode)이면 기존 선택 유지, 아니면 포인터 아래 엔티티
        currentSelecedEntity: entityUnderPointer ?? currentEntity ?? undefined,
        mouse: "mousemove",
      };
      this.editorCore?.sendContextToEditorModeStateMachine(ctx);
      const nextMode = this.editorCore?.getEditorMode();
      if (nextMode) this.setEditorMode(nextMode);

      this.editorMode.onPointerMove(this, p);
    };

    const onWinPointerUp = (e: PointerEvent) => {
      if (!this.ready) return;
      const { p } = feedPointer(e.clientX, e.clientY);
      // allow mode to transition before snapshotting context
      this.editorMode.onPointerUp(this, p);
      const ctx: EditorContext = {
        currentMode: this.editorMode,
        currentSelectedAsset: this.editorCore?.getSelectedAsset() ?? undefined,
        currentDraggingAsset: this.editorCore?.getDraggedAsset() ?? undefined,
        currentSelecedEntity: this.getEntityUnderPointer(p),
        mouse: "mouseup",
      };
      this.editorCore?.sendContextToEditorModeStateMachine(ctx);
      const next = this.editorCore?.getEditorMode();
      if (next) this.setEditorMode(next);
    };

    const onWinWheel = (e: WheelEvent) => {
      if (!this.ready) return;
      const result = getCanvasPos(e.clientX, e.clientY);
      if (!result) return;
      if (!result.inside) return;

      e.preventDefault();
      this.editorMode.onScroll(this, e.deltaY);
    };

    this.onReady(this, () => {
      this.map = this.make.tilemap({
        tileWidth: tileSize,
        tileHeight: tileSize,
        width: 200,
        height: 200,
      });

      this.tileset = this.map.addTilesetImage("tiles", "tiles", tileSize, tileSize)!;

      this.baselayer = this.map.createBlankLayer("base", this.tileset, 0, 0)!;
      this.previewlayer = this.map.createBlankLayer("preview", this.tileset, 0, 0)!;

      this.tileOffsetX = Math.floor(this.map.width / 2);
      this.tileOffsetY = Math.floor(this.map.height / 2);
      const offsetX = -this.tileOffsetX * tileSize;
      const offsetY = -this.tileOffsetY * tileSize;
      this.baselayer.setPosition(offsetX, offsetY);
      this.previewlayer.setPosition(offsetX, offsetY);

      this.baselayer.setDepth(0);
      this.previewlayer.setDepth(1);

      window.addEventListener("pointerdown", onWinPointerDown);
      window.addEventListener("pointermove", onWinPointerMove, { capture: true });
      window.addEventListener("pointerup", onWinPointerUp);
      window.addEventListener("wheel", onWinWheel, { passive: false });

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        window.removeEventListener("pointerdown", onWinPointerDown);
        window.removeEventListener("pointermove", onWinPointerMove);
        window.removeEventListener("pointerup", onWinPointerUp);
        window.removeEventListener("wheel", onWinWheel);
      });
      this.events.once(Phaser.Scenes.Events.DESTROY, () => {
        window.removeEventListener("pointerdown", onWinPointerDown);
        window.removeEventListener("pointermove", onWinPointerMove);
        window.removeEventListener("pointerup", onWinPointerUp);
        window.removeEventListener("wheel", onWinWheel);
      });

      this.ready = true;
    });
  }


  // -----------------------
  // ?뷀떚??媛깆떊 (以묒슂)
  // -----------------------
  updateEntities(entities: EditorEntity[]) {
    if (!this.ready) return;

    // ??this.children.removeAll() ?곕㈃ grid/?덉씠?대룄 ?좎븘媛????덉쓬
    // ??entityGroup留???媛덉븘?쇱슦??
    const old = this.entityGroup.getChildren();
    for (const c of old) c.destroy();
    this.entityGroup.clear(false);

    // Reset runtime components
    this.runtimeComponents = [];

    entities.forEach((e) => {
      const rect = this.add.rectangle(e.x, e.y, 40, 40, 0xffffff);
      rect.setData("id", e.id);
      rect.setInteractive({ useHandCursor: true });
      rect.setName(e.name); // Phaser Name

      this.entityGroup.add(rect);

      // Populate runtime components (Optimization)
      if (e.components) {
        e.components.forEach((comp) => {
          this.runtimeComponents.push({
            comp,
            target: rect,
            initialScale: { x: rect.scaleX, y: rect.scaleY },
          });
        });
      }
    });
  }

  // -----------------------
  // update / grid
  // -----------------------
  update(time: number, delta: number) {
    // -------------------------

    // 1) Grid
    this.redrawGrid();

    // Optimized Component System Loop
    // Only iterates active components
    const dt = delta / 1000; // seconds

    for (const rc of this.runtimeComponents) {
      if (!rc.target.active) continue;

      switch (rc.comp.type) {
        case "AutoRotate": {
          const c = rc.comp as AutoRotateComponent;
          // Rotate target
          rc.target.angle += c.speed * dt;
          break;
        }
        case "Pulse": {
          const c = rc.comp as PulseComponent;
          // Pulse scale
          // simple sine wave based on time
          const t = time / 1000 * c.speed;
          const scaleRange = (c.maxScale - c.minScale) / 2;
          const baseScale = (c.maxScale + c.minScale) / 2;
          const currentScale = baseScale + Math.sin(t) * scaleRange;

          rc.target.setScale(currentScale);
          break;
        }
      }
    }
  }

  redrawGrid() {
    if (!this.gridGfx || !this.cameras?.main) return;

    const cam = this.cameras.main;
    const view = cam.worldView;

    const left = Math.floor(view.x / tileSize) * tileSize;
    const right = Math.ceil((view.x + view.width) / tileSize) * tileSize;
    const top = Math.floor(view.y / tileSize) * tileSize;
    const bottom = Math.ceil((view.y + view.height) / tileSize) * tileSize;

    this.gridGfx.clear();
    this.gridGfx.lineStyle(1, 0xffffff, 0.15);

    for (let x = left; x <= right; x += tileSize) {
      this.gridGfx.beginPath();
      this.gridGfx.moveTo(x, top);
      this.gridGfx.lineTo(x, bottom);
      this.gridGfx.strokePath();
    }

    for (let y = top; y <= bottom; y += tileSize) {
      this.gridGfx.beginPath();
      this.gridGfx.moveTo(left, y);
      this.gridGfx.lineTo(right, y);
      this.gridGfx.strokePath();
    }
  }

  // =========================================================
  // ?꾨옒???쒖뿉???뷀떚???대┃ ??EntityEditMode濡??먮룞 吏꾩엯???듭떖
  // =========================================================

  private hitTest(pointer: Phaser.Input.Pointer): Phaser.GameObjects.GameObject[] {
    // hitTestPointer??setInteractive()???좊뱾留??≫옒
    const inputPlugin = this.input as Phaser.Input.InputPlugin & {
      hitTestPointer: (pointer: Phaser.Input.Pointer) => Phaser.GameObjects.GameObject[];
    };
    return inputPlugin.hitTestPointer(pointer) || [];
  }

  private getEntityUnderPointer(pointer: Phaser.Input.Pointer): EditorEntity | undefined {
    const entities = this.entityGroup?.getChildren() as Phaser.GameObjects.GameObject[] | undefined;
    if (!entities || !entities.length) return undefined;

    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    let best: Phaser.GameObjects.GameObject | null = null;
    let bestDepth = -Infinity;

    for (const obj of entities) {
      const gameObj = obj as Phaser.GameObjects.GameObject & {
        visible?: boolean;
        getBounds?: () => Phaser.Geom.Rectangle;
        depth?: number;
      };
      if (!obj.active || gameObj.visible === false) continue;

      const bounds: Phaser.Geom.Rectangle | null =
        typeof gameObj.getBounds === "function" ? gameObj.getBounds() : null;

      if (!bounds) continue;

      if (bounds.contains(world.x, world.y)) {
        const d = gameObj.depth ?? 0;
        if (d >= bestDepth) {
          bestDepth = d;
          best = obj;
        }
      }
    }

    if (!best) return undefined;
    const id = (best as Phaser.GameObjects.GameObject & { getData?: (key: string) => unknown }).getData?.("id");
    if (!id) return undefined;
    const fromCore = this.editorCore?.getEntities().get(id as string);
    if (fromCore) return fromCore;

    const transform = best as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
    return {
      id: id as string,
      type: "Unknown" as any,
      name: "Entity",
      x: transform.x ?? world.x,
      y: transform.y ?? world.y,
      z: 0,
      variables: [],
      events: [],
      components: [],
      rules: [],
      modules: [],
    };
  }

  /**
   * ?먯뀑(?붾젅?????대┃/?쒕옒洹??쒖옉?덉쑝硫?
   * - ?뷀떚?곕? ?앹꽦?섍퀬
   * - EntityEditMode濡??꾪솚????
   * - 媛숈? pointerDown???섍꺼???쒕컮濡??쒕옒洹??쒖옉?앷퉴吏 ?댁뼱媛?
   */
  private tryEnterEntityEditFromAsset(p: Phaser.Input.Pointer): boolean {
    const hits = this.hitTest(p);

    // ?먯뀑 UI 李얘린
    const assetObj = hits.find((obj) => {
      const gameObj = obj as Phaser.GameObjects.GameObject & { getData?: (key: string) => unknown };
      return gameObj.getData?.("uiType") === "asset";
    });
    if (!assetObj) return false;

    const assetGameObj = assetObj as Phaser.GameObjects.GameObject & { getData?: (key: string) => unknown };
    const assetId = assetGameObj.getData?.("assetId");

    // ?뷀떚?곕? ?꾩옱 而ㅼ꽌 ?붾뱶 ?꾩튂???앹꽦
    const world = this.cameras.main.getWorldPoint(p.x, p.y);

    const ent = this.add.rectangle(world.x, world.y, 40, 40, 0xffffff);
    ent.setInteractive({ useHandCursor: true });

    // id / assetId ???
    ent.setData("id", crypto.randomUUID());
    ent.setData("assetId", assetId);

    this.entityGroup.add(ent);

    // EntityEditMode濡??꾪솚 ?? ?ㅼ슫 ?대깽???꾨떖 ??利됱떆 ?쒕옒洹??댁뼱吏?
    this.setEntityEditMode();
    this.editorMode.onPointerDown(this, p);

    return true;
  }

  /**
   * 湲곗〈 ?뷀떚?곕? ?뚮??쇰㈃:
   * - EntityEditMode濡??꾪솚?섍퀬
   * - 媛숈? pointerDown???섍꺼??諛붾줈 ?쒕옒洹??섍쾶 ??
   */
  private tryEnterEntityEditFromEntity(p: Phaser.Input.Pointer): boolean {
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    const entities = this.entityGroup.getChildren() as Phaser.GameObjects.GameObject[];
    if (!entities.length) return false;

    let best: Phaser.GameObjects.GameObject | null = null;
    let bestDepth = -Infinity;

    for (const obj of entities) {
      const gameObj = obj as Phaser.GameObjects.GameObject & {
        visible?: boolean;
        getBounds?: () => Phaser.Geom.Rectangle;
        depth?: number;
      };
      if (!obj.active || gameObj.visible === false) continue;

      const bounds: Phaser.Geom.Rectangle | null =
        typeof gameObj.getBounds === "function" ? gameObj.getBounds() : null;

      if (!bounds) continue;

      if (bounds.contains(world.x, world.y)) {
        const d = gameObj.depth ?? 0;
        if (d >= bestDepth) {
          bestDepth = d;
          best = obj;
        }
      }
    }

    if (!best) return false;

    this.setEntityEditMode();
    this.editorMode.onPointerDown(this, p);
    return true;
  }
}


