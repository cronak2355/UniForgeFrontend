// src/AssetsEditor/phaser/scenes/MainScene.ts
// Phaser 메인 씬 - 에셋 렌더링 및 모션 테스트

import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import type { MotionType, MotionConfig } from '../EventBus';
import { MotionController } from '../controllers/MotionController';

export class MainScene extends Phaser.Scene {
  private motionController!: MotionController;
  private currentSprite: Phaser.GameObjects.Sprite | null = null;
  private background!: Phaser.GameObjects.Rectangle;
  
  // 로딩 상태
  private isLoading: boolean = false;
  private loadingText: Phaser.GameObjects.Text | null = null;
  
  // 그리드 (픽셀아트 확인용)
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private showGrid: boolean = false;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload(): void {
    // 기본 플레이스홀더 이미지 생성
    this.createPlaceholderTexture();
  }

  create(): void {
    const { width, height } = this.scale;

    // 배경 (체커보드 패턴 - 투명 영역 표시용)
    this.createCheckerboardBackground(width, height);

    // 그리드 오버레이 준비
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(100);

    // 모션 컨트롤러 초기화
    this.motionController = new MotionController(this);

    // 기본 플레이스홀더 스프라이트
    this.createDefaultSprite();

    // 로딩 텍스트
    this.loadingText = this.add.text(width / 2, height / 2, 'Loading...', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setVisible(false).setDepth(200);

    // EventBus 리스너 등록
    this.setupEventListeners();

    // React에 준비 완료 알림
    EventBus.emit('phaser:ready', { scene: this });
  }

  update(time: number, delta: number): void {
    // MotionController 업데이트 (Sine wave 모션용)
    this.motionController.update(delta);
  }

  /**
   * 플레이스홀더 텍스처 생성
   */
  private createPlaceholderTexture(): void {
    const size = 64;
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // 회색 배경
    graphics.fillStyle(0x444444);
    graphics.fillRect(0, 0, size, size);
    
    // 대각선 줄무늬
    graphics.lineStyle(2, 0x666666);
    for (let i = -size; i < size * 2; i += 8) {
      graphics.lineBetween(i, 0, i + size, size);
    }
    
    // 테두리
    graphics.lineStyle(2, 0x888888);
    graphics.strokeRect(0, 0, size, size);
    
    graphics.generateTexture('placeholder', size, size);
    graphics.destroy();
  }

  /**
   * 체커보드 배경 생성 (투명 영역 표시)
   */
  private createCheckerboardBackground(width: number, height: number): void {
    const tileSize = 16;
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    for (let y = 0; y < height; y += tileSize) {
      for (let x = 0; x < width; x += tileSize) {
        const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        graphics.fillStyle(isEven ? 0x3a3a3a : 0x2a2a2a);
        graphics.fillRect(x, y, tileSize, tileSize);
      }
    }
    
    graphics.generateTexture('checkerboard', width, height);
    this.add.image(width / 2, height / 2, 'checkerboard').setDepth(-1);
    graphics.destroy();
  }

  /**
   * 기본 스프라이트 생성
   */
  private createDefaultSprite(): void {
    const { width, height } = this.scale;
    
    this.currentSprite = this.add.sprite(width / 2, height / 2, 'placeholder');
    this.currentSprite.setDepth(10);
    
    // 픽셀아트 스케일링 (Nearest Neighbor)
    this.currentSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    
    // 모션 컨트롤러에 스프라이트 설정
    this.motionController.setSprite(this.currentSprite);
  }

  /**
   * EventBus 리스너 설정
   */
  private setupEventListeners(): void {
    // 모션 재생
    EventBus.on('motion:play', (data) => {
      this.motionController.play(data.type);
    });

    // 모션 정지
    EventBus.on('motion:stop', () => {
      this.motionController.stop();
    });

    // 에셋 로드
    EventBus.on('asset:load', (data) => {
      this.loadExternalAsset(data.url, data.key);
    });

    // 에셋 클리어
    EventBus.on('asset:clear', () => {
      this.clearCurrentAsset();
    });

    // 설정 업데이트
    EventBus.on('config:update', (config) => {
      this.motionController.updateConfig(config);
    });

    // 줌 변경
    EventBus.on('preview:zoom', (data) => {
      if (this.currentSprite) {
        this.currentSprite.setScale(data.scale);
        // 모션 컨트롤러에 새 스케일 반영
        this.motionController.setSprite(this.currentSprite);
      }
    });
  }

  /**
   * 외부 이미지 URL 로드
   */
  private loadExternalAsset(url: string, key: string): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.loadingText?.setVisible(true);

    // 기존 텍스처 제거
    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }

