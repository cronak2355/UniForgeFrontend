import { System } from "../ExecutionPipeline";
import { RuntimeContext } from "../RuntimeContext";
import { collisionSystem } from "../CollisionSystem";

export class PhysicsSystem implements System {
    name = "PhysicsSystem";

    onUpdate(context: RuntimeContext, dt: number) {
        // [SYNC] Sync RuntimeContext entity positions TO CollisionSystem
        // This ensures that any movement logic (LogicSystem, Scripts) is reflected in the collision world
        // BEFORE collision detection runs.
        for (const [id, entity] of context.entities) {
            // Optimization: Only update if changed? 
            // CollisionSystem.updatePosition is cheap (Map lookup + assignment)
            // But we need to filter for entities that HAVE colliders?
            // collisionSystem.updatePosition handles "if collider exists" check.
            collisionSystem.updatePosition(id, entity.x, entity.y);
        }

        // Delegate physics update to the global CollisionSystem (Legacy Wrapper)
        // In a pure ECS, this would iterate components and solve physics.
        // For now, we maintain the existing behavior.
        collisionSystem.update();

        // [SYNC] Sync back resolved positions from CollisionSystem to RuntimeContext
        // This ensures that "soft collisions" (pushing) are applied to the game state.
        for (const [id, collider] of collisionSystem['colliders']) {
            const entity = context.entities.get(id);
            if (entity) {
                // Only sync if position changed?
                // CollisionSystem updates bounds.x/y in place.
                if (entity.x !== collider.bounds.x || entity.y !== collider.bounds.y) {
                    entity.x = collider.bounds.x;
                    entity.y = collider.bounds.y;
                }
            }
        }
    }
}
