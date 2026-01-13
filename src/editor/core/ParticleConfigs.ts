// src/editor/core/ParticleConfigs.ts
// Phaser ParticleEmitter 설정값 - 고품질 이펙트 (Pooling & Juice)

import Phaser from 'phaser';

export interface ParticleConfig {
    /** Phaser Emitter 설정 */
    phaserConfig: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
    /** 일회성 재생 여부 (true = playEffect 호출 시 1회 폭발, false = createEmitter로 지속 재생) */
    oneShot: boolean;
    /** 일회성일 때 방출할 파티클 개수 */
    explodeCount?: number;
    /** 기본 재생 크기 배율 (기본값: 1) */
    baseScale?: number;
}

export const PARTICLE_CONFIGS: Record<string, ParticleConfig> = {
    // ============================================================
    // 전투 이펙트 (High Impact)
    // ============================================================

    // 피격 효과 - 강렬한 타격감 (Expo.Out)
    hit_spark: {
        oneShot: true,
        explodeCount: 12,
        baseScale: 1,
        phaserConfig: {
            speed: { min: 150, max: 350 },
            angle: { min: 0, max: 360 },
            scale: { start: 2, end: 0, ease: 'Power2' }, // 부드러운 소멸
            alpha: { start: 1, end: 0 },
            lifespan: 400,
            rotate: { min: 0, max: 360 },
            tint: [0xFFFFFF, 0xFFFF00, 0xFF8800],
            blendMode: Phaser.BlendModes.ADD,
        },
    },

    // 폭발 - 대규모 확산
    explosion: {
        oneShot: true,
        explodeCount: 40,
        baseScale: 1.5,
        phaserConfig: {
            speed: { min: 100, max: 400 },
            angle: { min: 0, max: 360 },
            scale: { start: 3, end: 0.5, ease: 'Expo.Out' }, // 펑 터지는 느낌
            alpha: { start: 1, end: 0, ease: 'Power2' },
            lifespan: 800,
            rotate: { min: 0, max: 360 },
            tint: [0xFFFFFF, 0xFFFF00, 0xFF6600, 0xFF0000],
            blendMode: Phaser.BlendModes.NORMAL, // ADD는 어두운 배경에서 안보임
            gravityY: 100,
        },
    },

    // 피 튀기기 - 묵직한 액체
    blood: {
        oneShot: true,
        explodeCount: 15,
        baseScale: 1,
        phaserConfig: {
            speed: { min: 50, max: 250 },
            angle: { min: 220, max: 320 }, // 위로 솟았다가
            scale: { start: 1.5, end: 0.5 },
            alpha: { start: 1, end: 0.5 },
            lifespan: 600,
            gravityY: 600, // 빠르게 떨어짐
            tint: [0xFF0000, 0xAA0000],
            rotate: { min: 0, max: 360 },
        },
    },

    // 힐링 - 부드러운 상승
    heal: {
        oneShot: true,
        explodeCount: 20,
        baseScale: 1,
        phaserConfig: {
            speedY: { min: -50, max: -150 }, // 위로만 이동
            speedX: { min: -20, max: 20 },
            scale: { start: 1.5, end: 0, ease: 'Sine.In' },
            alpha: { start: 0.8, end: 0 },
            lifespan: 1000,
            tint: [0x88FF88, 0x00FF00, 0xFFFFFF],
            blendMode: Phaser.BlendModes.ADD,
        },
    },

    // 마법 - 신비로운 회전
    magic: {
        oneShot: true,
        explodeCount: 25,
        baseScale: 1.2,
        phaserConfig: {
            speed: { min: 50, max: 150 },
            scale: { start: 2, end: 0, ease: 'Back.Out' },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            rotate: { min: 0, max: 360 },
            tint: [0xCC88FF, 0x8844FF, 0x4400CC],
            blendMode: Phaser.BlendModes.ADD,
        },
    },

    // ============================================================
    // 환경 & UI 이펙트
    // ============================================================

    sparkle: {
        oneShot: true,
        explodeCount: 8,
        phaserConfig: {
            speed: { min: 50, max: 100 },
            scale: { start: 1.5, end: 0 },
            lifespan: 500,
            blendMode: Phaser.BlendModes.ADD,
            tint: [0xFFFFFF, 0xFFFF88],
        },
    },

    level_up: {
        oneShot: true,
        explodeCount: 30,
        phaserConfig: {
            speed: { min: 100, max: 300 },
            angle: { min: 250, max: 290 },
            scale: { start: 2, end: 0.5, ease: 'Back.Out' },
            lifespan: 1200,
            gravityY: 100,
            tint: [0xFFD700, 0xFFFFFF],
            blendMode: Phaser.BlendModes.ADD,
        },
    },

    coin: {
        oneShot: true,
        explodeCount: 10,
        phaserConfig: {
            speedY: { min: -100, max: -200 },
            scale: { start: 1, end: 0.5 },
            lifespan: 600,
            gravityY: 400,
            tint: [0xFFD700],
        },
    },

    confetti: {
        oneShot: true,
        explodeCount: 40,
        phaserConfig: {
            speed: { min: 150, max: 350 },
            scale: { start: 1.2, end: 0.8 },
            lifespan: 1500,
            gravityY: 200,
            rotate: { min: 0, max: 360 },
            tint: [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF],
        },
    },

    // ============================================================
    // 지속 이펙트 (createEmitter용)
    // ============================================================

    rain: {
        oneShot: false,
        phaserConfig: {
            speedY: { min: 400, max: 600 },
            speedX: { min: -20, max: 20 },
            alpha: { min: 0.3, max: 0.7 },
            scale: { min: 0.8, max: 1.2 },
            lifespan: 1500,
            frequency: 10,
            quantity: 2,
            tint: 0xAADDFF,
        },
    },

    fire: {
        oneShot: false,
        phaserConfig: {
            speedY: { min: -50, max: -100 },
            speedX: { min: -10, max: 10 },
            scale: { start: 1.5, end: 0.2 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            frequency: 50,
            blendMode: Phaser.BlendModes.ADD,
            tint: [0xFF4400, 0xFFaa00],
        },
    },

    smoke: {
        oneShot: false,
        phaserConfig: {
            speedY: { min: -30, max: -60 },
            speedX: { min: -20, max: 20 },
            scale: { start: 1, end: 2.5 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 2000,
            frequency: 100,
            tint: 0x888888,
        },
    },

    snow: {
        oneShot: false,
        phaserConfig: {
            speedY: { min: 50, max: 100 },
            speedX: { min: -20, max: 20 },
            scale: { min: 0.5, max: 1.2 },
            lifespan: 4000,
            frequency: 50,
            tint: 0xFFFFFF,
        },
    },

    dust: {
        oneShot: true, // Dust can be one shot too
        explodeCount: 8,
        phaserConfig: {
            speed: { min: 20, max: 50 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 800,
            tint: 0xAAAAAA,
        },
    },
};
