/**
 * AISystem - 적 AI 시스템
 * 
 * 다양한 AI 행동 패턴 지원
 * - Chase: 플레이어 추적
 * - Patrol: 지점 간 순찰
 * - Attack: 사거리 내 공격
 * - Flee: 도주
 */

import { EventBus } from "./events/EventBus";

// ============================================================
// 타입 정의
// ============================================================

/** AI 행동 타입 */
export type AIBehavior =
    | "Idle"      // 대기
    | "Chase"     // 추적
    | "Patrol"    // 순찰
    | "Attack"    // 공격
    | "Flee"      // 도주
    | "Return";   // 원위치 복귀

/** AI 상태 */
export interface AIState {
    entityId: string;
    currentBehavior: AIBehavior;
    targetId: string | null;
    homeX: number;            // 원래 위치
    homeY: number;
    patrolPoints: { x: number; y: number }[];
    patrolIndex: number;
    patrolDirection: 1 | -1;  // 1: 정방향, -1: 역방향
    lastAttackTime: number;
    isAggro: boolean;         // 전투 상태
}

/** AI 설정 */
export interface AIConfig {
    behavior: AIBehavior;
    detectRange: number;      // 감지 범위
    attackRange: number;      // 공격 사거리
    loseAggroRange: number;   // 어그로 해제 거리
    moveSpeed: number;
    attackInterval: number;   // 공격 쿨다운 (ms)
    patrolPoints?: { x: number; y: number }[];
    patrolWaitTime?: number;  // 순찰 지점 대기 시간
}

/** AI 업데이트 결과 */
export interface AIUpdateResult {
    entityId: string;
    behavior: AIBehavior;
    moveX: number;            // 이동할 X 좌표
    moveY: number;            // 이동할 Y 좌표
    shouldAttack: boolean;
    targetId: string | null;
}

// ============================================================
// AISystem 클래스
// ============================================================

export class AISystem {
    private agents: Map<string, AIState> = new Map();
    private configs: Map<string, AIConfig> = new Map();

    /**
     * AI 에이전트 등록
     */
    register(
        entityId: string,
        x: number,
        y: number,
        config: AIConfig
    ): void {
        const state: AIState = {
            entityId,
            currentBehavior: config.behavior,
            targetId: null,
            homeX: x,
            homeY: y,
            patrolPoints: config.patrolPoints || [],
            patrolIndex: 0,
            patrolDirection: 1,
            lastAttackTime: 0,
            isAggro: false
        };

        this.agents.set(entityId, state);
        this.configs.set(entityId, config);
    }

    /**
     * AI 에이전트 해제
     */
    unregister(entityId: string): void {
        this.agents.delete(entityId);
        this.configs.delete(entityId);
    }

