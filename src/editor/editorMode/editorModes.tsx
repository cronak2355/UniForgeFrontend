import type { Asset } from "../types/Asset";
import { EditorScene } from "../EditorScene";
import { assetToEntity } from "../utils/assetToEntity";


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
        this.prevX = p.x;
        this.prevY = p.y;
    }
    onPointerMove(scene: Phaser.Scene, p: Phaser.Input.Pointer): void {
        if (!this.isDrag)
            return;

        const cam = scene.cameras.main;
        const moveX = Number.isFinite(p.movementX) ? p.movementX : (p.x - this.prevX);
        const moveY = Number.isFinite(p.movementY) ? p.movementY : (p.y - this.prevY);
        const x = moveX / (cam.zoom);
        const y = moveY / (cam.zoom);

        cam.scrollX -= x;
        cam.scrollY -= y;

        this.prevX = p.x;
        this.prevY = p.y;
        //???? ??????   
    }
    onPointerUp(_scene: Phaser.Scene, _p: Phaser.Input.Pointer): void {
        this.isDrag = false;
        //???? ??????????????????????????? ????
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
    public curTilingType: "drawing" | "erase" | "bucket" | "shape" | "connected_erase" | "" = "";
    private isDrag: boolean = false;
    private prevX: number = 0;
    private prevY: number = 0;
    public tile: number = -1;
    private lastX: number = 0.5;
    private lastY: number = 0.5;
    public preview!: Phaser.Tilemaps.TilemapLayer;
    public base!: Phaser.Tilemaps.TilemapLayer;

    // Shape Tool State
    private shapeStart: { x: number; y: number } | null = null;

    onPointerDown(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
        this.isDrag = true;
        const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
        const es = scene as EditorScene;
        const tilePos = es.worldToTileXY(worldPoint.x, worldPoint.y);

        this.prevX = p.x;
        this.prevY = p.y;

        if (!tilePos) return;
        const logicalX = tilePos.x - es.tileOffsetX;
        const logicalY = tilePos.y - es.tileOffsetY;

        if (this.curTilingType === "drawing") {
            this.base.putTileAt(this.tile, tilePos.x, tilePos.y);
            es.editorCore?.setTile(logicalX, logicalY, this.tile);
        } else if (this.curTilingType === "erase") {
            this.base.removeTileAt(tilePos.x, tilePos.y);
            es.editorCore?.removeTile(logicalX, logicalY);
        } else if (this.curTilingType === "bucket") {
            this.floodFill(es, tilePos.x, tilePos.y, this.tile);
        } else if (this.curTilingType === "connected_erase") {
            // Magic Eraser: Fill with -1 (remove)
            this.floodFill(es, tilePos.x, tilePos.y, -1, true); // true = match target tile only
        } else if (this.curTilingType === "shape") {
            this.shapeStart = { x: tilePos.x, y: tilePos.y };
        }
    }

    onPointerMove(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
        const es = scene as EditorScene;
        if (!es.ready) return;
        const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
        const tilePos = es.worldToTileXY(worldPoint.x, worldPoint.y);

        // Clear preview first
        if (this.preview) {
            // Only clear if not in shape mode or if needed
            // For shape mode, we redraw the shape every frame
            try { this.preview.fill(-1); } catch { /* ignore */ }
        }

        // Camera Pan Support (Middle Mouse or Space+Drag logic could be added here, 
        // but for now we assume '' mode is pan)
        if (this.curTilingType === "" && this.isDrag) {
            const cam = scene.cameras.main;
            const moveX = Number.isFinite(p.movementX) ? p.movementX : (p.x - this.prevX);
            const moveY = Number.isFinite(p.movementY) ? p.movementY : (p.y - this.prevY);
            cam.scrollX -= moveX / cam.zoom;
            cam.scrollY -= moveY / cam.zoom;
            this.prevX = p.x;
            this.prevY = p.y;
            return;
        }

        if (!tilePos) return;

        // Tool Logic
        switch (this.curTilingType) {
            case "drawing":
                if (this.isDrag) {
                    this.lastX = tilePos.x;
                    this.lastY = tilePos.y;
                    this.base.putTileAt(this.tile, this.lastX, this.lastY);
                    es.editorCore?.setTile(this.lastX - es.tileOffsetX, this.lastY - es.tileOffsetY, this.tile);
                } else {
                    // Cursor Preview
                    this.preview.putTileAt(this.tile, tilePos.x, tilePos.y);
                }
                break;
            case "erase":
                if (this.isDrag) {
                    this.lastX = tilePos.x;
                    this.lastY = tilePos.y;
                    this.base.removeTileAt(this.lastX, this.lastY);
                    es.editorCore?.removeTile(this.lastX - es.tileOffsetX, this.lastY - es.tileOffsetY);
                }
                // Erase preview? Red box? For now just nothing or simple highlight
                break;
            case "shape":
                if (this.isDrag && this.shapeStart) {
                    // Draw Rectangle Preview
                    const startX = Math.min(this.shapeStart.x, tilePos.x);
                    const startY = Math.min(this.shapeStart.y, tilePos.y);
                    const endX = Math.max(this.shapeStart.x, tilePos.x);
                    const endY = Math.max(this.shapeStart.y, tilePos.y);

                    for (let y = startY; y <= endY; y++) {
                        for (let x = startX; x <= endX; x++) {
                            this.preview.putTileAt(this.tile, x, y);
                        }
                    }
                } else {
                    this.preview.putTileAt(this.tile, tilePos.x, tilePos.y);
                }
                break;
            case "bucket":
            case "connected_erase":
                // Just show cursor preview
                if (this.curTilingType === "bucket") {
                    this.preview.putTileAt(this.tile, tilePos.x, tilePos.y);
                }
                break;
        }

        this.prevX = p.x;
        this.prevY = p.y;
    }

    onPointerUp(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
        const es = scene as EditorScene;
        if (this.curTilingType === "shape" && this.isDrag && this.shapeStart) {
            const worldPoint = scene.cameras.main.getWorldPoint(p.x, p.y);
            const tilePos = es.worldToTileXY(worldPoint.x, worldPoint.y);
            if (tilePos) {
                const startX = Math.min(this.shapeStart.x, tilePos.x);
                const startY = Math.min(this.shapeStart.y, tilePos.y);
                const endX = Math.max(this.shapeStart.x, tilePos.x);
                const endY = Math.max(this.shapeStart.y, tilePos.y);

                for (let y = startY; y <= endY; y++) {
                    for (let x = startX; x <= endX; x++) {
                        this.base.putTileAt(this.tile, x, y);
                        es.editorCore?.setTile(x - es.tileOffsetX, y - es.tileOffsetY, this.tile);
                    }
                }
            }
        }

        this.isDrag = false;
        this.shapeStart = null;
        this.prevX = 0;
        this.prevY = 0;
    }

    onScroll(scene: Phaser.Scene, deltaY: number) {
        const dy = Math.exp(deltaY * -(1 / 1000));
        const zoom = Math.min(Math.max(scene.cameras.main.zoom * dy, 0.1), 10);
        scene.cameras.main.setZoom(zoom);
    }

    private floodFill(scene: EditorScene, startX: number, startY: number, fillTile: number, matchExact: boolean = false) {
        const layer = this.base;
        const targetTileObj = layer.getTileAt(startX, startY);
        const targetIndex = targetTileObj ? targetTileObj.index : -1;

        if (targetIndex === fillTile) return;

        const queue: { x: number, y: number }[] = [{ x: startX, y: startY }];
        const visited = new Set<string>();

        // Safety Break (limit iterations)
        let iter = 0;
        const maxIter = 5000;

        while (queue.length > 0 && iter < maxIter) {
            iter++;
            const { x, y } = queue.shift()!;
            const key = `${x},${y}`;
            if (visited.has(key)) continue;

            // Check Bounds (Visual bounds - reasonable limit)
            // Or just check if TileMap has tile? 
            // Phaser Tilemap is dynamic, but lets verify boundaries if needed.
            // For now, infinite canvas style, BUT we should rely on "has tile" for connected erase

            const currentTileObj = layer.getTileAt(x, y);
            const currentIndex = currentTileObj ? currentTileObj.index : -1;

            if (matchExact) {
                // Connected Erase: Must match targetIndex exactly
                if (currentIndex !== targetIndex) continue;
            } else {
                // Bucket Fill: Must match targetIndex (which might be -1/empty)
                if (currentIndex !== targetIndex) continue;
            }

            // Apply Change
            if (fillTile === -1) {
                layer.removeTileAt(x, y);
                scene.editorCore?.removeTile(x - scene.tileOffsetX, y - scene.tileOffsetY);
            } else {
                layer.putTileAt(fillTile, x, y);
                scene.editorCore?.setTile(x - scene.tileOffsetX, y - scene.tileOffsetY, fillTile);
            }

            visited.add(key);

            // Neighbors
            queue.push({ x: x + 1, y: y });
            queue.push({ x: x - 1, y: y });
            queue.push({ x: x, y: y + 1 });
            queue.push({ x: x, y: y - 1 });
        }
    }
}

