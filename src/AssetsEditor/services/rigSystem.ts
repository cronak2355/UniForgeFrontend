/**
 * 단순 리깅 시스템
 * - 브러시로 부위 칠하기
 * - 드래그로 자유롭게 움직이기
 */

export interface Point {
  x: number;
  y: number;
}

export interface RigPart {
  id: string;
  name: string;
  color: string;
  pixels: Set<string>;  // "x,y" 형태
  zIndex: number;
}

export interface PartPose {
  x: number;      // 이동 X
  y: number;      // 이동 Y
  rotation: number; // 회전 (도)
  scale: number;    // 크기
}

export interface FrameData {
  [partId: string]: PartPose;
}

export const DEFAULT_POSE: PartPose = {
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
};

export const PART_COLORS = [
  '#ef4444', '#22c55e', '#3b82f6', '#eab308', 
  '#a855f7', '#f97316', '#06b6d4', '#ec4899',
];

// 부위의 중심점 계산 (픽셀 중심 기준)
export function getPartCenter(pixels: Set<string>): Point {
  if (pixels.size === 0) return { x: 0, y: 0 };
  
  let sumX = 0, sumY = 0;
  pixels.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    sumX += x + 0.5;  // 픽셀 중심
    sumY += y + 0.5;
  });
  
  return {
    x: sumX / pixels.size,
    y: sumY / pixels.size,
  };
}

// 부위의 바운딩 박스 계산
export function getPartBounds(pixels: Set<string>): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  pixels.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  
  return { minX, minY, maxX, maxY };
}

// 프레임 렌더링
export function renderAnimationFrame(
  sourceCanvas: HTMLCanvasElement,
  parts: RigPart[],
  poses: FrameData,
  canvasSize: number
): ImageData {
  const result = document.createElement('canvas');
  result.width = canvasSize;
  result.height = canvasSize;
  const ctx = result.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  
  const sourceCtx = sourceCanvas.getContext('2d')!;
  const sourceData = sourceCtx.getImageData(0, 0, canvasSize, canvasSize);
  
  // 부위에 속하지 않은 픽셀 먼저 그리기
  const allPartPixels = new Set<string>();
  parts.forEach(p => p.pixels.forEach(px => allPartPixels.add(px)));
  
  const baseImageData = ctx.createImageData(canvasSize, canvasSize);
  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      const key = `${x},${y}`;
      if (!allPartPixels.has(key)) {
        const idx = (y * canvasSize + x) * 4;
        baseImageData.data[idx] = sourceData.data[idx];
        baseImageData.data[idx + 1] = sourceData.data[idx + 1];
        baseImageData.data[idx + 2] = sourceData.data[idx + 2];
        baseImageData.data[idx + 3] = sourceData.data[idx + 3];
      }
    }
  }
  ctx.putImageData(baseImageData, 0, 0);
  
  // zIndex 순으로 부위 렌더링
  const sortedParts = [...parts].sort((a, b) => a.zIndex - b.zIndex);
  
  sortedParts.forEach(part => {
    if (part.pixels.size === 0) return;
    
    const pose = poses[part.id] || DEFAULT_POSE;
    const bounds = getPartBounds(part.pixels);
    
    // 부위 이미지 추출
    const partWidth = bounds.maxX - bounds.minX + 1;
    const partHeight = bounds.maxY - bounds.minY + 1;
    const partCanvas = document.createElement('canvas');
    partCanvas.width = partWidth;
    partCanvas.height = partHeight;
    const partCtx = partCanvas.getContext('2d')!;
    
    const partImageData = partCtx.createImageData(partWidth, partHeight);
    part.pixels.forEach(key => {
      const [px, py] = key.split(',').map(Number);
      const srcIdx = (py * canvasSize + px) * 4;
      const dstIdx = ((py - bounds.minY) * partWidth + (px - bounds.minX)) * 4;
      partImageData.data[dstIdx] = sourceData.data[srcIdx];
      partImageData.data[dstIdx + 1] = sourceData.data[srcIdx + 1];
      partImageData.data[dstIdx + 2] = sourceData.data[srcIdx + 2];
      partImageData.data[dstIdx + 3] = sourceData.data[srcIdx + 3];
    });
    partCtx.putImageData(partImageData, 0, 0);
    
    // 부위의 로컬 중심점 (partCanvas 내에서)
    const centerInPart = {
      x: partWidth / 2,
      y: partHeight / 2,
    };
    
    // 원래 위치의 중심점 (캔버스 전체에서)
    const originalCenter = {
      x: bounds.minX + centerInPart.x,
      y: bounds.minY + centerInPart.y,
    };
    
    // 변환 적용하여 그리기
    ctx.save();
    
    // 1. 원래 중심 + 이동값 위치로 이동
    ctx.translate(originalCenter.x + pose.x, originalCenter.y + pose.y);
    
    // 2. 회전
    ctx.rotate((pose.rotation * Math.PI) / 180);
    
    // 3. 스케일
    ctx.scale(pose.scale, pose.scale);
    
    // 4. 이미지를 중심 기준으로 그리기
    ctx.drawImage(
      partCanvas,
      -centerInPart.x,
      -centerInPart.y
    );
    
    ctx.restore();
  });
  
  return ctx.getImageData(0, 0, canvasSize, canvasSize);
}
