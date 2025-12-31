// src/AssetsEditor/phaser/PhaserCanvas.tsx
// React 래퍼 컴포넌트 - Phaser 인스턴스 관리

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { EventBus } from './EventBus';
import type { MotionType, MotionConfig } from './EventBus';

// ═══════════════════════════════════════════════════════════
// Props & Ref 타입
// ═══════════════════════════════════════════════════════════

export interface PhaserCanvasProps {
  width?: number;
  height?: number;
  className?: string;
  onReady?: (scene: Phaser.Scene) => void;
  onAssetLoaded?: (info: { key: string; width: number; height: number }) => void;
  onAssetError?: (error: { key: string; error: string }) => void;
  onMotionStarted?: (type: MotionType) => void;
  onMotionCompleted?: (type: MotionType) => void;
}

export interface PhaserCanvasRef {
  // 모션 제어
  playMotion: (type: MotionType) => void;
  stopMotion: () => void;
  
  // 에셋 제어
  loadAsset: (url: string, key?: string) => void;
  loadFromImageData: (imageData: ImageData, key?: string) => void;
  clearAsset: () => void;
  
  // 설정 제어
  updateConfig: (config: Partial<MotionConfig>) => void;
  setZoom: (scale: number) => void;
  
  // 게임 인스턴스
  getGame: () => Phaser.Game | null;
  getScene: () => Phaser.Scene | null;
}

// ═══════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════

export const PhaserCanvas = forwardRef<PhaserCanvasRef, PhaserCanvasProps>(
  (
    {
      width = 400,
      height = 400,
      className = '',
      onReady,
      onAssetLoaded,
      onAssetError,
      onMotionStarted,
      onMotionCompleted,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<Phaser.Scene | null>(null);
    const [isReady, setIsReady] = useState(false);

    // ─────────────────────────────────────────────────────────
    // Phaser 초기화
    // ─────────────────────────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current || gameRef.current) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width,
        height,
        backgroundColor: '#1a1a1a',
        
        // 픽셀아트 설정
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        
        // 렌더링 설정
        render: {
          pixelArt: true,
          antialias: false,
        },
        
        // 스케일 설정
        scale: {
          mode: Phaser.Scale.NONE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        
        // 씬
        scene: [MainScene],
        
        // 물리 엔진 비활성화 (필요없음)
        physics: {
          default: false,
        },
      };

      gameRef.current = new Phaser.Game(config);

      // 정리 함수
      return () => {
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
          sceneRef.current = null;
          setIsReady(false);
        }
      };
    }, [width, height]);

    // ─────────────────────────────────────────────────────────
    // EventBus 리스너
    // ─────────────────────────────────────────────────────────
    useEffect(() => {
      // Phaser 준비 완료
      const handleReady = (data: { scene: Phaser.Scene }) => {
        sceneRef.current = data.scene;
        setIsReady(true);
        onReady?.(data.scene);
      };

      // 에셋 로드 완료
      const handleAssetLoaded = (info: { key: string; width: number; height: number }) => {
        onAssetLoaded?.(info);
      };

      // 에셋 로드 에러
      const handleAssetError = (error: { key: string; error: string }) => {
        onAssetError?.(error);
      };

      // 모션 시작
      const handleMotionStarted = (data: { type: MotionType }) => {
        onMotionStarted?.(data.type);
      };

      // 모션 완료
      const handleMotionCompleted = (data: { type: MotionType }) => {
        onMotionCompleted?.(data.type);
      };

      EventBus.on('phaser:ready', handleReady);
      EventBus.on('asset:loaded', handleAssetLoaded);
      EventBus.on('asset:error', handleAssetError);
      EventBus.on('motion:started', handleMotionStarted);
      EventBus.on('motion:completed', handleMotionCompleted);

      return () => {
        EventBus.off('phaser:ready', handleReady);
        EventBus.off('asset:loaded', handleAssetLoaded);
        EventBus.off('asset:error', handleAssetError);
        EventBus.off('motion:started', handleMotionStarted);
        EventBus.off('motion:completed', handleMotionCompleted);
      };
    }, [onReady, onAssetLoaded, onAssetError, onMotionStarted, onMotionCompleted]);

    // ─────────────────────────────────────────────────────────
    // Ref 메서드 노출
    // ─────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      playMotion: (type: MotionType) => {
        EventBus.emit('motion:play', { type });
      },

      stopMotion: () => {
        EventBus.emit('motion:stop');
      },

      loadAsset: (url: string, key: string = 'user-asset') => {
        EventBus.emit('asset:load', { url, key });
      },

      loadFromImageData: (imageData: ImageData, key: string = 'canvas-asset') => {
        const scene = sceneRef.current as MainScene | null;
        if (scene && 'loadFromImageData' in scene) {
          scene.loadFromImageData(imageData, key);
        }
      },

      clearAsset: () => {
        EventBus.emit('asset:clear');
      },

      updateConfig: (config: Partial<MotionConfig>) => {
        EventBus.emit('config:update', config);
      },

      setZoom: (scale: number) => {
        EventBus.emit('preview:zoom', { scale });
      },

      getGame: () => gameRef.current,

      getScene: () => sceneRef.current,
    }), []);

    // ─────────────────────────────────────────────────────────
    // 렌더링
    // ─────────────────────────────────────────────────────────
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width,
          height,
          overflow: 'hidden',
          borderRadius: '4px',
        }}
      />
    );
  }
);

PhaserCanvas.displayName = 'PhaserCanvas';

// ═══════════════════════════════════════════════════════════
// 커스텀 훅: usePhaserCanvas
// ═══════════════════════════════════════════════════════════

export function usePhaserCanvas() {
  const canvasRef = useRef<PhaserCanvasRef>(null);
  const [currentMotion, setCurrentMotion] = useState<MotionType>('none');
  const [isAssetLoaded, setIsAssetLoaded] = useState(false);
  const [assetInfo, setAssetInfo] = useState<{ width: number; height: number } | null>(null);

  const playMotion = useCallback((type: MotionType) => {
    canvasRef.current?.playMotion(type);
    setCurrentMotion(type);
  }, []);

  const stopMotion = useCallback(() => {
    canvasRef.current?.stopMotion();
    setCurrentMotion('none');
  }, []);

  const loadAsset = useCallback((url: string) => {
    canvasRef.current?.loadAsset(url);
    setIsAssetLoaded(false);
  }, []);

  const loadFromImageData = useCallback((imageData: ImageData) => {
    canvasRef.current?.loadFromImageData(imageData);
    setIsAssetLoaded(false);
  }, []);

  const handleAssetLoaded = useCallback((info: { key: string; width: number; height: number }) => {
    setIsAssetLoaded(true);
    setAssetInfo({ width: info.width, height: info.height });
  }, []);

  const handleMotionCompleted = useCallback(() => {
    // loop가 아닌 경우에만 상태 변경
  }, []);

  return {
    canvasRef,
    currentMotion,
    isAssetLoaded,
    assetInfo,
    playMotion,
    stopMotion,
    loadAsset,
    loadFromImageData,
    handleAssetLoaded,
    handleMotionCompleted,
  };
}
