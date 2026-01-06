import { ActionRegistry, type ActionContext } from "../ActionRegistry";
import { EventBus } from "../EventBus";
import Phaser from "phaser";
import { getRuntimeEntity } from "../../modules/ModuleFactory";
import type { StatusModule } from "../../modules/StatusModule";
import type { KineticModule } from "../../modules/KineticModule";

/**
 * 기본 액션 등록
 * 모듈들이 로드될 때 이 파일도 함께 로드되어야 합니다.
 */

// --- Kinetic Actions ---

ActionRegistry.register("Move", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return;

    // [Fix] 사망한 엔티티는 이동 불가
    const runtimeEntity = getRuntimeEntity(ctx.entityId);
    if (runtimeEntity?.modules?.Status) {
        const status = runtimeEntity.modules.Status as any;
        if (!status.isAlive) return;
    }

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const x = (params.x as number) ?? 0;
    const y = (params.y as number) ?? 0;
    // [Module First] StatusModule.speed 우선, params.speed는 폴백
    const statusSpeed = (runtimeEntity?.modules?.Status as any)?.speed;
    const kineticSpeed = (runtimeEntity?.modules?.Kinetic as any)?.maxSpeed;
    const speed = statusSpeed ?? kineticSpeed ?? (params.speed as number) ?? 200;
    const dt = (ctx.eventData.dt as number) ?? 0.016;

    gameObject.x += x * speed * dt;
    gameObject.y += y * speed * dt;

    const entity = ctx.globals?.entities?.get(entityId);
    if (entity) {
        entity.x = gameObject.x;
        entity.y = gameObject.y;
    }

    if (runtimeEntity) {
        runtimeEntity.x = gameObject.x;
        runtimeEntity.y = gameObject.y;
    }
});

ActionRegistry.register("Jump", (_ctx: ActionContext, _params: Record<string, unknown>) => {
    console.log("[Action] Jump: Handled by physics engine");
});

ActionRegistry.register("MoveToward", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer as any;
    if (!renderer) return;

    // [Fix] 사망한 엔티티는 이동 불가
    const runtimeEntity = getRuntimeEntity(ctx.entityId);
    if (runtimeEntity?.modules?.Status) {
        const status = runtimeEntity.modules.Status as any;
        if (!status.isAlive) return;
    }

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const targetX = params.x as number;
    const targetY = params.y as number;
    // [Module First] StatusModule.speed 우선, params.speed는 폴백
    const statusSpeed = (runtimeEntity?.modules?.Status as any)?.speed;
    const kineticSpeed = (runtimeEntity?.modules?.Kinetic as any)?.maxSpeed;
    const speed = statusSpeed ?? kineticSpeed ?? (params.speed as number) ?? 100;
    const dt = (ctx.eventData.dt as number) ?? 0.016;

    const dx = targetX - gameObject.x;
    const dy = targetY - gameObject.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
        const nx = dx / distance;
        const ny = dy / distance;

        gameObject.x += nx * speed * dt;
        gameObject.y += ny * speed * dt;

        const entity = ctx.globals?.entities?.get(entityId);
        if (entity) {
            entity.x = gameObject.x;
            entity.y = gameObject.y;
        }
    }
});

