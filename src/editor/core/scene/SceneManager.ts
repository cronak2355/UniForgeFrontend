import type { Scene } from "./Scene";
import { SceneRegistry } from "./SceneRegistry";

class SceneManagerClass {
    private currentScene: Scene | null = null;

    /**
     * Scene 직접 전환 (내부용)
     */
    changeScene(scene: Scene) {
        if (this.currentScene) {
            this.currentScene.exit();
        }

        this.currentScene = scene;
        this.currentScene.enter();
    }

    /**
     * sceneId 기반 전환 (Action용)
     */
    changeSceneById(sceneId: string) {
        const scene = SceneRegistry.create(sceneId);
        this.changeScene(scene);
    }

    getCurrentScene(): Scene | null {
        return this.currentScene;
    }
}

export const SceneManager = new SceneManagerClass();
