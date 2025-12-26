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
 */
export class FrameManager {
  private frames: Frame[] = [];
  private currentFrameIndex = 0;
  private resolution: number;

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
   * 해상도 변경 시 모든 프레임 리셋
   */
  changeResolution(newResolution: number): void {
    this.resolution = newResolution;
    this.frames = [];
    this.currentFrameIndex = 0;
    this.addFrame();
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
   * 전체 클리어
   */
  clear(): void {
    this.frames = [];
    this.currentFrameIndex = 0;
    this.addFrame();
  }
}