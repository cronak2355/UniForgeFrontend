import { ActionRegistry, type ActionContext } from "../ActionRegistry";
import { EventBus } from "../EventBus";
import Phaser from "phaser";
import { editorCore } from "../../../EditorCore";
import { getRuntimeEntity } from "../../modules/ModuleFactory";
import type { StatusModule } from "../../modules/StatusModule";
import type { KineticModule } from "../../modules/KineticModule";

/**
 * 기본 액션 등록
 * 모듈들이 로드될 때 이 파일도 함께 로드되어야 합니다.
 */

// --- Kinetic Actions ---

ActionRegistry.register("Move", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) {
        console.warn("[Action] Move: No renderer in context");
        return;
    }

    const entityId = ctx.entityId;

    // 디버그: 렌더러에 등록된 모든 엔티티 ID 확인
    const allIds = renderer.getAllEntityIds?.() ?? [];
    console.log(`[Action] Move: Looking for ${entityId}, renderer has: [${allIds.join(', ')}]`);

    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) {
        console.warn(`[Action] Move: GameObject not found for entity ${entityId}`);
        return;
    }

    const x = (params.x as number) ?? 0;
    const y = (params.y as number) ?? 0;
    const speed = (params.speed as number) ?? 200;
    const dt = (ctx.eventData.dt as number) ?? 0.016;

    gameObject.x += x * speed * dt;
    gameObject.y += y * speed * dt;

    const entity = editorCore.getEntities().get(entityId);
    if (entity) {
        entity.x = gameObject.x;
        entity.y = gameObject.y;
    }

    // 런타임 엔티티 위치도 동기화
    const runtimeEntity = getRuntimeEntity(entityId);
    if (runtimeEntity) {
        runtimeEntity.x = gameObject.x;
        runtimeEntity.y = gameObject.y;
    }
});

ActionRegistry.register("Jump", (_ctx: ActionContext, _params: Record<string, unknown>) => {
    // 물리 엔진에서 처리 - EAC 호환성용
    console.log("[Action] Jump: Handled by physics engine");
});

/**
 * MoveToward - 특정 좌표를 향해 이동
 * params: { x: number, y: number, speed?: number }
 */
ActionRegistry.register("MoveToward", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const targetX = params.x as number;
    const targetY = params.y as number;
    const speed = (params.speed as number) ?? 100;
    const dt = (ctx.eventData.dt as number) ?? 0.016;

    const dx = targetX - gameObject.x;
    const dy = targetY - gameObject.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
        const nx = dx / distance;
        const ny = dy / distance;

        gameObject.x += nx * speed * dt;
        gameObject.y += ny * speed * dt;

        const entity = editorCore.getEntities().get(entityId);
        if (entity) {
            entity.x = gameObject.x;
            entity.y = gameObject.y;
        }
    }
});

/**
 * ChaseTarget - 타겟 엔티티를 향해 이동
 * params: { targetId: string, speed?: number }
 */
ActionRegistry.register("ChaseTarget", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    const entityId = ctx.entityId;
    const targetId = params.targetId as string;
    if (!targetId) return;

    const gameObject = renderer.getGameObject?.(entityId);
    const targetObject = renderer.getGameObject?.(targetId);
    if (!gameObject || !targetObject) return;

    const speed = (params.speed as number) ?? 100;
    const dt = (ctx.eventData.dt as number) ?? 0.016;

    const dx = targetObject.x - gameObject.x;
    const dy = targetObject.y - gameObject.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
        const nx = dx / distance;
        const ny = dy / distance;

        gameObject.x += nx * speed * dt;
        gameObject.y += ny * speed * dt;

        const entity = editorCore.getEntities().get(entityId);
        if (entity) {
            entity.x = gameObject.x;
            entity.y = gameObject.y;
        }

        // 런타임 엔티티 동기화
        const runtimeEntity = getRuntimeEntity(entityId);
        if (runtimeEntity) {
            runtimeEntity.x = gameObject.x;
            runtimeEntity.y = gameObject.y;
        }
    }
});

// --- Combat Actions ---

// 공격 쿨다운 관리 (엔티티별, ms 단위)
const attackCooldowns = new Map<string, number>();

