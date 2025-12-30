import type { Asset } from "../types/Asset";
import { assetToEntity } from "../utils/assetToEntity"
import { EditorScene } from "../EditorScene";
import type { EditorEntity } from "../types/Entity";

//가장 에디터 모드의 가장 틀이 되는 얘
//모든 에디터 모드를 새로 만들 때는 얘를 상속받아서 만들어야 함.
export abstract class EditorMode {
    enter(scene: Phaser.Scene) {}
    exit(scene: Phaser.Scene) {}

    onPointerDown(scene: Phaser.Scene, p: Phaser.Input.Pointer) {}
    onPointerMove(scene: Phaser.Scene, p: Phaser.Input.Pointer) {}
    onPointerUp(scene: Phaser.Scene, p: Phaser.Input.Pointer) {}
    onScroll(scene: Phaser.Scene, deltaY:number) {}
    update(scene: Phaser.Scene, dt: number) {}
}
//기본 에디터 모드
//드래그를 했을 때, 씬 뷰가 움직이도록만 하는 모드임
//우선 가장 기본적인것만 추가했음 나중에 추가해야하면 알아서 추가 하도록
export class CameraMode extends EditorMode
{
    private isDrag:boolean = false;
    private prevX:number = 0;
    private prevY:number = 0;
    onPointerDown(scene: Phaser.Scene, p: Phaser.Input.Pointer): void 
    {
        this.isDrag = true;
        const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
        const x = worldPoint.x;
        const y = worldPoint.y;
        this.prevX = x
        this.prevY = y
    }
    onPointerMove(scene: Phaser.Scene, p: Phaser.Input.Pointer): void 
    {
        if (!this.isDrag)
            return;
        
        const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
        const x = (worldPoint.x - this.prevX) / 2;
        const y = (worldPoint.y - this.prevY) / 2;

        scene.cameras.main.scrollX -= x;
        scene.cameras.main.scrollY -= y;

        this.prevX = worldPoint.x;
        this.prevY = worldPoint.y;
        //일단 비워둠    
    }
    onPointerUp(scene: Phaser.Scene, p: Phaser.Input.Pointer): void 
    {
        this.isDrag = false;
        //일단 비워둠 나중에 기능 넣어야 하면 넣기
        this.prevX = 0;
        this.prevY = 0;
    }
    onScroll(scene: Phaser.Scene, deltaY:number): void
    {
        const dy = Math.exp(deltaY * -(1 / 1000));
        const zoom = Math.min(Math.max(scene.cameras.main.zoom * dy, 0.1), 10)
        scene.cameras.main.setZoom(zoom)
    }
}

export class TilingMode extends EditorMode
{
    public curTilingType:string = ""
    private isDrag:boolean = false;
    private prevX:number = 0;
    private prevY:number = 0;
    public tile:number = -1;
    private lastX:number = 0.5;
    private lastY:number = 0.5;
    public preview!:Phaser.Tilemaps.TilemapLayer;
    public base!:Phaser.Tilemaps.TilemapLayer;

