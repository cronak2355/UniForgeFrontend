// src/AssetsEditor/engine/PixelEngine.ts

import { HistoryManager, type HistoryActionType } from './HistoryManager';
import { FrameManager, type Frame, MAX_FRAMES } from './FrameManager';

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type PixelSize = 128 | 256 | 512;

export class PixelEngine {
  private workCanvas: HTMLCanvasElement;
  private workCtx: CanvasRenderingContext2D;
  private viewCanvas: HTMLCanvasElement;
  private viewCtx: CanvasRenderingContext2D;
  private resolution: number;
  private historyManager: HistoryManager;
  private frameManager: FrameManager;

  constructor(canvas: HTMLCanvasElement, resolution: PixelSize = 128, maxHistory = 50) {
    this.resolution = resolution;
    this.viewCanvas = canvas;
    this.historyManager = new HistoryManager(maxHistory);
    this.frameManager = new FrameManager(resolution);

    canvas.width = resolution;
    canvas.height = resolution;

    const viewCtx = canvas.getContext('2d', { willReadFrequently: true });
    if (!viewCtx) throw new Error('Failed to get view canvas context');
    this.viewCtx = viewCtx;

    this.workCanvas = document.createElement('canvas');
    this.workCanvas.width = resolution;
    this.workCanvas.height = resolution;

    const workCtx = this.workCanvas.getContext('2d', { willReadFrequently: true });
    if (!workCtx) throw new Error('Failed to get work canvas context');
    this.workCtx = workCtx;

    this.viewCtx.imageSmoothingEnabled = false;
    this.workCtx.imageSmoothingEnabled = false;

    this.render();
  }

  getCanvas(): HTMLCanvasElement {
    return this.viewCanvas;
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.viewCanvas = canvas;
    const viewCtx = canvas.getContext('2d', { willReadFrequently: true });
    if (!viewCtx) throw new Error('Failed to get view canvas context');
    this.viewCtx = viewCtx;
    this.viewCtx.imageSmoothingEnabled = false;
    this.render();
  }

  // ==================== 프레임 API ====================

  get maxFrames(): number {
    return MAX_FRAMES;
  }

  addFrame(): Frame | null {
    const frame = this.frameManager.addFrame();
    return frame;
  }

  deleteFrame(index: number): boolean {
    const result = this.frameManager.deleteFrame(index);
    if (result) {
      this.historyManager.clear(); // 프레임 삭제 시 히스토리 클리어
      this.render();
    }
    return result;
  }

  duplicateFrame(index: number): Frame | null {
    const frame = this.frameManager.duplicateFrame(index);
    if (frame) {
      this.historyManager.clear();
    }
    return frame;
  }

  selectFrame(index: number): boolean {
    const result = this.frameManager.selectFrame(index);
    if (result) {
      this.render();
    }
    return result;
  }

  getCurrentFrameIndex(): number {
    return this.frameManager.getCurrentFrameIndex();
  }

  getAllFrames(): Frame[] {
    return this.frameManager.getAllFrames();
  }

  getFrameCount(): number {
    return this.frameManager.getFrameCount();
  }

  generateFrameThumbnail(index: number, size = 48): string | null {
    return this.frameManager.generateThumbnail(index, size);
  }

  // ==================== 기존 API ====================

  getResolution(): number {
    return this.resolution;
  }

  changeResolution(newResolution: PixelSize): void {
    if (this.resolution === newResolution) return;

    // 기존 픽셀 데이터를 새 해상도로 스케일링
    this.frameManager.changeResolution(newResolution);

    this.resolution = newResolution;

    this.workCanvas.width = newResolution;
    this.workCanvas.height = newResolution;

    this.viewCanvas.width = newResolution;
    this.viewCanvas.height = newResolution;

    this.viewCtx.imageSmoothingEnabled = false;
    this.workCtx.imageSmoothingEnabled = false;

    // 히스토리는 클리어 (좌표 체계가 달라지므로)
    this.historyManager.clear();

    this.render();
  }

  private get pixelBuffer(): Uint8ClampedArray {
    return this.frameManager.getCurrentFrameData();
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.resolution && y >= 0 && y < this.resolution;
  }

  private getBufferIndex(x: number, y: number): number {
    return (y * this.resolution + x) * 4;
  }

  private colorsMatch(c1: RGBA, c2: RGBA): boolean {
    return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
  }

  getPixelColorAt(x: number, y: number): RGBA {
    if (!this.isInBounds(x, y)) return { r: 0, g: 0, b: 0, a: 0 };

    const idx = this.getBufferIndex(x, y);
    const buffer = this.pixelBuffer;
    return {
      r: buffer[idx],
      g: buffer[idx + 1],
      b: buffer[idx + 2],
      a: buffer[idx + 3],
    };
  }

  private setPixelWithHistory(x: number, y: number, color: RGBA): void {
    if (!this.isInBounds(x, y)) return;

    const oldColor = this.getPixelColorAt(x, y);
    if (this.colorsMatch(oldColor, color)) return;

    this.historyManager.recordChange(x, y, oldColor, color);

    const idx = this.getBufferIndex(x, y);
    const buffer = this.pixelBuffer;
    buffer[idx] = color.r;
    buffer[idx + 1] = color.g;
    buffer[idx + 2] = color.b;
    buffer[idx + 3] = color.a;
  }

  private setPixelDirect(x: number, y: number, color: RGBA): void {
    if (!this.isInBounds(x, y)) return;

    const idx = this.getBufferIndex(x, y);
    const buffer = this.pixelBuffer;
    buffer[idx] = color.r;
    buffer[idx + 1] = color.g;
    buffer[idx + 2] = color.b;
    buffer[idx + 3] = color.a;
  }

