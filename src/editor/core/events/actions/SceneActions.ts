import { ActionRegistry, type ActionContext } from "../ActionRegistry";
import type { SceneState } from "../../scene/SceneState";
import { SceneManager } from "../../scene/SceneManager";

/**
 * SET_SCENE_FLAG
 */
ActionRegistry.register(
    "SET_SCENE_FLAG",
    (ctx: ActionContext, params: Record<string, unknown>) => {
        const sceneState = ctx.globals?.sceneState as SceneState | undefined;
        if (!sceneState) return;

        const flag = params.flag as string;
        if (!flag) return;

        const value = (params.value as boolean) ?? true;
        sceneState.setFlag(flag, value);
    }
);

/**
 * CHANGE_SCENE
 * params:
 *  - sceneId: string
 */
ActionRegistry.register(
    "CHANGE_SCENE",
    (_ctx: ActionContext, params: Record<string, unknown>) => {
        const sceneId = params.sceneId as string;
        if (!sceneId) return;

        SceneManager.changeSceneById(sceneId);
    }
);
