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
  private zoomFactor: number;

  constructor(canvas: HTMLCanvasElement, resolution: PixelSize = 64) {
    this.resolution = resolution;
    this.zoomFactor = this.calculateZoom(resolution);
    this.viewCanvas = canvas;
    
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

  private calculateZoom(resolution: PixelSize): number {
    // 캔버스 표시 크기를 ~400px로 유지
    if (resolution === 32) return 12;
    if (resolution === 64) return 6;
    return 3; // 128
  }

  getDisplaySize(): number {
    return this.resolution * this.zoomFactor;
  }

  getResolution(): number {
    return this.resolution;
  }

  getZoomFactor(): number {
    return this.zoomFactor;
  }

  changeResolution(newResolution: PixelSize): void {
    this.resolution = newResolution;
    this.zoomFactor = this.calculateZoom(newResolution);
    
    this.workCanvas.width = newResolution;
    this.workCanvas.height = newResolution;
    
    const displaySize = this.getDisplaySize();
    this.viewCanvas.width = displaySize;
    this.viewCanvas.height = displaySize;
    
    this.pixelBuffer = new Uint8ClampedArray(newResolution * newResolution * 4);
    
    this.viewCtx.imageSmoothingEnabled = false;
    this.workCtx.imageSmoothingEnabled = false;
    
    this.clear();
  }

  private viewToPixel(viewX: number, viewY: number): { x: number; y: number } {
    return {
      x: Math.floor(viewX / this.zoomFactor),
      y: Math.floor(viewY / this.zoomFactor),
    };
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.resolution && y >= 0 && y < this.resolution;
  }

  private getBufferIndex(x: number, y: number): number {
    return (y * this.resolution + x) * 4;
  }

  drawPixel(viewX: number, viewY: number, color: RGBA): void {
    const { x, y } = this.viewToPixel(viewX, viewY);
    if (!this.isInBounds(x, y)) return;

    const idx = this.getBufferIndex(x, y);
    this.pixelBuffer[idx] = color.r;
    this.pixelBuffer[idx + 1] = color.g;
    this.pixelBuffer[idx + 2] = color.b;
    this.pixelBuffer[idx + 3] = color.a;

    this.render();
  }

  erasePixel(viewX: number, viewY: number): void {
    const { x, y } = this.viewToPixel(viewX, viewY);
    if (!this.isInBounds(x, y)) return;

    const idx = this.getBufferIndex(x, y);
    this.pixelBuffer[idx] = 0;
    this.pixelBuffer[idx + 1] = 0;
    this.pixelBuffer[idx + 2] = 0;
    this.pixelBuffer[idx + 3] = 0;

    this.render();
  }

  getPixelColor(viewX: number, viewY: number): RGBA {
    const { x, y } = this.viewToPixel(viewX, viewY);
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

    this.viewCtx.clearRect(0, 0, this.viewCanvas.width, this.viewCanvas.height);
    this.viewCtx.drawImage(
      this.workCanvas,
      0, 0, this.resolution, this.resolution,
      0, 0, this.viewCanvas.width, this.viewCanvas.height
    );
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