  // ==================== 히스토리 배치 API ====================

  beginStroke(type: HistoryActionType = 'stroke'): void {
    this.historyManager.beginBatch(type);
  }

  endStroke(): void {
    this.historyManager.commitBatch();
    this.render();
  }

  cancelStroke(): void {
    this.historyManager.cancelBatch();
  }

  // ==================== 드로잉 API ====================

  drawPixelAt(x: number, y: number, color: RGBA, brushSize = 1): void {
    const radius = brushSize / 2;
    const centerOffset = Math.floor(radius);
    for (let dy = -centerOffset; dy <= centerOffset; dy++) {
      for (let dx = -centerOffset; dx <= centerOffset; dx++) {
        // Check if pixel is within circular radius
        if (dx * dx + dy * dy <= radius * radius) {
          this.setPixelWithHistory(x + dx, y + dy, color);
        }
      }
    }
    this.render();
  }

  erasePixelAt(x: number, y: number, brushSize = 1): void {
    const radius = brushSize / 2;
    const centerOffset = Math.floor(radius);
    for (let dy = -centerOffset; dy <= centerOffset; dy++) {
      for (let dx = -centerOffset; dx <= centerOffset; dx++) {
        // Check if pixel is within circular radius
        if (dx * dx + dy * dy <= radius * radius) {
          this.setPixelWithHistory(x + dx, y + dy, { r: 0, g: 0, b: 0, a: 0 });
        }
      }
    }
    this.render();
  }

  floodFill(startX: number, startY: number, fillColor: RGBA): void {
    if (!this.isInBounds(startX, startY)) return;

    const targetColor = this.getPixelColorAt(startX, startY);
    if (this.colorsMatch(targetColor, fillColor)) return;

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (!this.isInBounds(x, y)) continue;

      const currentColor = this.getPixelColorAt(x, y);
      if (!this.colorsMatch(currentColor, targetColor)) continue;

      visited.add(key);
      this.setPixelWithHistory(x, y, fillColor);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    this.render();
  }

  clear(): void {
    this.historyManager.beginBatch('clear');

    const buffer = this.pixelBuffer;
    for (let y = 0; y < this.resolution; y++) {
      for (let x = 0; x < this.resolution; x++) {
        const oldColor = this.getPixelColorAt(x, y);
        if (oldColor.a > 0) {
          this.setPixelWithHistory(x, y, { r: 0, g: 0, b: 0, a: 0 });
        }
      }
    }

    this.historyManager.commitBatch();
    this.render();
  }

  clearAllFrames(): void {
    this.frameManager.clear();
    this.historyManager.clear();
    this.render();
  }

  /**
   * 모든 해상도의 작업 내용 완전 초기화
   */
  clearAllResolutions(): void {
    this.frameManager.clearAll();
    this.historyManager.clear();
    this.render();
  }

  // ==================== AI 이미지 ====================

  applyAIImage(imageData: ImageData): void {
    this.historyManager.beginBatch('ai');

    for (let y = 0; y < this.resolution; y++) {
      for (let x = 0; x < this.resolution; x++) {
        const idx = (y * this.resolution + x) * 4;
        const color: RGBA = {
          r: imageData.data[idx],
          g: imageData.data[idx + 1],
          b: imageData.data[idx + 2],
          a: imageData.data[idx + 3],
        };

        // Always set the pixel, effectively overwriting/clearing previous content
        this.setPixelWithHistory(x, y, color);
      }
    }

    this.historyManager.commitBatch();
    this.render();
  }

  // ==================== Undo / Redo ====================

  undo(): boolean {
    const changes = this.historyManager.undo();
    if (!changes) return false;

    for (const change of changes) {
      this.setPixelDirect(change.x, change.y, change.oldColor);
    }

    this.render();
    return true;
  }

  redo(): boolean {
    const changes = this.historyManager.redo();
    if (!changes) return false;

    for (const change of changes) {
      this.setPixelDirect(change.x, change.y, change.newColor);
    }

    this.render();
    return true;
  }

  canUndo(): boolean {
    return this.historyManager.canUndo();
  }

  canRedo(): boolean {
    return this.historyManager.canRedo();
  }

  getHistoryState() {
    return this.historyManager.getState();
  }

  // ==================== 렌더링 ====================

  private render(): void {
    const imageData = this.workCtx.createImageData(this.resolution, this.resolution);
    imageData.data.set(this.pixelBuffer);
    this.workCtx.putImageData(imageData, 0, 0);

    this.viewCtx.clearRect(0, 0, this.resolution, this.resolution);
    this.viewCtx.drawImage(this.workCanvas, 0, 0);
  }

  /**
   * 특정 프레임을 캔버스에 렌더링 (프리뷰용)
   */
  renderFrame(index: number, targetCanvas: HTMLCanvasElement): void {
    const data = this.frameManager.getFrameData(index);
    if (!data) return;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    targetCanvas.width = this.resolution;
    targetCanvas.height = this.resolution;
    ctx.imageSmoothingEnabled = false;

    const imageData = ctx.createImageData(this.resolution, this.resolution);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
  }

  // ==================== Export ====================

  async exportAsBase64(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.workCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        'image/webp',
        1.0
      );
    });
  }

  /**
   * 모든 프레임을 GIF로 내보내기 위한 데이터
   */
  getAnimationData(): { frames: ImageData[]; resolution: number } {
    const frames: ImageData[] = [];

    for (let i = 0; i < this.frameManager.getFrameCount(); i++) {
      const data = this.frameManager.getFrameData(i);
      if (data) {
        const imageData = new ImageData(
          new Uint8ClampedArray(data),
          this.resolution,
          this.resolution
        );
        frames.push(imageData);
      }
    }

    return { frames, resolution: this.resolution };
  }
}
