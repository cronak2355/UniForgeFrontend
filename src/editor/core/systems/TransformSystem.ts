import { RuntimeContext } from "../RuntimeContext";
import { QuerySystem } from "../QuerySystem";
import { System } from "../ExecutionPipeline";

export class TransformSystem implements System {
    name = "TransformSystem";

    onUpdate(context: RuntimeContext, dt: number) {
        // Simple Example: Find entities that need transform logic
        // In reality, transform calculation might come from physics or parents.
        // For now, this is a placeholder to verify the loop.

        // Example: Query entities with "AutoRotate" component (if we had one)
        // const rotating = QuerySystem.select(context, { all: ["AutoRotate"] });
        // for (const entity of rotating) { ... }
    }
}
