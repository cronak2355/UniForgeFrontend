// src/AssetsEditor/context/AssetsEditorContext.tsx

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { PixelEngine, type RGBA, type PixelSize } from '../engine/PixelEngine';
import type { Frame } from '../engine/FrameManager';
import { generateAsset } from '../services/SagemakerService';

export type Tool = 'brush' | 'eraser' | 'eyedropper' | 'fill';

interface Asset {
  id: string;
  name: string;
  type: 'character' | 'object' | 'tile';
  imageData: string;
  stats: { hp: number; speed: number; attack: number };
  createdAt: Date;
}

interface AssetsEditorContextType {
  // Canvas & Engine
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  initEngine: () => void;

  // Tool state
  tool: Tool;
  setTool: (tool: Tool) => void;
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;

  // Color state
  color: RGBA;
  setColor: (color: RGBA) => void;
  currentColor: RGBA;
  setCurrentColor: (color: RGBA) => void;

  // Resolution & Zoom
  pixelSize: PixelSize;
  setPixelSize: (size: PixelSize) => void;
  zoom: number;
  setZoom: (zoom: number) => void;

  // Brush Size
  brushSize: number;
  setBrushSize: (size: number) => void;

  // Canvas Actions
  clear: () => void;
  clearCanvas: () => void;

  // Pointer Events
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: () => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyState: { undoCount: number; redoCount: number };

  // Frame Management
  frames: Frame[];
  currentFrameIndex: number;
  maxFrames: number;
  addFrame: () => void;
  deleteFrame: (index: number) => void;
  duplicateFrame: (index: number) => void;
  selectFrame: (index: number) => void;
  getFrameThumbnail: (index: number) => string | null;

  // Animation Preview
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  fps: number;
  setFps: (fps: number) => void;

  // AI Image
  loadAIImage: (blob: Blob) => Promise<void>;
  applyImageData: (imageData: ImageData) => void;
  getWorkCanvas: () => HTMLCanvasElement | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  featherAmount: number;
  setFeatherAmount: (amount: number) => void;



  // Export
  downloadWebP: (filename: string) => Promise<void>;
  saveToLibrary: (name: string, type: Asset['type'], stats: Asset['stats']) => Promise<void>;

  // Library
  assets: Asset[];
  deleteAsset: (id: string) => void;
  loadAsset: (id: string) => void;
  triggerBackgroundRemoval: () => void;
}

const AssetsEditorContext = createContext<AssetsEditorContextType | null>(null);

