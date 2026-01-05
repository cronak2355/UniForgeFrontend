/**
 * CombatModule - 전투 및 투사체 관리 모듈
 * 
 * 사거리 체크, 공격 주기, 투사체 생성 신호를 관리합니다.
 * 
 * 지원 장르:
 * - RPG: 근접/원거리 공격
 * - 디펜스: 타워 공격
 * - 탄막: 탄막 패턴 생성
 * - 횡스크롤: 슈팅
 * 
 * Unity 호환: serialize() 메서드로 C# 구조와 1:1 매핑
 */

import type { IModule, Vector3 } from "./IModule";
import { Vec3, serializeForUnity } from "./IModule";

/**
 * 공격 타입
 */
export type AttackType = "Melee" | "Ranged" | "Area" | "Beam";

/**
 * 타겟팅 모드
 */
export type TargetingMode =
    | "Nearest"     // 가장 가까운 적
    | "Farthest"    // 가장 먼 적
    | "LowestHp"    // HP가 가장 낮은 적
    | "HighestHp"   // HP가 가장 높은 적
    | "First"       // 경로에서 가장 앞선 적 (디펜스)
    | "Manual";     // 수동 타겟팅

/**
 * 투사체 생성 신호 (렌더러로 전달)
 */
export interface ProjectileSpawnSignal {
    /** 투사체 ID */
    id: string;
    /** 발사자 ID */
    fromId: string;
    /** 타겟 ID */
    targetId: string | null;
    /** 시작 위치 */
    position: Vector3;
    /** 방향 (정규화) */
    direction: Vector3;
    /** 속도 */
    speed: number;
    /** 투사체 타입 */
    type: string;
    /** 피해량 */
    damage: number;
    /** 관통 횟수 (0이면 단일 타겟) */
    pierceCount: number;
    /** 폭발 범위 (0이면 단일 타겟) */
    explosionRadius: number;
}

/**
 * 탄막 패턴 타입
 */
export type BulletPattern =
    | "Single"      // 단발
    | "Spread"      // 부채꼴
    | "Circle"      // 원형
    | "Spiral"      // 나선형
    | "Aimed";      // 조준

/**
 * 전투 데이터 인터페이스
 */
export interface CombatData {
    /** 공격 타입 */
    attackType: AttackType;
    /** 사거리 */
    attackRange: number;
    /** 공격 주기 (초) */
    attackInterval: number;
    /** 마지막 공격 시간 */
    lastAttackTime: number;
    /** 기본 피해량 */
    damage: number;
    /** 크리티컬 확률 (0~1) */
    criticalChance: number;
    /** 크리티컬 배율 */
    criticalMultiplier: number;
    /** 투사체 속도 */
    projectileSpeed: number;
    /** 투사체 타입 (텍스처/프리팹 키) */
    projectileType: string;
    /** 관통 횟수 */
    pierceCount: number;
    /** 폭발 범위 */
    explosionRadius: number;
    /** 현재 타겟 ID */
    targetId: string | null;
    /** 타겟팅 모드 */
    targetingMode: TargetingMode;
    /** 자동 공격 여부 */
    autoAttack: boolean;

    // ===== 탄막 패턴 =====
    /** 탄막 패턴 */
    bulletPattern: BulletPattern;
    /** 탄막 수 (Spread/Circle) */
    bulletCount: number;
    /** 탄막 각도 (Spread) */
    spreadAngle: number;
    /** 나선 속도 (Spiral) */
    spiralSpeed: number;
}

/**
 * 전투 이벤트 타입
 */
export type CombatEventType =
    | "attack"        // 공격 실행
    | "hit"           // 명중
    | "critical"      // 크리티컬
    | "kill"          // 처치
    | "projectile";   // 투사체 생성

/**
 * 전투 이벤트 콜백
 */
export type CombatCallback = (
    event: CombatEventType,
    data: {
        targetId?: string;
        damage?: number;
        projectile?: ProjectileSpawnSignal;
    }
) => void;

/**
 * 타겟 정보 (외부에서 제공)
 */
export interface TargetInfo {
    id: string;
    position: Vector3;
    hp?: number;
    pathProgress?: number;  // 디펜스용 경로 진행도
}

/**
 * CombatModule 클래스
 * 
 * 게임 엔티티의 전투를 관리하는 모듈입니다.
 * 엔진 독립적으로 설계되어 투사체 렌더링은 IRenderer가 담당합니다.
 */
