/**
 * Core Systems - 게임 시스템 모음
 * 
 * 모든 핵심 게임 시스템을 단일 진입점에서 내보냅니다.
 */

// 충돌 시스템
export { collisionSystem, createCollisionSystem, CollisionLayer } from "./CollisionSystem";
export type { AABB, Collider, CollisionResult, CollisionTag } from "./CollisionSystem";

// 투사체 시스템
export { projectileSystem } from "./ProjectileSystem";
export type { Projectile, SpawnerConfig, BulletPattern } from "./ProjectileSystem";

// AI 시스템
export { aiSystem } from "./AISystem";
export type { AIBehavior, AIState, AIConfig, AIUpdateResult } from "./AISystem";

// 스포너 시스템
export { spawnerSystem } from "./SpawnerSystem";
export type { SpawnPoint, EnemyTemplate, Wave, WaveEnemy, SpawnerState, SpawnResult } from "./SpawnerSystem";

// 물리 시스템
export { runtimePhysics } from "./RuntimePhysics";
export type { InputState, PhysicsState, PhysicsResult } from "./RuntimePhysics";

// 게임 코어
export { GameCore } from "./GameCore";
