import { EventBus } from "../EventBus";

export class KeyboardAdapter {
    constructor(scene: Phaser.Scene) {
        if (!scene || !scene.input || !scene.input.keyboard) {
            console.warn("[KeyboardAdapter] Scene input not ready.");
            return;
        }

        scene.input.keyboard.on('keydown', (event: KeyboardEvent) => {
            // 반복 입력 방지 옵션이 필요할 수 있음
            EventBus.emit("KEY_DOWN", { key: event.code });
        });

        scene.input.keyboard.on('keyup', (event: KeyboardEvent) => {
            EventBus.emit("KEY_UP", { key: event.code });
        });

        console.log("[KeyboardAdapter] Initialized");
    }
}
