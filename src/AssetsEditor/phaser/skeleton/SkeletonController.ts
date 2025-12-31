// src/AssetsEditor/phaser/skeleton/SkeletonController.ts
// 6대 모션 프리셋 - 본 기반 절차적 애니메이션 엔진

import Phaser from 'phaser';
import { BoneSystem, BoneType, BoneTransform, DEFAULT_TRANSFORM } from './BoneSystem';

/**
 * 모션 타입
 */
export type MotionType = 'idle' | 'walk' | 'jump' | 'attack' | 'hit' | 'rotate' | 'none';

/**
 * 모션 설정 (외부에서 조절 가능)
 */
export interface MotionConfig {
  speed: number;       // 0.5 ~ 2.0 (기본 1.0)
  intensity: number;   // 0.5 ~ 2.0 (기본 1.0)
  loop: boolean;
}

/**
 * VFX 이벤트 콜백
 */
export interface VFXCallbacks {
  onScreenShake?: (intensity: number) => void;
  onFlash?: (color: number, duration: number) => void;
  onGhost?: (alpha: number) => void;
  onSlashVFX?: (angle: number) => void;
}

// ═══════════════════════════════════════════════════════════════════
// 수학적 상수 및 유틸리티
// ═══════════════════════════════════════════════════════════════════

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Easing 함수들 (물리 기반 탄성)
 */
export const Easing = {
  // 탄성 (Elastic) - 공격/착지 반동
  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  
  // 바운스 - 점프 착지
  easeOutBounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  
  // 힘 응축 (Anticipation) - 점프 전 웅크림
  easeInBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  
  // 폭발적 가속
  easeOutExpo: (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  },
  
  // 부드러운 사인
  easeInOutSine: (t: number): number => {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  },
};

// ═══════════════════════════════════════════════════════════════════
// SkeletonController 클래스
// ═══════════════════════════════════════════════════════════════════

export class SkeletonController {
  private scene: Phaser.Scene;
  private boneSystem: BoneSystem;
  
  private currentMotion: MotionType = 'none';
  private config: MotionConfig = { speed: 1, intensity: 1, loop: true };
  private vfxCallbacks: VFXCallbacks = {};
  
  // 애니메이션 상태
  private elapsedTime: number = 0;
  private motionPhase: number = 0;  // 0~1 진행도
  private activeTweens: Phaser.Tweens.Tween[] = [];
  private updateCallback: ((delta: number) => void) | null = null;

