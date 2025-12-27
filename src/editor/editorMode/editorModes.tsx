
import type { Asset } from "../../data/Asset";

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
