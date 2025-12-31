// src/AssetsEditor/phaser/controllers/MotionController.ts
// 하드코딩된 절차적 애니메이션 (단일 이미지 기반)

import Phaser from 'phaser';
import { EventBus, DEFAULT_MOTION_CONFIG } from '../EventBus';
import type { MotionType, MotionConfig } from '../EventBus';

/**
 * 모션 파라미터 정의
 */
interface MotionParams {
  // 기본 변형
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;  // radians
  alpha: number;
  
  // 피벗 (0~1)
  originY: number;
}

/**
 * MotionController
 * - 단일 스프라이트에 Tween/Sine 기반 모션 적용
 * - 모든 모션은 수학적 변형으로 구현
 */
export class MotionController {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  
  private currentMotion: MotionType = 'none';
  private config: MotionConfig = { ...DEFAULT_MOTION_CONFIG };
  
  // 원본 위치/스케일 저장
  private baseX: number = 0;
  private baseY: number = 0;
  private baseScaleX: number = 1;
  private baseScaleY: number = 1;
  
  // 활성 Tween들
  private activeTweens: Phaser.Tweens.Tween[] = [];
  private updateCallback: (() => void) | null = null;
  
  // Sine wave 타이머
  private elapsedTime: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 스프라이트 설정
   */
  setSprite(sprite: Phaser.GameObjects.Sprite): void {
    this.sprite = sprite;
    this.baseX = sprite.x;
    this.baseY = sprite.y;
    this.baseScaleX = sprite.scaleX;
    this.baseScaleY = sprite.scaleY;
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<MotionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 모션 재생
   */
  play(type: MotionType): void {
    this.stop();
    
    if (!this.sprite || type === 'none') {
      this.currentMotion = 'none';
      return;
    }

    this.currentMotion = type;
    this.elapsedTime = 0;

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
      case 'hurt':
        this.playHurt();
        break;
      case 'spin':
        this.playSpin();
        break;
    }

    EventBus.emit('motion:started', { type });
  }

  /**
   * 모션 정지
   */
  stop(): void {
    // 모든 Tween 정지
    this.activeTweens.forEach(tween => tween.destroy());
    this.activeTweens = [];

    // Update 콜백 제거
    if (this.updateCallback) {
      this.scene.events.off('update', this.updateCallback);
      this.updateCallback = null;
    }

    // 원래 상태로 복원
    this.resetSprite();
    
    const prevMotion = this.currentMotion;
    this.currentMotion = 'none';
    
    if (prevMotion !== 'none') {
      EventBus.emit('motion:completed', { type: prevMotion });
    }
  }

  /**
   * 스프라이트 원래 상태로 복원
   */
  private resetSprite(): void {
    if (!this.sprite) return;
    
    this.sprite.x = this.baseX;
    this.sprite.y = this.baseY;
    this.sprite.scaleX = this.baseScaleX;
    this.sprite.scaleY = this.baseScaleY;
    this.sprite.rotation = 0;
    this.sprite.alpha = 1;
    this.sprite.setOrigin(0.5, 0.5);
  }

  /**
   * 매 프레임 업데이트 (Sine 기반 모션용)
   */
  update(delta: number): void {
    this.elapsedTime += delta * this.config.speed;
  }

  // ═══════════════════════════════════════════════════════════
  // 모션 구현부
  // ═══════════════════════════════════════════════════════════

  /**
   * Idle: 숨쉬기 (Sine wave)
   * - Y축 부드러운 상하 움직임
   * - ScaleY 미세 변화
   */
  private playIdle(): void {
    if (!this.sprite) return;

    const intensity = this.config.intensity;
    const speed = this.config.speed;

    this.updateCallback = () => {
      if (!this.sprite) return;
      
      const time = this.scene.time.now * 0.003 * speed;
      
      // 부드러운 Sine wave
      const yOffset = Math.sin(time) * 3 * intensity;
      const scaleYOffset = Math.sin(time) * 0.03 * intensity;
      
      this.sprite.y = this.baseY + yOffset;
      this.sprite.scaleY = this.baseScaleY + scaleYOffset;
    };

    this.scene.events.on('update', this.updateCallback);
  }

