/**
 * SpawnerSystem - 웨이브/스폰 시스템
 * 
 * 디펜스, 탄막 등에서 사용하는 스폰 시스템
 * - 웨이브 기반 적 스폰
 * - 시간 기반 스폰
 * - 템플릿 기반 엔티티 생성
 */

import { EventBus } from "./events/EventBus";

// ============================================================
// 타입 정의
// ============================================================

/** 스폰 포인트 */
export interface SpawnPoint {
    id: string;
    x: number;
    y: number;
    rotation?: number;
}

/** 적 템플릿 */
export interface EnemyTemplate {
    templateId: string;
    name: string;
    hp: number;
    damage: number;
    speed: number;
    spriteKey?: string;
    aiConfig?: {
        behavior: string;
        detectRange: number;
        attackRange: number;
        attackInterval: number;
    };
}

/** 웨이브 적 설정 */
export interface WaveEnemy {
    templateId: string;
    count: number;
    spawnDelay: number;     // 각 적 사이 딜레이 (ms)
    spawnPointId?: string;  // 특정 스폰 포인트 (생략시 랜덤)
}

/** 웨이브 설정 */
export interface Wave {
    waveNumber: number;
    enemies: WaveEnemy[];
    startDelay: number;     // 웨이브 시작 전 딜레이 (ms)
    completionBonus?: number; // 클리어 보상
}

/** 스포너 상태 */
export interface SpawnerState {
    currentWave: number;
    totalWaves: number;
    isActive: boolean;
    isPaused: boolean;
    enemiesSpawned: number;
    enemiesKilled: number;
    enemiesRemaining: number;
}

/** 스폰 결과 */
export interface SpawnResult {
    entityId: string;
    templateId: string;
    x: number;
    y: number;
}

// ============================================================
// SpawnerSystem 클래스
// ============================================================

export class SpawnerSystem {
    // 스폰 포인트
    private spawnPoints: Map<string, SpawnPoint> = new Map();

    // 적 템플릿
    private templates: Map<string, EnemyTemplate> = new Map();

    // 웨이브 데이터
    private waves: Wave[] = [];

    // 현재 상태
    private currentWaveIndex = 0;
    private isRunning = false;
    private isPaused = false;

    // 스폰 대기열
    private spawnQueue: { template: EnemyTemplate; point: SpawnPoint; time: number }[] = [];
    private waveStartTime = 0;

    // 통계
    private enemiesSpawned = 0;
    private enemiesKilled = 0;
    private activeEnemies = new Set<string>();

    // ID 카운터
    private idCounter = 0;

    // 외부 생성 콜백
    public onSpawn?: (result: SpawnResult, template: EnemyTemplate) => void;

    /**
     * 스폰 포인트 등록
     */
    addSpawnPoint(point: SpawnPoint): void {
        this.spawnPoints.set(point.id, point);
    }

    /**
     * 스폰 포인트 제거
     */
    removeSpawnPoint(id: string): void {
        this.spawnPoints.delete(id);
    }

    /**
     * 템플릿 등록
     */
    registerTemplate(template: EnemyTemplate): void {
        this.templates.set(template.templateId, template);
    }

    /**
     * 웨이브 설정
     */
    setWaves(waves: Wave[]): void {
        this.waves = waves.sort((a, b) => a.waveNumber - b.waveNumber);
    }

    /**
     * 웨이브 시작
     */
    startWaves(): void {
        if (this.waves.length === 0) {
            console.warn("[SpawnerSystem] No waves configured");
            return;
        }

        this.currentWaveIndex = 0;
        this.isRunning = true;
        this.isPaused = false;
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        this.activeEnemies.clear();
        this.spawnQueue = [];

        this.startWave(0);

        EventBus.emit("WAVES_STARTED", { totalWaves: this.waves.length });
    }

    /**
     * 특정 웨이브 시작
     */
    private startWave(index: number): void {
        if (index >= this.waves.length) {
            this.completeAllWaves();
            return;
        }

        const wave = this.waves[index];
        this.waveStartTime = Date.now() + wave.startDelay;

        EventBus.emit("WAVE_STARTING", {
            waveNumber: wave.waveNumber,
            totalEnemies: wave.enemies.reduce((sum, e) => sum + e.count, 0),
            startDelay: wave.startDelay
        });

        // 스폰 대기열 생성
        let totalDelay = wave.startDelay;

        for (const enemyConfig of wave.enemies) {
            const template = this.templates.get(enemyConfig.templateId);
            if (!template) {
                console.warn(`[SpawnerSystem] Template not found: ${enemyConfig.templateId}`);
                continue;
            }

            for (let i = 0; i < enemyConfig.count; i++) {
                const point = this.getSpawnPoint(enemyConfig.spawnPointId);
                if (!point) continue;

                this.spawnQueue.push({
                    template,
                    point,
                    time: Date.now() + totalDelay + i * enemyConfig.spawnDelay
                });
            }

            totalDelay += enemyConfig.count * enemyConfig.spawnDelay;
        }
    }