ActionRegistry.register("Attack", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    const attackerId = ctx.entityId;
    const now = Date.now();

    // 쿨다운 체크 (기본 500ms)
    const cooldown = (params.cooldown as number) ?? 500;
    const lastAttack = attackCooldowns.get(attackerId) ?? 0;
    if (now - lastAttack < cooldown) return;

    const attackerObj = renderer.getGameObject?.(attackerId);
    if (!attackerObj) return;

    const range = (params.range as number) ?? 100;
    const damage = (params.damage as number) ?? 10;
    const targetId = params.targetId as string | undefined;

    const allIds = targetId ? [targetId] : (renderer.getAllEntityIds?.() || []);

    let hitSomething = false;

    for (const id of allIds) {
        if (id === attackerId) continue;

        const targetObj = renderer.getGameObject?.(id);
        if (!targetObj) continue;

        const distance = Phaser.Math.Distance.Between(
            attackerObj.x, attackerObj.y,
            targetObj.x, targetObj.y
        );

        if (distance <= range) {
            // 타겟의 StatusModule에서 직접 데미지 적용
            const targetRuntimeEntity = getRuntimeEntity(id);
            if (targetRuntimeEntity?.modules?.Status) {
                const statusModule = targetRuntimeEntity.modules.Status as any;
                if (typeof statusModule.takeDamage === 'function') {
                    statusModule.takeDamage(damage);
                    console.log(`[Attack] ${attackerId} → ${id}: ${damage} damage (HP: ${statusModule.hp})`);
                    hitSomething = true;
                }
            }

            // 이벤트도 발행 (커스텀 Rule에서 추가 처리 가능)
            EventBus.emit("ATTACK_HIT", { targetId: id, damage, attackerId });
        }
    }

    // 뭔가를 공격했으면 쿨다운 적용
    if (hitSomething) {
        attackCooldowns.set(attackerId, now);
    }
});

/**
 * FireProjectile - 투사체 발사
 * params: { targetId?: string, targetX?: number, targetY?: number, speed?: number, damage?: number }
 */
ActionRegistry.register("FireProjectile", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    const ownerId = ctx.entityId;
    const ownerObj = renderer.getGameObject?.(ownerId);
    if (!ownerObj) return;

    // 타겟 좌표 결정
    let targetX = params.targetX as number | undefined;
    let targetY = params.targetY as number | undefined;

    if (params.targetId) {
        const targetObj = renderer.getGameObject?.(params.targetId);
        if (targetObj) {
            targetX = targetObj.x;
            targetY = targetObj.y;
        }
    }

    if (targetX === undefined || targetY === undefined) {
        console.warn("[Action] FireProjectile: No target specified");
        return;
    }

    const speed = (params.speed as number) ?? 300;
    const damage = (params.damage as number) ?? 10;

    // 방향 계산
    const dx = targetX - ownerObj.x;
    const dy = targetY - ownerObj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / distance;
    const ny = dy / distance;

    // 투사체 이벤트 발행 (ProjectileSystem에서 처리)
    EventBus.emit("SPAWN_PROJECTILE", {
        ownerId,
        x: ownerObj.x,
        y: ownerObj.y,
        velX: nx * speed,
        velY: ny * speed,
        damage
    });
});

// --- Status Actions ---

/**
 * TakeDamage - 데미지 적용 (런타임 모듈 인스턴스 사용)
 * params: { amount: number }
 */
ActionRegistry.register("TakeDamage", (ctx: ActionContext, params: Record<string, unknown>) => {
    // 런타임 모듈 인스턴스에서 StatusModule 가져오기
    const status = ctx.modules.Status as StatusModule | undefined;
    if (!status) {
        console.warn(`[Action] TakeDamage: No Status module for entity ${ctx.entityId}`);
        return;
    }

    const amount = (params.amount as number) ?? 1;

    // StatusModule 클래스의 takeDamage 메서드 호출
    if (typeof status.takeDamage === 'function') {
        const actualDamage = status.takeDamage(amount);
        console.log(`[Action] TakeDamage: ${ctx.entityId} took ${actualDamage} damage, HP: ${status.hp}/${status.maxHp}`);

        // HP 변화 이벤트 발행
        EventBus.emit("HP_CHANGED", {
            entityId: ctx.entityId,
            hp: status.hp,
            maxHp: status.maxHp,
            damage: actualDamage
        });

        // 사망 체크
        if (!status.isAlive) {
            EventBus.emit("ENTITY_DIED", { entityId: ctx.entityId });
        }
    } else {
        // 폴백: 데이터 객체인 경우 직접 조작
        const statusData = status as unknown as { hp?: number; maxHp?: number };
        if (statusData.hp !== undefined) {
            statusData.hp = Math.max(0, statusData.hp - amount);
            if (statusData.hp <= 0) {
                EventBus.emit("ENTITY_DIED", { entityId: ctx.entityId });
            }
        }
    }
});

