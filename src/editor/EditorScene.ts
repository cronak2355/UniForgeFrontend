import { EditorMode, CameraMode } from "./editorMode/editorModes";
import type { EditorEntity } from "./types/Entity";

const tileSize = 32;
export class EditorScene extends Phaser.Scene {
    private ready = false;
    private editorMode:EditorMode = new CameraMode();
    private map!: Phaser.Tilemaps.Tilemap;
    private tileset!: Phaser.Tilemaps.Tileset;
    private gridGfx!: Phaser.GameObjects.Graphics;
    public baselayer!: Phaser.Tilemaps.TilemapLayer;
    public previewlayer!: Phaser.Tilemaps.TilemapLayer;
    public entityGroup!:Phaser.GameObjects.Group;
    
    onReady!: (scene: EditorScene, callback:() => void) => Promise<void>;
    onSelectEntity?: (entity: EditorEntity) => void;

    constructor() {
        super("EditorScene");
    }


    create() {
        //타일 맵 만들기!
        this.ready = true;
        //this.input.enabled = false;
        this.gridGfx = this.add.graphics();
        this.gridGfx.setDepth(9999); // 항상 위에 보이게 (필요하면)
        // tilesKey는 "로드한 이미지 키" (예: "tiles")
        this.entityGroup = this.add.group()
        const getCanvasPos = (clientX: number, clientY: number) => {
        const rect = this.sys.game.canvas.getBoundingClientRect();

        // ✅ inside는 "client 좌표"로 rect에 직접 비교 (이게 제일 안 헷갈림)
        const inside =
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom;
        // ✅ Phaser에 넘길 좌표는 "캔버스 픽셀 좌표"로 변환
        // rect.width/height는 CSS 픽셀, canvas.width/height는 실제 렌더 픽셀(DPR 반영)
        const x = (clientX - rect.left) * (this.sys.game.canvas.width / rect.width);
        const y = (clientY - rect.top) * (this.sys.game.canvas.height / rect.height);

        return { x, y, inside, rect };
        };

        const feedPointer = (clientX: number, clientY: number) => {
            const { x, y, inside } = getCanvasPos(clientX, clientY);

            // Phaser 캔버스 밖이면 굳이 모드에 안 보내고 싶으면 여기서 막아도 됨
            // (드래그 중 프리뷰를 캔버스 밖에서 끄고 싶으면 inside 체크 활용)
            const p = this.input.activePointer;

            // ★ 핵심: activePointer에 좌표를 "주입"
            // TS 상 readonly일 수 있어서 any 캐스팅
            (p as any).x = x;
            (p as any).y = y;

            // world 좌표가 모드에서 필요하면 모드 내부에서 getWorldPoint 쓰면 됨
            return { p, inside };
        };
        const onWinPointerDown = (e: PointerEvent) => {
            // 캔버스 밖에서 눌린 건 무시하고 싶으면:
            const { p, inside } = feedPointer(e.clientX, e.clientY);
            
            if (!inside) return;
            this.editorMode.onPointerDown(this, p);
        };

        const onWinPointerMove = (e: PointerEvent) => {
            const { p, inside } = feedPointer(e.clientX, e.clientY);
            // inside 조건을 줄지 말지는 니 UX 선택임.
            // - inside 체크하면: 캔버스 밖에선 모드 move 안 감
            // - 체크 안 하면: 캔버스 밖에서도 계속 move 들어감 (드래그 취소 처리 등에 유용)
            // 여기선 일단 inside 아니면 return 걸어둘게.
            if (!inside) return;

            this.editorMode.onPointerMove(this, p);
        };

        const onWinPointerUp = (e: PointerEvent) => {
            const { p, inside } = feedPointer(e.clientX, e.clientY);

            // up은 inside 아니어도 처리하고 싶을 때가 많음(드래그 종료)
            // 여기선 무조건 보냄
            this.editorMode.onPointerUp(this, p);
        };

        const onWinWheel = (e: WheelEvent) => {
            const { inside } = getCanvasPos(e.clientX, e.clientY);
            if (!inside) return;

            // 페이지 스크롤 방지 (passive:false 필수)
            e.preventDefault();

            this.editorMode.onScroll(this, e.deltaY);
        };
        this.onReady(this, () =>{
            this.map = this.make.tilemap({
                tileWidth: tileSize,
                tileHeight: tileSize,
                width: 200,
                height: 200,
            });

            this.tileset = this.map.addTilesetImage("tiles", "tiles", tileSize, tileSize)!;
            //레이어 만들기 (실제로 화면에 그려지는 대상)
            this.baselayer = this.map.createBlankLayer("base", this.tileset, 0, 0)!;
            this.previewlayer = this.map.createBlankLayer("preview", this.tileset,0 , 0)!;
            this.baselayer.setDepth(0);
            this.previewlayer.setDepth(1);
        });
        window.addEventListener("pointerdown", onWinPointerDown, {capture: true});
        window.addEventListener("pointermove", onWinPointerMove, {capture: true});
        window.addEventListener("pointerup", onWinPointerUp, {capture: true});
        window.addEventListener("wheel", onWinWheel, { passive: false });

        // 씬 종료/재시작 때 누수 방지
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            window.removeEventListener("pointerdown", onWinPointerDown);
            window.removeEventListener("pointermove", onWinPointerMove);
            window.removeEventListener("pointerup", onWinPointerUp);
            window.removeEventListener("wheel", onWinWheel as any);
        });
        this.entityGroup.getChildren().forEach(c => {
            c.on
        });
    }

    updateEntities(entities: EditorEntity[]) {
        if (!this.ready) return;

        this.children.removeAll();
        entities.forEach(e => {
            const rect = this.add.rectangle(e.x, e.y, 40, 40, 0xffffff);
            rect.setData("id", e.id);
        });
    }
    setEditorMode(mode:EditorMode)
    {
        this.editorMode = mode;
    }
    getEditorMode()
    {
        return this.editorMode;
    }
    //이 친구는 아예 테스트용도로만 쓰임 나중에 지울 것
    update()
    {
        this.redrawGrid()
    }
    //그리드를 그리는 얘
    redrawGrid() {
      const cam = this.cameras.main;
      const view = cam.worldView; // 현재 카메라가 보는 월드 영역
    
      // 보이는 영역을 tileSize 경계로 스냅
      const left = Math.floor(view.x / tileSize) * tileSize;
      const right = Math.ceil((view.x + view.width) / tileSize) * tileSize;
      const top = Math.floor(view.y / tileSize) * tileSize;
      const bottom = Math.ceil((view.y + view.height) / tileSize) * tileSize;
    
      this.gridGfx.clear();
    
      // 선 스타일 (두께 1, 색은 아무거나)
      this.gridGfx.lineStyle(1, 0xffffff, 0.15);
    
      // 세로선
      for (let x = left; x <= right; x += tileSize) {
        this.gridGfx.beginPath();
        this.gridGfx.moveTo(x, top);
        this.gridGfx.lineTo(x, bottom);
        this.gridGfx.strokePath();
      }
    
      // 가로선
      for (let y = top; y <= bottom; y += tileSize) {
        this.gridGfx.beginPath();
        this.gridGfx.moveTo(left, y);
        this.gridGfx.lineTo(right, y);
        this.gridGfx.strokePath();
      }
    }
}
