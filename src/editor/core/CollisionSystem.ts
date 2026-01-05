/**
 * CollisionSystem - AABB 충돌 감지 시스템
 * 
 * 모든 게임 장르에서 사용되는 핵심 충돌 시스템입니다.
 * - AABB (Axis-Aligned Bounding Box) 알고리즘 사용
 * - 태그 기반 필터링 지원
 * - Solid (차단) / Trigger (통과) 충돌 구분
 */

import { EventBus } from "./events/EventBus";

// ============================================================
// 타입 정의
// ============================================================

/** 충돌 태그 */
export type CollisionTag = "Player" | "Enemy" | "Bullet" | "Wall" | "Item" | "Trigger" | "NPC" | string;

/** 충돌 레이어 (비트마스크) */
export const CollisionLayer = {
    None: 0,
    Player: 1 << 0,    // 1
    Enemy: 1 << 1,     // 2
    Bullet: 1 << 2,    // 4
    Wall: 1 << 3,      // 8
    Item: 1 << 4,      // 16
    Trigger: 1 << 5,   // 32
    All: 0xFFFF
} as const;

export type CollisionLayer = (typeof CollisionLayer)[keyof typeof CollisionLayer];

/** AABB 바운딩 박스 */
export interface AABB {
    x: number;      // 중심 X
    y: number;      // 중심 Y
    width: number;  // 너비
    height: number; // 높이
}

/** 충돌체 정보 */
export interface Collider {
    entityId: string;
    tag: CollisionTag;
    layer: CollisionLayer;
    mask: CollisionLayer;   // 충돌 가능한 레이어
    isSolid: boolean;       // true: 물리 차단, false: 트리거만
    bounds: AABB;
}

/** 충돌 결과 */
export interface CollisionResult {
    entityA: string;
    entityB: string;
    tagA: CollisionTag;
    tagB: CollisionTag;
    overlapX: number;       // 겹침량 X
    overlapY: number;       // 겹침량 Y
    normalX: number;        // 충돌 방향 X (-1, 0, 1)
    normalY: number;        // 충돌 방향 Y
}

// ============================================================
// CollisionSystem 클래스
// ============================================================

export class CollisionSystem {
    private colliders: Map<string, Collider> = new Map();

    // 이전 프레임 충돌 쌍 (Enter/Exit 감지용)
    private previousCollisions: Set<string> = new Set();
    private currentCollisions: Set<string> = new Set();

    /**
     * 충돌체 등록
     */
    register(
        entityId: string,
        tag: CollisionTag,
        bounds: AABB,
        options: {
            layer?: CollisionLayer;
            mask?: CollisionLayer;
            isSolid?: boolean;
        } = {}
    ): void {
        const collider: Collider = {
            entityId,
            tag,
            layer: options.layer ?? CollisionLayer.All,
            mask: options.mask ?? CollisionLayer.All,
            isSolid: options.isSolid ?? true,
            bounds
        };
        this.colliders.set(entityId, collider);
    }

    /**
     * 충돌체 해제
     */
    unregister(entityId: string): void {
        this.colliders.delete(entityId);
    }

    /**
     * 충돌체 위치 업데이트
     */
    updatePosition(entityId: string, x: number, y: number): void {
        const collider = this.colliders.get(entityId);
        if (collider) {
            collider.bounds.x = x;
            collider.bounds.y = y;
        }
    }

    /**
     * 충돌체 크기 업데이트
     */
    updateSize(entityId: string, width: number, height: number): void {
        const collider = this.colliders.get(entityId);
        if (collider) {
            collider.bounds.width = width;
            collider.bounds.height = height;
        }
    }

    /**
     * AABB 충돌 검사
     */
    private checkAABB(a: AABB, b: AABB): boolean {
        const halfWidthA = a.width / 2;
        const halfHeightA = a.height / 2;
        const halfWidthB = b.width / 2;
        const halfHeightB = b.height / 2;

        return (
            a.x - halfWidthA < b.x + halfWidthB &&
            a.x + halfWidthA > b.x - halfWidthB &&
            a.y - halfHeightA < b.y + halfHeightB &&
            a.y + halfHeightA > b.y - halfHeightB
        );
    }

