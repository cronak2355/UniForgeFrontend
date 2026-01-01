import Phaser from "phaser";
import type { EditorEntity } from "./types/Entity";
import type { EditorState, TilePlacement } from "./EditorCore";

const tileSize = 32;

export default class RunTimeScene extends Phaser.Scene {
    public editorCore?: EditorState;

    private map?: Phaser.Tilemaps.Tilemap;
    private tileset?: Phaser.Tilemaps.Tileset;
    private baselayer?: Phaser.Tilemaps.TilemapLayer;
    private entityGroup?: Phaser.GameObjects.Group;

    public tileOffsetX = 0;
    public tileOffsetY = 0;

    constructor() {
        super("RunTimeScene");
    }
    preload() {
        const assets = this.editorCore?.getAssets() ?? [];
        for (const asset of assets) {
            if (asset.tag === "Tile") continue;
            if (this.textures.exists(asset.name)) continue;
            this.load.image(asset.name, asset.url);
        }
    }

    async buildTilesetTexture() {
        const assets = this.editorCore?.getAssets() ?? [];
        const tileAssets = assets.filter((asset) => asset.tag === "Tile");
        const cols = 16;

        if (tileAssets.length === 0) return;

        const tilesetcanvas = document.createElement("canvas");
        tilesetcanvas.width = tileSize * cols;
        tilesetcanvas.height = Math.ceil(tileAssets.length / cols) * tileSize;

        const ctx = tilesetcanvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");

        let idx = 0;
        for (const asset of tileAssets) {
            const img = new Image();
            img.src = asset.url;
            await img.decode();

            const x = (idx % cols) * tileSize;
            const y = Math.floor(idx / cols) * tileSize;
            ctx.drawImage(img, x, y, tileSize, tileSize);

            idx++;
        }

        const tilesetKey = "tiles";
        if (this.textures.exists(tilesetKey)) this.textures.remove(tilesetKey);
        this.textures.addCanvas(tilesetKey, tilesetcanvas);
    }
    create()
    {
        
    }
    buildWorldFromCore() {
        if (!this.editorCore) return;

        this.map = this.make.tilemap({
        tileWidth: tileSize,
        tileHeight: tileSize,
        width: 200,
        height: 200,
        });

        this.tileset = this.map.addTilesetImage("tiles", "tiles", tileSize, tileSize)!;
        this.baselayer = this.map.createBlankLayer("base", this.tileset, 0, 0)!;
        this.baselayer.setDepth(0);

        this.tileOffsetX = Math.floor(this.map.width / 2);
        this.tileOffsetY = Math.floor(this.map.height / 2);
        const offsetX = -this.tileOffsetX * tileSize;
        const offsetY = -this.tileOffsetY * tileSize;
        this.baselayer.setPosition(offsetX, offsetY);

        this.applyTiles(Array.from(this.editorCore.getTiles().values()));
        this.spawnEntities(Array.from(this.editorCore.getEntities().values()));
    }

    applyTiles(tiles: TilePlacement[]) {
        if (!this.baselayer || !this.map) return;
        this.baselayer.fill(-1);

        for (const t of tiles) {
            const x = t.x + this.tileOffsetX;
            const y = t.y + this.tileOffsetY;
            if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) continue;
            this.baselayer.putTileAt(t.tile, x, y);
        }
    }

  spawnEntities(entities: EditorEntity[]) {
    if (this.entityGroup) {
      const old = this.entityGroup.getChildren();
      for (const c of old) c.destroy();
      this.entityGroup.clear(false);
    } else {
      this.entityGroup = this.add.group();
    }

    entities.forEach((e) => {
      if (this.textures.exists(e.name)) {
        const sprite = this.add.image(e.x, e.y, e.name);
        sprite.setDepth(10);
        sprite.setData("id", e.id);
        this.entityGroup!.add(sprite);
      } else {
        const rect = this.add.rectangle(e.x, e.y, 40, 40, 0xffffff);
        rect.setDepth(10);
        rect.setData("id", e.id);
        this.entityGroup!.add(rect);
      }
    });
  }
}