  /**
   * Walk: 걷기 (Sine wave + 바운스)
   * - 좌우 회전 (발 기준)
   * - 바운스 업다운
   */
  private playWalk(): void {
    if (!this.sprite) return;

    const intensity = this.config.intensity;
    const speed = this.config.speed;

    // 발 기준 회전
    this.sprite.setOrigin(0.5, 1);
    
    // baseY 조정 (origin 변경으로 인한 보정)
    const adjustedBaseY = this.baseY + (this.sprite.displayHeight * 0.5);

    this.updateCallback = () => {
      if (!this.sprite) return;
      
      const time = this.scene.time.now * 0.005 * speed;
      
      // 좌우 회전 (뒤뚱뒤뚱)
      const rotation = Math.sin(time) * 0.2 * intensity;  // ~12 degrees
      
      // 바운스 (걸을 때 위로 튀어오름)
      const bounce = Math.abs(Math.sin(time * 2)) * 6 * intensity;
      
      // 좌우 미세 이동
      const xOffset = Math.sin(time) * 2 * intensity;
      
      this.sprite.rotation = rotation;
      this.sprite.y = adjustedBaseY - bounce;
      this.sprite.x = this.baseX + xOffset;
    };

    this.scene.events.on('update', this.updateCallback);
  }

  /**
   * Jump: 점프 (Tween sequence)
   * - 웅크림 → 도약 → 정점 → 착지
   */
  private playJump(): void {
    if (!this.sprite) return;

    const intensity = this.config.intensity;
    const speed = this.config.speed;
    const duration = 150 / speed;

    // 발 기준
    this.sprite.setOrigin(0.5, 1);
    const adjustedBaseY = this.baseY + (this.sprite.displayHeight * 0.5);

    const jumpSequence = () => {
      if (!this.sprite) return;

      // 1. 웅크림
      const squat = this.scene.tweens.add({
        targets: this.sprite,
        scaleX: this.baseScaleX * (1 + 0.2 * intensity),
        scaleY: this.baseScaleY * (1 - 0.35 * intensity),
        y: adjustedBaseY + 8 * intensity,
        duration: duration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!this.sprite) return;
          
          // 2. 도약
          const leap = this.scene.tweens.add({
            targets: this.sprite,
            scaleX: this.baseScaleX * (1 - 0.15 * intensity),
            scaleY: this.baseScaleY * (1 + 0.25 * intensity),
            y: adjustedBaseY - 50 * intensity,
            duration: duration * 1.5,
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (!this.sprite) return;
              
              // 3. 정점에서 잠시 유지
              const peak = this.scene.tweens.add({
                targets: this.sprite,
                scaleX: this.baseScaleX,
                scaleY: this.baseScaleY,
                duration: duration * 0.5,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                  if (!this.sprite) return;
                  
                  // 4. 하강 + 착지 충격
                  const fall = this.scene.tweens.add({
                    targets: this.sprite,
                    y: adjustedBaseY,
                    duration: duration * 1.2,
                    ease: 'Quad.easeIn',
                    onComplete: () => {
                      if (!this.sprite) return;
                      
                      // 5. 착지 스쿼시
                      const land = this.scene.tweens.add({
                        targets: this.sprite,
                        scaleX: this.baseScaleX * (1 + 0.15 * intensity),
                        scaleY: this.baseScaleY * (1 - 0.15 * intensity),
                        duration: duration * 0.5,
                        ease: 'Quad.easeOut',
                        onComplete: () => {
                          if (!this.sprite) return;
                          
                          // 6. 복원
                          const recover = this.scene.tweens.add({
                            targets: this.sprite,
                            scaleX: this.baseScaleX,
                            scaleY: this.baseScaleY,
                            duration: duration * 0.5,
                            ease: 'Quad.easeOut',
                            onComplete: () => {
                              if (this.config.loop && this.currentMotion === 'jump') {
                                this.scene.time.delayedCall(200 / speed, jumpSequence);
                              } else {
                                EventBus.emit('motion:completed', { type: 'jump' });
                              }
                            }
                          });
                          this.activeTweens.push(recover);
                        }
                      });
                      this.activeTweens.push(land);
                    }
                  });
                  this.activeTweens.push(fall);
                }
              });
              this.activeTweens.push(peak);
            }
          });
          this.activeTweens.push(leap);
        }
      });
      this.activeTweens.push(squat);
    };

    jumpSequence();
  }

  /**
   * Attack: 공격 (Tween sequence)
   * - 뒤로 젖힘 → 빠른 찌르기 → 복귀
   */
  private playAttack(): void {
    if (!this.sprite) return;

    const intensity = this.config.intensity;
    const speed = this.config.speed;
    const duration = 100 / speed;

    // 발 기준 회전
    this.sprite.setOrigin(0.5, 1);
    const adjustedBaseY = this.baseY + (this.sprite.displayHeight * 0.5);

    const attackSequence = () => {
      if (!this.sprite) return;

      // 1. 준비 자세 (살짝 뒤로)
      const ready = this.scene.tweens.add({
        targets: this.sprite,
        x: this.baseX - 4 * intensity,
        rotation: -0.15 * intensity,
        scaleX: this.baseScaleX * 0.95,
        duration: duration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!this.sprite) return;
          
          // 2. 크게 뒤로 젖힘
          const windUp = this.scene.tweens.add({
            targets: this.sprite,
            x: this.baseX - 10 * intensity,
            rotation: -0.4 * intensity,  // ~23 degrees
            scaleX: this.baseScaleX * 0.9,
            duration: duration * 1.5,
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (!this.sprite) return;
              
              // 3. 빠른 찌르기!
              const thrust = this.scene.tweens.add({
                targets: this.sprite,
                x: this.baseX + 18 * intensity,
                rotation: 0.3 * intensity,  // ~17 degrees
                scaleX: this.baseScaleX * 1.2,
                scaleY: this.baseScaleY * 0.92,
                duration: duration * 0.6,  // 빠르게!
                ease: 'Quad.easeOut',
                onComplete: () => {
                  if (!this.sprite) return;
                  
                  // 4. 찌르기 유지 (잠깐)
                  const hold = this.scene.tweens.add({
                    targets: this.sprite,
                    x: this.baseX + 12 * intensity,
                    rotation: 0.2 * intensity,
                    scaleX: this.baseScaleX * 1.1,
                    scaleY: this.baseScaleY * 0.95,
                    duration: duration * 0.8,
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                      if (!this.sprite) return;
                      
                      // 5. 복귀
                      const recover = this.scene.tweens.add({
                        targets: this.sprite,
                        x: this.baseX,
                        rotation: 0,
                        scaleX: this.baseScaleX,
                        scaleY: this.baseScaleY,
                        duration: duration * 1.5,
                        ease: 'Quad.easeOut',
                        onComplete: () => {
                          if (this.config.loop && this.currentMotion === 'attack') {
                            this.scene.time.delayedCall(300 / speed, attackSequence);
                          } else {
                            EventBus.emit('motion:completed', { type: 'attack' });
                          }
                        }
                      });
                      this.activeTweens.push(recover);
                    }
                  });
                  this.activeTweens.push(hold);
                }
              });
              this.activeTweens.push(thrust);
            }
          });
          this.activeTweens.push(windUp);
        }
      });
      this.activeTweens.push(ready);
    };

    attackSequence();
  }

  /**
   * Hurt: 피격 (Shake + Flash)
   * - 뒤로 밀림
   * - 떨림
   * - 깜빡임
   */
  private playHurt(): void {
    if (!this.sprite) return;

    const intensity = this.config.intensity;
    const speed = this.config.speed;
    const duration = 80 / speed;

    const hurtSequence = () => {
      if (!this.sprite) return;

      // 1. 뒤로 밀림 + 알파 감소
      const knockback = this.scene.tweens.add({
        targets: this.sprite,
        x: this.baseX - 12 * intensity,
        rotation: -0.25 * intensity,
        scaleX: this.baseScaleX * 0.9,
        alpha: 0.5,
        duration: duration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!this.sprite) return;
          
          // 2. 떨림 (좌우)
          let shakeCount = 0;
          const maxShakes = 4;
          
          const shake = () => {
            if (!this.sprite || shakeCount >= maxShakes) {
              // 복귀
              const recover = this.scene.tweens.add({
                targets: this.sprite,
                x: this.baseX,
                rotation: 0,
                scaleX: this.baseScaleX,
                alpha: 1,
                duration: duration * 2,
                ease: 'Quad.easeOut',
                onComplete: () => {
                  if (this.config.loop && this.currentMotion === 'hurt') {
                    this.scene.time.delayedCall(400 / speed, hurtSequence);
                  } else {
                    EventBus.emit('motion:completed', { type: 'hurt' });
                  }
                }
              });
              this.activeTweens.push(recover);
              return;
            }

            const direction = shakeCount % 2 === 0 ? 1 : -1;
            const shakeTween = this.scene.tweens.add({
              targets: this.sprite,
              x: this.baseX + (8 - shakeCount * 1.5) * direction * intensity,
              alpha: 0.3 + (shakeCount * 0.15),
              duration: duration * 0.5,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                shakeCount++;
                shake();
              }
            });
            this.activeTweens.push(shakeTween);
          };

          shake();
        }
      });
      this.activeTweens.push(knockback);
    };

    hurtSequence();
  }

  /**
   * Spin: 회전 (X축 스케일로 3D 느낌)
   */
  private playSpin(): void {
    if (!this.sprite) return;

    const speed = this.config.speed;
    const duration = 200 / speed;

    const spinSequence = () => {
      if (!this.sprite) return;

      // 1 → 0.2 (옆면)
      const toSide1 = this.scene.tweens.add({
        targets: this.sprite,
        scaleX: this.baseScaleX * 0.2,
        duration: duration,
        ease: 'Sine.easeIn',
        onComplete: () => {
          if (!this.sprite) return;
          
          // 0.2 → -1 (뒤집힘)
          const toBack = this.scene.tweens.add({
            targets: this.sprite,
            scaleX: -this.baseScaleX,
            duration: duration,
            ease: 'Sine.easeOut',
            onComplete: () => {
              if (!this.sprite) return;
              
              // -1 → -0.2 (옆면)
              const toSide2 = this.scene.tweens.add({
                targets: this.sprite,
                scaleX: -this.baseScaleX * 0.2,
                duration: duration,
                ease: 'Sine.easeIn',
                onComplete: () => {
                  if (!this.sprite) return;
                  
                  // -0.2 → 1 (원래대로)
                  const toFront = this.scene.tweens.add({
                    targets: this.sprite,
                    scaleX: this.baseScaleX,
                    duration: duration,
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                      if (this.config.loop && this.currentMotion === 'spin') {
                        spinSequence();
                      } else {
                        EventBus.emit('motion:completed', { type: 'spin' });
                      }
                    }
                  });
                  this.activeTweens.push(toFront);
                }
              });
              this.activeTweens.push(toSide2);
            }
          });
          this.activeTweens.push(toBack);
        }
      });
      this.activeTweens.push(toSide1);
    };

    spinSequence();
  }

  /**
   * 현재 모션 반환
   */
  getCurrentMotion(): MotionType {
    return this.currentMotion;
  }

  /**
   * 정리
   */
  destroy(): void {
    this.stop();
    this.sprite = null;
  }
}
