// src/AssetsEditor/context/AssetsEditorContext.tsx

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { PixelEngine, type RGBA, type PixelSize } from '../engine/PixelEngine';

export type Tool = 'brush' | 'eraser' | 'eyedropper';

interface Asset {
  id: string;
  name: string;
  type: 'character' | 'object' | 'tile';
  imageData: string;
  stats: {
    hp: number;
    speed: number;
    attack: number;
  };
  createdAt: Date;
}

interface AssetsEditorContextType {
  // Canvas & Engine
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  initEngine: () => void;
  
  // Tool state (aliased for compatibility)
  tool: Tool;
  setTool: (tool: Tool) => void;
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  
  // Color state (aliased for compatibility)
  color: RGBA;
  setColor: (color: RGBA) => void;
  currentColor: RGBA;
  setCurrentColor: (color: RGBA) => void;
  
  // Resolution
  pixelSize: PixelSize;
  setPixelSize: (size: PixelSize) => void;
  
  // Zoom
  zoom: number;
  setZoom: (zoom: number) => void;
  
  // Actions
  clear: () => void;
  clearCanvas: () => void;
  handleCanvasInteraction: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  
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
  const [zoom, setZoomState] = useState(8); // 줌은 CSS용 상태만
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 줌 변경 - CSS만 변경, 엔진은 건드리지 않음
  const setZoom = useCallback((newZoom: number) => {
    const clampedZoom = Math.min(20, Math.max(2, newZoom));
    setZoomState(clampedZoom);
  }, []);

  // 엔진 초기화
  const initEngine = useCallback(() => {
    if (!canvasRef.current) return;
    if (engineRef.current) return;
    
    engineRef.current = new PixelEngine(canvasRef.current, pixelSize);
  }, [pixelSize]);

  // 해상도 변경
  const setPixelSize = useCallback((size: PixelSize) => {
    setPixelSizeState(size);
    if (canvasRef.current) {
      engineRef.current = new PixelEngine(canvasRef.current, size);
    }
  }, []);

  const clearCanvas = useCallback(() => {
    engineRef.current?.clear();
  }, []);

  const handleCanvasInteraction = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!engineRef.current || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      switch (currentTool) {
        case 'brush':
          engineRef.current.drawPixelAt(x, y, currentColor);
          break;
        case 'eraser':
          engineRef.current.erasePixelAt(x, y);
          break;
        case 'eyedropper':
          const color = engineRef.current.getPixelColorAt(x, y);
          if (color.a > 0) {
            setCurrentColor(color);
            setCurrentTool('brush');
          }
          break;
      }
    },
    [currentTool, currentColor]
  );

  const loadAIImage = useCallback(async (blob: Blob) => {
    if (!engineRef.current) return;
    
    setIsLoading(true);
    try {
      const imageBitmap = await createImageBitmap(blob);
      
      // Create temp canvas to extract pixel data
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = pixelSize;
      tempCanvas.height = pixelSize;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Failed to get temp context');
      
      // Draw scaled and pixelated
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(imageBitmap, 0, 0, pixelSize, pixelSize);
      
      // Get pixel data and draw to engine
      const imageData = tempCtx.getImageData(0, 0, pixelSize, pixelSize);
      
      for (let y = 0; y < pixelSize; y++) {
        for (let x = 0; x < pixelSize; x++) {
          const idx = (y * pixelSize + x) * 4;
          const color: RGBA = {
            r: imageData.data[idx],
            g: imageData.data[idx + 1],
            b: imageData.data[idx + 2],
            a: imageData.data[idx + 3],
          };
          if (color.a > 0) {
            engineRef.current.drawPixelAt(x, y, color);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [pixelSize]);

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
    // TODO: Load asset onto canvas
    console.log('Load asset:', id);
  }, []);

  return (
    <AssetsEditorContext.Provider
      value={{
        canvasRef,
        initEngine,
        // Tool (with aliases)
        tool: currentTool,
        setTool: setCurrentTool,
        currentTool,
        setCurrentTool,
        // Color (with aliases)
        color: currentColor,
        setColor: setCurrentColor,
        currentColor,
        setCurrentColor,
        // Resolution
        pixelSize,
        setPixelSize,
        // Zoom
        zoom,
        setZoom,
        // Actions (with aliases)
        clear: clearCanvas,
        clearCanvas,
        handleCanvasInteraction,
        // AI
        loadAIImage,
        isLoading,
        // Export
        downloadWebP,
        saveToLibrary,
        // Library
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