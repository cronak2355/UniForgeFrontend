import type { Asset } from "../types/Asset";
import { EditorScene } from "../EditorScene";
import type { EditorEntity } from "../types/Entity";
import { Scene } from "phaser";

//媛???먮뵒??紐⑤뱶??媛??????섎뒗 ??
//紐⑤뱺 ?먮뵒??紐⑤뱶瑜??덈줈 留뚮뱾 ?뚮뒗 ?섎? ?곸냽諛쏆븘??留뚮뱾?댁빞 ??
export abstract class EditorMode {
    enter(_scene: Phaser.Scene) { }
    exit(_scene: Phaser.Scene) { }

    onPointerDown(_scene: Phaser.Scene, _p: Phaser.Input.Pointer) { }
    onPointerMove(_scene: Phaser.Scene, _p: Phaser.Input.Pointer) { }
    onPointerUp(_scene: Phaser.Scene, _p: Phaser.Input.Pointer) { }
    onScroll(_scene: Phaser.Scene, _deltaY: number) { }
    update(_scene: Phaser.Scene, _dt: number) { }
}
//湲곕낯 ?먮뵒??紐⑤뱶
//?쒕옒洹몃? ?덉쓣 ?? ??酉곌? ?吏곸씠?꾨줉留??섎뒗 紐⑤뱶??
//?곗꽑 媛??湲곕낯?곸씤寃껊쭔 異붽??덉쓬 ?섏쨷??異붽??댁빞?섎㈃ ?뚯븘??異붽? ?섎룄濡?
export class CameraMode extends EditorMode {
    private isDrag: boolean = false;
    private prevX: number = 0;
    private prevY: number = 0;
    onPointerDown(scene: Phaser.Scene, p: Phaser.Input.Pointer): void {
        this.isDrag = true;
        const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
        const x = worldPoint.x;
        const y = worldPoint.y;
        this.prevX = x
        this.prevY = y
    }
    onPointerMove(scene: Phaser.Scene, p: Phaser.Input.Pointer): void {
        if (!this.isDrag)
            return;

        const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
        const x = (worldPoint.x - this.prevX) / 2;
        const y = (worldPoint.y - this.prevY) / 2;

        scene.cameras.main.scrollX -= x;
        scene.cameras.main.scrollY -= y;

        this.prevX = worldPoint.x;
        this.prevY = worldPoint.y;
        //?쇰떒 鍮꾩썙??   
    }
    onPointerUp(_scene: Phaser.Scene, _p: Phaser.Input.Pointer): void {
        this.isDrag = false;
        //?쇰떒 鍮꾩썙???섏쨷??湲곕뒫 ?ｌ뼱???섎㈃ ?ｊ린
        this.prevX = 0;
        this.prevY = 0;
    }
    onScroll(scene: Phaser.Scene, deltaY: number): void {
        const dy = Math.exp(deltaY * -(1 / 1000));
        const zoom = Math.min(Math.max(scene.cameras.main.zoom * dy, 0.1), 10)
        scene.cameras.main.setZoom(zoom)
    }
}

export class TilingMode extends EditorMode {
    public curTilingType: string = ""
    private isDrag: boolean = false;
    private prevX: number = 0;
    private prevY: number = 0;
    public tile: number = -1;
    private lastX: number = 0.5;
    private lastY: number = 0.5;
    public preview!: Phaser.Tilemaps.TilemapLayer;
    public base!: Phaser.Tilemaps.TilemapLayer;