    /**
     * 스폰 포인트 가져오기
     */
    private getSpawnPoint(specificId?: string): SpawnPoint | null {
        if (specificId) {
            return this.spawnPoints.get(specificId) ?? null;
        }

        // 랜덤 선택
        const points = Array.from(this.spawnPoints.values());
        if (points.length === 0) return null;
        return points[Math.floor(Math.random() * points.length)];
    }

    /**
     * 업데이트 (매 프레임 호출)
     */
    update(): SpawnResult[] {
        if (!this.isRunning || this.isPaused) return [];

        const results: SpawnResult[] = [];
        const now = Date.now();

        // 대기열에서 스폰 시간 도달한 것들 처리
        const toSpawn = this.spawnQueue.filter(item => item.time <= now);
        this.spawnQueue = this.spawnQueue.filter(item => item.time > now);

        for (const item of toSpawn) {
            const entityId = `enemy_${++this.idCounter}`;

            const result: SpawnResult = {
                entityId,
                templateId: item.template.templateId,
                x: item.point.x,
                y: item.point.y
            };

            results.push(result);
            this.enemiesSpawned++;
            this.activeEnemies.add(entityId);

            // 외부 콜백 호출
            if (this.onSpawn) {
                this.onSpawn(result, item.template);
            }

            EventBus.emit("ENEMY_SPAWNED", {
                entityId,
                templateId: item.template.templateId,
                x: item.point.x,
                y: item.point.y,
                hp: item.template.hp
            });
        }

        // 웨이브 완료 체크
        if (this.spawnQueue.length === 0 && this.activeEnemies.size === 0) {
            this.completeWave();
        }

        return results;
    }

    /**
     * 적 처치 알림
     */
    onEnemyKilled(entityId: string): void {
        if (this.activeEnemies.has(entityId)) {
            this.activeEnemies.delete(entityId);
            this.enemiesKilled++;

            EventBus.emit("ENEMY_KILLED", {
                entityId,
                remaining: this.activeEnemies.size
            });
        }
    }

    /**
     * 웨이브 완료
     */
    private completeWave(): void {
        const wave = this.waves[this.currentWaveIndex];

        EventBus.emit("WAVE_COMPLETED", {
            waveNumber: wave.waveNumber,
            bonus: wave.completionBonus ?? 0
        });

        this.currentWaveIndex++;

        if (this.currentWaveIndex < this.waves.length) {
            this.startWave(this.currentWaveIndex);
        } else {
            this.completeAllWaves();
        }
    }

    /**
     * 전체 웨이브 완료
     */
    private completeAllWaves(): void {
        this.isRunning = false;

        EventBus.emit("ALL_WAVES_COMPLETED", {
            totalSpawned: this.enemiesSpawned,
            totalKilled: this.enemiesKilled
        });
    }

    /**
     * 일시정지
     */
    pause(): void {
        this.isPaused = true;
        EventBus.emit("WAVES_PAUSED", {});
    }

    /**
     * 재개
     */
    resume(): void {
        this.isPaused = false;
        EventBus.emit("WAVES_RESUMED", {});
    }

    /**
     * 중지
     */
    stop(): void {
        this.isRunning = false;
        this.isPaused = false;
        this.spawnQueue = [];
        EventBus.emit("WAVES_STOPPED", {});
    }

    /**
     * 현재 상태
     */
    getState(): SpawnerState {
        return {
            currentWave: this.currentWaveIndex + 1,
            totalWaves: this.waves.length,
            isActive: this.isRunning,
            isPaused: this.isPaused,
            enemiesSpawned: this.enemiesSpawned,
            enemiesKilled: this.enemiesKilled,
            enemiesRemaining: this.activeEnemies.size
        };
    }

    /**
     * 즉시 스폰 (웨이브 외)
     */
    spawnImmediate(templateId: string, x: number, y: number): SpawnResult | null {
        const template = this.templates.get(templateId);
        if (!template) return null;

        const entityId = `enemy_${++this.idCounter}`;

        const result: SpawnResult = {
            entityId,
            templateId,
            x,
            y
        };

        this.activeEnemies.add(entityId);

        if (this.onSpawn) {
            this.onSpawn(result, template);
        }

        EventBus.emit("ENEMY_SPAWNED", {
            entityId,
            templateId,
            x,
            y,
            hp: template.hp
        });

        return result;
    }

    /**
     * 초기화
     */
    clear(): void {
        this.spawnPoints.clear();
        this.templates.clear();
        this.waves = [];
        this.currentWaveIndex = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.spawnQueue = [];
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        this.activeEnemies.clear();
    }
}

// 싱글톤 인스턴스
export const spawnerSystem = new SpawnerSystem();
