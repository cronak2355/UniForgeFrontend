// src/AssetsEditor/services/simpleAnimationService.ts
// 백엔드 없이 Canvas 변형만으로 애니메이션 생성 (v3 - 극적인 모션)

export type SimpleAnimationType = 'idle' | 'walk' | 'jump' | 'attack' | 'hurt' | 'spin';

export interface SimpleAnimationPreset {
  id: SimpleAnimationType;
  nameKo: string;
  emoji: string;
  frameCount: number;
}

export const SIMPLE_PRESETS: SimpleAnimationPreset[] = [
  { id: 'idle', nameKo: '숨쉬기', emoji: '😌', frameCount: 4 },
  { id: 'walk', nameKo: '걷기', emoji: '🚶', frameCount: 6 },
  { id: 'jump', nameKo: '점프', emoji: '⬆️', frameCount: 6 },
  { id: 'attack', nameKo: '공격', emoji: '⚔️', frameCount: 6 },
  { id: 'hurt', nameKo: '피격', emoji: '💥', frameCount: 4 },
  { id: 'spin', nameKo: '회전', emoji: '🔄', frameCount: 4 },
];

interface TransformParams {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // degrees
  opacity: number;
  pivotY: number;   // 0=top, 0.5=center, 1=bottom (feet)
  skewX: number;    // 기울임 (degrees) - 추가!
}

// 기본값
const defaultTransform: TransformParams = {
  offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, 
  rotation: 0, opacity: 1, pivotY: 0.5, skewX: 0
};

// v4: 첫 프레임 원본 유지 + 겹침 방지
const ANIMATION_TRANSFORMS: Record<SimpleAnimationType, TransformParams[]> = {
  
  // ============ 숨쉬기 (4프레임) - OK 유지 ============
  idle: [
    { ...defaultTransform },                                    // 1. 원본
    { ...defaultTransform, offsetY: -2, scaleY: 1.02 },         // 2. 살짝 위
    { ...defaultTransform },                                    // 3. 원본
    { ...defaultTransform, offsetY: 1, scaleY: 0.98 },          // 4. 살짝 아래
  ],

  // ============ 걷기 (6프레임) - 이동 위주, 회전 최소 ============
  walk: [
    { ...defaultTransform },                                    // 1. 원본 (베이스)
    { ...defaultTransform, offsetX: -2, offsetY: -3 },          // 2. 왼발 들기
    { ...defaultTransform, offsetY: -1 },                       // 3. 중간
    { ...defaultTransform, offsetX: 2, offsetY: -3 },           // 4. 오른발 들기
    { ...defaultTransform, offsetY: -1 },                       // 5. 중간
    { ...defaultTransform },                                    // 6. 원본 복귀
  ],

  // ============ 점프 (6프레임) - 위아래 이동 위주 ============
  jump: [
    { ...defaultTransform },                                    // 1. 원본 (베이스)
    { ...defaultTransform, offsetY: 3, scaleY: 0.9 },           // 2. 웅크림
    { ...defaultTransform, offsetY: -6 },                       // 3. 점프 시작
    { ...defaultTransform, offsetY: -10 },                      // 4. 정점
    { ...defaultTransform, offsetY: -4 },                       // 5. 하강
    { ...defaultTransform, offsetY: 2, scaleY: 0.95 },          // 6. 착지
  ],

  // ============ 공격 (6프레임) - X축 이동 위주 ============
  attack: [
    { ...defaultTransform },                                    // 1. 원본 (베이스)
    { ...defaultTransform, offsetX: -3 },                       // 2. 뒤로 준비
    { ...defaultTransform, offsetX: -5 },                       // 3. 뒤로 최대
    { ...defaultTransform, offsetX: 6 },                        // 4. 찌르기!
    { ...defaultTransform, offsetX: 4 },                        // 5. 찌르기 유지
    { ...defaultTransform, offsetX: 1 },                        // 6. 복귀
  ],

  // ============ 피격 (4프레임) - OK 유지 (원래 버전) ============
  hurt: [
    { ...defaultTransform },                                              // 1. 원본
    { ...defaultTransform, offsetX: -6, rotation: -12, opacity: 0.6 },    // 2. 뒤로 밀림 + 기울어짐
    { ...defaultTransform, offsetX: 3, rotation: 8, opacity: 0.4 },       // 3. 반동
    { ...defaultTransform, offsetX: -1, rotation: -3, opacity: 0.8 },     // 4. 복귀 중
  ],

  // ============ 회전 (4프레임) - X축 스케일만 ============
  spin: [
    { ...defaultTransform },                                    // 1. 원본 (베이스)
    { ...defaultTransform, scaleX: 0.3 },                       // 2. 옆면
    { ...defaultTransform, scaleX: -1 },                        // 3. 뒤집힘
    { ...defaultTransform, scaleX: 0.3 },                       // 4. 옆면 복귀
  ],
};

/**
 * 원본 이미지에 변형을 적용하여 새 ImageData 생성
 */
function applyTransform(
  sourceCanvas: HTMLCanvasElement,
  transform: TransformParams,
  outputSize: number
): ImageData {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = outputSize;
  tempCanvas.height = outputSize;
  const ctx = tempCanvas.getContext('2d')!;

  ctx.clearRect(0, 0, outputSize, outputSize);

  const cx = outputSize / 2;
  const cy = outputSize * transform.pivotY;

  ctx.save();
  ctx.globalAlpha = transform.opacity;

  // 피벗 포인트로 이동 + 오프셋
  ctx.translate(cx + transform.offsetX, cy + transform.offsetY);
  
  // 회전
  ctx.rotate((transform.rotation * Math.PI) / 180);
  
  // skew (기울임)
  if (transform.skewX !== 0) {
    ctx.transform(1, 0, Math.tan((transform.skewX * Math.PI) / 180), 1, 0, 0);
  }
  
  // 스케일
  ctx.scale(transform.scaleX, transform.scaleY);
  
  // 원점으로 복귀
  ctx.translate(-cx, -cy);

  ctx.drawImage(sourceCanvas, 0, 0, outputSize, outputSize);
  ctx.restore();

  return ctx.getImageData(0, 0, outputSize, outputSize);
}

/**
 * 메인 함수: 현재 캔버스에서 애니메이션 프레임들 생성
 */
export function generateSimpleAnimation(
  sourceCanvas: HTMLCanvasElement,
  animationType: SimpleAnimationType,
  outputSize: number
): ImageData[] {
  const transforms = ANIMATION_TRANSFORMS[animationType];
  const frames: ImageData[] = [];

  for (const transform of transforms) {
    const frameData = applyTransform(sourceCanvas, transform, outputSize);
    frames.push(frameData);
  }

  return frames;
}

/**
 * ImageData를 base64 DataURL로 변환
 */
export function imageDataToDataURL(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
