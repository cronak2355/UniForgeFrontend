import { System } from "../ExecutionPipeline";
import { RuntimeContext } from "../RuntimeContext";
import { ModuleRuntime } from "../flow/ModuleRuntime";

export class LogicSystem implements System {
    name = "LogicSystem";
    private moduleRuntime: ModuleRuntime;

    constructor(moduleRuntime: ModuleRuntime) {
        this.moduleRuntime = moduleRuntime;
    }

    onUpdate(context: RuntimeContext, dt: number) {
        // Delegate logic execution to ModuleRuntime
        // ModuleRuntime maintains its own internal list of active module instances
        // so we don't need to query entities here yet.
        // In the future, we might query entities with "ModuleComponent".

        const results = this.moduleRuntime.update(0, dt); // Time is unused in current signature?

        // Log failures if needed
        for (const result of results) {
            if (result.status === "failed") {
                // console.warn("[LogicSystem] Module execution failed", result);
            }
        }
    }
}