    onPointerDown(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
        this.isDrag = true;
        const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
        const es = scene as EditorScene;
        const tilePos = es.worldToTileXY(worldPoint.x, worldPoint.y);

        this.prevX = worldPoint.x
        this.prevY = worldPoint.y
        if (!tilePos) return;
        const logicalX = tilePos.x - es.tileOffsetX;
        const logicalY = tilePos.y - es.tileOffsetY;
        if (this.curTilingType == "drawing") {
            this.base.putTileAt(this.tile, tilePos.x, tilePos.y);
            es.editorCore?.setTile(logicalX, logicalY, this.tile);
        } else if (this.curTilingType == "erase") {
            this.base.removeTileAt(tilePos.x, tilePos.y);
            es.editorCore?.removeTile(logicalX, logicalY);
        }
    }
    onPointerMove(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
        const es = scene as EditorScene;
        if (!es.ready)
            return;
        const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
        const tilePos = es.worldToTileXY(worldPoint.x, worldPoint.y);
        this.preview.fill(-1);
        switch (this.curTilingType) {
            case "": {
                if (!this.isDrag)
                    return;
                const x = (worldPoint.x - this.prevX) / 2;
                const y = (worldPoint.y - this.prevY) / 2;

                scene.cameras.main.scrollX -= x;
                scene.cameras.main.scrollY -= y;

                this.prevX = worldPoint.x;
                this.prevY = worldPoint.y;
                break;
            }
            case "drawing":
                if (!tilePos)
                    return;
                if (this.isDrag) {
                    this.lastX = tilePos.x
                    this.lastY = tilePos.y
                    this.base.putTileAt(this.tile, this.lastX, this.lastY);
                    es.editorCore?.setTile(this.lastX - es.tileOffsetX, this.lastY - es.tileOffsetY, this.tile);
                }
                else {
                    if (!Number.isInteger(this.lastX) && !Number.isInteger(this.lastY)) {
                        //초기값설정해주기
                        this.lastX = tilePos.x
                        this.lastY = tilePos.y
                        this.preview.putTileAt(this.tile, this.lastX, this.lastY);
                        return;
                    }
                    //마지막좌표를 고려해 이전 위치를 지우고 위치를 새로 만듦.
                    if (this.lastX != tilePos.x || this.lastY != tilePos.y) {
                        this.lastX = tilePos.x
                        this.lastY = tilePos.y
                        this.preview.putTileAt(this.tile, this.lastX, this.lastY);
                    }
                }
                break;
            case "erase":
                if (this.isDrag) {
                    if (!tilePos)
                        return;
                    this.lastX = tilePos.x
                    this.lastY = tilePos.y
                    this.base.removeTileAt(this.lastX, this.lastY);
                    es.editorCore?.removeTile(this.lastX - es.tileOffsetX, this.lastY - es.tileOffsetY);
                }
                break;
            default:
                break;
        }
    }
    onPointerUp(_scene: Phaser.Scene, _p: Phaser.Input.Pointer) {
        this.isDrag = false;
        this.prevX = 0;
        this.prevY = 0;
    }
    onScroll(scene: Phaser.Scene, deltaY: number) {
        const dy = Math.exp(deltaY * -(1 / 1000));
        const zoom = Math.min(Math.max(scene.cameras.main.zoom * dy, 0.1), 10)
        scene.cameras.main.setZoom(zoom)
    }
}

export class DragDropMode extends EditorMode {
    public asset: Asset | null = null; // ???몃??먯꽌 ?꾩옱 ?쒕옒洹??먯뀑 二쇱엯

    private ghost: Phaser.GameObjects.Image | null = null;

    // enter/exit/update???꾩슂?녿떎 ?덉쑝??鍮꾩썙??
    enter(_scene: Phaser.Scene) { }
    exit(_scene: Phaser.Scene) {
        if (this.ghost) {
            this.ghost.destroy();
            this.ghost = null;
        }
    }
    update(_scene: Phaser.Scene, _dt: number) { }

    onPointerDown(_scene: Phaser.Scene, _p: Phaser.Input.Pointer) {
        // 援녹씠 ?????놁쓬. (?먰븯硫??ш린??ghost瑜?誘몃━ 留뚮뱾 ?섎룄 ?덉쓬)
    }

    onPointerMove(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
        if (!this.asset) return;

        const key = this.asset.name;
        if (!scene.textures.exists(key)) return;

        const wp = scene.cameras.main.getWorldPoint(p.x, p.y);

        // ghost ?놁쑝硫??앹꽦
        if (!this.ghost) {
            this.ghost = scene.add.image(wp.x, wp.y, key);
            this.ghost.setAlpha(0.6);
            this.ghost.setDepth(9999);
            this.ghost.setOrigin(0.5, 0.5);
        } else {
            // ?덉쑝硫??꾩튂留?媛깆떊
            this.ghost.setPosition(wp.x, wp.y);
        }
    }

    onPointerUp(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
        const es = scene as EditorScene;
        const finalizeDrop = () => {
            if (this.ghost) {
                this.ghost.destroy();
                this.ghost = null;
            }
            this.asset = null;
            es.setCameraMode();
            es.editorCore?.setDraggedAsset(null);
            // sync core + FSM so React UI switches to CameraMode
            es.editorCore?.sendContextToEditorModeStateMachine({ currentMode: new CameraMode(), mouse: "mouseup" });
        };

        if (!this.asset) {
            finalizeDrop();
            return;
        }

        const key = this.asset.name;
        if (!scene.textures.exists(key)) {
            finalizeDrop();
            return;
        }

        const wp = scene.cameras.main.getWorldPoint(p.x, p.y);

        // ???ㅼ젣 ?앹꽦
        const created = scene.add.image(wp.x, wp.y, key);
        created.setDepth(10);
        created.setOrigin(0.5, 0.5);
        created.setInteractive();
        created.setData("id", crypto.randomUUID());
        // (?좏깮) EditorScene??entityGroups 媛숈? 而⑦뀒?대꼫媛 ?덉쑝硫?嫄곌린???ｊ린
        const entity: EditorEntity = {

            id: created.getData("id"),
            type: this.asset!.tag,
            name: this.asset!.name,
            x: created.x,
            y: created.y,
            z: 0,
            variables: [],
            events: [],
            components: [],
            modules: [],
        };

        // Notify React side immediately about the created entity so Hierarchy updates
        es.onSelectEntity?.(entity);

        created.on("pointerdown", () => {
            // On click, just set selection in core if available (do not re-add)
            try {
                (es as any).editorCore?.setSelectedEntity?.(entity);
            } catch (e) {
                // ignore
            }
        });
        if (es.entityGroup) es.entityGroup.add(created);

        finalizeDrop();
    }

