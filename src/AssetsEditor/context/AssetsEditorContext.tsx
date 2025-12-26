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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const initEngine = useCallback(() => {
    if (!canvasRef.current) return;
    
    const displaySize = pixelSize * (pixelSize === 32 ? 12 : pixelSize === 64 ? 6 : 3);
    canvasRef.current.width = displaySize;
    canvasRef.current.height = displaySize;
    
    engineRef.current = new PixelEngine(canvasRef.current, pixelSize);
  }, [pixelSize]);

  const setPixelSize = useCallback((size: PixelSize) => {
    setPixelSizeState(size);
    if (engineRef.current && canvasRef.current) {
      const displaySize = size * (size === 32 ? 12 : size === 64 ? 6 : 3);
      canvasRef.current.width = displaySize;
      canvasRef.current.height = displaySize;
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
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      switch (currentTool) {
        case 'brush':
          engineRef.current.drawPixel(x, y, currentColor);
          break;
        case 'eraser':
          engineRef.current.erasePixel(x, y);
          break;
        case 'eyedropper':
          const color = engineRef.current.getPixelColor(x, y);
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
      const zoomFactor = pixelSize === 32 ? 12 : pixelSize === 64 ? 6 : 3;
      
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
            engineRef.current.drawPixel(x * zoomFactor, y * zoomFactor, color);
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