// src/editor/core/ParticleManager.ts
// Phaser 파티클 시스템 래퍼 - High Performance (Pooling)

import Phaser from 'phaser';
import { PARTICLE_CONFIGS, type ParticleConfig } from './ParticleConfigs';

/**
 * ParticleManager - Phaser 파티클 시스템 관리자
 * 
 * 성능 최적화:
 * - Emitter Pooling: 프리셋별로 단일 이미터를 생성하여 재사용
 * - World Space Lock: 이미터는 (0,0)에 고정, explode(x,y)로 파티클만 발사
 * - Pre-warming: 자주 쓰는 이펙트 미리 생성
 */
export class ParticleManager {
    private scene: Phaser.Scene;

    // 이미터 풀: PresetID -> Single Shared Emitter (One-Shot용)
    private sharedEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();

    // 지속 이펙트 관리 (개별 인스턴스)
    private activeContinuousEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();

    /** 등록된 커스텀 파티클 텍스처 ID 목록 */
    private customTextures: Set<string> = new Set();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        // 씬 시작 시 주요 이펙트 미리 생성 (Pre-warm)
        this.preWarmEmitters();
    }

    /**
     * 초기화 시점에 프리셋 이미터 미리 생성
     */
    private preWarmEmitters() {
        Object.keys(PARTICLE_CONFIGS).forEach(presetId => {
            const config = PARTICLE_CONFIGS[presetId];
            if (config.oneShot) {
                this.getOrCreateSharedEmitter(presetId);
            }
        });
    }

    /**
     * 공유 이미터 가져오기 또는 생성 (Lazy Loading)
     */
    private getOrCreateSharedEmitter(presetId: string): Phaser.GameObjects.Particles.ParticleEmitter | null {
        if (this.sharedEmitters.has(presetId)) {
            return this.sharedEmitters.get(presetId)!;
        }

        const config = PARTICLE_CONFIGS[presetId];
        if (!config) return null;

        const textureKey = `particle_${presetId}`;

        // 텍스처 존재 확인
        if (!this.scene.textures.exists(textureKey)) {
            // 경고는 최초 1회만 (또는 호출 시점에)
            console.warn(`[ParticleManager] Texture missing for preset '${presetId}' (key: ${textureKey})`);
            return null;
        }

        // 이미터 생성 (0,0 위치, emitting: false)
        const emitter = this.scene.add.particles(0, 0, textureKey, {
            ...config.phaserConfig,
            emitting: false
        });

        // 최상단 렌더링 보장
        emitter.setDepth(1000);

        this.sharedEmitters.set(presetId, emitter);
        return emitter;
    }

    /**
     * 커스텀 파티클 텍스처 등록 및 이미터 준비
     */
    registerCustomTexture(id: string, url: string): void {
        const textureKey = `particle_custom_${id}`;
        if (this.scene.textures.exists(textureKey)) {
            return;
        }

        this.scene.load.image(textureKey, url);
        this.scene.load.once('complete', () => {
            this.customTextures.add(id);
            console.log(`[ParticleManager] Custom texture registered: ${id}`);
            // 커스텀 이미터 즉시 생성 (Pre-warm)
            this.createCustomEmitter(id, textureKey);
        });
        this.scene.load.start();
    }

    /**
     * 커스텀 파티클용 이미터 생성
     */
    private createCustomEmitter(id: string, textureKey: string) {
        const presetId = `custom:${id}`;
        if (this.sharedEmitters.has(presetId)) return;

        // 커스텀 기본 설정
        const emitter = this.scene.add.particles(0, 0, textureKey, {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            blendMode: Phaser.BlendModes.ADD,
            emitting: false
        });

        emitter.setDepth(1000);
        this.sharedEmitters.set(presetId, emitter);
    }

    /**
     * 등록된 커스텀 텍스처 목록 반환
     */
    getCustomTextures(): string[] {
        return Array.from(this.customTextures);
    }

    /**
     * 커스텀 파티클 재생 (Phaser 3.60+ 호환)
     */
    playCustomEffect(textureId: string, x: number, y: number, scale: number = 1): void {
        const textureKey = `particle_custom_${textureId}`;

        if (!this.scene.textures.exists(textureKey)) {
            console.warn(`[ParticleManager] Custom texture not found: ${textureKey}`);
            return;
        }

        // 커스텀 파티클 기본 설정
        const emitter = this.scene.add.particles(x, y, textureKey, {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1 * scale, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            blendMode: Phaser.BlendModes.NORMAL,
            emitting: true,
            quantity: 10,
            stopAfter: 10,
            duration: 100,
        });

        emitter.setDepth(1000);

        // 자동 파괴
        this.scene.time.delayedCall(1000, () => {
            if (emitter && emitter.active) {
                emitter.destroy();
            }
        });
    }

    /**
     * 일회성 파티클 이펙트 재생 (Phaser 3.60+ 호환)
     * @param presetId 프리셋 ID
     * @param x 월드 X 좌표
     * @param y 월드 Y 좌표
     * @param scale 크기 배율 (기본값 1)
     */
    playEffect(presetId: string, x: number, y: number, scale: number = 1): void {

        const config = PARTICLE_CONFIGS[presetId];
        if (!config) {
            console.warn(`[ParticleManager] Unknown preset: ${presetId}`);
            return;
        }

        const textureKey = `particle_${presetId}`;
        if (!this.scene.textures.exists(textureKey)) {
            console.warn(`[ParticleManager] Texture missing: ${textureKey}`);
            return;
        }

        const count = config.explodeCount ?? 10;

        // Phaser 3.60+: 일회성 파티클은 직접 생성하고 자동 파괴
        // stopAfter 옵션으로 count개 방출 후 자동 정지
        const phaserConfig = { ...config.phaserConfig };

        // 스케일 적용
        if (phaserConfig.scale) {
            const baseStart = (phaserConfig.scale as any).start ?? 1;
            const baseEnd = (phaserConfig.scale as any).end ?? 0;
            phaserConfig.scale = {
                start: baseStart * scale,
                end: baseEnd * scale,
                ease: (phaserConfig.scale as any).ease
            } as any;
        }

        // 이미터 생성 (자동 방출)
        const emitter = this.scene.add.particles(x, y, textureKey, {
            ...phaserConfig,
            emitting: true,
            quantity: count,
            stopAfter: count,  // count개 방출 후 자동 정지
            duration: 100,     // 100ms 동안만 방출
        });

        emitter.setDepth(1000);


        // 파티클 수명 + 여유 시간 후 이미터 파괴
        const lifespan = (phaserConfig.lifespan as number) || 500;
        this.scene.time.delayedCall(lifespan + 500, () => {
            if (emitter && emitter.active) {
                emitter.destroy();
            }
        });
    }

    /**
     * 지속 이미터 생성 (기존 호환성 + 개별 제어)
     * 지속 이펙트는 상태(위치 이동, ON/OFF)를 가지므로 공유 풀을 쓰지 않고 개별 생성합니다.
     */
    createEmitter(id: string, presetId: string, x: number, y: number): Phaser.GameObjects.Particles.ParticleEmitter | null {
        // 이미 존재하면 제거 (재생성)
        if (this.activeContinuousEmitters.has(id)) {
            this.stopEmitter(id);
        }

        const config = PARTICLE_CONFIGS[presetId];
        if (!config) return null;

        const textureKey = `particle_${presetId}`;
        if (!this.scene.textures.exists(textureKey)) return null;

        // 지속 이펙트는 해당 위치에 생성 (따라다니기 등을 위해)
        const emitter = this.scene.add.particles(x, y, textureKey, {
            ...config.phaserConfig,
            emitting: true
        });

        emitter.setDepth(900); // 일회성보다는 아래, 엔티티보다는 위? 상황에 따라 다름

        this.activeContinuousEmitters.set(id, emitter);
        return emitter;
    }

    /**
     * 이미터 중지 및 제거
     */
    stopEmitter(id: string): void {
        const emitter = this.activeContinuousEmitters.get(id);
        if (emitter) {
            emitter.stop();
            // 지속 이펙트는 바로 destroy하지 않고 서서히 사라지게 할 수도 있지만, 
            // 여기서는 단순 제거
            this.scene.time.delayedCall(1000, () => emitter.destroy()); // 잔여 파티클 위해 지연 파괴
            this.activeContinuousEmitters.delete(id);
        }
    }

    /**
     * 이미터 위치 업데이트
     */
    updateEmitterPosition(id: string, x: number, y: number): void {
        const emitter = this.activeContinuousEmitters.get(id);
        if (emitter) {
            emitter.setPosition(x, y);
        }
    }

    /**
     * 특정 엔티티를 추적하는 이미터 생성
     */
    followEntity(emitterId: string, presetId: string, gameObject: Phaser.GameObjects.GameObject): Phaser.GameObjects.Particles.ParticleEmitter | null {
        const transform = gameObject as Phaser.GameObjects.GameObject & { x: number; y: number };
        const emitter = this.createEmitter(emitterId, presetId, transform.x, transform.y);

        if (emitter) {
            emitter.startFollow(gameObject as Phaser.GameObjects.Sprite);
        }

        return emitter;
    }

    /**
     * 활성 이미터 개수
     */
    getActiveEmitterCount(): number {
        return this.activeContinuousEmitters.size;
    }

    /**
     * 모든 리소스 정리
     */
    destroy(): void {
        for (const [_, emitter] of this.sharedEmitters) {
            emitter.destroy();
        }
        for (const [_, emitter] of this.activeContinuousEmitters) {
            emitter.destroy();
        }
        this.sharedEmitters.clear();
        this.activeContinuousEmitters.clear();
    }
}
