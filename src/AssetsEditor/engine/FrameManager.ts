// src/AssetsEditor/engine/FrameManager.ts

import type { RGBA } from './PixelEngine';

export const MAX_FRAMES = 4;

export interface Frame {
  id: string;
  name: string;
  data: Uint8ClampedArray;
}

/**
 * 프레임 관리자
 * - 최대 4프레임까지 지원
 * - 각 프레임은 독립적인 픽셀 데이터 보유
 * - 해상도별로 작업 상태를 독립적으로 저장
 */
export class FrameManager {
  private frames: Frame[] = [];
  private currentFrameIndex = 0;
  private resolution: number;

  // 해상도별 프레임 데이터 저장소
  private resolutionCache: Map<number, { frames: Frame[]; currentIndex: number }> = new Map();

  constructor(resolution: number) {
    this.resolution = resolution;
    // 기본 프레임 1개 생성
    this.addFrame();
  }

  /**
   * 새 프레임 추가
   */
  addFrame(): Frame | null {
    if (this.frames.length >= MAX_FRAMES) {
      return null;
    }

    const frame: Frame = {
      id: crypto.randomUUID(),
      name: `Frame ${this.frames.length + 1}`,
      data: new Uint8ClampedArray(this.resolution * this.resolution * 4),
    };

    this.frames.push(frame);
    return frame;
  }

  /**
   * 프레임 삭제
   */
  deleteFrame(index: number): boolean {
    if (this.frames.length <= 1 || index < 0 || index >= this.frames.length) {
      return false;
    }

    this.frames.splice(index, 1);

    // 현재 인덱스 조정
    if (this.currentFrameIndex >= this.frames.length) {
      this.currentFrameIndex = this.frames.length - 1;
    }

    return true;
  }

  /**
   * 프레임 복제
   */
  duplicateFrame(index: number): Frame | null {
    if (this.frames.length >= MAX_FRAMES || index < 0 || index >= this.frames.length) {
      return null;
    }

    const sourceFrame = this.frames[index];
    const newFrame: Frame = {
      id: crypto.randomUUID(),
      name: `${sourceFrame.name} copy`,
      data: new Uint8ClampedArray(sourceFrame.data),
    };

    // 원본 다음 위치에 삽입
    this.frames.splice(index + 1, 0, newFrame);
    return newFrame;
  }

  /**
   * 프레임 순서 변경
   */
  moveFrame(fromIndex: number, toIndex: number): boolean {
    if (
      fromIndex < 0 || fromIndex >= this.frames.length ||
      toIndex < 0 || toIndex >= this.frames.length ||
      fromIndex === toIndex
    ) {
      return false;
    }

    const [frame] = this.frames.splice(fromIndex, 1);
    this.frames.splice(toIndex, 0, frame);

    // 현재 인덱스 조정
    if (this.currentFrameIndex === fromIndex) {
      this.currentFrameIndex = toIndex;
    } else if (fromIndex < this.currentFrameIndex && toIndex >= this.currentFrameIndex) {
      this.currentFrameIndex--;
    } else if (fromIndex > this.currentFrameIndex && toIndex <= this.currentFrameIndex) {
      this.currentFrameIndex++;
    }

    return true;
  }

  /**
   * 현재 프레임 선택
   */
  selectFrame(index: number): boolean {
    if (index < 0 || index >= this.frames.length) {
      return false;
    }
    this.currentFrameIndex = index;
    return true;
  }

  /**
   * 현재 프레임 인덱스
   */
  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  /**
   * 현재 프레임 데이터
   */
  getCurrentFrameData(): Uint8ClampedArray {
    return this.frames[this.currentFrameIndex].data;
  }

  /**
   * 현재 프레임 객체
   */
  getCurrentFrame(): Frame {
    return this.frames[this.currentFrameIndex];
  }

  /**
   * 모든 프레임
   */
  getAllFrames(): Frame[] {
    return this.frames;
  }

  /**
   * 프레임 개수
   */
  getFrameCount(): number {
    return this.frames.length;
  }

  /**
   * 프레임 데이터 직접 접근
   */
  getFrameData(index: number): Uint8ClampedArray | null {
    if (index < 0 || index >= this.frames.length) {
      return null;
    }
    return this.frames[index].data;
  }