export class CombatModule implements IModule {
    readonly type = "Combat";
    readonly id: string;

    private data: CombatData;

    /** 현재 위치 (외부에서 주입) */
    public position: Vector3 = Vec3.zero();

    /** 전투 이벤트 콜백 */
    onEvent?: CombatCallback;

    /** 투사체 생성 콜백 (렌더러로 전달) */
    onSpawnProjectile?: (signal: ProjectileSpawnSignal) => void;

    /** 현재 게임 시간 */
    private gameTime = 0;

    /** 투사체 ID 카운터 */
    private projectileIdCounter = 0;

    constructor(id: string, initialData: Partial<CombatData> = {}) {
        this.id = id;

        this.data = {
            attackType: initialData.attackType ?? "Ranged",
            attackRange: initialData.attackRange ?? 100,
            attackInterval: initialData.attackInterval ?? 1,
            lastAttackTime: initialData.lastAttackTime ?? 0,
            damage: initialData.damage ?? 10,
            criticalChance: initialData.criticalChance ?? 0.1,
            criticalMultiplier: initialData.criticalMultiplier ?? 2,
            projectileSpeed: initialData.projectileSpeed ?? 300,
            projectileType: initialData.projectileType ?? "default",
            pierceCount: initialData.pierceCount ?? 0,
            explosionRadius: initialData.explosionRadius ?? 0,
            targetId: initialData.targetId ?? null,
            targetingMode: initialData.targetingMode ?? "Nearest",
            autoAttack: initialData.autoAttack ?? true,
            bulletPattern: initialData.bulletPattern ?? "Single",
            bulletCount: initialData.bulletCount ?? 1,
            spreadAngle: initialData.spreadAngle ?? 30,
            spiralSpeed: initialData.spiralSpeed ?? 90,
        };
    }

    // ===== Getters =====

    get attackRange(): number { return this.data.attackRange; }
    get attackInterval(): number { return this.data.attackInterval; }
    get damage(): number { return this.data.damage; }
    get targetId(): string | null { return this.data.targetId; }

    /** 공격 가능 여부 */
    get canAttack(): boolean {
        return this.gameTime - this.data.lastAttackTime >= this.data.attackInterval;
    }

    // ===== 타겟팅 =====

    /**
     * 수동 타겟 설정
     */
    setTarget(targetId: string | null): void {
        this.data.targetId = targetId;
    }

    /**
     * 사거리 내 타겟 찾기
     * @param targets 후보 타겟 목록
     * @returns 선택된 타겟 ID
     */
    findTarget(targets: TargetInfo[]): string | null {
        if (targets.length === 0) return null;

        // 사거리 내 타겟 필터링
        const inRange = targets.filter(t =>
            Vec3.distance(this.position, t.position) <= this.data.attackRange
        );

        if (inRange.length === 0) return null;

        // 타겟팅 모드에 따라 선택
        switch (this.data.targetingMode) {
            case "Nearest":
                return this.findNearest(inRange);
            case "Farthest":
                return this.findFarthest(inRange);
            case "LowestHp":
                return this.findLowestHp(inRange);
            case "HighestHp":
                return this.findHighestHp(inRange);
            case "First":
                return this.findFirst(inRange);
            case "Manual":
                return this.data.targetId;
            default:
                return inRange[0]?.id ?? null;
        }
    }

    private findNearest(targets: TargetInfo[]): string | null {
        let nearest: TargetInfo | null = null;
        let minDist = Infinity;

        for (const t of targets) {
            const dist = Vec3.distance(this.position, t.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = t;
            }
        }

        return nearest?.id ?? null;
    }

    private findFarthest(targets: TargetInfo[]): string | null {
        let farthest: TargetInfo | null = null;
        let maxDist = -Infinity;

        for (const t of targets) {
            const dist = Vec3.distance(this.position, t.position);
            if (dist > maxDist) {
                maxDist = dist;
                farthest = t;
            }
        }

        return farthest?.id ?? null;
    }

    private findLowestHp(targets: TargetInfo[]): string | null {
        let lowest: TargetInfo | null = null;
        let minHp = Infinity;

        for (const t of targets) {
            if (t.hp !== undefined && t.hp < minHp) {
                minHp = t.hp;
                lowest = t;
            }
        }

        return lowest?.id ?? targets[0]?.id ?? null;
    }

