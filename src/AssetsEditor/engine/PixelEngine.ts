// src/AssetsEditor/engine/PixelEngine.ts

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type PixelSize = 32 | 64 | 128;

export class PixelEngine {
  private pixelBuffer: Uint8ClampedArray;
  private workCanvas: HTMLCanvasElement;
  private workCtx: CanvasRenderingContext2D;
  private viewCanvas: HTMLCanvasElement;
  private viewCtx: CanvasRenderingContext2D;
  
  private resolution: number;

  constructor(canvas: HTMLCanvasElement, resolution: PixelSize = 64) {
    this.resolution = resolution;
    this.viewCanvas = canvas;
    
    // 캔버스 크기는 해상도와 동일하게 (줌은 CSS로 처리)
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

    this.pixelBuffer = new Uint8ClampedArray(resolution * resolution * 4);

    this.viewCtx.imageSmoothingEnabled = false;
    this.workCtx.imageSmoothingEnabled = false;
    
    this.clear();
  }

  getResolution(): number {
    return this.resolution;
  }

  changeResolution(newResolution: PixelSize): void {
    this.resolution = newResolution;
    
    this.workCanvas.width = newResolution;
    this.workCanvas.height = newResolution;
    
    this.viewCanvas.width = newResolution;
    this.viewCanvas.height = newResolution;
    
    this.pixelBuffer = new Uint8ClampedArray(newResolution * newResolution * 4);
    
    this.viewCtx.imageSmoothingEnabled = false;
    this.workCtx.imageSmoothingEnabled = false;
    
    this.clear();
  }

  // 뷰 좌표를 픽셀 좌표로 변환 (줌 팩터는 외부에서 전달)
  viewToPixel(viewX: number, viewY: number, zoom: number): { x: number; y: number } {
    return {
      x: Math.floor(viewX / zoom),
      y: Math.floor(viewY / zoom),
    };
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.resolution && y >= 0 && y < this.resolution;
  }

  private getBufferIndex(x: number, y: number): number {
    return (y * this.resolution + x) * 4;
  }

  drawPixelAt(x: number, y: number, color: RGBA): void {
    if (!this.isInBounds(x, y)) return;

    const idx = this.getBufferIndex(x, y);
    this.pixelBuffer[idx] = color.r;
    this.pixelBuffer[idx + 1] = color.g;
    this.pixelBuffer[idx + 2] = color.b;
    this.pixelBuffer[idx + 3] = color.a;

    this.render();
  }

  erasePixelAt(x: number, y: number): void {
    if (!this.isInBounds(x, y)) return;

    const idx = this.getBufferIndex(x, y);
    this.pixelBuffer[idx] = 0;
    this.pixelBuffer[idx + 1] = 0;
    this.pixelBuffer[idx + 2] = 0;
    this.pixelBuffer[idx + 3] = 0;

    this.render();
  }

  getPixelColorAt(x: number, y: number): RGBA {
    if (!this.isInBounds(x, y)) return { r: 0, g: 0, b: 0, a: 0 };

    const idx = this.getBufferIndex(x, y);
    return {
      r: this.pixelBuffer[idx],
      g: this.pixelBuffer[idx + 1],
      b: this.pixelBuffer[idx + 2],
      a: this.pixelBuffer[idx + 3],
    };
  }

  clear(): void {
    this.pixelBuffer.fill(0);
    this.render();
  }

  private render(): void {
    const imageData = this.workCtx.createImageData(this.resolution, this.resolution);
    imageData.data.set(this.pixelBuffer);
    this.workCtx.putImageData(imageData, 0, 0);

    this.viewCtx.clearRect(0, 0, this.resolution, this.resolution);
    this.viewCtx.drawImage(this.workCanvas, 0, 0);
  }

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
}