  constructor(scene: Phaser.Scene, boneSystem: BoneSystem) {
    this.scene = scene;
    this.boneSystem = boneSystem;
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<MotionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * VFX 콜백 설정
   */
  setVFXCallbacks(callbacks: VFXCallbacks): void {
    this.vfxCallbacks = callbacks;
  }

  /**
   * 모션 재생
   */
  play(type: MotionType): void {
    this.stop();
    
    if (type === 'none') {
      this.currentMotion = 'none';
      return;
    }

    this.currentMotion = type;
    this.elapsedTime = 0;
    this.motionPhase = 0;

    switch (type) {
      case 'idle':
        this.playIdle();
        break;
      case 'walk':
        this.playWalk();
        break;
      case 'jump':
        this.playJump();
        break;
      case 'attack':
        this.playAttack();
        break;
      case 'hit':
        this.playHit();
        break;
      case 'rotate':
        this.playRotate();
        break;
    }
  }

  /**
   * 모션 정지
   */
  stop(): void {
    // Tween 정지
    this.activeTweens.forEach(t => t.destroy());
    this.activeTweens = [];

    // Update 콜백 제거
    if (this.updateCallback) {
      this.scene.events.off('update', this.updateCallback);
      this.updateCallback = null;
    }

    // 본 리셋
    this.boneSystem.resetAll();
    this.currentMotion = 'none';
  }

  /**
   * 현재 모션
   */
  getCurrentMotion(): MotionType {
    return this.currentMotion;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. IDLE: Sine 파형 기반 Squash & Stretch
  // ═══════════════════════════════════════════════════════════════════
  /**
   * Idle 모션
   * - 전체적인 숨쉬기 효과
   * - 머리: 미세한 상하 움직임
   * - 몸통: Squash & Stretch
   * - 다리: 안정적 (최소 움직임)
   * 
   * 수학적 원리:
   * - 기본 주기: 2초 (0.5Hz)
   * - Head Y: sin(t) * 2px
   * - Body ScaleY: 1 + sin(t) * 0.03
   */
  private playIdle(): void {
    const { speed, intensity } = this.config;
    
    // 기본 주기: 2초 (1000ms * 2)
    const basePeriod = 2000 / speed;
    
    this.updateCallback = (delta: number) => {
      this.elapsedTime += delta;
      
      // 0 ~ 2π 범위의 위상
      const phase = (this.elapsedTime / basePeriod) * Math.PI * 2;
      
      // Sine 값 (-1 ~ 1)
      const sinValue = Math.sin(phase);
      const cosValue = Math.cos(phase);
      
      // === HEAD ===
      // 부드러운 상하 움직임 + 미세 회전
      this.boneSystem.applyBoneTransform('head', {
        y: sinValue * 2 * intensity,
        rotation: sinValue * 0.03 * intensity,  // ~1.7도
      });
      
      // === BODY ===
      // Squash & Stretch (반대 위상)
      const bodyScaleY = 1 + sinValue * 0.03 * intensity;
      const bodyScaleX = 1 - sinValue * 0.015 * intensity;  // 역보상
      this.boneSystem.applyBoneTransform('body', {
        scaleX: bodyScaleX,
        scaleY: bodyScaleY,
        y: cosValue * 1 * intensity,
      });
      
      // === LEGS ===
      // 안정적, 미세한 눌림
      this.boneSystem.applyBoneTransform('legs', {
        scaleY: 1 - sinValue * 0.01 * intensity,
      });
    };

    this.scene.events.on('update', this.updateCallback);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. WALK: 기울기 + 하체 반동 뒤뚱거림
  // ═══════════════════════════════════════════════════════════════════
  /**
   * Walk 모션
   * - 이동 방향으로 기울기 (Leaning)
   * - 하체는 반대 방향 반동
   * - 머리는 관성으로 뒤따라감
   * 
   * 수학적 원리:
   * - 걸음 주기: 0.5초 (2Hz)
   * - Body 기울기: sin(t) * 12도
   * - Legs 반동: -sin(t) * 8도
   * - Head 지연: sin(t - π/6) (위상 지연)
   */
  private playWalk(): void {
    const { speed, intensity } = this.config;
    
    // 걸음 주기: 0.5초
    const stepPeriod = 500 / speed;
    
    this.updateCallback = (delta: number) => {
      this.elapsedTime += delta;
      
      const phase = (this.elapsedTime / stepPeriod) * Math.PI * 2;
      const sinValue = Math.sin(phase);
      const cosValue = Math.cos(phase);
      
      // 위상 지연 (머리는 몸보다 늦게 반응)
      const headPhase = phase - Math.PI / 6;  // 30도 지연
      const headSin = Math.sin(headPhase);
      
      // === LEGS ===
      // 발을 딛는 동작 (반대 방향 회전)
      const legsRotation = -sinValue * 8 * DEG_TO_RAD * intensity;
      const legsBounce = Math.abs(sinValue) * 3 * intensity;  // 바운스
      this.boneSystem.applyBoneTransform('legs', {
        rotation: legsRotation,
        y: -legsBounce,
      });
      
      // === BODY ===
      // 기울기 (Leaning) + 좌우 스웨이
      const bodyRotation = sinValue * 12 * DEG_TO_RAD * intensity;
      const bodySwayX = sinValue * 2 * intensity;
      const bodyBounce = Math.abs(cosValue) * 2 * intensity;
      this.boneSystem.applyBoneTransform('body', {
        rotation: bodyRotation,
        x: bodySwayX,
        y: -bodyBounce,
      });
      
      // === HEAD ===
      // 관성으로 지연 반응 + 보상 회전
      const headRotation = headSin * 6 * DEG_TO_RAD * intensity;
      const headCompensation = -bodyRotation * 0.3;  // 몸 기울기 일부 보상
      this.boneSystem.applyBoneTransform('head', {
        rotation: headRotation + headCompensation,
        x: headSin * 1.5 * intensity,
        y: -Math.abs(headSin) * 2 * intensity,
      });
    };

    this.scene.events.on('update', this.updateCallback);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. JUMP: Anticipation → 가속 점프 → 착지 반동
  // ═══════════════════════════════════════════════════════════════════
  /**
   * Jump 모션 (Tween 시퀀스)
   * 
   * 1. Anticipation (웅크림): 200ms
   *    - 전체 scaleY 0.7, 다리 구부림
   * 2. Takeoff (도약): 150ms
   *    - 급격한 상승, 늘어남
   * 3. Air (체공): 300ms
   *    - 정점에서 잠시 유지
   * 4. Fall (하강): 200ms
   *    - 가속 낙하
   * 5. Land (착지): 250ms
   *    - 충격 흡수, 바운스 반동
   */
  private playJump(): void {
    const { speed, intensity, loop } = this.config;
    const timeScale = 1 / speed;

    const jumpSequence = () => {
      // ─── Phase 1: Anticipation (웅크림) ───
      const anticipation = this.scene.tweens.add({
        targets: {},
        duration: 200 * timeScale,
        ease: Easing.easeInBack,
        onUpdate: (tween) => {
          const p = tween.progress;
          
          // 전체적으로 납작해짐
          this.boneSystem.applyBoneTransform('legs', {
            scaleY: 1 - 0.2 * p * intensity,
            scaleX: 1 + 0.1 * p * intensity,
          });
          this.boneSystem.applyBoneTransform('body', {
            scaleY: 1 - 0.15 * p * intensity,
            y: 3 * p * intensity,
            rotation: -5 * DEG_TO_RAD * p * intensity,
          });
          this.boneSystem.applyBoneTransform('head', {
            y: 5 * p * intensity,
            rotation: 8 * DEG_TO_RAD * p * intensity,
          });
        },
        onComplete: () => {
          // ─── Phase 2: Takeoff (도약) ───
          const takeoff = this.scene.tweens.add({
            targets: {},
            duration: 150 * timeScale,
            ease: Easing.easeOutExpo,
            onUpdate: (tween) => {
              const p = tween.progress;
              
              // 급격히 늘어나며 상승
              this.boneSystem.applyBoneTransform('legs', {
                scaleY: 0.8 + 0.35 * p * intensity,
                scaleX: 1.1 - 0.15 * p * intensity,
                y: -15 * p * intensity,
              });
              this.boneSystem.applyBoneTransform('body', {
                scaleY: 0.85 + 0.25 * p * intensity,
                y: -20 * p * intensity,
                rotation: (-5 + 8 * p) * DEG_TO_RAD * intensity,
              });
              this.boneSystem.applyBoneTransform('head', {
                y: -25 * p * intensity,
                rotation: (8 - 12 * p) * DEG_TO_RAD * intensity,
              });
            },
            onComplete: () => {
              // ─── Phase 3: Air (체공) ───
              const air = this.scene.tweens.add({
                targets: {},
                duration: 300 * timeScale,
                ease: 'Sine.easeInOut',
                onUpdate: (tween) => {
                  const p = tween.progress;
                  const floatSin = Math.sin(p * Math.PI);
                  
                  // 정점에서 부드럽게 유지
                  const yOffset = -25 - 10 * floatSin;
                  this.boneSystem.applyBoneTransform('legs', {
                    scaleY: 1.15 - 0.05 * floatSin,
                    y: yOffset * 0.6 * intensity,
                  });
                  this.boneSystem.applyBoneTransform('body', {
                    y: yOffset * 0.8 * intensity,
                  });
                  this.boneSystem.applyBoneTransform('head', {
                    y: yOffset * intensity,
                    rotation: floatSin * 3 * DEG_TO_RAD * intensity,
                  });
                },
                onComplete: () => {
                  // ─── Phase 4: Fall (하강) ───
                  const fall = this.scene.tweens.add({
                    targets: {},
                    duration: 200 * timeScale,
                    ease: 'Quad.easeIn',
                    onUpdate: (tween) => {
                      const p = tween.progress;
                      
                      // 가속 낙하
                      const fallY = -35 * (1 - p);
                      this.boneSystem.applyBoneTransform('legs', {
                        y: fallY * 0.6 * intensity,
                        scaleY: 1.1 - 0.1 * p,
                      });
                      this.boneSystem.applyBoneTransform('body', {
                        y: fallY * 0.8 * intensity,
                        rotation: -p * 5 * DEG_TO_RAD * intensity,
                      });
                      this.boneSystem.applyBoneTransform('head', {
                        y: fallY * intensity,
                        rotation: p * 8 * DEG_TO_RAD * intensity,
                      });
                    },
                    onComplete: () => {
                      // VFX: 착지 화면 흔들림
                      this.vfxCallbacks.onScreenShake?.(0.5 * intensity);
                      
                      // ─── Phase 5: Land (착지 반동) ───
                      const land = this.scene.tweens.add({
                        targets: {},
                        duration: 250 * timeScale,
                        ease: Easing.easeOutBounce,
                        onUpdate: (tween) => {
                          const p = tween.progress;
                          const bounce = Easing.easeOutBounce(p);
                          
                          // 충격 흡수 후 반동
                          const squash = 1 - 0.25 * (1 - bounce) * intensity;
                          const stretch = 1 + 0.15 * (1 - bounce) * intensity;
                          
                          this.boneSystem.applyBoneTransform('legs', {
                            scaleY: squash,
                            scaleX: stretch,
                            y: 0,
                          });
                          this.boneSystem.applyBoneTransform('body', {
                            scaleY: squash,
                            y: (1 - bounce) * 5 * intensity,
                            rotation: -(1 - bounce) * 10 * DEG_TO_RAD * intensity,
                          });
                          this.boneSystem.applyBoneTransform('head', {
                            y: (1 - bounce) * 8 * intensity,
                            rotation: (1 - bounce) * 15 * DEG_TO_RAD * intensity,
                          });
                        },
                        onComplete: () => {
                          this.boneSystem.resetAll();
                          if (loop && this.currentMotion === 'jump') {
                            this.scene.time.delayedCall(300 / speed, jumpSequence);
                          }
                        }
                      });
                      this.activeTweens.push(land);
                    }
                  });
                  this.activeTweens.push(fall);
                }
              });
              this.activeTweens.push(air);
            }
          });
          this.activeTweens.push(takeoff);
        }
      });
      this.activeTweens.push(anticipation);
    };

    jumpSequence();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. ATTACK: 상체 회전 + 잔상 + 화면 흔들림 + VFX
  // ═══════════════════════════════════════════════════════════════════
  /**
   * Attack 모션
   * 
   * 1. Windup (준비): 150ms
   *    - 뒤로 젖히기, 힘 응축
   * 2. Strike (공격): 80ms (빠르게!)
   *    - 급격한 회전, 잔상 효과
   * 3. Impact (충격): 50ms
   *    - 화면 흔들림, VFX
   * 4. Recovery (복귀): 200ms
   *    - 탄성 복귀
   */
  private playAttack(): void {
    const { speed, intensity, loop } = this.config;
    const timeScale = 1 / speed;

    const attackSequence = () => {
      // ─── Phase 1: Windup ───
      const windup = this.scene.tweens.add({
        targets: {},
        duration: 150 * timeScale,
        ease: 'Back.easeIn',
        onUpdate: (tween) => {
          const p = tween.progress;
          
          // 뒤로 젖히기
          this.boneSystem.applyBoneTransform('legs', {
            rotation: 5 * DEG_TO_RAD * p * intensity,
          });
          this.boneSystem.applyBoneTransform('body', {
            rotation: -25 * DEG_TO_RAD * p * intensity,
            x: -8 * p * intensity,
            scaleX: 0.95,
          });
          this.boneSystem.applyBoneTransform('head', {
            rotation: -15 * DEG_TO_RAD * p * intensity,
            x: -5 * p * intensity,
          });
        },
        onComplete: () => {
          // ─── Phase 2: Strike (빠른 공격!) ───
          // VFX: 잔상 시작
          this.vfxCallbacks.onGhost?.(0.3);
          
          const strike = this.scene.tweens.add({
            targets: {},
            duration: 80 * timeScale,
            ease: Easing.easeOutExpo,
            onUpdate: (tween) => {
              const p = tween.progress;
              
              // 급격한 정방향 회전
              this.boneSystem.applyBoneTransform('legs', {
                rotation: (5 - 10 * p) * DEG_TO_RAD * intensity,
              });
              this.boneSystem.applyBoneTransform('body', {
                rotation: (-25 + 45 * p) * DEG_TO_RAD * intensity,
                x: (-8 + 20 * p) * intensity,
                scaleX: 0.95 + 0.25 * p * intensity,
              });
              this.boneSystem.applyBoneTransform('head', {
                rotation: (-15 + 25 * p) * DEG_TO_RAD * intensity,
                x: (-5 + 15 * p) * intensity,
              });
            },
            onComplete: () => {
              // ─── Phase 3: Impact ───
              // VFX
              this.vfxCallbacks.onScreenShake?.(0.8 * intensity);
              this.vfxCallbacks.onSlashVFX?.(20 * intensity);
              this.vfxCallbacks.onGhost?.(0);  // 잔상 끝
              
              const impact = this.scene.tweens.add({
                targets: {},
                duration: 50 * timeScale,
                onUpdate: (tween) => {
                  const p = tween.progress;
                  
                  // 찌르기 최대 포즈 유지
                  this.boneSystem.applyBoneTransform('body', {
                    rotation: 20 * DEG_TO_RAD * intensity,
                    x: 12 * intensity,
                    scaleX: 1.2 * intensity,
                  });
                  this.boneSystem.applyBoneTransform('head', {
                    rotation: 10 * DEG_TO_RAD * intensity,
                    x: 10 * intensity,
                  });
                },
                onComplete: () => {
                  // ─── Phase 4: Recovery ───
                  const recovery = this.scene.tweens.add({
                    targets: {},
                    duration: 200 * timeScale,
                    ease: Easing.easeOutElastic,
                    onUpdate: (tween) => {
                      const p = tween.progress;
                      const elastic = Easing.easeOutElastic(p);
                      
                      // 탄성 복귀
                      this.boneSystem.applyBoneTransform('legs', {
                        rotation: -5 * (1 - elastic) * DEG_TO_RAD * intensity,
                      });
                      this.boneSystem.applyBoneTransform('body', {
                        rotation: 20 * (1 - elastic) * DEG_TO_RAD * intensity,
                        x: 12 * (1 - elastic) * intensity,
                        scaleX: 1 + 0.2 * (1 - elastic) * intensity,
                      });
                      this.boneSystem.applyBoneTransform('head', {
                        rotation: 10 * (1 - elastic) * DEG_TO_RAD * intensity,
                        x: 10 * (1 - elastic) * intensity,
                      });
                    },
                    onComplete: () => {
                      this.boneSystem.resetAll();
                      if (loop && this.currentMotion === 'attack') {
                        this.scene.time.delayedCall(400 / speed, attackSequence);
                      }
                    }
                  });
                  this.activeTweens.push(recovery);
                }
              });
              this.activeTweens.push(impact);
            }
          });
          this.activeTweens.push(strike);
        }
      });
      this.activeTweens.push(windup);
    };

    attackSequence();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. HIT: 고주파 진동 + 화이트 플래시
  // ═══════════════════════════════════════════════════════════════════
  /**
   * Hit 모션
   * - 고주파 진동 (Shake)
   * - 뒤로 밀림
   * - 화이트 플래시
   * 
   * 수학적 원리:
   * - 진동 주파수: 30Hz (33ms 주기)
   * - 진폭 감쇠: exponential decay
   */
  private playHit(): void {
    const { speed, intensity, loop } = this.config;
    const timeScale = 1 / speed;

    const hitSequence = () => {
      // VFX: 화이트 플래시
      this.vfxCallbacks.onFlash?.(0xffffff, 100);
      
      let shakeTime = 0;
      const shakeDuration = 300 * timeScale;
      const shakeFrequency = 30;  // Hz
      
      // 고주파 진동 + 밀림
      const knockback = this.scene.tweens.add({
        targets: {},
        duration: shakeDuration,
        onUpdate: (tween) => {
          shakeTime += 16;  // 약 60fps 기준
          const p = tween.progress;
          
          // 감쇠 계수 (시간에 따라 진동 줄어듦)
          const decay = Math.exp(-p * 3);
          
          // 고주파 진동
          const shakeX = Math.sin(shakeTime * 0.001 * shakeFrequency * Math.PI * 2) * 6 * decay * intensity;
          const shakeRotation = Math.sin(shakeTime * 0.001 * shakeFrequency * Math.PI * 2 + Math.PI / 4) * 8 * decay * intensity;
          
          // 밀림 (초반에 크게, 점점 복귀)
          const knockbackX = -15 * (1 - p) * intensity;
          const knockbackRotation = -20 * (1 - p) * intensity;
          
          // 합성
          this.boneSystem.applyBoneTransform('legs', {
            x: shakeX * 0.3 + knockbackX * 0.3,
          });
          this.boneSystem.applyBoneTransform('body', {
            x: shakeX * 0.7 + knockbackX * 0.7,
            rotation: (shakeRotation + knockbackRotation) * DEG_TO_RAD,
            alpha: 0.4 + 0.6 * p,  // 깜빡임
          });
          this.boneSystem.applyBoneTransform('head', {
            x: shakeX + knockbackX,
            rotation: (shakeRotation * 1.5 + knockbackRotation * 0.5) * DEG_TO_RAD,
            alpha: 0.4 + 0.6 * p,
          });
        },
        onComplete: () => {
          this.boneSystem.resetAll();
          if (loop && this.currentMotion === 'hit') {
            this.scene.time.delayedCall(500 / speed, hitSequence);
          }
        }
      });
      this.activeTweens.push(knockback);
    };

    hitSequence();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. ROTATE: 원심력 느낌의 Skew 회전
  // ═══════════════════════════════════════════════════════════════════
  /**
   * Rotate 모션
   * - X축 스케일로 3D 회전 시뮬레이션
   * - 원심력으로 인한 늘어짐 효과
   * 
   * 수학적 원리:
   * - scaleX: cos(θ) → -1 ~ 1
   * - 원심력: |sin(θ)| * stretch
   */
  private playRotate(): void {
    const { speed, intensity, loop } = this.config;
    
    const rotateDuration = 800 / speed;
    
    const rotateSequence = () => {
      const rotate = this.scene.tweens.add({
        targets: {},
        duration: rotateDuration,
        ease: 'Linear',
        onUpdate: (tween) => {
          const p = tween.progress;
          const angle = p * Math.PI * 2;  // 0 ~ 2π
          
          // X축 스케일 (정면 → 옆면 → 뒷면 → 옆면 → 정면)
          const scaleX = Math.cos(angle);
          
          // 원심력 효과 (옆면일 때 최대)
          const centrifugal = Math.abs(Math.sin(angle));
          
          // 회전 속도에 따른 늘어짐
          const stretch = 1 + centrifugal * 0.15 * intensity;
          const squash = 1 - centrifugal * 0.08 * intensity;
          
          // 각 본에 적용 (위로 갈수록 더 많이 영향)
          this.boneSystem.applyBoneTransform('legs', {
            scaleX: scaleX,
            scaleY: squash,
          });
          this.boneSystem.applyBoneTransform('body', {
            scaleX: scaleX * (1 + centrifugal * 0.05 * intensity),
            scaleY: stretch * 0.95,
            // Skew 효과 (기울어짐)
            rotation: centrifugal * 10 * Math.sign(Math.sin(angle)) * DEG_TO_RAD * intensity,
          });
          this.boneSystem.applyBoneTransform('head', {
            scaleX: scaleX * (1 + centrifugal * 0.1 * intensity),
            // 머리는 관성으로 더 기울어짐
            rotation: centrifugal * 15 * Math.sign(Math.sin(angle)) * DEG_TO_RAD * intensity,
            // 원심력으로 바깥쪽으로
            x: centrifugal * 3 * Math.sign(Math.sin(angle)) * intensity,
          });
        },
        onComplete: () => {
          if (loop && this.currentMotion === 'rotate') {
            rotateSequence();
          } else {
            this.boneSystem.resetAll();
          }
        }
      });
      this.activeTweens.push(rotate);
    };

    rotateSequence();
  }

  /**
   * 정리
   */
  destroy(): void {
    this.stop();
  }
}
