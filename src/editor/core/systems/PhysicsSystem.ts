import { System } from "../ExecutionPipeline";
import { RuntimeContext } from "../RuntimeContext";
import { collisionSystem } from "../CollisionSystem";

export class PhysicsSystem implements System {
    name = "PhysicsSystem";

    onUpdate(context: RuntimeContext, dt: number) {
        // Delegate physics update to the global CollisionSystem (Legacy Wrapper)
        // In a pure ECS, this would iterate components and solve physics.
        // For now, we maintain the existing behavior.
        collisionSystem.update();
    }
}
