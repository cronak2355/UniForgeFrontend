/**
 * ProjectileSystem - 투사체/탄막 시스템
 * 
 * 탄막 게임 및 RPG/디펜스 투사체를 위한 고성능 시스템
 * - 오브젝트 풀링으로 GC 최소화
 * - 다양한 발사 패턴 지원
 * - 자동 수명 관리
 */

import { EventBus } from "./events/EventBus";
import { collisionSystem, type CollisionTag } from "./CollisionSystem";

// ============================================================
// 타입 정의
// ============================================================

/** 탄막 패턴 */
export type BulletPattern =
    | "Single"      // 단발
    | "Spread"      // 부채꼴
    | "Circle"      // 원형 (전방위)
    | "Spiral"      // 나선형
    | "Aimed"       // 플레이어 조준
    | "Random";     // 랜덤 방향

/** 투사체 데이터 */
export interface Projectile {
    id: string;
    ownerId: string;          // 발사한 엔티티 ID
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    speed: number;
    damage: number;
    radius: number;           // 충돌 반경
    lifetime: number;         // 남은 수명 (ms)
    maxLifetime: number;      // 최대 수명
    piercing: boolean;        // 관통 여부
    pierceCount: number;      // 남은 관통 횟수
    hitTargets: Set<string>;  // 이미 맞힌 대상
    tag: CollisionTag;        // 충돌 태그
    active: boolean;          // 활성 상태
    spriteKey?: string;       // 스프라이트 키
}

/** 스포너 설정 */
export interface SpawnerConfig {
    pattern: BulletPattern;
    bulletCount: number;      // 한 번에 발사할 탄 수
    angleSpread: number;      // 퍼짐 각도 (도)
    bulletSpeed: number;
    bulletDamage: number;
    bulletRadius: number;
    bulletLifetime: number;   // ms
    piercing: boolean;
    pierceCount: number;
    fireRate: number;         // 발사 간격 (ms)
    spriteKey?: string;
}

// ============================================================
// ProjectileSystem 클래스
// ============================================================

export class ProjectileSystem {
    // 활성 투사체
    private projectiles: Map<string, Projectile> = new Map();

    // 오브젝트 풀 (재사용)
    private pool: Projectile[] = [];
    private poolMaxSize = 500;

    // 스포너별 쿨다운
    private spawnerCooldowns: Map<string, number> = new Map();

    // ID 카운터
    private idCounter = 0;

    /**
     * 투사체 풀에서 가져오기 또는 새로 생성
     */
    private acquire(): Projectile {
        if (this.pool.length > 0) {
            const p = this.pool.pop()!;
            p.active = true;
            p.hitTargets.clear();
            return p;
        }

        return {
            id: "",
            ownerId: "",
            x: 0,
            y: 0,
            velocityX: 0,
            velocityY: 0,
            speed: 0,
            damage: 0,
            radius: 5,
            lifetime: 0,
            maxLifetime: 0,
            piercing: false,
            pierceCount: 0,
            hitTargets: new Set(),
            tag: "Bullet",
            active: true
        };
    }

    /**
     * 투사체 풀로 반환
     */
    private release(projectile: Projectile): void {
        projectile.active = false;
        if (this.pool.length < this.poolMaxSize) {
            this.pool.push(projectile);
        }
    }

    /**
     * 단일 투사체 발사
     */
    spawn(
        ownerId: string,
        x: number,
        y: number,
        directionX: number,
        directionY: number,
        config: Partial<SpawnerConfig>
    ): string {
        const p = this.acquire();
        p.id = `proj_${++this.idCounter}`;
        p.ownerId = ownerId;
        p.x = x;
        p.y = y;

        // 방향 정규화
        const len = Math.sqrt(directionX * directionX + directionY * directionY);
        const normX = len > 0 ? directionX / len : 1;
        const normY = len > 0 ? directionY / len : 0;

        const speed = config.bulletSpeed ?? 300;
        p.velocityX = normX * speed;
        p.velocityY = normY * speed;
        p.speed = speed;
        p.damage = config.bulletDamage ?? 10;
        p.radius = config.bulletRadius ?? 5;
        p.lifetime = config.bulletLifetime ?? 3000;
        p.maxLifetime = p.lifetime;
        p.piercing = config.piercing ?? false;
        p.pierceCount = config.pierceCount ?? 0;
        p.spriteKey = config.spriteKey;

        this.projectiles.set(p.id, p);

        // 충돌 시스템에 등록
        collisionSystem.register(p.id, "Bullet", {
            x: p.x,
            y: p.y,
            width: p.radius * 2,
            height: p.radius * 2
        }, { isSolid: false });

        EventBus.emit("PROJECTILE_SPAWNED", { id: p.id, x, y, ownerId });

        return p.id;
    }

