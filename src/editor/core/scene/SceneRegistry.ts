import type { Scene } from "./Scene";
import type { SceneFactory } from "./SceneFactory";

class SceneRegistryClass {
    private factories = new Map<string, SceneFactory>();

    /**
     * Scene 등록 (게임 초기화 시)
     */
    register(sceneId: string, factory: SceneFactory) {
        if (this.factories.has(sceneId)) {
            console.warn(`[SceneRegistry] Scene '${sceneId}' is already registered.`);
        }
        this.factories.set(sceneId, factory);
    }

    /**
     * Scene 생성
     */
    create(sceneId: string): Scene {
        const factory = this.factories.get(sceneId);
        if (!factory) {
            throw new Error(`[SceneRegistry] Scene '${sceneId}' not found.`);
        }
        return factory();
    }

    /**
     * 등록 여부 확인 (옵션)
     */
    has(sceneId: string): boolean {
        return this.factories.has(sceneId);
    }
}

export const SceneRegistry = new SceneRegistryClass();
