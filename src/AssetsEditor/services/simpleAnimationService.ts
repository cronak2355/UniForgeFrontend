// src/AssetsEditor/services/simpleAnimationService.ts
// 백엔드 없이 Canvas 변형만으로 애니메이션 생성 (v3 - 극적인 모션)

export type SimpleAnimationType = 'idle' | 'hurt' | 'bounce' | 'shake';

export interface SimpleAnimationPreset {
  id: SimpleAnimationType;
  nameKo: string;
  emoji: string;
  frameCount: number;
}

export const SIMPLE_PRESETS: SimpleAnimationPreset[] = [
  { id: 'idle', nameKo: '숨쉬기', emoji: '😌', frameCount: 4 },
  { id: 'hurt', nameKo: '피격', emoji: '💥', frameCount: 4 },
  { id: 'bounce', nameKo: '바운스', emoji: '⬆️', frameCount: 4 },
  { id: 'shake', nameKo: '흔들림', emoji: '📳', frameCount: 4 },
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

// v5: 쓸만한 애니메이션만 유지
const ANIMATION_TRANSFORMS: Record<SimpleAnimationType, TransformParams[]> = {

  // ============ 숨쉬기 (4프레임) ============
  idle: [
    { ...defaultTransform },                                    // 1. 원본
    { ...defaultTransform, offsetY: -2, scaleY: 1.02 },         // 2. 살짝 위
    { ...defaultTransform },                                    // 3. 원본
    { ...defaultTransform, offsetY: 1, scaleY: 0.98 },          // 4. 살짝 아래
  ],

  // ============ 피격 (4프레임) ============
  hurt: [
    { ...defaultTransform },                                              // 1. 원본
    { ...defaultTransform, offsetX: -6, rotation: -12, opacity: 0.6 },    // 2. 뒤로 밀림 + 기울어짐
    { ...defaultTransform, offsetX: 3, rotation: 8, opacity: 0.4 },       // 3. 반동
    { ...defaultTransform, offsetX: -1, rotation: -3, opacity: 0.8 },     // 4. 복귀 중
  ],

  // ============ 바운스 (4프레임) - 통통 튀기 ============
  bounce: [
    { ...defaultTransform },                                    // 1. 원본
    { ...defaultTransform, offsetY: -8, scaleY: 1.1, scaleX: 0.9 },  // 2. 위로 (세로 늘어남)
    { ...defaultTransform, offsetY: -4 },                       // 3. 중간
    { ...defaultTransform, offsetY: 2, scaleY: 0.9, scaleX: 1.1 },   // 4. 착지 (납작)
  ],

  // ============ 흔들림 (4프레임) - 좌우 떨림 ============
  shake: [
    { ...defaultTransform },                                    // 1. 원본
    { ...defaultTransform, offsetX: -4, rotation: -3 },         // 2. 왼쪽
    { ...defaultTransform, offsetX: 4, rotation: 3 },           // 3. 오른쪽
    { ...defaultTransform, offsetX: -2, rotation: -1 },         // 4. 복귀
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
/**
 * 두 변환 파라미터 사이를 선형 보간 (Linear Interpolation)
 */
function lerpTransform(t1: TransformParams, t2: TransformParams, progress: number): TransformParams {
  return {
    offsetX: t1.offsetX + (t2.offsetX - t1.offsetX) * progress,
    offsetY: t1.offsetY + (t2.offsetY - t1.offsetY) * progress,
    scaleX: t1.scaleX + (t2.scaleX - t1.scaleX) * progress,
    scaleY: t1.scaleY + (t2.scaleY - t1.scaleY) * progress,
    rotation: t1.rotation + (t2.rotation - t1.rotation) * progress,
    opacity: t1.opacity + (t2.opacity - t1.opacity) * progress,
    pivotY: t1.pivotY + (t2.pivotY - t1.pivotY) * progress,
    skewX: t1.skewX + (t2.skewX - t1.skewX) * progress,
  };
}

/**
 * 메인 함수: 현재 캔버스에서 애니메이션 프레임들 생성
 * targetFrameCount가 주어지면 해당 프레임 수만큼 보간하여 생성
 */
export function generateSimpleAnimation(
  sourceCanvas: HTMLCanvasElement,
  animationType: SimpleAnimationType,
  outputSize: number,
  targetFrameCount?: number
): ImageData[] {
  const keyframes = ANIMATION_TRANSFORMS[animationType];
  const frames: ImageData[] = [];

  // 목표 프레임 수가 없거나 키프레임 수와 같으면 그대로 반환 (하위 호환)
  if (!targetFrameCount || targetFrameCount === keyframes.length) {
    for (const transform of keyframes) {
      const frameData = applyTransform(sourceCanvas, transform, outputSize);
      frames.push(frameData);
    }
    return frames;
  }

  // 보간 생성
  for (let i = 0; i < targetFrameCount; i++) {
    // 현재 진행도 (0 ~ 1)
    // 마지막 프레임이 첫 프레임과 이어지도록(Loop) 처리
    const progressTotal = (i / targetFrameCount) * keyframes.length;
    const currentIndex = Math.floor(progressTotal);
    const nextIndex = (currentIndex + 1) % keyframes.length;
    const progressLocal = progressTotal - currentIndex;

    const t1 = keyframes[currentIndex];
    const t2 = keyframes[nextIndex];

    const interpolatedTransform = lerpTransform(t1, t2, progressLocal);

    // 특정 동작(Spin 등)에서 급격한 변화가 필요한 경우 보간을 조정할 수도 있지만,
    // 대부분의 경우 선형 보간으로 부드러운 효과 가능

    // Spin의 경우 scaleX가 1 -> 0.3 -> -1 -> 0.3 -> 1 로 변함.
    // -1 -> 0.3 구간 등도 선형 보간이면 자연스러움.

    const frameData = applyTransform(sourceCanvas, interpolatedTransform, outputSize);
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
