// src/AssetsEditor/phaser/skeleton/SkeletonScene.ts
// Phaser 메인 씬 - 스켈레톤 애니메이션 렌더링

import Phaser from 'phaser';
import { BoneSystem } from './BoneSystem';
import { SkeletonController } from './SkeletonController';
import type { MotionType, MotionConfig } from './SkeletonController';
import { EventBus } from '../EventBus';

/**
 * VFX 오브젝트들
 */
interface VFXObjects {
  flashOverlay: Phaser.GameObjects.Rectangle | null;
  ghostSprites: Phaser.GameObjects.Sprite[];
  slashGraphics: Phaser.GameObjects.Graphics | null;
}

export class SkeletonScene extends Phaser.Scene {
  private boneSystem!: BoneSystem;
  private skeletonController!: SkeletonController;
  private currentTextureKey: string = '';
  
  // 캔버스 설정
  private canvasWidth: number = 400;
  private canvasHeight: number = 400;
  
  // VFX
  private vfx: VFXObjects = {
    flashOverlay: null,
    ghostSprites: [],
    slashGraphics: null,
  };
  
  // 체커보드 배경
  private checkerboard!: Phaser.GameObjects.TileSprite;

  constructor() {
    super({ key: 'SkeletonScene' });
  }

  // ═══════════════════════════════════════════════════════════════════
  // Phaser 생명주기
  // ═══════════════════════════════════════════════════════════════════

  preload(): void {
    // 체커보드 패턴 생성
    this.createCheckerboardTexture();
  }

  create(): void {
    this.canvasWidth = this.cameras.main.width;
    this.canvasHeight = this.cameras.main.height;

    // 1. 체커보드 배경
    this.checkerboard = this.add.tileSprite(
      0, 0,
      this.canvasWidth, this.canvasHeight,
      'checkerboard'
    );
    this.checkerboard.setOrigin(0, 0);
    this.checkerboard.setDepth(-100);

    // 2. 본 시스템 초기화 (화면 중앙 하단)
    const centerX = this.canvasWidth / 2;
    const bottomY = this.canvasHeight - 50;
    this.boneSystem = new BoneSystem(this, centerX, bottomY);

    // 3. 스켈레톤 컨트롤러 초기화
    this.skeletonController = new SkeletonController(this, this.boneSystem);
    
    // VFX 콜백 연결
    this.skeletonController.setVFXCallbacks({
      onScreenShake: (intensity) => this.doScreenShake(intensity),
      onFlash: (color, duration) => this.doFlash(color, duration),
      onGhost: (alpha) => this.doGhost(alpha),
      onSlashVFX: (angle) => this.doSlashVFX(angle),
    });

    // 4. VFX 오브젝트 초기화
    this.initVFX();

    // 5. EventBus 리스너 등록
    this.registerEventListeners();

    // 6. 준비 완료 알림
    EventBus.emit('skeleton:ready');
    console.log('[SkeletonScene] Ready');
  }

  update(time: number, delta: number): void {
    // 컨트롤러의 update는 내부적으로 scene.events.on('update')로 처리됨
  }

  // ═══════════════════════════════════════════════════════════════════
  // 초기화 메서드
  // ═══════════════════════════════════════════════════════════════════

  /**
   * 체커보드 텍스처 생성 (투명 배경 표시용)
   */
  private createCheckerboardTexture(): void {
    const size = 16;
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // 밝은 회색
    graphics.fillStyle(0x3a3a3a);
    graphics.fillRect(0, 0, size, size);
    graphics.fillRect(size, size, size, size);
    
    // 어두운 회색
    graphics.fillStyle(0x2a2a2a);
    graphics.fillRect(size, 0, size, size);
    graphics.fillRect(0, size, size, size);

    graphics.generateTexture('checkerboard', size * 2, size * 2);
    graphics.destroy();
  }

  /**
   * VFX 오브젝트 초기화
   */
  private initVFX(): void {
    // 플래시 오버레이
    this.vfx.flashOverlay = this.add.rectangle(
      this.canvasWidth / 2,
      this.canvasHeight / 2,
      this.canvasWidth,
      this.canvasHeight,
      0xffffff,
      0
    );
    this.vfx.flashOverlay.setDepth(1000);

    // 슬래시 그래픽스
    this.vfx.slashGraphics = this.add.graphics();
    this.vfx.slashGraphics.setDepth(500);
  }

