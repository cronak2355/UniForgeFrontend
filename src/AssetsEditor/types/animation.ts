// src/AssetsEditor/types/animation.ts
// 애니메이션 관련 공통 타입 (Phaser 의존성 없음)

/**
 * 모션 타입 (6대 코어 모션)
 */
export type MotionType = 'idle' | 'walk' | 'jump' | 'attack' | 'hit' | 'rotate' | 'none';

/**
 * 모션 설정
 */
export interface MotionConfig {
  speed: number;        // 0.25 ~ 2.0 (기본 1.0)
  intensity: number;    // 0.25 ~ 2.0 (기본 1.0)
  loop: boolean;
}

/**
 * 기본 모션 설정
 */
export const DEFAULT_MOTION_CONFIG: MotionConfig = {
  speed: 1.0,
  intensity: 1.0,
  loop: true,
};