    /**
     * 겹침량 계산
     */
    private calculateOverlap(a: AABB, b: AABB): { overlapX: number; overlapY: number } {
        const halfWidthA = a.width / 2;
        const halfHeightA = a.height / 2;
        const halfWidthB = b.width / 2;
        const halfHeightB = b.height / 2;

        const overlapX = Math.min(a.x + halfWidthA, b.x + halfWidthB) - Math.max(a.x - halfWidthA, b.x - halfWidthB);
        const overlapY = Math.min(a.y + halfHeightA, b.y + halfHeightB) - Math.max(a.y - halfHeightA, b.y - halfHeightB);

        return { overlapX: Math.max(0, overlapX), overlapY: Math.max(0, overlapY) };
    }

    /**
     * 레이어 마스크 충돌 가능 여부
     */
    private canCollide(a: Collider, b: Collider): boolean {
        return (a.layer & b.mask) !== 0 && (b.layer & a.mask) !== 0;
    }

    /**
     * 전체 충돌 검사 (매 프레임 호출)
     */
    update(): CollisionResult[] {
        const results: CollisionResult[] = [];
        this.currentCollisions.clear();

        const colliderArray = Array.from(this.colliders.values());
        const count = colliderArray.length;

        // O(n²) 브루트포스 - 소규모 게임에 적합
        // TODO: 대규모 시 쿼드트리 또는 공간 해싱 도입
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const a = colliderArray[i];
                const b = colliderArray[j];

                // 레이어 마스크 체크
                if (!this.canCollide(a, b)) continue;

                // AABB 충돌 검사
                if (this.checkAABB(a.bounds, b.bounds)) {
                    const { overlapX, overlapY } = this.calculateOverlap(a.bounds, b.bounds);

                    // 충돌 방향 (A 기준)
                    const normalX = a.bounds.x < b.bounds.x ? -1 : 1;
                    const normalY = a.bounds.y < b.bounds.y ? -1 : 1;

                    const result: CollisionResult = {
                        entityA: a.entityId,
                        entityB: b.entityId,
                        tagA: a.tag,
                        tagB: b.tag,
                        overlapX,
                        overlapY,
                        normalX,
                        normalY
                    };

                    results.push(result);

                    // 충돌 쌍 키 생성
                    const pairKey = this.makePairKey(a.entityId, b.entityId);
                    this.currentCollisions.add(pairKey);

                    // Enter/Stay 이벤트
                    if (!this.previousCollisions.has(pairKey)) {
                        EventBus.emit("COLLISION_ENTER", result as unknown as Record<string, unknown>);
                    } else {
                        EventBus.emit("COLLISION_STAY", result as unknown as Record<string, unknown>);
                    }
                }
            }
        }

        // Exit 이벤트 (이전 프레임에는 있었지만 현재는 없는 충돌)
        for (const pairKey of this.previousCollisions) {
            if (!this.currentCollisions.has(pairKey)) {
                const [entityA, entityB] = pairKey.split("|");
                EventBus.emit("COLLISION_EXIT", { entityA, entityB });
            }
        }

        // 다음 프레임을 위해 저장
        this.previousCollisions = new Set(this.currentCollisions);

        return results;
    }

    /**
     * 특정 엔티티와 충돌 중인 모든 엔티티 반환
     */
    getCollisions(entityId: string, filterTag?: CollisionTag): string[] {
        const result: string[] = [];
        const collider = this.colliders.get(entityId);
        if (!collider) return result;

        for (const other of this.colliders.values()) {
            if (other.entityId === entityId) continue;
            if (filterTag && other.tag !== filterTag) continue;
            if (!this.canCollide(collider, other)) continue;

            if (this.checkAABB(collider.bounds, other.bounds)) {
                result.push(other.entityId);
            }
        }

        return result;
    }

    /**
     * 특정 태그의 Solid 충돌체와 충돌 시 밀어내기 벡터 계산
     */
    resolveCollision(
        entityId: string,
        targetX: number,
        targetY: number
    ): { x: number; y: number; blocked: boolean } {
        const collider = this.colliders.get(entityId);
        if (!collider) return { x: targetX, y: targetY, blocked: false };

        // 원래 위치 저장
        const originalX = collider.bounds.x;
        const originalY = collider.bounds.y;

        // 작업용 위치 (각 충돌 후 업데이트됨)
        let workX = targetX;
        let workY = targetY;
        let blocked = false;

        // 최대 반복 횟수 (무한 루프 방지)
        const maxIterations = 4;

        for (let iteration = 0; iteration < maxIterations; iteration++) {
            collider.bounds.x = workX;
            collider.bounds.y = workY;
            let hadCollision = false;

            for (const other of this.colliders.values()) {
                if (other.entityId === entityId) continue;
                if (!other.isSolid) continue;
                if (!this.canCollide(collider, other)) continue;

                if (this.checkAABB(collider.bounds, other.bounds)) {
                    const { overlapX, overlapY } = this.calculateOverlap(collider.bounds, other.bounds);

                    // 더 작은 겹침 방향으로 밀어내기
                    if (overlapX < overlapY) {
                        workX += collider.bounds.x < other.bounds.x ? -overlapX : overlapX;
                    } else {
                        workY += collider.bounds.y < other.bounds.y ? -overlapY : overlapY;
                    }
                    blocked = true;
                    hadCollision = true;

                    // 위치 업데이트 후 다시 검사
                    collider.bounds.x = workX;
                    collider.bounds.y = workY;
                }
            }

            // 더 이상 충돌이 없으면 종료
            if (!hadCollision) break;
        }

        // 원래 위치 복원 (실제 이동은 호출자가 처리)
        collider.bounds.x = originalX;
        collider.bounds.y = originalY;

        return { x: workX, y: workY, blocked };
    }

    /**
     * 레이캐스트 (직선 충돌 검사)
     */
    raycast(
        originX: number,
        originY: number,
        directionX: number,
        directionY: number,
        distance: number,
        filterTag?: CollisionTag
    ): { entityId: string; distance: number } | null {
        // 단순화된 레이캐스트 (샘플링 기반)
        const steps = Math.ceil(distance / 4); // 4픽셀 간격
        const stepX = (directionX * distance) / steps;
        const stepY = (directionY * distance) / steps;

        for (let i = 1; i <= steps; i++) {
            const checkX = originX + stepX * i;
            const checkY = originY + stepY * i;

            for (const collider of this.colliders.values()) {
                if (filterTag && collider.tag !== filterTag) continue;

                const bounds = collider.bounds;
                const halfW = bounds.width / 2;
                const halfH = bounds.height / 2;

                if (
                    checkX >= bounds.x - halfW &&
                    checkX <= bounds.x + halfW &&
                    checkY >= bounds.y - halfH &&
                    checkY <= bounds.y + halfH
                ) {
                    const hitDistance = Math.sqrt(
                        (checkX - originX) ** 2 + (checkY - originY) ** 2
                    );
                    return { entityId: collider.entityId, distance: hitDistance };
                }
            }
        }

        return null;
    }

    /**
     * 바닥 감지 (플랫포머용)
     */
    isGrounded(entityId: string, groundTags: CollisionTag[] = ["Wall"]): boolean {
        const collider = this.colliders.get(entityId);
        if (!collider) return false;

        // 충돌체 아래쪽으로 1픽셀 체크
        const checkY = collider.bounds.y + collider.bounds.height / 2 + 1;

        for (const other of this.colliders.values()) {
            if (other.entityId === entityId) continue;
            if (!groundTags.includes(other.tag)) continue;
            if (!other.isSolid) continue;

            const otherBounds = other.bounds;
            const halfW = collider.bounds.width / 2;
            const otherHalfW = otherBounds.width / 2;
            const otherTop = otherBounds.y - otherBounds.height / 2;

            // X축 겹침 확인
            const xOverlap =
                collider.bounds.x + halfW > otherBounds.x - otherHalfW &&
                collider.bounds.x - halfW < otherBounds.x + otherHalfW;

            // Y축 바로 아래 확인
            if (xOverlap && Math.abs(checkY - otherTop) < 4) {
                return true;
            }
        }

        return false;
    }

    /**
     * 모든 충돌체 초기화
     */
    clear(): void {
        this.colliders.clear();
        this.previousCollisions.clear();
        this.currentCollisions.clear();
    }

    /**
     * 충돌 쌍 키 생성 (순서 무관)
     */
    private makePairKey(a: string, b: string): string {
        return a < b ? `${a}|${b}` : `${b}|${a}`;
    }
}

/**
 * CollisionSystem 인스턴스 생성 팩토리
 * 의존성 주입을 위해 사용
 */
export function createCollisionSystem(): CollisionSystem {
    return new CollisionSystem();
}

/**
 * @deprecated 의존성 주입을 위해 createCollisionSystem() 사용 권장
 * 하위 호환성을 위해 유지됨
 */
export const collisionSystem = new CollisionSystem();
