/**
 * KineticModule - 이동 및 물리 관리 모듈
 * 
 * 이동과 물리 로직을 담당하며, 다양한 게임 장르에 맞는 모드를 제공합니다.
 * 
 * 지원 모드:
 * - TopDown: 8방향 자유 이동 (RPG, 탑다운 슈터)
 * - Platformer: 중력 + 점프 (플랫포머, 횡스크롤)
 * - Path: 경로 추적 이동 (디펜스 적, 탄막 패턴)
 * 
 * Unity 호환: serialize() 메서드로 C# 구조와 1:1 매핑
 */

import type { IModule, Vector3 } from "./IModule";
import { Vec3, serializeForUnity } from "./IModule";

/**
 * 이동 모드 타입
 */
export type KineticMode = "TopDown" | "Platformer" | "Path";

/**
 * 이동 데이터 인터페이스
 */
export interface KineticData {
    /** 이동 모드 */
    mode: KineticMode;
    /** 현재 속도 */
    velocity: Vector3;
    /** 가속도 */
    acceleration: Vector3;
    /** 최대 속도 */
    maxSpeed: number;
    /** 마찰력 (0~1, 속도 감쇠율) */
    friction: number;
    /** 질량 (물리 계산용) */
    mass: number;

    // ===== Platformer 전용 =====
    /** 중력 가속도 */
    gravity: number;
    /** 점프 힘 */
    jumpForce: number;
    /** 최대 점프 횟수 */
    maxJumps: number;
    /** 현재 점프 횟수 */
    currentJumps: number;
    /** 바닥 접촉 여부 */
    isGrounded: boolean;

    // ===== Path 전용 =====
    /** 경로 포인트 목록 */
    pathPoints: Vector3[];
    /** 현재 경로 인덱스 */
    currentPathIndex: number;
    /** 경로 이동 속도 */
    pathSpeed: number;
    /** 경로 반복 여부 */
    loopPath: boolean;
    /** 경로 완료 여부 */
    pathCompleted: boolean;
}

/**
 * 입력 방향 타입 (TopDown/Platformer용)
 */
export interface InputDirection {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
}

/**
 * KineticModule 클래스
 * 
 * 게임 엔티티의 이동과 물리를 관리하는 모듈입니다.
 * 엔진 독립적으로 설계되어 좌표 업데이트만 수행하고, 렌더링은 IRenderer가 담당합니다.
 */
export class KineticModule implements IModule {
    readonly type = "Kinetic";
    readonly id: string;

    private data: KineticData;

    /** 현재 위치 (외부에서 주입) */
    public position: Vector3 = Vec3.zero();

    /** 위치 변경 콜백 (렌더러에 전달) */
    onPositionChange?: (newPos: Vector3) => void;

    /** 경로 완료 콜백 */
    onPathComplete?: () => void;

    constructor(id: string, initialData: Partial<KineticData> = {}) {
        this.id = id;

        // 기본값으로 초기화
        this.data = {
            mode: initialData.mode ?? "TopDown",
            velocity: initialData.velocity ?? Vec3.zero(),
            acceleration: initialData.acceleration ?? Vec3.zero(),
            maxSpeed: initialData.maxSpeed ?? 200,
            friction: initialData.friction ?? 0.8,
            mass: initialData.mass ?? 1,

            // Platformer
            gravity: initialData.gravity ?? 980,
            jumpForce: initialData.jumpForce ?? 400,
            maxJumps: initialData.maxJumps ?? 1,
            currentJumps: initialData.currentJumps ?? 0,
            isGrounded: initialData.isGrounded ?? false,

            // Path
            pathPoints: initialData.pathPoints ?? [],
            currentPathIndex: initialData.currentPathIndex ?? 0,
            pathSpeed: initialData.pathSpeed ?? 100,
            loopPath: initialData.loopPath ?? false,
            pathCompleted: initialData.pathCompleted ?? false,
        };
    }

    // ===== Getters =====

    get mode(): KineticMode { return this.data.mode; }
    get velocity(): Vector3 { return this.data.velocity; }
    get isGrounded(): boolean { return this.data.isGrounded; }
    get pathCompleted(): boolean { return this.data.pathCompleted; }

    /** 현재 속력 (스칼라) */
    get speed(): number { return Vec3.magnitude(this.data.velocity); }

    // ===== 모드 설정 =====

