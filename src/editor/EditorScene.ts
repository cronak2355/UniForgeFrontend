import Phaser from "phaser";
import type { EditorEntity } from "./EditorState";

export class EditorScene extends Phaser.Scene {
    private sprites = new Map<string, Phaser.GameObjects.Image>();
    public onEntityMove?: (id: string, x: number, y: number) => void;

    private ghost?: Phaser.GameObjects.Image;
    private ready = false;
    private pendingEntities: EditorEntity[] | null = null;

    preload() {
        this.load.image("preview", "/src/assets/placeholder.png");
    }

    create() {
        this.ready = true;

        if (this.pendingEntities) {
            this.syncEntities(this.pendingEntities);
            this.pendingEntities = null;
        }
    }

    syncEntities(entities: EditorEntity[]) {
        if (!this.ready) {
            this.pendingEntities = entities;
            return;
        }

        this.children.removeAll();
        this.sprites.clear();

        entities.forEach((e) => {
            const sprite = this.add.image(e.x, e.y, "preview");
            sprite.setData("id", e.id);
            sprite.setInteractive({ draggable: true });

            this.input.setDraggable(sprite);

            sprite.on("drag", (_p: any, x: number, y: number) => {
                sprite.setPosition(x, y);
            });

            sprite.on("dragend", () => {
                this.onEntityMove?.(e.id, sprite.x, sprite.y);
            });

            this.sprites.set(e.id, sprite);
        });
    }

    showGhost(x: number, y: number) {
        if (!this.ready) return;

        if (!this.ghost) {
            this.ghost = this.add.image(x, y, "preview");
            this.ghost.setAlpha(0.5);
            this.ghost.setScale(0.5);
        } else {
            this.ghost.setPosition(x, y);
        }
    }

    hideGhost() {
        this.ghost?.destroy();
        this.ghost = undefined;
    }
}
