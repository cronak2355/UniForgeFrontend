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
        console.log("drag")
        
        const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
        const x = (worldPoint.x - this.prevX) / 1;
        const y = (worldPoint.y - this.prevY) / 1;
        
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
    }
    onScroll(scene: Phaser.Scene, deltaY:number): void
    {
        console.log("zoom")
        const dy = Math.exp(deltaY * -(1 / 1000));
        const zoom = Math.min(Math.max(scene.cameras.main.zoom * dy, 0.1), 10)
        scene.cameras.main.setZoom(zoom)
    }
}