    private findHighestHp(targets: TargetInfo[]): string | null {
        let highest: TargetInfo | null = null;
        let maxHp = -Infinity;

        for (const t of targets) {
            if (t.hp !== undefined && t.hp > maxHp) {
                maxHp = t.hp;
                highest = t;
            }
        }

        return highest?.id ?? targets[0]?.id ?? null;
    }

    private findFirst(targets: TargetInfo[]): string | null {
        let first: TargetInfo | null = null;
        let maxProgress = -Infinity;

        for (const t of targets) {
            if (t.pathProgress !== undefined && t.pathProgress > maxProgress) {
                maxProgress = t.pathProgress;
                first = t;
            }
        }

        return first?.id ?? targets[0]?.id ?? null;
    }

    // ===== 공격 =====

    /**
     * 공격 실행
     * @param targetPosition 타겟 위치
     * @returns 생성된 투사체 신호 목록
     */
    attack(targetPosition: Vector3): ProjectileSpawnSignal[] {
        if (!this.canAttack) return [];

        this.data.lastAttackTime = this.gameTime;

        const signals = this.createProjectiles(targetPosition);

        for (const signal of signals) {
            this.onSpawnProjectile?.(signal);
            this.onEvent?.("projectile", { projectile: signal });
        }

        this.onEvent?.("attack", { targetId: this.data.targetId ?? undefined });

        return signals;
    }

    /**
     * 탄막 패턴에 따른 투사체 생성
     */
    private createProjectiles(targetPosition: Vector3): ProjectileSpawnSignal[] {
        const signals: ProjectileSpawnSignal[] = [];
        const baseDirection = Vec3.normalize(Vec3.sub(targetPosition, this.position));

        switch (this.data.bulletPattern) {
            case "Single":
                signals.push(this.createSingleProjectile(baseDirection));
                break;

            case "Spread":
                signals.push(...this.createSpreadProjectiles(baseDirection));
                break;

            case "Circle":
                signals.push(...this.createCircleProjectiles());
                break;

            case "Spiral":
                signals.push(this.createSpiralProjectile());
                break;

            case "Aimed":
                signals.push(this.createSingleProjectile(baseDirection));
                break;
        }

        return signals;
    }

    private createSingleProjectile(direction: Vector3): ProjectileSpawnSignal {
        return {
            id: `proj_${this.id}_${this.projectileIdCounter++}`,
            fromId: this.id,
            targetId: this.data.targetId,
            position: Vec3.clone(this.position),
            direction,
            speed: this.data.projectileSpeed,
            type: this.data.projectileType,
            damage: this.calculateDamage(),
            pierceCount: this.data.pierceCount,
            explosionRadius: this.data.explosionRadius,
        };
    }

    private createSpreadProjectiles(baseDirection: Vector3): ProjectileSpawnSignal[] {
        const signals: ProjectileSpawnSignal[] = [];
        const count = this.data.bulletCount;
        const totalAngle = this.data.spreadAngle * (Math.PI / 180);
        const startAngle = -totalAngle / 2;
        const angleStep = count > 1 ? totalAngle / (count - 1) : 0;

        for (let i = 0; i < count; i++) {
            const angle = startAngle + angleStep * i;
            const direction = this.rotateVector(baseDirection, angle);
            signals.push(this.createSingleProjectile(direction));
        }

        return signals;
    }

    private createCircleProjectiles(): ProjectileSpawnSignal[] {
        const signals: ProjectileSpawnSignal[] = [];
        const count = this.data.bulletCount;
        const angleStep = (Math.PI * 2) / count;

        for (let i = 0; i < count; i++) {
            const angle = angleStep * i;
            const direction = Vec3.create(Math.cos(angle), Math.sin(angle), 0);
            signals.push(this.createSingleProjectile(direction));
        }

        return signals;
    }

    private spiralAngle = 0;

    private createSpiralProjectile(): ProjectileSpawnSignal {
        const direction = Vec3.create(
            Math.cos(this.spiralAngle),
            Math.sin(this.spiralAngle),
            0
        );
        this.spiralAngle += this.data.spiralSpeed * (Math.PI / 180);
        return this.createSingleProjectile(direction);
    }

    /**
     * 벡터 회전 (2D, Z축 기준)
     */
    private rotateVector(v: Vector3, angle: number): Vector3 {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return Vec3.create(
            v.x * cos - v.y * sin,
            v.x * sin + v.y * cos,
            v.z
        );
    }