    // 이미지 로드
    this.load.image(key, url);
    
    this.load.once('complete', () => {
      this.isLoading = false;
      this.loadingText?.setVisible(false);
      
      // 스프라이트 교체
      this.replaceSprite(key);
      
      // 텍스처 정보
      const texture = this.textures.get(key);
      const frame = texture.get();
      
      EventBus.emit('asset:loaded', {
        key,
        width: frame.width,
        height: frame.height
      });
    });

    this.load.once('loaderror', () => {
      this.isLoading = false;
      this.loadingText?.setVisible(false);
      
      EventBus.emit('asset:error', {
        key,
        error: 'Failed to load image'
      });
    });

    this.load.start();
  }

  /**
   * 스프라이트 교체
   */
  private replaceSprite(textureKey: string): void {
    const { width, height } = this.scale;
    
    // 기존 스프라이트 제거
    if (this.currentSprite) {
      this.motionController.stop();
      this.currentSprite.destroy();
    }

    // 새 스프라이트 생성
    this.currentSprite = this.add.sprite(width / 2, height / 2, textureKey);
    this.currentSprite.setDepth(10);
    
    // 픽셀아트 필터
    this.currentSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    
    // 자동 스케일 (캔버스에 맞게)
    this.autoScaleSprite();
    
    // 모션 컨트롤러에 새 스프라이트 설정
    this.motionController.setSprite(this.currentSprite);
  }

  /**
   * 스프라이트 자동 스케일
   */
  private autoScaleSprite(): void {
    if (!this.currentSprite) return;
    
    const { width, height } = this.scale;
    const maxSize = Math.min(width, height) * 0.7;
    
    const spriteWidth = this.currentSprite.width;
    const spriteHeight = this.currentSprite.height;
    const maxDimension = Math.max(spriteWidth, spriteHeight);
    
    if (maxDimension > maxSize) {
      const scale = maxSize / maxDimension;
      this.currentSprite.setScale(scale);
    } else if (maxDimension < 64) {
      // 너무 작으면 확대 (픽셀아트)
      const scale = Math.floor(maxSize / maxDimension);
      this.currentSprite.setScale(Math.max(1, scale));
    }
  }

  /**
   * 현재 에셋 클리어
   */
  private clearCurrentAsset(): void {
    this.motionController.stop();
    
    if (this.currentSprite) {
      this.currentSprite.setTexture('placeholder');
      this.currentSprite.setScale(1);
      this.motionController.setSprite(this.currentSprite);
    }
  }

  /**
   * 그리드 토글
   */
  toggleGrid(show: boolean): void {
    this.showGrid = show;
    
    if (!this.gridGraphics) return;
    this.gridGraphics.clear();
    
    if (!show || !this.currentSprite) return;

    const sprite = this.currentSprite;
    const bounds = sprite.getBounds();
    const pixelSize = sprite.scaleX; // 1픽셀 = scaleX 크기

    this.gridGraphics.lineStyle(1, 0x00ff00, 0.3);
    
    // 수직선
    for (let x = bounds.left; x <= bounds.right; x += pixelSize) {
      this.gridGraphics.lineBetween(x, bounds.top, x, bounds.bottom);
    }
    
    // 수평선
    for (let y = bounds.top; y <= bounds.bottom; y += pixelSize) {
      this.gridGraphics.lineBetween(bounds.left, y, bounds.right, y);
    }
  }

  /**
   * ImageData 직접 로드 (Canvas에서 복사)
   */
  loadFromImageData(imageData: ImageData, key: string = 'canvas-asset'): void {
    // 임시 캔버스에 ImageData 그리기
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    
    // Data URL로 변환
    const dataUrl = canvas.toDataURL('image/png');
    
    // Phaser에 로드
    this.loadExternalAsset(dataUrl, key);
  }

  /**
   * 현재 스프라이트 반환
   */
  getCurrentSprite(): Phaser.GameObjects.Sprite | null {
    return this.currentSprite;
  }

  /**
   * 씬 정리
   */
  shutdown(): void {
    // EventBus 리스너 제거
    EventBus.off('motion:play');
    EventBus.off('motion:stop');
    EventBus.off('asset:load');
    EventBus.off('asset:clear');
    EventBus.off('config:update');
    EventBus.off('preview:zoom');
    
    // 모션 컨트롤러 정리
    this.motionController.destroy();
  }
}