    onScroll(_scene: Phaser.Scene, _deltaY: number) {
        // ?쒕옒洹??쒕엻留???嫄곕㈃ ?ㅽ겕濡?臾댁떆
    }
}

export class EntityEditMode implements EditorMode {
    private dragging = false;
    private selected: Phaser.GameObjects.GameObject | null = null;

    private offsetX = 0;
    private offsetY = 0;

    private snapToGrid = true;
    enter(_scene: Phaser.Scene): void { }
    exit(_scene: Phaser.Scene): void { }
    update(_scene: Phaser.Scene, _dt: number): void { }
    onPointerDown(scene: EditorScene, p: Phaser.Input.Pointer): void {
        const world = scene.cameras.main.getWorldPoint(p.x, p.y);

        const target = this.pickEntity(scene, world.x, world.y);
        if (!target) {
            this.selected = null;
            this.dragging = false;
            return;
        }

        this.selected = target;
        this.dragging = true;

        const pos = this.getXY(target);
        this.offsetX = world.x - pos.x;
        this.offsetY = world.y - pos.y;
    }

    onPointerMove(scene: EditorScene, p: Phaser.Input.Pointer): void {
        if (!this.dragging || !this.selected) return;

        const world = scene.cameras.main.getWorldPoint(p.x, p.y);
        this.setXY(this.selected, world.x - this.offsetX, world.y - this.offsetY);
    }

    onPointerUp(scene: EditorScene, __p: Phaser.Input.Pointer): void {
        if (!this.selected) return;

        if (this.dragging && this.snapToGrid) {
            const pos = this.getXY(this.selected);
            const snapped = this.snapCenterToGrid(pos.x, pos.y, 32);
            this.setXY(this.selected, snapped.x, snapped.y);
        }

        this.dragging = false;

        // Sync to EditorCore
        const id = (this.selected as any).getData?.("id");
        if (id && scene.editorCore) {
            const entity = scene.editorCore.getEntities().get(id);
            if (entity) {
                // Update specific properties (position)
                const transform = this.selected as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
                entity.x = transform.x ?? entity.x;
                entity.y = transform.y ?? entity.y;

                // Commit back to core
                scene.editorCore.addEntity(entity);
                scene.editorCore.setSelectedEntity(entity);
            }
        }
    }

    onScroll(_scene: EditorScene, _deltaY: number): void {
        // ?뷀떚??紐⑤뱶?먯꽌???ㅽ겕濡ㅼ쓣 留됯퀬 ?띠쑝硫?洹몃깷 return
        // 移대찓??以뚮룄 媛숈씠 ?덉슜?섍퀬 ?띠쑝硫??ш린??移대찓??以?濡쒖쭅 ?몄텧
    }

    // --------- util ---------

    private pickEntity(scene: EditorScene, x: number, y: number): Phaser.GameObjects.GameObject | null {
        const entities = scene.entityGroup.getChildren() as Phaser.GameObjects.GameObject[];
        if (!entities.length) return null;

        let best: Phaser.GameObjects.GameObject | null = null;
        let bestDepth = -Infinity;

        type GameObjectWithBounds = Phaser.GameObjects.GameObject & {
            visible?: boolean;
            getBounds?: () => Phaser.Geom.Rectangle;
            depth?: number;
            width?: number;
            height?: number;
            x?: number;
            y?: number;
        };

        for (const obj of entities) {
            const gameObj = obj as GameObjectWithBounds;
            if (!obj.active || gameObj.visible === false) continue;

            const bounds: Phaser.Geom.Rectangle | null =
                typeof gameObj.getBounds === "function"
                    ? gameObj.getBounds()
                    : (gameObj.width != null && gameObj.height != null && gameObj.x != null && gameObj.y != null)
                        ? new Phaser.Geom.Rectangle(gameObj.x - gameObj.width * 0.5, gameObj.y - gameObj.height * 0.5, gameObj.width, gameObj.height)
                        : null;

            if (!bounds) continue;

            if (bounds.contains(x, y)) {
                const d = gameObj.depth ?? 0;
                if (d >= bestDepth) {
                    bestDepth = d;
                    best = obj;
                }
            }
        }
        return best;
    }

    private getXY(obj: Phaser.GameObjects.GameObject): { x: number; y: number } {
        const transform = obj as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
        return { x: transform.x ?? 0, y: transform.y ?? 0 };
    }

    private setXY(obj: Phaser.GameObjects.GameObject, x: number, y: number): void {
        const transform = obj as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
        transform.x = x;
        transform.y = y;
    }

    private snapCenterToGrid(x: number, y: number, grid: number) {
        const sx = Math.floor(x / grid) * grid + grid / 2;
        const sy = Math.floor(y / grid) * grid + grid / 2;
        return { x: sx, y: sy };
    }
}





