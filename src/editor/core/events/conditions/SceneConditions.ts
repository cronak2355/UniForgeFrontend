import { ConditionRegistry } from "../ConditionRegistry";
import type { ActionContext } from "../ActionRegistry";
import type { SceneState } from "../../scene/SceneState";

/**
 * IF_SCENE_FLAG
 * params:
 *  - flag: string
 *  - value?: boolean (default: true)
 */
ConditionRegistry.register(
    "IF_SCENE_FLAG",
    (ctx: ActionContext, params: Record<string, unknown>) => {
        const sceneState = ctx.globals?.sceneState as SceneState | undefined;
        if (!sceneState) return false;

        const flag = params.flag as string;
        if (!flag) return false;

        const expected = (params.value as boolean) ?? true;
        return sceneState.getFlag(flag) === expected;
    }
);

console.log("[SceneConditions] registered: IF_SCENE_FLAG");