  /**
   * EventBus 리스너 등록
   */
  private registerEventListeners(): void {
    // 에셋 로드
    EventBus.on('skeleton:loadAsset', (data: { url: string }) => {
      this.loadAsset(data.url);
    });

    // ImageData로 로드
    EventBus.on('skeleton:loadImageData', (data: { imageData: ImageData }) => {
      this.loadFromImageData(data.imageData);
    });

    // 모션 재생
    EventBus.on('skeleton:play', (data: { type: MotionType }) => {
      this.skeletonController.play(data.type);
      EventBus.emit('skeleton:motionStarted', { type: data.type });
    });

    // 모션 정지
    EventBus.on('skeleton:stop', () => {
      this.skeletonController.stop();
      EventBus.emit('skeleton:motionStopped');
    });

    // 설정 업데이트
    EventBus.on('skeleton:config', (config: Partial<MotionConfig>) => {
      this.skeletonController.updateConfig(config);
    });

    // 스케일 변경
    EventBus.on('skeleton:scale', (data: { scale: number }) => {
      this.boneSystem.setScale(data.scale);
    });

    // 정리
    this.events.on('shutdown', () => {
      EventBus.removeAllListeners();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 에셋 로딩
  // ═══════════════════════════════════════════════════════════════════

  /**
   * URL에서 에셋 로드
   */
  loadAsset(url: string): void {
    const key = `asset_${Date.now()}`;
    
    // 이전 텍스처 정리
    if (this.currentTextureKey && this.textures.exists(this.currentTextureKey)) {
      this.textures.remove(this.currentTextureKey);
    }

    // 새 텍스처 로드
    this.load.image(key, url);
    this.load.once('complete', () => {
      this.currentTextureKey = key;
      
      // 픽셀아트 필터 적용
      const texture = this.textures.get(key);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      
      // 본 시스템에 텍스처 설정
      this.boneSystem.setTexture(key);
      
      // 적절한 스케일 계산
      const frame = texture.get();
      const maxSize = Math.min(this.canvasWidth, this.canvasHeight) * 0.6;
      const scale = Math.min(maxSize / frame.width, maxSize / frame.height);
      this.boneSystem.setScale(Math.max(1, Math.floor(scale)));

      EventBus.emit('skeleton:assetLoaded', {
        width: frame.width,
        height: frame.height,
      });
      
      console.log(`[SkeletonScene] Asset loaded: ${frame.width}x${frame.height}`);
    });
    
    this.load.start();
  }

  /**
   * ImageData에서 에셋 로드
   */
  loadFromImageData(imageData: ImageData): void {
    const key = `imagedata_${Date.now()}`;
    
    // Canvas에 ImageData 그리기
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    // 이전 텍스처 정리
    if (this.currentTextureKey && this.textures.exists(this.currentTextureKey)) {
      this.textures.remove(this.currentTextureKey);
    }

    // 텍스처 추가
    this.textures.addCanvas(key, canvas);
    this.currentTextureKey = key;
    
    // 픽셀아트 필터
    const texture = this.textures.get(key);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    
    // 본 시스템에 적용
    this.boneSystem.setTexture(key);
    
    // 스케일 계산
    const maxSize = Math.min(this.canvasWidth, this.canvasHeight) * 0.6;
    const scale = Math.min(maxSize / imageData.width, maxSize / imageData.height);
    this.boneSystem.setScale(Math.max(1, Math.floor(scale)));

    EventBus.emit('skeleton:assetLoaded', {
      width: imageData.width,
      height: imageData.height,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // VFX 메서드
  // ═══════════════════════════════════════════════════════════════════

  /**
   * 화면 흔들림
   */
  private doScreenShake(intensity: number): void {
    this.cameras.main.shake(150, 0.01 * intensity);
  }

  /**
   * 화면 플래시
   */
  private doFlash(color: number, duration: number): void {
    if (!this.vfx.flashOverlay) return;

    this.vfx.flashOverlay.setFillStyle(color, 0.8);
    
    this.tweens.add({
      targets: this.vfx.flashOverlay,
      alpha: { from: 0.8, to: 0 },
      duration: duration,
      ease: 'Cubic.easeOut',
    });
  }

  /**
   * 잔상 효과 (TODO: 구현 필요 시 확장)
   */
  private doGhost(alpha: number): void {
    // 현재는 간단히 로깅만
    // 실제 구현 시 스프라이트 복제하여 잔상 생성
    if (alpha > 0) {
      console.log('[VFX] Ghost effect ON:', alpha);
    }
  }

  /**
   * 검기 VFX
   */
  private doSlashVFX(angle: number): void {
    if (!this.vfx.slashGraphics) return;

    const g = this.vfx.slashGraphics;
    g.clear();

    // 검기 그리기
    const centerX = this.canvasWidth / 2 + 30;
    const centerY = this.canvasHeight / 2 - 20;
    const length = 80;
    const thickness = 4;

    // 흰색 섬광
    g.lineStyle(thickness + 4, 0xffffff, 0.8);
    g.beginPath();
    g.moveTo(centerX - length/2, centerY);
    g.lineTo(centerX + length/2, centerY - 30);
    g.strokePath();

    // 노란색 코어
    g.lineStyle(thickness, 0xffff00, 1);
    g.beginPath();
    g.moveTo(centerX - length/2, centerY);
    g.lineTo(centerX + length/2, centerY - 30);
    g.strokePath();

    // 페이드 아웃
    this.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0 },
      duration: 150,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        g.clear();
        g.setAlpha(1);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 정리
  // ═══════════════════════════════════════════════════════════════════

  shutdown(): void {
    this.skeletonController?.destroy();
    this.boneSystem?.destroy();
  }
}
