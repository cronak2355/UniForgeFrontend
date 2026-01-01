import { CameraMode, EditorMode, DragDropMode, TilingMode, EntityEditMode } from "./editorMode/editorModes";
import type { Asset } from "./types/Asset";
import type { EditorEntity } from "./types/Entity";

type mouseEvent = "mousedown" | "mouseup" | "mousemove";

export type EditorContext = {
    currentMode: EditorMode;

  // 보통 선택/드래그는 없을 수 있음
    currentSelectedAsset?: Asset;
    currentDraggingAsset?: Asset;
    currentDraggingEntity?: EditorEntity;
    currentSelecedEntity?: EditorEntity;
    mouse:mouseEvent
};

export type TilePlacement = {
  x: number;
  y: number;
  tile: number;
};

export class EditorState {
  private fsm: EditorStateMachine;

  // 로드된 에셋들(팔레트/라이브러리)
  private assets: Asset[] = [
      {
          id: 0,
          name: "test1",
          tag: "Tile",
          url: "TestAsset.webp",
          idx: -1
      },
      {
          id: 1,
          name: "test2",
          tag: "Tile",
          url: "TestAsset2.webp",
          idx: -1
      },
      {
          id: 2,
          name: "test3",
          tag: "Tile",
          url: "TestAsset3.webp",
          idx: -1
      },
      {
          id: 3,
          name: "dragon",
          tag: "Character",
          url: "RedDragon.webp",
          idx: -1
      }
  ];

  // 씬에 배치된 엔티티들
  private entities: Map<string, EditorEntity>;
  // placed tiles keyed by "x,y"
  private tiles: Map<string, TilePlacement> = new Map();

  // 현재 모드
  private editormode: EditorMode;

  // UI에서 선택/드래그 상태를 저장하는 필드
  public selectedAsset: Asset | null = null;
  public draggedAsset: Asset | null = null;
  public selectedEntity: EditorEntity | null = null;

  // 간단한 구독(발행) 메커니즘 — React 컴포넌트가 변경을 구독하도록 함
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.entities = new Map();

    // 초기 모드: Camera
    this.editormode = new CameraMode();

    // FSM에 “모드 registry”를 주는 형태가 제일 편함
    this.fsm = new EditorStateMachine(
        new CameraMode(),
        new EntityEditMode(),
        new TilingMode(),
        new DragDropMode()
    );
  }

  // --- getters ---
  getEditorMode(): EditorMode {
    return this.editormode;
  }

  // --- selection / drag state api ---
  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    for (const cb of this.listeners) cb();
  }

  setSelectedAsset(a: Asset | null) {
    this.selectedAsset = a;
    this.notify();
  }

  getSelectedAsset(): Asset | null {
    return this.selectedAsset;
  }

  setDraggedAsset(a: Asset | null) {
    this.draggedAsset = a;
    this.notify();
  }

  getDraggedAsset(): Asset | null {
    return this.draggedAsset;
  }

  setSelectedEntity(e: EditorEntity | null) {
    this.selectedEntity = e;
    this.notify();
  }

  getSelectedEntity(): EditorEntity | null {
    return this.selectedEntity;
  }

  getAssets(): Asset[] {
    return this.assets;
  }

  getEntities(): Map<string, EditorEntity> {
    return this.entities;
  }

  getTiles(): Map<string, TilePlacement> {
    return this.tiles;
  }

  setTile(x: number, y: number, tile: number) {
    const key = `${x},${y}`;
    this.tiles.set(key, { x, y, tile });
    this.notify();
  }

  removeTile(x: number, y: number) {
    const key = `${x},${y}`;
    if (this.tiles.delete(key)) {
      this.notify();
    }
  }

  // --- state update ---
  sendContextToEditorModeStateMachine(context: EditorContext) {
    this.editormode = this.fsm.changeMode(context);
  }

  // (선택) 에셋/엔티티 등록용 API 뼈대
  addAsset(asset: Asset) {
    this.assets.push(asset);
    this.notify();
  }

  addEntity(entity: EditorEntity & { id: string }) {
    this.entities.set(entity.id, entity);
    this.notify();
  }

  removeEntity(id: string) {
    this.entities.delete(id);
    this.notify();
  }
}

class EditorStateMachine
{
    private cameraMode!:CameraMode;
    private editMode!:EntityEditMode;
    private tilingMode!:TilingMode;
    private dragdropMode!:DragDropMode;

    constructor(
        cameraMode:CameraMode,
        editMode:EntityEditMode,
        tilingMode:TilingMode,
        dragdropMode:DragDropMode
    )
    {
        this.cameraMode = cameraMode;
        this.editMode = editMode;
        this.tilingMode = tilingMode;
        this.dragdropMode = dragdropMode;    
    }
    //받아온 context로 
    changeMode(context:EditorContext): EditorMode
    {
        
        let mode: EditorMode = this.cameraMode;

        if (context.currentDraggingAsset) {
            this.dragdropMode.asset = context.currentDraggingAsset;
            return this.dragdropMode;
        }

        if (context.currentMode instanceof CameraMode) {
            const m = this.changeModewhenCameraMode(context);
            mode = m ?? this.cameraMode;
        } else if (context.currentMode instanceof TilingMode) {
        if (context.currentSelectedAsset) {
        mode = this.tilingMode;
        this.tilingMode.tile = context.currentSelectedAsset.idx;
        this.tilingMode.curTilingType = (context.currentMode as TilingMode).curTilingType;
        } else {
        mode = this.cameraMode;
        }
        } else if (context.currentMode instanceof DragDropMode) {
            if (context.currentDraggingAsset) {
            mode = this.dragdropMode;
            (mode as DragDropMode).asset = context.currentDraggingAsset;
            } else {
            mode = this.cameraMode;
            }
        } else if (context.currentMode instanceof EntityEditMode) {
            mode = this.editMode;
            if (context.mouse === "mouseup") {
                mode = this.cameraMode;
            }
        }
        console.log(`change context: ${mode.constructor.name}`)
      return mode;
    }


    changeModewhenCameraMode(context:EditorContext): EditorMode
    {
      // 기본은 카메라 모드
      let mode: EditorMode = this.cameraMode;

      // 드래그 중인 에셋이 있으면 드래그-드롭 모드
      if (context.currentDraggingAsset) {
        mode = this.dragdropMode;
        (mode as DragDropMode).asset = context.currentDraggingAsset;
        return mode;
      }

      // 엔티티를 드래그 중이고 마우스가 누른 상태라면 엔티티 편집 모드
      if (context.currentDraggingEntity && context.mouse === "mousedown") {
        mode = this.editMode;
        return mode;
      }

      // 선택된 엔티티가 있으면 엔티티 편집 모드로 진입
      if (context.currentSelecedEntity && context.mouse === "mousedown") {
        mode = this.editMode;
        return mode;
      }

      // 선택된 에셋이 있고 타일 인덱스가 유효하면 타일링 모드로 전환
      if (context.currentSelectedAsset && context.mouse === "mousedown") {
        const a = context.currentSelectedAsset;
        if (typeof a.idx === "number" && a.idx >= 0) {
          mode = this.tilingMode;
          this.tilingMode.tile = a.idx;
          return mode;
        }
      }

      // 아무 것도 해당되지 않으면 카메라 모드 유지
      return mode;
    }
}

export const editorCore = new EditorState();