    onPointerDown(scene: Phaser.Scene, p: Phaser.Input.Pointer) 
    {
        this.isDrag = true;
        const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
        const x = worldPoint.x;
        const y = worldPoint.y;

        this.prevX = x
        this.prevY = y
        if (this.curTilingType == "drawing")
            this.base.putTileAt(this.tile, Math.floor(x/32), Math.floor(y/32));
        else if (this.curTilingType == "erase")
            this.base.removeTileAt(Math.floor(x/32), Math.floor(y/32));
    }
    onPointerMove(scene: Phaser.Scene, p: Phaser.Input.Pointer)
    {
        const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
        worldPoint.x = worldPoint.x / 32;
        worldPoint.y = worldPoint.y / 32;
        this.preview.fill(-1);
        switch(this.curTilingType)
        {
            case "":
                if (!this.isDrag)
                    return;
                const x = (worldPoint.x - this.prevX) / 2;
                const y = (worldPoint.y - this.prevY) / 2;

                scene.cameras.main.scrollX -= x;
                scene.cameras.main.scrollY -= y;

                this.prevX = worldPoint.x;
                this.prevY = worldPoint.y;
                break;
            case "drawing":
                if (this.isDrag)
                {
                    this.lastX = Math.floor(worldPoint.x)
                    this.lastY = Math.floor(worldPoint.y)
                    this.base.putTileAt(this.tile, this.lastX, this.lastY);
                }
                else
                {
                    if (!Number.isInteger(this.lastX) && !Number.isInteger(this.lastY))
                    {
                        //초기값 설정해주기
                        this.lastX = Math.floor(worldPoint.x)
                        this.lastY = Math.floor(worldPoint.y)
                        this.preview.putTileAt(this.tile, this.lastX, this.lastY);
                        return;
                    }
                    //마지막 좌표와 달라졌을 때, 원래 있던 타일을 없애고, 타일을 새로 만듦.
                    if (this.lastX != worldPoint.x || this.lastY != worldPoint.y)
                    {
                        this.lastX = Math.floor(worldPoint.x)
                        this.lastY = Math.floor(worldPoint.y)
                        this.preview.putTileAt(this.tile, this.lastX, this.lastY);
                    }
                }
                break;
            case "erase":
                if (this.isDrag)
                {
                    this.lastX = Math.floor(worldPoint.x)
                    this.lastY = Math.floor(worldPoint.y)
                    this.base.removeTileAt(this.lastX, this.lastY);
                }
                break;
            default:
                break;
        }
    }
    onPointerUp(scene: Phaser.Scene, p: Phaser.Input.Pointer)
    {
        this.isDrag = false;
        this.prevX = 0;
        this.prevY = 0;
    }
    onScroll(scene: Phaser.Scene, deltaY:number)
    {
        const dy = Math.exp(deltaY * -(1 / 1000));
        const zoom = Math.min(Math.max(scene.cameras.main.zoom * dy, 0.1), 10)
        scene.cameras.main.setZoom(zoom)
    }
}

export class DragDropMode extends EditorMode {
  public asset: Asset | null = null; // ✅ 외부에서 현재 드래그 에셋 주입

  private ghost: Phaser.GameObjects.Image | null = null;

  // enter/exit/update는 필요없다 했으니 비워둠
  enter(scene: Phaser.Scene) {}
  exit(scene: Phaser.Scene) {}
  update(scene: Phaser.Scene, dt: number) {}

  onPointerDown(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
    // 굳이 할 일 없음. (원하면 여기서 ghost를 미리 만들 수도 있음)
  }

  onPointerMove(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
    if (!this.asset) return;

    const key = this.asset.name;
    if (!scene.textures.exists(key)) return;

    const wp = scene.cameras.main.getWorldPoint(p.x, p.y);

    // ghost 없으면 생성
    if (!this.ghost) {
        this.ghost = scene.add.image(wp.x, wp.y, key);
        this.ghost.setAlpha(0.6);
        this.ghost.setDepth(9999);
        this.ghost.setOrigin(0.5, 0.5);
    } else {
        // 있으면 위치만 갱신
        this.ghost.setPosition(wp.x, wp.y);   
    }
  }

  onPointerUp(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
    if (!this.asset) return;

    const key = this.asset.name;
    if (!scene.textures.exists(key)) return;

    const wp = scene.cameras.main.getWorldPoint(p.x, p.y);

    // ✅ 실제 생성
    const created = scene.add.image(wp.x, wp.y, key);
    created.setDepth(10);
    created.setOrigin(0.5, 0.5);
    created.setInteractive();
    // (선택) EditorScene에 entityGroups 같은 컨테이너가 있으면 거기에 넣기
    const es = scene as EditorScene;

    created.on("pointerdown", () => {
        console.log("🟢 [DragDropMode] object clicked");

        console.log("asset:", this.asset);
        const entity: EditorEntity = {
    
          id: crypto.randomUUID(),
          type: this.asset!.tag,
          name: this.asset!.name,
          x: created.x,
          y: created.y,
          variables: [],
          events: [],
        };
    
        es.onSelectEntity?.(entity);
      });
    if (es.entityGroup) es.entityGroup.add(created);

    // ✅ ghost 제거
    if (this.ghost) {
      this.ghost.destroy();
      this.ghost = null;
    }

    // (선택) 여기서 모드 종료/asset 비우기 하고 싶으면:
    // this.asset = null;
        // scene.input.setDefaultCursor('default');
    }

    onScroll(scene: Phaser.Scene, deltaY: number) {
        // 드래그 드랍만 할 거면 스크롤 무시
    }
}