    /**
     * 이동 모드 변경
     */
    setMode(mode: KineticMode): void {
        this.data.mode = mode;
        this.data.velocity = Vec3.zero();
        this.data.acceleration = Vec3.zero();

        if (mode === "Path") {
            this.data.currentPathIndex = 0;
            this.data.pathCompleted = false;
        }
    }

    // ===== TopDown 이동 =====

    /**
     * TopDown 8방향 이동 처리
     * @param input 입력 방향
     */
    processTopDownInput(input: InputDirection): void {
        if (this.data.mode !== "TopDown") return;

        const dir = Vec3.zero();

        if (input.up) dir.y -= 1;
        if (input.down) dir.y += 1;
        if (input.left) dir.x -= 1;
        if (input.right) dir.x += 1;

        // 정규화하여 대각선 이동 속도 일정하게
        const normalized = Vec3.normalize(dir);
        this.data.acceleration = Vec3.scale(normalized, this.data.maxSpeed * 5);
    }

    // ===== Platformer 이동 =====

    /**
     * Platformer 이동 처리
     * @param input 입력 방향
     */
    processPlatformerInput(input: InputDirection): void {
        if (this.data.mode !== "Platformer") return;

        // 수평 이동
        let accelX = 0;
        if (input.left) accelX -= this.data.maxSpeed * 5;
        if (input.right) accelX += this.data.maxSpeed * 5;

        this.data.acceleration.x = accelX;

        // 점프
        if (input.jump && this.canJump()) {
            this.jump();
        }
    }

    /**
     * 점프 가능 여부
     */
    canJump(): boolean {
        return this.data.isGrounded || this.data.currentJumps < this.data.maxJumps;
    }

    /**
     * 점프 실행
     */
    /**
     * 점프 실행
     * @param force 점프 힘 (없으면 기본값 사용)
     */
    jump(force?: number): void {
        if (!this.canJump()) return;

        this.data.velocity.y = -(force ?? this.data.jumpForce);
        this.data.isGrounded = false;
        this.data.currentJumps++;
    }

    /**
     * 바닥 착지 처리
     */
    land(groundY: number): void {
        this.position.y = groundY;
        this.data.velocity.y = 0;
        this.data.isGrounded = true;
        this.data.currentJumps = 0;
    }

    // ===== Path 이동 =====

    /**
     * 경로 설정
     */
    setPath(points: Vector3[], loop: boolean = false): void {
        this.data.pathPoints = points.map(p => Vec3.clone(p));
        this.data.currentPathIndex = 0;
        this.data.loopPath = loop;
        this.data.pathCompleted = false;
    }

    /**
     * 경로 추가
     */
    addPathPoint(point: Vector3): void {
        this.data.pathPoints.push(Vec3.clone(point));
    }

    /**
     * 경로 초기화
     */
    resetPath(): void {
        this.data.currentPathIndex = 0;
        this.data.pathCompleted = false;
    }

    // ===== 물리 업데이트 =====

    /**
     * 프레임 업데이트
     * @param dt 델타 타임 (초)
     */
    update(dt: number): void {
        switch (this.data.mode) {
            case "TopDown":
                this.updateTopDown(dt);
                break;
            case "Platformer":
                this.updatePlatformer(dt);
                break;
            case "Path":
                this.updatePath(dt);
                break;
        }
    }

    /**
     * TopDown 물리 업데이트
     */
    private updateTopDown(dt: number): void {
        // 가속도 적용
        this.data.velocity = Vec3.add(
            this.data.velocity,
            Vec3.scale(this.data.acceleration, dt)
        );

        // 최대 속도 제한
        const speed = Vec3.magnitude(this.data.velocity);
        if (speed > this.data.maxSpeed) {
            this.data.velocity = Vec3.scale(
                Vec3.normalize(this.data.velocity),
                this.data.maxSpeed
            );
        }

        // 마찰 적용
        this.data.velocity = Vec3.scale(this.data.velocity, this.data.friction);

        // 위치 업데이트
        this.position = Vec3.add(this.position, Vec3.scale(this.data.velocity, dt));

        // 가속도 초기화
        this.data.acceleration = Vec3.zero();

        this.notifyPositionChange();
    }