export class DragDropMode extends EditorMode {
    public asset: Asset | null = null; // ????????? ???? ????????????????

    private ghost: Phaser.GameObjects.Image | null = null;

    // enter/exit/update?????????? ????????????
    enter(_scene: Phaser.Scene) { }
    exit(_scene: Phaser.Scene) {
        if (this.ghost) {
            this.ghost.destroy();
            this.ghost = null;
        }
    }
    update(_scene: Phaser.Scene, _dt: number) { }

    private resolveTextureKey(scene: Phaser.Scene, asset: Asset): string | null {
        const prefabTexture = asset.tag === "Prefab"
            ? (asset.metadata?.prefab as { texture?: string } | undefined)?.texture
            : undefined;
        if (prefabTexture && scene.textures.exists(prefabTexture)) {
            return prefabTexture;
        }
        if (scene.textures.exists(asset.name)) {
            return asset.name;
        }
        return null;
    }

    onPointerDown(_scene: Phaser.Scene, _p: Phaser.Input.Pointer) {
        // ?????????????. (???????????ghost???????????????? ????)
    }

    onPointerMove(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
        if (!this.asset) return;

        const key = this.resolveTextureKey(scene, this.asset);
        if (!key) return;

        const wp = scene.cameras.main.getWorldPoint(p.x, p.y);

        // ghost ??????????
        if (!this.ghost) {
            this.ghost = scene.add.image(wp.x, wp.y, key);
            this.ghost.setAlpha(0.6);
            this.ghost.setDepth(9999);
            this.ghost.setOrigin(0.5, 0.5);
        } else {
            // ?????????????????
            this.ghost.setPosition(wp.x, wp.y);
        }
    }