    /**
     * 패턴 기반 발사 (탄막용)
     */
    spawnPattern(
        ownerId: string,
        x: number,
        y: number,
        targetX: number,
        targetY: number,
        config: SpawnerConfig
    ): string[] {
        const ids: string[] = [];
        const baseAngle = Math.atan2(targetY - y, targetX - x);

        switch (config.pattern) {
            case "Single":
                ids.push(this.spawn(ownerId, x, y, Math.cos(baseAngle), Math.sin(baseAngle), config));
                break;

            case "Spread": {
                const spreadRad = (config.angleSpread * Math.PI) / 180;
                const step = spreadRad / Math.max(1, config.bulletCount - 1);
                const startAngle = baseAngle - spreadRad / 2;

                for (let i = 0; i < config.bulletCount; i++) {
                    const angle = startAngle + step * i;
                    ids.push(this.spawn(ownerId, x, y, Math.cos(angle), Math.sin(angle), config));
                }
                break;
            }

            case "Circle": {
                const step = (Math.PI * 2) / config.bulletCount;
                for (let i = 0; i < config.bulletCount; i++) {
                    const angle = step * i;
                    ids.push(this.spawn(ownerId, x, y, Math.cos(angle), Math.sin(angle), config));
                }
                break;
            }

            case "Spiral": {
                // 나선형은 시간에 따라 각도 오프셋 증가
                const time = Date.now() / 1000;
                const spiralOffset = (time % 10) * Math.PI * 2;
                const step = (Math.PI * 2) / config.bulletCount;

                for (let i = 0; i < config.bulletCount; i++) {
                    const angle = step * i + spiralOffset;
                    ids.push(this.spawn(ownerId, x, y, Math.cos(angle), Math.sin(angle), config));
                }
                break;
            }

            case "Aimed":
                // 단순히 타겟 방향으로 발사
                ids.push(this.spawn(ownerId, x, y, Math.cos(baseAngle), Math.sin(baseAngle), config));
                break;

            case "Random": {
                for (let i = 0; i < config.bulletCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    ids.push(this.spawn(ownerId, x, y, Math.cos(angle), Math.sin(angle), config));
                }
                break;
            }
        }

        return ids;
    }

    /**
     * 스포너 발사 (쿨다운 포함)
     */
    fire(
        spawnerId: string,
        ownerId: string,
        x: number,
        y: number,
        targetX: number,
        targetY: number,
        config: SpawnerConfig
    ): string[] | null {
        const now = Date.now();
        const lastFire = this.spawnerCooldowns.get(spawnerId) ?? 0;

        if (now - lastFire < config.fireRate) {
            return null; // 쿨다운 중
        }

        this.spawnerCooldowns.set(spawnerId, now);
        return this.spawnPattern(ownerId, x, y, targetX, targetY, config);
    }

    /**
     * 투사체 업데이트 (매 프레임 호출)
     */
    update(dt: number): void {
        const toRemove: string[] = [];

        for (const [id, p] of this.projectiles) {
            if (!p.active) continue;

            // 이동
            p.x += p.velocityX * dt;
            p.y += p.velocityY * dt;

            // 충돌 시스템 위치 업데이트
            collisionSystem.updatePosition(id, p.x, p.y);

            // 수명 감소
            p.lifetime -= dt * 1000;

            // 수명 만료 체크
            if (p.lifetime <= 0) {
                toRemove.push(id);
                continue;
            }

            // 화면 밖 체크 (간단한 경계)
            if (p.x < -1000 || p.x > 3000 || p.y < -1000 || p.y > 3000) {
                toRemove.push(id);
                continue;
            }

            // 충돌 체크
            const hits = collisionSystem.getCollisions(id);
            for (const hitId of hits) {
                // 자신이 발사한 것과는 충돌 무시
                if (hitId === p.ownerId) continue;
                // 이미 맞힌 대상 무시
                if (p.hitTargets.has(hitId)) continue;

                p.hitTargets.add(hitId);

                EventBus.emit("PROJECTILE_HIT", {
                    projectileId: id,
                    targetId: hitId,
                    damage: p.damage,
                    x: p.x,
                    y: p.y
                });

                // 관통 처리
                if (p.piercing && p.pierceCount > 0) {
                    p.pierceCount--;
                } else if (!p.piercing) {
                    toRemove.push(id);
                    break;
                }

                // 관통 횟수 소진
                if (p.piercing && p.pierceCount <= 0) {
                    toRemove.push(id);
                    break;
                }
            }
        }

        // 투사체 제거
        for (const id of toRemove) {
            this.destroy(id);
        }
    }

    /**
     * 투사체 삭제
     */
    destroy(id: string): void {
        const p = this.projectiles.get(id);
        if (p) {
            collisionSystem.unregister(id);
            this.projectiles.delete(id);
            this.release(p);
            EventBus.emit("PROJECTILE_DESTROYED", { id });
        }
    }

    /**
     * 특정 소유자의 모든 투사체 삭제
     */
    destroyByOwner(ownerId: string): void {
        const toRemove: string[] = [];
        for (const [id, p] of this.projectiles) {
            if (p.ownerId === ownerId) {
                toRemove.push(id);
            }
        }
        for (const id of toRemove) {
            this.destroy(id);
        }
    }

    /**
     * 모든 투사체 삭제
     */
    clear(): void {
        for (const id of this.projectiles.keys()) {
            collisionSystem.unregister(id);
        }
        this.projectiles.clear();
        this.spawnerCooldowns.clear();
    }

    /**
     * 활성 투사체 수
     */
    getCount(): number {
        return this.projectiles.size;
    }

    /**
     * 모든 활성 투사체 반환 (렌더링용)
     */
    getAll(): Projectile[] {
        return Array.from(this.projectiles.values()).filter(p => p.active);
    }
}

// 싱글톤 인스턴스
export const projectileSystem = new ProjectileSystem();
