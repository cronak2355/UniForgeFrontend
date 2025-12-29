import Phaser from "phaser";
import type { EditorEntity } from "./EditorState";

export class EditorScene extends Phaser.Scene {
    private sprites = new Map<string, Phaser.GameObjects.Image>();

    preload() {
        this.load.image(
            "placeholder",
            "/src/assets/placeholder.png"
        );
    }

    syncEntities(entities: EditorEntity[]) {
        this.sprites.forEach((sprite) => sprite.destroy());
        this.sprites.clear();

        for (const e of entities) {
            const sprite = this.add.image(
                e.x,
                e.y,
                "placeholder"
            );
            sprite.setOrigin(0.5, 0.5);

            this.sprites.set(e.id, sprite);
        }
    }
}