export function AssetsEditorProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PixelEngine | null>(null);

  const [currentTool, setCurrentTool] = useState<Tool>('brush');
  const [currentColor, setCurrentColor] = useState<RGBA>({ r: 255, g: 255, b: 255, a: 255 });
  const [pixelSize, setPixelSizeState] = useState<PixelSize>(512);
  const [zoom, setZoomState] = useState(1);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [featherAmount, setFeatherAmount] = useState(0);

  const [originalAIImage, setOriginalAIImage] = useState<ImageBitmap | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [historyState, setHistoryState] = useState({ undoCount: 0, redoCount: 0 });
  const [brushSize, setBrushSizeState] = useState(1);

  // Frame state
  const [frames, setFrames] = useState<Frame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [maxFrames, setMaxFrames] = useState(4);

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(8);

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // 프레임 상태 동기화
  const syncFrameState = useCallback(() => {
    if (!engineRef.current) return;
    setFrames([...engineRef.current.getAllFrames()]);
    setCurrentFrameIndex(engineRef.current.getCurrentFrameIndex());
    setMaxFrames(engineRef.current.maxFrames);
  }, []);

  // 히스토리 상태 업데이트
  const updateHistoryState = useCallback(() => {
    if (!engineRef.current) return;
    setCanUndo(engineRef.current.canUndo());
    setCanRedo(engineRef.current.canRedo());
    const state = engineRef.current.getHistoryState();
    setHistoryState({ undoCount: state.undoCount, redoCount: state.redoCount });
  }, []);

  const setZoom = useCallback((newZoom: number) => {
    setZoomState(Math.min(20, Math.max(0.1, newZoom)));
  }, []);

  const initEngine = useCallback(() => {
    if (!canvasRef.current) return;

    if (engineRef.current) {
      if (engineRef.current.getCanvas() !== canvasRef.current) {
        engineRef.current.setCanvas(canvasRef.current);
      }
      return;
    }

    engineRef.current = new PixelEngine(canvasRef.current, pixelSize, 50);
    updateHistoryState();
    syncFrameState();
  }, [pixelSize, updateHistoryState, syncFrameState]);

  const setPixelSize = useCallback((size: PixelSize) => {
    setPixelSizeState(size);
    if (engineRef.current) {
      // 새 엔진 생성하지 않고 해상도만 변경 (캐시 유지)
      engineRef.current.changeResolution(size);
      updateHistoryState();
      syncFrameState();
    }
  }, [updateHistoryState, syncFrameState]);

  const clearCanvas = useCallback(() => {
    engineRef.current?.clear();
    updateHistoryState();
  }, [updateHistoryState]);

  const setBrushSize = useCallback((size: number) => {
    setBrushSizeState(Math.min(16, Math.max(1, size)));
  }, []);

  // ==================== Frame Management ====================

  const addFrame = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.addFrame();
    syncFrameState();
  }, [syncFrameState]);

  const deleteFrame = useCallback((index: number) => {
    if (!engineRef.current) return;
    engineRef.current.deleteFrame(index);
    syncFrameState();
    updateHistoryState();
  }, [syncFrameState, updateHistoryState]);

  const duplicateFrame = useCallback((index: number) => {
    if (!engineRef.current) return;
    engineRef.current.duplicateFrame(index);
    syncFrameState();
  }, [syncFrameState]);

  const selectFrame = useCallback((index: number) => {
    if (!engineRef.current) return;
    engineRef.current.selectFrame(index);
    syncFrameState();
    updateHistoryState();
  }, [syncFrameState, updateHistoryState]);

  const getFrameThumbnail = useCallback((index: number): string | null => {
    if (!engineRef.current) return null;
    return engineRef.current.generateFrameThumbnail(index, 48);
  }, []);

  // 좌표 계산 헬퍼
  const getPixelCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY),
    };
  }, []);

  // 픽셀 그리기/지우기 실행
  const executeToolAt = useCallback((x: number, y: number) => {
    if (!engineRef.current) return;

    switch (currentTool) {
      case 'brush':
        engineRef.current.drawPixelAt(x, y, currentColor, brushSize);
        break;
      case 'eraser':
        engineRef.current.erasePixelAt(x, y, brushSize);
        break;
      case 'fill':
        engineRef.current.floodFill(x, y, currentColor);
        break;
      case 'eyedropper':
        const color = engineRef.current.getPixelColorAt(x, y);
        if (color.a > 0) {
          setCurrentColor(color);
          setCurrentTool('brush');
        }
        break;
    }
  }, [currentTool, currentColor, brushSize]);

  // Bresenham line algorithm for smooth strokes
  const drawLine = useCallback((x0: number, y0: number, x1: number, y1: number) => {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      executeToolAt(x, y);

      if (x === x1 && y === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }, [executeToolAt]);

  // ==================== Pointer Events ====================

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;

    const coords = getPixelCoords(e);
    if (!coords || !engineRef.current) return;

    isDrawingRef.current = true;

    if (currentTool === 'fill') {
      engineRef.current.beginStroke('fill');
      executeToolAt(coords.x, coords.y);
      engineRef.current.endStroke();
      isDrawingRef.current = false;
      updateHistoryState();
      syncFrameState(); // 썸네일 업데이트
      setOriginalAIImage(null); // Manual edit invalidates AI source
      return;
    }

    if (currentTool === 'eyedropper') {
      executeToolAt(coords.x, coords.y);
      isDrawingRef.current = false;
      return;
    }

    const actionType = currentTool === 'eraser' ? 'erase' : 'stroke';
    engineRef.current.beginStroke(actionType);
    executeToolAt(coords.x, coords.y);
    lastPointRef.current = { x: coords.x, y: coords.y };
  }, [currentTool, getPixelCoords, executeToolAt, updateHistoryState, syncFrameState]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if (currentTool !== 'brush' && currentTool !== 'eraser') return;

    const coords = getPixelCoords(e);
    if (!coords) return;

    // Use line interpolation for smooth strokes
    if (lastPointRef.current) {
      drawLine(lastPointRef.current.x, lastPointRef.current.y, coords.x, coords.y);
    } else {
      executeToolAt(coords.x, coords.y);
    }
    lastPointRef.current = { x: coords.x, y: coords.y };
  }, [currentTool, getPixelCoords, executeToolAt, drawLine]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;
    lastPointRef.current = null;
    engineRef.current?.endStroke();
    updateHistoryState();
    syncFrameState(); // 썸네일 업데이트
    setOriginalAIImage(null); // Manual edit invalidates AI source
  }, [updateHistoryState, syncFrameState]);

  // ==================== Undo / Redo ====================

  const undo = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.undo();
    updateHistoryState();
    syncFrameState();
  }, [updateHistoryState, syncFrameState]);

  const redo = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.redo();
    updateHistoryState();
    syncFrameState();
  }, [updateHistoryState, syncFrameState]);

  // ==================== Keyboard Shortcuts ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Ignore if typing in an input/textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (modKey && (e.code === 'KeyZ' || e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // ==================== AI Image ====================

  // Main Image Processing Logic (Simplified: Just Load & Resize)
  const processAndApplyImage = useCallback(async (baseImage: ImageBitmap, feather: number) => {
    if (!engineRef.current) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = pixelSize;
    tempCanvas.height = pixelSize;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return;

    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(baseImage, 0, 0, pixelSize, pixelSize);

    const imageData = tempCtx.getImageData(0, 0, pixelSize, pixelSize);
    engineRef.current.applyAIImage(imageData);
    syncFrameState();
  }, [pixelSize, syncFrameState]);


  // Manual Background Removal Trigger (with Hybrid AI + Algorithm Fallback)
  const triggerBackgroundRemoval = useCallback(async () => {
    if (!engineRef.current || !canvasRef.current) return;

    setIsLoading(true);

    const w = pixelSize;
    const h = pixelSize;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) {
      setIsLoading(false);
      return;
    }

    try {
      let processSuccess = false;

      // ---------------------------------------------------------
      // A. Try AI Semantic Segmentation (Titan Image Generator v2)
      // ---------------------------------------------------------
      try {
        const sourceCanvas = canvasRef.current;
        const base64Image = sourceCanvas.toDataURL('image/png').split(',')[1];

        // Note: generateAsset handles response errors by throwing or returning success:false
        const result = await generateAsset({
          mode: 'remove_background',
          image: base64Image,
          prompt: 'background removal',
          asset_type: 'character',
        });

        if (result.success && result.image) {
          console.log("AI Background Removal Successful");
          const cleanBase64 = result.image;
          const blob = await (await fetch(`data:image/png;base64,${cleanBase64}`)).blob();
          const bitmap = await createImageBitmap(blob);
          tempCtx.drawImage(bitmap, 0, 0, w, h);
          processSuccess = true;
        } else {
          throw new Error(result.error || "AI returned failure status");
        }

      } catch (aiError) {
        console.warn("AI Background Removal Failed (ContentFilter/Error), falling back to algorithm:", aiError);
        // Don't alert yet, try fallback.

        // ---------------------------------------------------------
        // B. Fallback: Robust Flood Fill Algorithm (Frontend)
        // ---------------------------------------------------------

        // 1. Get current data
        tempCtx.drawImage(canvasRef.current, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // --- Algorithm Helpers ---
        const detectBackgroundColor = (data: Uint8ClampedArray, w: number, h: number) => {
          const candidates: number[] = [];
          for (let x = 0; x < w; x += 5) { candidates.push(x); candidates.push((h - 1) * w + x); }
          for (let y = 0; y < h; y += 5) { candidates.push(y * w); candidates.push(y * w + w - 1); }
          const colorGeneric = (r: number, g: number, b: number) =>
            `${Math.floor(r / 15)},${Math.floor(g / 15)},${Math.floor(b / 15)}`;
          const counts: Record<string, { count: number, color: { r: number, g: number, b: number, a: number } }> = {};
          for (const idx of candidates) {
            if (idx >= data.length / 4) continue;
            const r = data[idx * 4];
            const g = data[idx * 4 + 1];
            const b = data[idx * 4 + 2];
            const a = data[idx * 4 + 3];
            if (a === 0) continue;
            const key = colorGeneric(r, g, b);
            if (!counts[key]) counts[key] = { count: 0, color: { r, g, b, a } };
            counts[key].count++;
          }
          let maxCount = 0; let winner = null;
          for (const key in counts) {
            if (counts[key].count > maxCount) { maxCount = counts[key].count; winner = counts[key].color; }
          }
          return winner;
        };

        const removeBackgroundAlg = (data: Uint8ClampedArray, w: number, h: number, bgColor: { r: number, g: number, b: number }) => {
          const isGreenDominant = bgColor.g > bgColor.r + 30 && bgColor.g > bgColor.b + 30;
          const tolerance = isGreenDominant ? 100 : 60;
          const visited = new Uint8Array(w * h);
          const stack: number[] = [];
          for (let x = 0; x < w; x++) { stack.push(x); stack.push((h - 1) * w + x); visited[x] = 1; visited[(h - 1) * w + x] = 1; }
          for (let y = 1; y < h - 1; y++) { stack.push(y * w); stack.push(y * w + w - 1); visited[y * w] = 1; visited[y * w + w - 1] = 1; }
          const isMatch = (idx: number) => {
            const r = data[idx * 4]; const g = data[idx * 4 + 1]; const b = data[idx * 4 + 2];
            const dist = Math.abs(r - bgColor.r) + Math.abs(g - bgColor.g) + Math.abs(b - bgColor.b);
            return dist < tolerance * 3;
          };
          let writePtr = 0;
          for (let i = 0; i < stack.length; i++) { if (isMatch(stack[i])) stack[writePtr++] = stack[i]; }
          stack.length = writePtr;
          while (stack.length > 0) {
            const idx = stack.pop()!;
            data[idx * 4 + 3] = 0;
            const x = idx % w; const y = Math.floor(idx / w);
            const neighbors = [{ nx: x + 1, ny: y }, { nx: x - 1, ny: y }, { nx: x, ny: y + 1 }, { nx: x, ny: y - 1 }];
            for (const { nx, ny } of neighbors) {
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIdx = ny * w + nx;
                if (visited[nIdx] === 0) { visited[nIdx] = 1; if (isMatch(nIdx)) stack.push(nIdx); }
              }
            }
          }
        };

        const removeNoiseAlg = (data: Uint8ClampedArray, w: number, h: number) => {
          const visited = new Uint8Array(w * h);
          const islands: number[][] = [];
          for (let i = 0; i < w * h; i++) {
            if (data[i * 4 + 3] > 0 && visited[i] === 0) {
              const stack = [i]; const island = []; visited[i] = 1;
              while (stack.length > 0) {
                const curr = stack.pop()!; island.push(curr);
                const x = curr % w; const y = Math.floor(curr / w);
                const neighbors = [{ nx: x + 1, ny: y }, { nx: x - 1, ny: y }, { nx: x, ny: y + 1 }, { nx: x, ny: y - 1 }];
                for (const { nx, ny } of neighbors) {
                  if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    const nIdx = ny * w + nx;
                    if (visited[nIdx] === 0 && data[nIdx * 4 + 3] > 0) { visited[nIdx] = 1; stack.push(nIdx); }
                  }
                }
              }
              islands.push(island);
            }
          }
          if (islands.length === 0) return;
          islands.sort((a, b) => b.length - a.length);
          const largest = new Set(islands[0]);
          for (let i = 0; i < w * h; i++) { if (!largest.has(i)) data[i * 4 + 3] = 0; }
        };

        const bgColor = detectBackgroundColor(data, w, h);
        if (bgColor) {
          removeBackgroundAlg(data, w, h, bgColor);
          removeNoiseAlg(data, w, h);
          tempCtx.putImageData(imageData, 0, 0);
          processSuccess = true;
          console.warn('⚠️ AI Safety Block: Fell back to algorithmic removal.');
          console.log("Fallback Algorithm Success");
        } else {
          console.warn("Fallback failed: No uniform background detected");
          alert("배경 제거 실패: AI가 차단되었고, 단색 배경도 감지되지 않았습니다.");
        }
      }

      // ---------------------------------------------------------
      // C. Smart Crop & Scaling (Universal)
      // ---------------------------------------------------------
      if (processSuccess) {
        const imageData = tempCtx.getImageData(0, 0, w, h);
        const data = imageData.data;

        const getBounds = (data: Uint8ClampedArray, w: number, h: number) => {
          let minX = w, minY = h, maxX = 0, maxY = 0;
          let hasPixels = false;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              if (data[idx + 3] > 0) {
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
                hasPixels = true;
              }
            }
          }
          return { minX, minY, maxX, maxY, hasPixels };
        };

        const b = getBounds(data, w, h);
        if (b.hasPixels) {
          const contentW = b.maxX - b.minX + 1;
          const contentH = b.maxY - b.minY + 1;
          const cCanvas = document.createElement('canvas');
          cCanvas.width = contentW; cCanvas.height = contentH;
          cCanvas.getContext('2d')?.putImageData(tempCtx.getImageData(b.minX, b.minY, contentW, contentH), 0, 0);

          tempCtx.clearRect(0, 0, w, h);
          const safePadding = 2;
          const targetSize = w - (safePadding * 2);
          const scale = Math.min(targetSize / contentW, targetSize / contentH);
          const dstW = Math.floor(contentW * scale);
          const dstH = Math.floor(contentH * scale);
          const offX = Math.floor((w - dstW) / 2);
          const offY = Math.floor((h - dstH) / 2);

          tempCtx.imageSmoothingEnabled = false;
          tempCtx.drawImage(cCanvas, 0, 0, contentW, contentH, offX, offY, dstW, dstH);
          const finalData = tempCtx.getImageData(0, 0, w, h);
          engineRef.current.applyAIImage(finalData);

          // Fix: Update originalAIImage state so that resolution changes (which trigger processAndApplyImage)
          // do not revert to the old image with background.
          createImageBitmap(finalData).then((newBitmap) => {
            setOriginalAIImage(newBitmap);
            setFeatherAmount(0); // Reset feather to avoid double-blurring
          });

          syncFrameState();
        } else {
          console.warn("Image empty after processing");
        }
      }

    } catch (e) {
      console.error("Critical Error in Background Removal:", e);
      alert("오류 발생: " + (e instanceof Error ? e.message : "알 수 없는 오류"));
    } finally {
      setIsLoading(false);
    }
  }, [pixelSize, syncFrameState]);

  // Load Image (Trigger)
  const loadAIImage = useCallback(async (blob: Blob) => {
    if (!engineRef.current) return;

    setIsLoading(true);
    try {
      const imageBitmap = await createImageBitmap(blob);
      setOriginalAIImage(imageBitmap);
      setFeatherAmount(0); // Reset feather

      // Just Load, DO NOT Remove Background Automatically
      await processAndApplyImage(imageBitmap, 0);

    } catch (e) {
      console.error("Failed to load/process AI image", e);
    } finally {
      setIsLoading(false);
    }
  }, [processAndApplyImage]);

  // Re-process when feather changes
  useEffect(() => {
    if (!originalAIImage) return;
    const timer = setTimeout(() => {
      processAndApplyImage(originalAIImage, featherAmount);
    }, 100); // 100ms debounce
    return () => clearTimeout(timer);
  }, [featherAmount, originalAIImage, processAndApplyImage]);

  // Manual cleanup when changing images?
  // Not needed, state replacement handles it.

  const applyImageData = useCallback((imageData: ImageData) => {
    if (!engineRef.current) return;
    engineRef.current.applyAIImage(imageData);
    updateHistoryState();
    syncFrameState();
  }, [updateHistoryState, syncFrameState]);

  const getWorkCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!engineRef.current) return null;
    // 현재 프레임의 캔버스 스냅샷 생성
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = pixelSize;
    tempCanvas.height = pixelSize;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx || !canvasRef.current) return null;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvasRef.current, 0, 0, pixelSize, pixelSize);
    return tempCanvas;
  }, [pixelSize]);

  // ==================== Export ====================

  const downloadWebP = useCallback(async (filename: string) => {
    if (!engineRef.current) return;

    const base64 = await engineRef.current.exportAsBase64();
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename.endsWith('.webp') ? filename : `${filename}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const saveToLibrary = useCallback(
    async (name: string, type: Asset['type'], stats: Asset['stats']) => {
      if (!engineRef.current) return;

      const imageData = await engineRef.current.exportAsBase64();
      const newAsset: Asset = {
        id: crypto.randomUUID(),
        name,
        type,
        imageData,
        stats,
        createdAt: new Date(),
      };
      setAssets((prev) => [...prev, newAsset]);
    },
    []
  );

  const deleteAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const loadAsset = useCallback((id: string) => {
    console.log('Load asset:', id);
  }, []);

  return (
    <AssetsEditorContext.Provider
      value={{
        canvasRef,
        initEngine,
        tool: currentTool,
        setTool: setCurrentTool,
        currentTool,
        setCurrentTool,
        color: currentColor,
        setColor: setCurrentColor,
        currentColor,
        setCurrentColor,
        pixelSize,
        setPixelSize,
        zoom,
        setZoom,
        brushSize,
        setBrushSize,
        clear: clearCanvas,
        clearCanvas,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        undo,
        redo,
        canUndo,
        canRedo,
        historyState,
        frames,
        currentFrameIndex,
        maxFrames,
        addFrame,
        deleteFrame,
        duplicateFrame,
        selectFrame,
        getFrameThumbnail,
        isPlaying,
        setIsPlaying,
        fps,
        setFps,
        loadAIImage,
        applyImageData,
        getWorkCanvas,
        isLoading,
        setIsLoading,
        featherAmount,
        setFeatherAmount,

        // Export
        downloadWebP,
        saveToLibrary,
        assets,
        deleteAsset,
        loadAsset,
        triggerBackgroundRemoval,
      }}
    >
      {children}
    </AssetsEditorContext.Provider>
  );
}

export function useAssetsEditor() {
  const context = useContext(AssetsEditorContext);
  if (!context) {
    throw new Error('useAssetsEditor must be used within AssetsEditorProvider');
  }
  return context;
}