    onPointerUp(scene: Phaser.Scene, p: Phaser.Input.Pointer) {
        console.log("[DragDrop] onPointerUp triggered", this.asset?.id);
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

        const key = this.resolveTextureKey(scene, this.asset);
        if (!key) {
            finalizeDrop();
            return;
        }

        console.log("[DragDrop] asset metadata", this.asset?.metadata);
        const wp = scene.cameras.main.getWorldPoint(p.x, p.y);
        const entity = assetToEntity(this.asset, wp.x, wp.y);
        console.log("[DragDrop] spawing entity from asset", entity);

        // ?????? ????
        const created = scene.add.image(wp.x, wp.y, key);
        const depth = this.asset.tag === "Prefab" ? (entity.z ?? 10) : 10;
        created.setDepth(depth);
        created.setOrigin(0.5, 0.5);
        created.setInteractive();
        created.setData("id", entity.id);

        if (this.asset.tag === "Prefab") {
            created.setScale(entity.scaleX ?? 1, entity.scaleY ?? 1);
            if (typeof entity.rotation === "number") {
                created.setRotation(entity.rotation);
            }
            entity.z = depth;
        }

        // Save entity to EditorCore so it can be exported
        es.editorCore?.addEntity(entity);

        // Notify React side immediately about the created entity so Hierarchy updates
        es.onSelectEntity?.(entity);

        created.on("pointerdown", () => {
            // On click, set selection and switch to EntityEditMode for dragging
            try {
                es.editorCore?.setSelectedEntity?.(entity);
                // Switch to EntityEditMode to enable dragging
                const editMode = new EntityEditMode();
                es.setEditorMode(editMode);
                es.editorCore?.sendContextToEditorModeStateMachine({
                    currentMode: editMode,
                    mouse: "mousedown"
                });
            } catch (e) {
                // ignore
            }
        });
        if (es.entityGroup) es.entityGroup.add(created);

        finalizeDrop();
    }

    onScroll(_scene: Phaser.Scene, _deltaY: number) {
        // ??????????????????????????????
    }
}


export class EntityEditMode implements EditorMode {
    private dragging = false;
    private selected: Phaser.GameObjects.GameObject | null = null;

    private offsetX = 0;
    private offsetY = 0;

    private snapToGrid = false;
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

        // 드래그 시작 시점에 선택된 엔티티를 즉시 인스펙터에 표시
        const id = (target as any).getData?.("id");
        if (id && scene.editorCore) {
            const entity = scene.editorCore.getEntities().get(id);
            if (entity) {
                // Snapshot BEFORE drag starts (for undo)
                (scene.editorCore as any).snapshot?.();
                scene.editorCore.setSelectedEntity(entity);
            }
        }
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

                // Commit back to core using updateEntity (no snapshot, we already took one on drag start)
                scene.editorCore.updateEntity(entity);
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