ActionRegistry.register("Heal", (ctx: ActionContext, params: Record<string, unknown>) => {
    const status = ctx.modules.Status as StatusModule | undefined;
    if (!status) return;

    const amount = (params.amount as number) ?? 10;

    if (typeof status.heal === 'function') {
        status.heal(amount);
        console.log(`[Action] Heal: ${ctx.entityId} healed ${amount}, HP: ${status.hp}/${status.maxHp}`);

        EventBus.emit("HP_CHANGED", {
            entityId: ctx.entityId,
            hp: status.hp,
            maxHp: status.maxHp,
            healed: amount
        });
    } else {
        const statusData = status as unknown as { hp?: number; maxHp?: number };
        if (statusData.hp !== undefined && statusData.maxHp !== undefined) {
            statusData.hp = Math.min(statusData.maxHp, statusData.hp + amount);
        }
    }
});

// --- Variable Actions ---

/**
 * 변수 설정
 * params: { name: string, value: number | string }
 */
ActionRegistry.register("SetVar", (ctx: ActionContext, params: Record<string, unknown>) => {
    const entity = editorCore.getEntities().get(ctx.entityId);
    if (!entity) return;

    const varName = params.name as string;
    const value = params.value as number | string;
    if (!varName) return;

    if (!entity.variables) entity.variables = [];

    const existingVar = entity.variables.find(v => v.name === varName);
    if (existingVar) {
        existingVar.value = value;
    } else {
        entity.variables.push({
            id: crypto.randomUUID(),
            name: varName,
            type: typeof value === 'number' ? 'float' : 'string',
            value
        });
    }
});

// --- Entity Control Actions ---

/**
 * 엔티티 활성화/비활성화
 * params: { targetId?: string, enabled?: boolean }
 * enabled 생략시 true (활성화)
 */
ActionRegistry.register("Enable", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    const targetId = (params.targetId as string) ?? ctx.entityId;
    const enabled = (params.enabled as boolean) ?? true;
    const gameObject = renderer.getGameObject?.(targetId);

    if (gameObject) {
        gameObject.setVisible(enabled);
        gameObject.setActive(enabled);
        EventBus.emit(enabled ? "ENTITY_ENABLED" : "ENTITY_DISABLED", { entityId: targetId });
    }
});

// --- Scene Actions ---

/**
 * 씬 전환
 * params: { sceneName: string, data?: object }
 */
ActionRegistry.register("ChangeScene", (ctx: ActionContext, params: Record<string, unknown>) => {
    const scene = ctx.globals?.scene as Phaser.Scene | undefined;
    if (!scene) return;

    const sceneName = params.sceneName as string;
    const data = params.data as object | undefined;
    if (!sceneName) return;

    EventBus.emit("SCENE_CHANGING", { from: scene.scene.key, to: sceneName });
    scene.scene.start(sceneName, data);
});

ActionRegistry.register("Rotate", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const speed = (params.speed as number) ?? 90; // deg/sec
    const dt = 0.016;

    gameObject.rotation += Phaser.Math.DegToRad(speed * dt);

    // EditorCore 동기화
    const entity = editorCore.getEntities().get(entityId);
    if (entity) {
        entity.rotation += Phaser.Math.DegToRad(speed * dt);
        gameObject.rotation = entity.rotation;
    }
});

ActionRegistry.register("Pulse", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const speed = (params.speed as number) ?? 2;
    const min = (params.minScale as number) ?? 0.8;
    const max = (params.maxScale as number) ?? 1.2;

    const time = performance.now() * 0.001;
    const t = Math.sin(time * speed) * 0.5 + 0.5;
    const scale = min + (max - min) * t;

    gameObject.setScale(scale);

    const entity = editorCore.getEntities().get(entityId);
    if (entity) {
        entity.scaleX = scale;
        entity.scaleY = scale;
    }
});

console.log("[DefaultActions] 12 actions registered: Move, Jump, MoveToward, ChaseTarget, Attack, FireProjectile, TakeDamage, Heal, SetVar, Enable, ChangeScene");