ActionRegistry.register("ChaseTarget", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
    if (!renderer) return;

    // [Fix] 사망한 엔티티는 이동 불가
    const runtimeEntity = getRuntimeEntity(ctx.entityId);
    if (runtimeEntity?.modules?.Status) {
        const status = runtimeEntity.modules.Status as any;
        if (!status.isAlive) return;
    }

    const entityId = ctx.entityId;

    // [Role-Based Targeting] targetId 또는 targetRole 지원
    // targetId에 공백만 있으면 무시 (trim 처리)
    let targetId = ((params.targetId as string) ?? "").trim() || undefined;
    const targetRole = params.targetRole as string | undefined;

    // targetId가 입력되었지만 실제 존재하지 않는 경우 (사용자 오타 방지)
    if (targetId) {
        const targetObj = renderer.getGameObject?.(targetId);
        if (!targetObj) {
            targetId = undefined; // ID로 못 찾으면 역할 기반 검색으로 폴백
        }
    }

    // targetId가 없고 targetRole이 있으면 해당 역할의 가장 가까운 엔티티 찾기
    if (!targetId && targetRole) {
        const gameCore = ctx.globals?.gameCore;
        const gameObject = renderer.getGameObject?.(entityId);
        if (gameCore && gameObject) {
            const nearest = gameCore.getNearestEntityByRole?.(targetRole, gameObject.x, gameObject.y, entityId);
            if (nearest) {
                targetId = nearest.id;
            }
        }
    }

    if (!targetId) return;

    const gameObject = renderer.getGameObject?.(entityId);
    const targetObject = renderer.getGameObject?.(targetId);
    if (!gameObject || !targetObject) return;

    // [Module First] StatusModule.speed 우선, params.speed는 폴백
    const statusSpeed = (runtimeEntity?.modules?.Status as any)?.speed;
    const kineticSpeed = (runtimeEntity?.modules?.Kinetic as any)?.maxSpeed;
    const speed = statusSpeed ?? kineticSpeed ?? (params.speed as number) ?? 100;
    const dt = (ctx.eventData.dt as number) ?? 0.016;

    const dx = targetObject.x - gameObject.x;
    const dy = targetObject.y - gameObject.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
        const nx = dx / distance;
        const ny = dy / distance;

        gameObject.x += nx * speed * dt;
        gameObject.y += ny * speed * dt;

        const entity = ctx.globals?.entities?.get(entityId);
        if (entity) {
            entity.x = gameObject.x;
            entity.y = gameObject.y;
        }

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
    const renderer = ctx.globals?.renderer;
    if (!renderer) return;

    const attackerId = ctx.entityId;
    const attackerRuntime = getRuntimeEntity(attackerId);

    // [Fix] 사망한 엔티티는 공격 불가
    if (attackerRuntime?.modules?.Status) {
        const status = attackerRuntime.modules.Status as any;
        if (!status.isAlive) return;
    }

    const now = Date.now();

    // 쿨다운 체크 (기본 500ms)
    const cooldown = (params.cooldown as number) ?? 500;
    const lastAttack = attackCooldowns.get(attackerId) ?? 0;
    if (now - lastAttack < cooldown) return;

    const attackerObj = renderer.getGameObject?.(attackerId);
    if (!attackerObj) return;

    // [Module First] CombatModule.attackRange 우선, params.range는 폴백
    const combatModule = attackerRuntime?.modules?.Combat as any;
    const range = combatModule?.attackRange ?? (params.range as number) ?? 100;

    // [Module First] StatusModule.attack 우선, params.damage는 폴백
    const statusModule = attackerRuntime?.modules?.Status as any;
    const damage = statusModule?.attack ?? (params.damage as number) ?? 10;

    // [Role-Based Targeting] targetId, targetRole, 또는 전체 범위 공격
    let targetIds: string[] = [];
    // targetId에 공백만 있으면 무시 (trim 처리)
    let targetId = ((params.targetId as string) ?? "").trim() || undefined;
    const targetRole = params.targetRole as string | undefined;

    // targetId가 입력되었지만 실제 존재하지 않는 경우 (사용자 오타 방지)
    if (targetId) {
        const targetObj = renderer.getGameObject?.(targetId);
        if (!targetObj) {
            targetId = undefined; // ID로 못 찾으면 역할 기반 검색으로 폴백
        }
    }

    if (targetId) {
        // 특정 ID 지정
        targetIds = [targetId];
    } else if (targetRole) {
        // 역할로 필터링
        const gameCore = ctx.globals?.gameCore;
        if (gameCore?.getEntitiesByRole) {
            const roleEntities = gameCore.getEntitiesByRole(targetRole);
            targetIds = roleEntities.map(e => e.id);
        }
    } else {
        // 전체 엔티티 대상
        targetIds = renderer.getAllEntityIds?.() || [];
    }

    let hitSomething = false;

    for (const id of targetIds) {
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

                // [Fix] 사망한 타겟은 공격 대상 제외
                if (!statusModule.isAlive) continue;

                if (typeof statusModule.takeDamage === 'function') {
                    const actualDamage = statusModule.takeDamage(damage);

                    hitSomething = true;

                    // DAMAGE_DEALT 이벤트 발행
                    const screenPos = renderer.worldToScreen?.(targetObj.x, targetObj.y - 40, 0) ?? { x: targetObj.x, y: targetObj.y - 40 };
                    EventBus.emit("DAMAGE_DEALT", {
                        x: screenPos.x,
                        y: screenPos.y,
                        damage: actualDamage,
                        isCritical: false,
                        targetId: id
                    });
                }
            }

            // 이벤트도 발행
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

    // [Module First] CombatModule.projectileSpeed 우선, params.speed는 폴백
    const attackerRuntime = getRuntimeEntity(ownerId);
    const combatModule = attackerRuntime?.modules?.Combat as any;
    const speed = combatModule?.projectileSpeed ?? (params.speed as number) ?? 300;

    // [Module First] StatusModule.attack 우선, params.damage는 폴백
    const statusModule = attackerRuntime?.modules?.Status as any;
    const damage = statusModule?.attack ?? (params.damage as number) ?? 10;

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
    const entity = ctx.globals?.entities?.get(ctx.entityId);
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
    const renderer = ctx.globals?.renderer;
    if (!renderer) return;

    const entityId = ctx.entityId;
    const gameObject = renderer.getGameObject?.(entityId);
    if (!gameObject) return;

    const speed = (params.speed as number) ?? 90; // deg/sec
    const dt = 0.016;

    if (gameObject.rotation !== undefined) {
        gameObject.rotation += Phaser.Math.DegToRad(speed * dt);
    }

    // EditorCore 동기화
    const entity = ctx.globals?.entities?.get(entityId);
    if (entity && gameObject.rotation !== undefined) {
        entity.rotation += Phaser.Math.DegToRad(speed * dt);
        gameObject.rotation = entity.rotation;
    }
});

ActionRegistry.register("Pulse", (ctx: ActionContext, params: Record<string, unknown>) => {
    const renderer = ctx.globals?.renderer;
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

    gameObject.setScale?.(scale);

    const entity = ctx.globals?.entities?.get(entityId);
    if (entity) {
        entity.scaleX = scale;
        entity.scaleY = scale;
    }
});

ActionRegistry.register("ClearSignal", (ctx: ActionContext, params: Record<string, unknown>) => {
    const key = params.key as string;
    if (!key) return;
    if (!ctx.entityContext?.signals) return;
    ctx.entityContext.signals.flags[key] = false;
    ctx.entityContext.signals.values[key] = null;
});

console.log("[DefaultActions] 13 actions registered: Move, Jump, MoveToward, ChaseTarget, Attack, FireProjectile, TakeDamage, Heal, SetVar, Enable, ChangeScene, ClearSignal");

