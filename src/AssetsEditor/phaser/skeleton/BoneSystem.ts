// src/AssetsEditor/phaser/skeleton/BoneSystem.ts
// 가상 본(Bone) 계층 시스템 - 단일 이미지를 3단 분할하여 계층화

import Phaser from 'phaser';

/**
 * 본(관절) 타입
 */
export type BoneType = 'head' | 'body' | 'legs';

/**
 * 본 설정
 */
export interface BoneConfig {
  // 이미지 내 영역 (0~1 비율)
  cropStart: number;  // 시작 Y 비율
  cropEnd: number;    // 끝 Y 비율
  
  // 피벗 위치 (0~1, 0=상단, 1=하단)
  pivotX: number;
  pivotY: number;
  
  // 기본 오프셋 (부모 대비)
  offsetY: number;
}

/**
 * 본 변형 상태
 */
export interface BoneTransform {
  x: number;
  y: number;
  rotation: number;   // radians
  scaleX: number;
  scaleY: number;
  skewX: number;      // radians
  alpha: number;
}

/**
 * 기본 본 설정 (3단 분할)
 * ┌──────┐ 0%
 * │ HEAD │ 
 * ├──────┤ 30%
 * │ BODY │
 * ├──────┤ 60%
 * │ LEGS │
 * └──────┘ 100%
 */
export const DEFAULT_BONE_CONFIG: Record<BoneType, BoneConfig> = {
  head: {
    cropStart: 0,
    cropEnd: 0.30,
    pivotX: 0.5,
    pivotY: 1,      // 목 위치 (하단)
    offsetY: 0,
  },
  body: {
    cropStart: 0.30,
    cropEnd: 0.60,
    pivotX: 0.5,
    pivotY: 1,      // 허리 위치 (하단)
    offsetY: 0,
  },
  legs: {
    cropStart: 0.60,
    cropEnd: 1.0,
    pivotX: 0.5,
    pivotY: 1,      // 발 위치 (하단)
    offsetY: 0,
  },
};

/**
 * 기본 변형 상태
 */
export const DEFAULT_TRANSFORM: BoneTransform = {
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  alpha: 1,
};

/**
 * 개별 본(Bone) 클래스
 */
export class Bone {
  public readonly type: BoneType;
  public readonly container: Phaser.GameObjects.Container;
  public readonly sprite: Phaser.GameObjects.Sprite;
  
  private config: BoneConfig;
  private baseTransform: BoneTransform;
  private currentTransform: BoneTransform;
  
  // 원본 이미지 정보
  private sourceWidth: number = 0;
  private sourceHeight: number = 0;

  constructor(
    scene: Phaser.Scene,
    type: BoneType,
    config: BoneConfig = DEFAULT_BONE_CONFIG[type]
  ) {
    this.type = type;
    this.config = config;
    this.baseTransform = { ...DEFAULT_TRANSFORM };
    this.currentTransform = { ...DEFAULT_TRANSFORM };

    // 컨테이너 생성 (피벗 역할)
    this.container = scene.add.container(0, 0);
    
    // 스프라이트 생성 (임시 - 나중에 텍스처 설정)
    this.sprite = scene.add.sprite(0, 0, '__DEFAULT');
    this.sprite.setVisible(false);
    
    this.container.add(this.sprite);
  }

  /**
   * 소스 텍스처 설정 및 크롭
   */
  setTexture(textureKey: string, scene: Phaser.Scene): void {
    const texture = scene.textures.get(textureKey);
    if (!texture || texture.key === '__MISSING') return;

    const frame = texture.get();
    this.sourceWidth = frame.width;
    this.sourceHeight = frame.height;

    // 크롭 영역 계산
    const cropY = Math.floor(this.sourceHeight * this.config.cropStart);
    const cropHeight = Math.floor(this.sourceHeight * (this.config.cropEnd - this.config.cropStart));

    // 크롭된 프레임 생성
    const frameKey = `${textureKey}_${this.type}`;
    
    if (!scene.textures.exists(frameKey)) {
      // 동적으로 크롭된 텍스처 생성
      const canvas = document.createElement('canvas');
      canvas.width = this.sourceWidth;
      canvas.height = cropHeight;
      
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false; // 픽셀아트 유지
      
      // 원본에서 해당 영역만 그리기
      const sourceCanvas = texture.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
      ctx.drawImage(
        sourceCanvas,
        0, cropY,                    // 소스 시작점
        this.sourceWidth, cropHeight, // 소스 크기
        0, 0,                        // 대상 시작점
        this.sourceWidth, cropHeight  // 대상 크기
      );

      scene.textures.addCanvas(frameKey, canvas);
    }

    // 스프라이트에 적용
    this.sprite.setTexture(frameKey);
    this.sprite.setVisible(true);
    
    // 픽셀아트 필터
    this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    
    // 피벗 설정 (origin)
    this.sprite.setOrigin(this.config.pivotX, this.config.pivotY);
    
    // 스프라이트 위치 조정 (피벗 기준으로 0,0에 위치)
    this.sprite.setPosition(0, 0);
  }

