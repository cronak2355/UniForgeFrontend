import { EventBus } from "../EventBus";

export class KeyboardAdapter {
    private scene: Phaser.Scene;
    private onKeyDown: (event: KeyboardEvent) => void;
    private onKeyUp: (event: KeyboardEvent) => void;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        // Initialize dummy handlers to satisfy TS strict initialization checks
        this.onKeyDown = () => { };
        this.onKeyUp = () => { };

        if (!scene || !scene.input || !scene.input.keyboard) {
            console.warn("[KeyboardAdapter] Scene input not ready.");
            return;
        }

        this.onKeyDown = (event: KeyboardEvent) => {
            if (event.repeat) return; // Prevent auto-repeat from firing KEY_DOWN multiple times
            EventBus.emit("KEY_DOWN", { key: event.code });
        };

        this.onKeyUp = (event: KeyboardEvent) => {
            EventBus.emit("KEY_UP", { key: event.code });
        };

        scene.input.keyboard.on('keydown', this.onKeyDown);
        scene.input.keyboard.on('keyup', this.onKeyUp);

        console.log("[KeyboardAdapter] Initialized");
    }

    destroy(): void {
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown', this.onKeyDown);
            this.scene.input.keyboard.off('keyup', this.onKeyUp);
            console.log("[KeyboardAdapter] Destroyed and listeners removed");
        }
    }
}