    /**
     * 거리 계산
     */
    private distance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    /**
     * 방향 벡터 계산 (정규화됨)
     */
    private direction(fromX: number, fromY: number, toX: number, toY: number): { x: number; y: number } {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len === 0) return { x: 0, y: 0 };
        return { x: dx / len, y: dy / len };
    }

    /**
     * 가장 가까운 타겟 찾기
     */
    findClosestTarget(
        entityId: string,
        entityX: number,
        entityY: number,
        targets: { id: string; x: number; y: number }[],
        maxRange: number
    ): { id: string; x: number; y: number; distance: number } | null {
        let closest: { id: string; x: number; y: number; distance: number } | null = null;

        for (const target of targets) {
            if (target.id === entityId) continue;

            const dist = this.distance(entityX, entityY, target.x, target.y);
            if (dist <= maxRange) {
                if (!closest || dist < closest.distance) {
                    closest = { ...target, distance: dist };
                }
            }
        }

        return closest;
    }

    /**
     * 단일 에이전트 업데이트
     */
    updateAgent(
        entityId: string,
        entityX: number,
        entityY: number,
        targets: { id: string; x: number; y: number }[],
        dt: number
    ): AIUpdateResult | null {
        const state = this.agents.get(entityId);
        const config = this.configs.get(entityId);
        if (!state || !config) return null;

        const result: AIUpdateResult = {
            entityId,
            behavior: state.currentBehavior,
            moveX: entityX,
            moveY: entityY,
            shouldAttack: false,
            targetId: state.targetId
        };

        const now = Date.now();

        // 타겟 감지
        const closestTarget = this.findClosestTarget(
            entityId, entityX, entityY, targets, config.detectRange
        );

        // 어그로 상태 업데이트
        if (closestTarget) {
            state.targetId = closestTarget.id;
            state.isAggro = true;
        } else if (state.targetId) {
            // 타겟이 범위를 벗어났는지 확인
            const target = targets.find(t => t.id === state.targetId);
            if (target) {
                const dist = this.distance(entityX, entityY, target.x, target.y);
                if (dist > config.loseAggroRange) {
                    state.targetId = null;
                    state.isAggro = false;
                }
            } else {
                state.targetId = null;
                state.isAggro = false;
            }
        }

        // 행동 결정
        if (state.isAggro && state.targetId) {
            const target = targets.find(t => t.id === state.targetId);
            if (target) {
                const dist = this.distance(entityX, entityY, target.x, target.y);

                // 공격 범위 내
                if (dist <= config.attackRange) {
                    state.currentBehavior = "Attack";

                    // 공격 쿨다운 체크
                    if (now - state.lastAttackTime >= config.attackInterval) {
                        result.shouldAttack = true;
                        state.lastAttackTime = now;

                        EventBus.emit("AI_ATTACK", {
                            attackerId: entityId,
                            targetId: target.id,
                            x: entityX,
                            y: entityY
                        });
                    }
                } else {
                    // 추적
                    state.currentBehavior = "Chase";
                    const dir = this.direction(entityX, entityY, target.x, target.y);
                    result.moveX = entityX + dir.x * config.moveSpeed * dt;
                    result.moveY = entityY + dir.y * config.moveSpeed * dt;
                }
            }
        } else {
            // 비전투 상태
            switch (config.behavior) {
                case "Patrol":
                    state.currentBehavior = "Patrol";
                    result.moveX = entityX;
                    result.moveY = entityY;

                    if (state.patrolPoints.length > 0) {
                        const targetPoint = state.patrolPoints[state.patrolIndex];
                        const dist = this.distance(entityX, entityY, targetPoint.x, targetPoint.y);

                        if (dist < 5) {
                            // 다음 순찰 지점으로
                            state.patrolIndex += state.patrolDirection;
                            if (state.patrolIndex >= state.patrolPoints.length) {
                                state.patrolIndex = state.patrolPoints.length - 2;
                                state.patrolDirection = -1;
                            } else if (state.patrolIndex < 0) {
                                state.patrolIndex = 1;
                                state.patrolDirection = 1;
                            }
                        } else {
                            const dir = this.direction(entityX, entityY, targetPoint.x, targetPoint.y);
                            result.moveX = entityX + dir.x * config.moveSpeed * dt;
                            result.moveY = entityY + dir.y * config.moveSpeed * dt;
                        }
                    }
                    break;

                case "Return":
                    // 원위치로 복귀
                    const homeDist = this.distance(entityX, entityY, state.homeX, state.homeY);
                    if (homeDist > 5) {
                        const dir = this.direction(entityX, entityY, state.homeX, state.homeY);
                        result.moveX = entityX + dir.x * config.moveSpeed * dt;
                        result.moveY = entityY + dir.y * config.moveSpeed * dt;
                    } else {
                        state.currentBehavior = config.behavior;
                    }
                    break;

                case "Idle":
                default:
                    state.currentBehavior = "Idle";
                    break;
            }
        }

        result.behavior = state.currentBehavior;
        result.targetId = state.targetId;

        return result;
    }

    /**
     * 모든 에이전트 업데이트
     */
    update(
        entities: Map<string, { x: number; y: number }>,
        targets: { id: string; x: number; y: number }[],
        dt: number
    ): AIUpdateResult[] {
        const results: AIUpdateResult[] = [];

        for (const [entityId, state] of this.agents) {
            const entity = entities.get(entityId);
            if (!entity) continue;

            const result = this.updateAgent(entityId, entity.x, entity.y, targets, dt);
            if (result) {
                results.push(result);
            }
        }

        return results;
    }

    /**
     * 특정 에이전트 상태 가져오기
     */
    getState(entityId: string): AIState | undefined {
        return this.agents.get(entityId);
    }

    /**
     * 어그로 강제 설정
     */
    setAggro(entityId: string, targetId: string | null): void {
        const state = this.agents.get(entityId);
        if (state) {
            state.targetId = targetId;
            state.isAggro = targetId !== null;
        }
    }

    /**
     * 모든 에이전트 초기화
     */
    clear(): void {
        this.agents.clear();
        this.configs.clear();
    }
}

// 싱글톤 인스턴스
export const aiSystem = new AISystem();