    /**
     * 피해량 계산 (크리티컬 포함)
     */
    private calculateDamage(): number {
        const isCritical = Math.random() < this.data.criticalChance;
        const damage = isCritical
            ? this.data.damage * this.data.criticalMultiplier
            : this.data.damage;

        if (isCritical) {
            this.onEvent?.("critical", { damage });
        }

        return Math.floor(damage);
    }

    // ===== 사거리 체크 =====

    /**
     * 타겟이 사거리 내에 있는지 확인
     */
    isInRange(targetPosition: Vector3): boolean {
        return Vec3.distance(this.position, targetPosition) <= this.data.attackRange;
    }

    // ===== IModule 구현 =====

    /**
     * 프레임 업데이트
     * @param dt 델타 타임 (초)
     */
    update(dt: number): void {
        this.gameTime += dt;

        // 자동 공격 처리는 외부에서 타겟 정보와 함께 수행
    }

    /**
     * 자동 공격 업데이트 (타겟 정보 필요)
     * @param targets 사용 가능한 타겟 목록
     */
    updateAutoAttack(targets: TargetInfo[]): ProjectileSpawnSignal[] {
        if (!this.data.autoAttack) return [];

        // 타겟 찾기
        const targetId = this.findTarget(targets);
        if (!targetId) return [];

        this.data.targetId = targetId;

        // 타겟 위치 가져오기
        const target = targets.find(t => t.id === targetId);
        if (!target) return [];

        // 공격
        return this.attack(target.position);
    }

    /**
     * Unity 호환 직렬화
     */
    serialize(): Record<string, unknown> {
        return serializeForUnity({
            type: this.type,
            id: this.id,
            attackType: this.data.attackType,
            attackRange: this.data.attackRange,
            attackInterval: this.data.attackInterval,
            damage: this.data.damage,
            criticalChance: this.data.criticalChance,
            criticalMultiplier: this.data.criticalMultiplier,
            projectileSpeed: this.data.projectileSpeed,
            projectileType: this.data.projectileType,
            pierceCount: this.data.pierceCount,
            explosionRadius: this.data.explosionRadius,
            targetingMode: this.data.targetingMode,
            autoAttack: this.data.autoAttack,
            bulletPattern: this.data.bulletPattern,
            bulletCount: this.data.bulletCount,
            spreadAngle: this.data.spreadAngle,
            spiralSpeed: this.data.spiralSpeed,
            position: this.position,
        });
    }

    /**
     * 역직렬화 (정적 팩토리)
     */
    static deserialize(data: Record<string, unknown>): CombatModule {
        const module = new CombatModule(data.Id as string ?? data.id as string, {
            attackType: (data.AttackType ?? data.attackType) as AttackType,
            attackRange: data.AttackRange as number ?? data.attackRange as number,
            attackInterval: data.AttackInterval as number ?? data.attackInterval as number,
            damage: data.Damage as number ?? data.damage as number,
            criticalChance: data.CriticalChance as number ?? data.criticalChance as number,
            criticalMultiplier: data.CriticalMultiplier as number ?? data.criticalMultiplier as number,
            projectileSpeed: data.ProjectileSpeed as number ?? data.projectileSpeed as number,
            projectileType: data.ProjectileType as string ?? data.projectileType as string,
            pierceCount: data.PierceCount as number ?? data.pierceCount as number,
            explosionRadius: data.ExplosionRadius as number ?? data.explosionRadius as number,
            targetingMode: (data.TargetingMode ?? data.targetingMode) as TargetingMode,
            autoAttack: data.AutoAttack as boolean ?? data.autoAttack as boolean,
            bulletPattern: (data.BulletPattern ?? data.bulletPattern) as BulletPattern,
            bulletCount: data.BulletCount as number ?? data.bulletCount as number,
            spreadAngle: data.SpreadAngle as number ?? data.spreadAngle as number,
            spiralSpeed: data.SpiralSpeed as number ?? data.spiralSpeed as number,
        });

        if (data.Position ?? data.position) {
            module.position = (data.Position ?? data.position) as Vector3;
        }

        return module;
    }

    /**
     * 리소스 정리
     */
    destroy(): void {
        this.onEvent = undefined;
        this.onSpawnProjectile = undefined;
    }
}
