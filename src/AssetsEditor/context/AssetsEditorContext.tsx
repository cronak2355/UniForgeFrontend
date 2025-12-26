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
  isLoading: boolean;
  
  // Export
  downloadWebP: (filename: string) => Promise<void>;
  saveToLibrary: (name: string, type: Asset['type'], stats: Asset['stats']) => Promise<void>;
  
  // Library
  assets: Asset[];
  deleteAsset: (id: string) => void;
  loadAsset: (id: string) => void;
}

const AssetsEditorContext = createContext<AssetsEditorContextType | null>(null);

export function AssetsEditorProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PixelEngine | null>(null);
  
  const [currentTool, setCurrentTool] = useState<Tool>('brush');
  const [currentColor, setCurrentColor] = useState<RGBA>({ r: 255, g: 255, b: 255, a: 255 });
  const [pixelSize, setPixelSizeState] = useState<PixelSize>(64);
  const [zoom, setZoomState] = useState(8);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [historyState, setHistoryState] = useState({ undoCount: 0, redoCount: 0 });
  
  // Frame state
  const [frames, setFrames] = useState<Frame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [maxFrames, setMaxFrames] = useState(4);
  
  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(8);
  
  const isDrawingRef = useRef(false);

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
    setZoomState(Math.min(20, Math.max(2, newZoom)));
  }, []);

  const initEngine = useCallback(() => {
    if (!canvasRef.current || engineRef.current) return;
    engineRef.current = new PixelEngine(canvasRef.current, pixelSize, 50);
    updateHistoryState();
    syncFrameState();
  }, [pixelSize, updateHistoryState, syncFrameState]);

  const setPixelSize = useCallback((size: PixelSize) => {
    setPixelSizeState(size);
    if (canvasRef.current) {
      engineRef.current = new PixelEngine(canvasRef.current, size, 50);
      updateHistoryState();
      syncFrameState();
    }
  }, [updateHistoryState, syncFrameState]);

  const clearCanvas = useCallback(() => {
    engineRef.current?.clear();
    updateHistoryState();
  }, [updateHistoryState]);

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
        engineRef.current.drawPixelAt(x, y, currentColor);
        break;
      case 'eraser':
        engineRef.current.erasePixelAt(x, y);
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
  }, [currentTool, currentColor]);

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
  }, [currentTool, getPixelCoords, executeToolAt, updateHistoryState, syncFrameState]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if (currentTool !== 'brush' && currentTool !== 'eraser') return;

    const coords = getPixelCoords(e);
    if (!coords) return;

    executeToolAt(coords.x, coords.y);
  }, [currentTool, getPixelCoords, executeToolAt]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    
    isDrawingRef.current = false;
    engineRef.current?.endStroke();
    updateHistoryState();
    syncFrameState(); // 썸네일 업데이트
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

      if (modKey && e.key === 'z') {
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

  const loadAIImage = useCallback(async (blob: Blob) => {
    if (!engineRef.current) return;
    
    setIsLoading(true);
    try {
      const imageBitmap = await createImageBitmap(blob);
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = pixelSize;
      tempCanvas.height = pixelSize;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Failed to get temp context');
      
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(imageBitmap, 0, 0, pixelSize, pixelSize);
      
      const imageData = tempCtx.getImageData(0, 0, pixelSize, pixelSize);
      
      engineRef.current.applyAIImage(imageData);
      updateHistoryState();
      syncFrameState();
    } finally {
      setIsLoading(false);
    }
  }, [pixelSize, updateHistoryState, syncFrameState]);

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
        isLoading,
        downloadWebP,
        saveToLibrary,
        assets,
        deleteAsset,
        loadAsset,
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