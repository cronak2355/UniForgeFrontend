import Phaser from "phaser";
import { EditorMode, CameraMode, EntityEditMode } from "./editorMode/editorModes";
import type { EditorEntity } from "./types/Entity";

const tileSize = 32;

export class EditorScene extends Phaser.Scene {
  private ready = false;
  private editorMode: EditorMode = new CameraMode();

  private map!: Phaser.Tilemaps.Tilemap;
  private tileset!: Phaser.Tilemaps.Tileset;
  private gridGfx!: Phaser.GameObjects.Graphics;

  public baselayer!: Phaser.Tilemaps.TilemapLayer;
  public previewlayer!: Phaser.Tilemaps.TilemapLayer;

  public entityGroup!: Phaser.GameObjects.Group;
  public assetGroup!: Phaser.GameObjects.Group;

  // (선택) 드랍 완료 후 외부(React)로 알리고 싶으면 이 콜백 사용
  // onEntityMoved?: (id: string, x: number, y: number) => void;

  onReady!: (scene: EditorScene, callback: () => void) => Promise<void>;

  constructor() {
    super("EditorScene");
  }

  // -----------------------
  // 모드 전환
  // -----------------------
  setEditorMode(mode: EditorMode) {
    this.editorMode = mode;
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

  // -----------------------
  // 에셋 UI 등록
  // -----------------------
  /**
   * 에셋(팔레트) 오브젝트를 클릭/드래그했을 때 EntityEditMode로 들어가게 하려면
   * 에셋 UI 만들고 나서 이 함수 호출해줘.
   */
  registerAssetUI(obj: Phaser.GameObjects.GameObject, assetId: string) {
    (obj as any).setInteractive?.({ useHandCursor: true });
    (obj as any).setScrollFactor?.(0);
    (obj as any).setDepth?.(10000);

    (obj as any).setData?.("uiType", "asset");
    (obj as any).setData?.("assetId", assetId);

    this.assetGroup.add(obj);
  }

  // -----------------------
  // create
  // -----------------------
  create() {
    this.ready = true;

    this.gridGfx = this.add.graphics();
    this.gridGfx.setDepth(9999);

    this.entityGroup = this.add.group();
    this.assetGroup = this.add.group();

    const getCanvasPos = (clientX: number, clientY: number) => {
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
      const { x, y, inside } = getCanvasPos(clientX, clientY);

      const p = this.input.activePointer;
      (p as any).x = x;
      (p as any).y = y;

      return { p, inside };
    };

    const onWinPointerDown = (e: PointerEvent) => {
      const { p, inside } = feedPointer(e.clientX, e.clientY);
      if (!inside) return;

      // ✅ 1) 에셋 UI 클릭/드래그 시작이면 -> 엔티티 모드로 진입 + 생성(+드래그 시작)
      if (this.tryEnterEntityEditFromAsset(p)) return;

      // ✅ 2) 기존 엔티티를 눌렀으면 -> 엔티티 모드로 진입해서 드래그 시작
      if (this.tryEnterEntityEditFromEntity(p)) return;

      // ✅ 3) 그 외는 현재 모드에 위임
      this.editorMode.onPointerDown(this, p);
    };

    const onWinPointerMove = (e: PointerEvent) => {
      const { p, inside } = feedPointer(e.clientX, e.clientY);
      if (!inside) return;

      this.editorMode.onPointerMove(this, p);
    };

    const onWinPointerUp = (e: PointerEvent) => {
      const { p } = feedPointer(e.clientX, e.clientY);
      this.editorMode.onPointerUp(this, p);
    };

    const onWinWheel = (e: WheelEvent) => {
      const { inside } = getCanvasPos(e.clientX, e.clientY);
      if (!inside) return;

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

      this.baselayer.setDepth(0);
      this.previewlayer.setDepth(1);
    });

    window.addEventListener("pointerdown", onWinPointerDown, { capture: true });
    window.addEventListener("pointermove", onWinPointerMove, { capture: true });
    window.addEventListener("pointerup", onWinPointerUp, { capture: true });
    window.addEventListener("wheel", onWinWheel, { passive: false });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("pointerdown", onWinPointerDown);
      window.removeEventListener("pointermove", onWinPointerMove);
      window.removeEventListener("pointerup", onWinPointerUp);
      window.removeEventListener("wheel", onWinWheel as any);
    });

    // ✅ (선택) 테스트용 단축키
    this.input.keyboard?.on("keydown-C", () => this.setCameraMode());
    this.input.keyboard?.on("keydown-E", () => this.setEntityEditMode());
  }

  // -----------------------
  // 엔티티 갱신 (중요)
  // -----------------------
  updateEntities(entities: EditorEntity[]) {
    if (!this.ready) return;

    // ❌ this.children.removeAll() 쓰면 grid/레이어도 날아갈 수 있음
    // ✅ entityGroup만 싹 갈아끼우자
    const old = this.entityGroup.getChildren();
    for (const c of old) c.destroy();
    this.entityGroup.clear(false);

    entities.forEach((e) => {
      const rect = this.add.rectangle(e.x, e.y, 40, 40, 0xffffff);
      rect.setData("id", e.id);
      rect.setInteractive({ useHandCursor: true });

      this.entityGroup.add(rect);
    });
  }

  // -----------------------
  // update / grid
  // -----------------------
  update() {
    this.redrawGrid();
  }

  redrawGrid() {
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
  // 아래는 “에셋/엔티티 클릭 시 EntityEditMode로 자동 진입” 핵심
  // =========================================================

  private hitTest(pointer: Phaser.Input.Pointer): Phaser.GameObjects.GameObject[] {
    // hitTestPointer는 setInteractive()된 애들만 잡힘
    return ((this.input as any).hitTestPointer(pointer) as Phaser.GameObjects.GameObject[]) || [];
  }

  /**
   * 에셋(팔레트)을 클릭/드래그 시작했으면:
   * - 엔티티를 생성하고
   * - EntityEditMode로 전환한 뒤
   * - 같은 pointerDown을 넘겨서 “바로 드래그 시작”까지 이어감
   */
  private tryEnterEntityEditFromAsset(p: Phaser.Input.Pointer): boolean {
    const hits = this.hitTest(p);

    // 에셋 UI 찾기
    const assetObj = hits.find((obj) => (obj as any).getData?.("uiType") === "asset");
    if (!assetObj) return false;

    const assetId = (assetObj as any).getData?.("assetId");

    // 엔티티를 현재 커서 월드 위치에 생성
    const world = this.cameras.main.getWorldPoint(p.x, p.y);

    const ent = this.add.rectangle(world.x, world.y, 40, 40, 0xffffff);
    ent.setInteractive({ useHandCursor: true });

    // id / assetId 저장
    ent.setData("id", (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`);
    ent.setData("assetId", assetId);

    this.entityGroup.add(ent);

    // EntityEditMode로 전환 후, 다운 이벤트 전달 → 즉시 드래그 이어짐
    this.setEntityEditMode();
    this.editorMode.onPointerDown(this, p);

    return true;
  }

  /**
   * 기존 엔티티를 눌렀으면:
   * - EntityEditMode로 전환하고
   * - 같은 pointerDown을 넘겨서 바로 드래그 되게 함
   */
  private tryEnterEntityEditFromEntity(p: Phaser.Input.Pointer): boolean {
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    const entities = this.entityGroup.getChildren() as Phaser.GameObjects.GameObject[];
    if (!entities.length) return false;

    let best: Phaser.GameObjects.GameObject | null = null;
    let bestDepth = -Infinity;

    for (const obj of entities) {
      const anyObj = obj as any;
      if (!obj.active || anyObj.visible === false) continue;

      const bounds: Phaser.Geom.Rectangle | null =
        typeof anyObj.getBounds === "function" ? anyObj.getBounds() : null;

      if (!bounds) continue;

      if (bounds.contains(world.x, world.y)) {
        const d = anyObj.depth ?? 0;
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