    /**
     * Platformer 물리 업데이트
     */
    private updatePlatformer(dt: number): void {
        // 중력 적용
        this.data.acceleration.y = this.data.gravity;

        // 가속도 적용
        this.data.velocity = Vec3.add(
            this.data.velocity,
            Vec3.scale(this.data.acceleration, dt)
        );

        // 수평 마찰
        this.data.velocity.x *= this.data.friction;

        // 최대 수평 속도 제한
        if (Math.abs(this.data.velocity.x) > this.data.maxSpeed) {
            this.data.velocity.x = Math.sign(this.data.velocity.x) * this.data.maxSpeed;
        }

        // 위치 업데이트
        this.position = Vec3.add(this.position, Vec3.scale(this.data.velocity, dt));

        // 가속도 초기화 (중력은 매 프레임 재적용)
        this.data.acceleration = Vec3.zero();

        this.notifyPositionChange();
    }

    /**
     * Path 이동 업데이트
     */
    private updatePath(dt: number): void {
        if (this.data.pathCompleted || this.data.pathPoints.length === 0) return;

        const target = this.data.pathPoints[this.data.currentPathIndex];
        const distance = Vec3.distance(this.position, target);
        const moveDistance = this.data.pathSpeed * dt;

        if (distance <= moveDistance) {
            // 목표 지점 도달
            this.position = Vec3.clone(target);
            this.data.currentPathIndex++;

            if (this.data.currentPathIndex >= this.data.pathPoints.length) {
                if (this.data.loopPath) {
                    this.data.currentPathIndex = 0;
                } else {
                    this.data.pathCompleted = true;
                    this.onPathComplete?.();
                }
            }
        } else {
            // 목표를 향해 이동
            const direction = Vec3.normalize(Vec3.sub(target, this.position));
            this.position = Vec3.add(
                this.position,
                Vec3.scale(direction, moveDistance)
            );
            this.data.velocity = Vec3.scale(direction, this.data.pathSpeed);
        }

        this.notifyPositionChange();
    }

    /**
     * 위치 변경 알림
     */
    private notifyPositionChange(): void {
        this.onPositionChange?.(this.position);
    }

    // ===== 외부 힘 적용 =====

    /**
     * 힘 적용 (F = ma)
     */
    applyForce(force: Vector3): void {
        const accel = Vec3.scale(force, 1 / this.data.mass);
        this.data.acceleration = Vec3.add(this.data.acceleration, accel);
    }

    /**
     * 충격 적용 (즉시 속도 변화)
     */
    applyImpulse(impulse: Vector3): void {
        const deltaV = Vec3.scale(impulse, 1 / this.data.mass);
        this.data.velocity = Vec3.add(this.data.velocity, deltaV);
    }

    /**
     * 정지
     */
    stop(): void {
        this.data.velocity = Vec3.zero();
        this.data.acceleration = Vec3.zero();
    }

    // ===== IModule 구현 =====

    /**
     * Unity 호환 직렬화
     */
    serialize(): Record<string, unknown> {
        return serializeForUnity({
            type: this.type,
            id: this.id,
            mode: this.data.mode,
            velocity: this.data.velocity,
            acceleration: this.data.acceleration,
            maxSpeed: this.data.maxSpeed,
            friction: this.data.friction,
            mass: this.data.mass,
            gravity: this.data.gravity,
            jumpForce: this.data.jumpForce,
            maxJumps: this.data.maxJumps,
            currentJumps: this.data.currentJumps,
            isGrounded: this.data.isGrounded,
            pathPoints: this.data.pathPoints,
            currentPathIndex: this.data.currentPathIndex,
            pathSpeed: this.data.pathSpeed,
            loopPath: this.data.loopPath,
            pathCompleted: this.data.pathCompleted,
            position: this.position,
        });
    }

    /**
     * 역직렬화 (정적 팩토리)
     */
    static deserialize(data: Record<string, unknown>): KineticModule {
        const module = new KineticModule(data.Id as string ?? data.id as string, {
            mode: (data.Mode ?? data.mode) as KineticMode,
            velocity: (data.Velocity ?? data.velocity) as Vector3,
            maxSpeed: data.MaxSpeed as number ?? data.maxSpeed as number,
            friction: data.Friction as number ?? data.friction as number,
            mass: data.Mass as number ?? data.mass as number,
            gravity: data.Gravity as number ?? data.gravity as number,
            jumpForce: data.JumpForce as number ?? data.jumpForce as number,
            maxJumps: data.MaxJumps as number ?? data.maxJumps as number,
            pathPoints: (data.PathPoints ?? data.pathPoints) as Vector3[],
            pathSpeed: data.PathSpeed as number ?? data.pathSpeed as number,
            loopPath: data.LoopPath as boolean ?? data.loopPath as boolean,
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
        this.onPositionChange = undefined;
        this.onPathComplete = undefined;
    }
}