  /**
   * 변형 적용
   */
  applyTransform(transform: Partial<BoneTransform>): void {
    this.currentTransform = { ...this.currentTransform, ...transform };
    
    const t = this.currentTransform;
    
    // 컨테이너에 변형 적용
    this.container.setPosition(this.baseTransform.x + t.x, this.baseTransform.y + t.y);
    this.container.setRotation(t.rotation);
    this.container.setScale(t.scaleX, t.scaleY);
    this.container.setAlpha(t.alpha);
    
    // Skew는 스프라이트에 직접 적용 (Phaser는 skew를 직접 지원하지 않으므로 행렬 사용)
    // 간단히 rotation으로 대체하거나, 커스텀 렌더링 필요
    // 여기서는 스케일X로 시뮬레이션
    if (t.skewX !== 0) {
      const skewScale = 1 + Math.abs(t.skewX) * 0.3;
      this.sprite.setScale(skewScale, 1);
    } else {
      this.sprite.setScale(1, 1);
    }
  }

  /**
   * 기본 위치 설정
   */
  setBasePosition(x: number, y: number): void {
    this.baseTransform.x = x;
    this.baseTransform.y = y;
    this.applyTransform({});
  }

  /**
   * 변형 리셋
   */
  reset(): void {
    this.currentTransform = { ...DEFAULT_TRANSFORM };
    this.applyTransform(this.currentTransform);
  }

  /**
   * 본 높이 반환
   */
  getHeight(): number {
    return this.sprite.displayHeight;
  }

  /**
   * 정리
   */
  destroy(): void {
    this.sprite.destroy();
    this.container.destroy();
  }
}

/**
 * 스켈레톤 시스템 (본 계층 관리)
 */
export class BoneSystem {
  private scene: Phaser.Scene;
  private rootContainer: Phaser.GameObjects.Container;
  
  public readonly bones: Map<BoneType, Bone> = new Map();
  
  // 계층 순서: legs(루트) -> body -> head
  private readonly hierarchy: BoneType[] = ['legs', 'body', 'head'];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    
    // 루트 컨테이너
    this.rootContainer = scene.add.container(x, y);
    
    // 본 생성 (계층 순서대로)
    this.createBones();
  }

  /**
   * 본 생성 및 계층화
   */
  private createBones(): void {
    let parentContainer = this.rootContainer;
    
    for (const boneType of this.hierarchy) {
      const bone = new Bone(this.scene, boneType);
      this.bones.set(boneType, bone);
      
      // 부모 컨테이너에 추가
      parentContainer.add(bone.container);
      
      // 다음 본의 부모가 됨
      parentContainer = bone.container;
    }
  }

  /**
   * 텍스처 설정 및 위치 계산
   */
  setTexture(textureKey: string): void {
    const texture = this.scene.textures.get(textureKey);
    if (!texture || texture.key === '__MISSING') return;

    const frame = texture.get();
    const totalHeight = frame.height;

    // 각 본에 텍스처 설정
    for (const [type, bone] of this.bones) {
      bone.setTexture(textureKey, this.scene);
    }

    // 본 위치 설정 (아래에서 위로 쌓기)
    this.arrangeBones(totalHeight);
  }

  /**
   * 본 배치 (계층적 위치 설정)
   */
  private arrangeBones(totalHeight: number): void {
    const configs = DEFAULT_BONE_CONFIG;
    
    // Legs는 루트 위치 (0, 0) - 발이 기준점
    const legs = this.bones.get('legs')!;
    legs.setBasePosition(0, 0);
    
    // Body는 Legs 위에
    const body = this.bones.get('body')!;
    const legsHeight = totalHeight * (configs.legs.cropEnd - configs.legs.cropStart);
    body.setBasePosition(0, -legsHeight);
    
    // Head는 Body 위에
    const head = this.bones.get('head')!;
    const bodyHeight = totalHeight * (configs.body.cropEnd - configs.body.cropStart);
    head.setBasePosition(0, -bodyHeight);
  }

  /**
   * 본 변형 적용
   */
  applyBoneTransform(boneType: BoneType, transform: Partial<BoneTransform>): void {
    const bone = this.bones.get(boneType);
    if (bone) {
      bone.applyTransform(transform);
    }
  }

  /**
   * 모든 본 변형 적용
   */
  applyAllTransforms(transforms: Partial<Record<BoneType, Partial<BoneTransform>>>): void {
    for (const [type, transform] of Object.entries(transforms)) {
      this.applyBoneTransform(type as BoneType, transform);
    }
  }

  /**
   * 모든 본 리셋
   */
  resetAll(): void {
    for (const bone of this.bones.values()) {
      bone.reset();
    }
  }

  /**
   * 루트 위치 설정
   */
  setPosition(x: number, y: number): void {
    this.rootContainer.setPosition(x, y);
  }

  /**
   * 루트 스케일 설정
   */
  setScale(scale: number): void {
    this.rootContainer.setScale(scale);
  }

  /**
   * 정리
   */
  destroy(): void {
    for (const bone of this.bones.values()) {
      bone.destroy();
    }
    this.bones.clear();
    this.rootContainer.destroy();
  }
}
