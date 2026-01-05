import { ActionRegistry, type ActionContext } from "../ActionRegistry";
import { EventBus } from "../EventBus";
import Phaser from "phaser";
import { editorCore } from "../../../EditorCore";

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
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) {
        console.warn(`[Action] Move: GameObject not found for entity ${entityId}`);
        return;
    }

    // 파라미터에서 방향과 속도를 가져옴
    const x = (params.x as number) ?? 0;
    const y = (params.y as number) ?? 0;
    const speed = (params.speed as number) ?? 200;
    const dt = 0.016; // 약 60fps 기준

    // 실제 위치 이동
    gameObject.x += x * speed * dt;
    gameObject.y += y * speed * dt;

    // EditorCore의 entity 데이터도 업데이트 (동기화)
    const entity = editorCore.getEntities().get(entityId);
    if (entity) {
        entity.x = gameObject.x;
        entity.y = gameObject.y;
    }

    console.log(`[Action] Move: Entity ${entityId} moved to (${gameObject.x.toFixed(1)}, ${gameObject.y.toFixed(1)})`);
});

ActionRegistry.register("Jump", (_ctx: ActionContext, _params: Record<string, unknown>) => {
    // Jump 액션은 더 이상 위치를 직접 변경하지 않습니다.
    // update() 루프의 물리 엔진이 모든 점프를 처리합니다.
    // 이 액션은 EAC 규칙 호환성을 위해 로그만 출력합니다.
    console.log(`[Action] Jump: Handled by physics engine (not direct position change)`);
});

// --- Combat Actions ---

ActionRegistry.register("Attack", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    const attackerId = ctx.entityId;
    const attackerObj = renderer.getGameObject?.(attackerId);
    if (!attackerObj) return;

    const range = (params.range as number) ?? 100;
    const damage = (params.damage as number) ?? 10;

    // 다른 엔티티들과 거리 검사
    const allIds = renderer.getAllEntityIds?.() || [];
    for (const id of allIds) {
        if (id === attackerId) continue;

        const targetObj = renderer.getGameObject?.(id);
        if (!targetObj) continue;

        const distance = Phaser.Math.Distance.Between(
            attackerObj.x, attackerObj.y,
            targetObj.x, targetObj.y
        );

        if (distance <= range) {
            EventBus.emit("ATTACK_HIT", { targetId: id, damage, attackerId });
            console.log(`[Action] Attack hit: ${id} for ${damage} damage`);
        }
    }
});

// --- Status Actions ---

ActionRegistry.register("TakeDamage", (ctx: ActionContext, params: Record<string, unknown>) => {
    const status = ctx.modules.Status as any;
    if (!status) {
        console.warn("[Action] TakeDamage: No Status module");
        return;
    }

    const amount = (params.amount as number) ?? 1;

    if (typeof status.takeDamage === 'function') {
        status.takeDamage(amount);
    } else {
        // 직접 HP 감소 (데이터 모듈인 경우)
        if (status.hp !== undefined) {
            status.hp = Math.max(0, status.hp - amount);
            console.log(`[Action] TakeDamage: HP reduced to ${status.hp}`);

            if (status.hp <= 0) {
                EventBus.emit("ENTITY_DIED", { entityId: ctx.entityId });
            }
        }
    }
});

ActionRegistry.register("Heal", (ctx: ActionContext, params: Record<string, unknown>) => {
    const status = ctx.modules.Status as any;
    if (!status) return;

    const amount = (params.amount as number) ?? 10;

    if (typeof status.heal === 'function') {
        status.heal(amount);
    } else if (status.hp !== undefined && status.maxHp !== undefined) {
        status.hp = Math.min(status.maxHp, status.hp + amount);
        console.log(`[Action] Heal: HP increased to ${status.hp}`);
    }
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

console.log("[DefaultActions] Actions registered with runtime support.");