  /**
   * 해상도 변경 시 현재 상태를 저장하고 새 해상도 상태를 로드
   * 각 해상도별로 독립적인 작업 상태 유지
   */
  changeResolution(newResolution: number): void {
    if (this.resolution === newResolution) return;

    // 리사이즈를 위한 임시 캔버스 생성
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // 새 프레임 데이터 배열
    const newFrames: Frame[] = [];

    // 각 프레임을 새 해상도로 리사이즈
    for (const frame of this.frames) {
      // 1. 현재 데이터로 캔버스 그리기
      tempCanvas.width = this.resolution;
      tempCanvas.height = this.resolution;

      const imgData = new ImageData(
        new Uint8ClampedArray(frame.data),
        this.resolution,
        this.resolution
      );
      ctx.putImageData(imgData, 0, 0);

      // 2. 리사이즈 처리
      let newImgData: ImageData;

      // Downscaling (Integer Ratio): Use Quality Box Sampling
      // High-resolution to Low-resolution (e.g. 512 -> 128)
      if (newResolution < this.resolution && Number.isInteger(this.resolution / newResolution)) {
        const ratio = this.resolution / newResolution;
        newImgData = new ImageData(newResolution, newResolution);
        const src = new Uint8ClampedArray(frame.data);
        const dst = newImgData.data;

        for (let y = 0; y < newResolution; y++) {
          for (let x = 0; x < newResolution; x++) {
            let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

            for (let dy = 0; dy < ratio; dy++) {
              for (let dx = 0; dx < ratio; dx++) {
                const srcIdx = ((y * ratio + dy) * this.resolution + (x * ratio + dx)) * 4;
                const a = src[srcIdx + 3];
                // Alpha-weighted color averaging (prevents dark edges)
                if (a > 0) {
                  rSum += src[srcIdx] * a;
                  gSum += src[srcIdx + 1] * a;
                  bSum += src[srcIdx + 2] * a;
                }
                aSum += a;
              }
            }

            const dstIdx = (y * newResolution + x) * 4;
            const area = ratio * ratio;

            if (aSum > 0) {
              dst[dstIdx] = Math.round(rSum / aSum);     // R
              dst[dstIdx + 1] = Math.round(gSum / aSum); // G
              dst[dstIdx + 2] = Math.round(bSum / aSum); // B
              dst[dstIdx + 3] = Math.round(aSum / area); // A (Average alpha)
            } else {
              dst[dstIdx + 3] = 0;
            }
          }
        }
      } else {
        // Upscaling or Non-integer: Use Canvas API (Nearest Neighbor for upscaling)
        const newCanvas = document.createElement('canvas');
        newCanvas.width = newResolution;
        newCanvas.height = newResolution;
        const newCtx = newCanvas.getContext('2d')!;

        newCtx.imageSmoothingEnabled = false; // Keep edges sharp for upscaling

        newCtx.drawImage(
          tempCanvas,
          0, 0, this.resolution, this.resolution,
          0, 0, newResolution, newResolution
        );
        newImgData = newCtx.getImageData(0, 0, newResolution, newResolution);
      }

      newFrames.push({
        id: frame.id,
        name: frame.name,
        data: new Uint8ClampedArray(newImgData.data.buffer),
      });
    }

    // 상태 업데이트
    this.resolution = newResolution;
    this.frames = newFrames;
    this.resolutionCache.clear(); // 해상도 변경 시 캐시 무효화 (항상 현재 상태 유지)
  }

  /**
   * 프레임 이름 변경
   */
  renameFrame(index: number, name: string): boolean {
    if (index < 0 || index >= this.frames.length) {
      return false;
    }
    this.frames[index].name = name;
    return true;
  }

  /**
   * 프레임 썸네일 생성 (Base64)
   */
  generateThumbnail(index: number, size = 64): string | null {
    const data = this.getFrameData(index);
    if (!data) return null;

    const canvas = document.createElement('canvas');
    canvas.width = this.resolution;
    canvas.height = this.resolution;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.createImageData(this.resolution, this.resolution);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);

    // 썸네일 크기로 리사이즈
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = size;
    thumbCanvas.height = size;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (!thumbCtx) return null;

    thumbCtx.imageSmoothingEnabled = false;
    thumbCtx.drawImage(canvas, 0, 0, size, size);

    return thumbCanvas.toDataURL('image/png');
  }

  /**
   * 현재 해상도만 클리어 (다른 해상도 캐시는 유지)
   */
  clear(): void {
    this.frames = [];
    this.currentFrameIndex = 0;
    this.addFrame();
  }

  /**
   * 모든 해상도의 캐시를 포함해서 완전 초기화
   */
  clearAll(): void {
    this.resolutionCache.clear();
    this.frames = [];
    this.currentFrameIndex = 0;
    this.addFrame();
  }
}
