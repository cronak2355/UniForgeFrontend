// src/AssetsEditor/phaser/skeleton/SkeletonPreview.tsx
// React-Phaser 브릿지 컴포넌트 - 스켈레톤 애니메이션 프리뷰

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import Phaser from 'phaser';
import { SkeletonScene } from './SkeletonScene';
import { EventBus } from '../EventBus';
import type { MotionType, MotionConfig } from './SkeletonController';

// ═══════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════

export interface SkeletonPreviewProps {
  width?: number;
  height?: number;
  className?: string;
  onReady?: () => void;
  onMotionStarted?: (type: MotionType) => void;
  onMotionStopped?: () => void;
  onAssetLoaded?: (info: { width: number; height: number }) => void;
}

export interface SkeletonPreviewRef {
  loadAsset: (url: string) => void;
  loadFromImageData: (imageData: ImageData) => void;
  playMotion: (type: MotionType) => void;
  stopMotion: () => void;
  updateConfig: (config: Partial<MotionConfig>) => void;
  setScale: (scale: number) => void;
}

// ═══════════════════════════════════════════════════════════════════
// SkeletonPreview 컴포넌트
// ═══════════════════════════════════════════════════════════════════

export const SkeletonPreview = forwardRef<SkeletonPreviewRef, SkeletonPreviewProps>(
  (
    {
      width = 400,
      height = 400,
      className = '',
      onReady,
      onMotionStarted,
      onMotionStopped,
      onAssetLoaded,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const [isReady, setIsReady] = useState(false);

    // ─── Phaser 초기화 ───
    useEffect(() => {
      if (!containerRef.current || gameRef.current) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width,
        height,
        backgroundColor: '#1a1a1a',
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        scene: [SkeletonScene],
        render: {
          pixelArt: true,
          antialias: false,
        },
      };

      gameRef.current = new Phaser.Game(config);

      // EventBus 리스너
      const handleReady = () => {
        setIsReady(true);
        onReady?.();
      };

      const handleMotionStarted = (data: { type: MotionType }) => {
        onMotionStarted?.(data.type);
      };

      const handleMotionStopped = () => {
        onMotionStopped?.();
      };

      const handleAssetLoaded = (info: { width: number; height: number }) => {
        onAssetLoaded?.(info);
      };

      EventBus.on('skeleton:ready', handleReady);
      EventBus.on('skeleton:motionStarted', handleMotionStarted);
      EventBus.on('skeleton:motionStopped', handleMotionStopped);
      EventBus.on('skeleton:assetLoaded', handleAssetLoaded);

      // 정리
      return () => {
        EventBus.off('skeleton:ready', handleReady);
        EventBus.off('skeleton:motionStarted', handleMotionStarted);
        EventBus.off('skeleton:motionStopped', handleMotionStopped);
        EventBus.off('skeleton:assetLoaded', handleAssetLoaded);

        gameRef.current?.destroy(true);
        gameRef.current = null;
      };
    }, [width, height, onReady, onMotionStarted, onMotionStopped, onAssetLoaded]);

    // ─── 외부 API 노출 ───
    const loadAsset = useCallback((url: string) => {
      EventBus.emit('skeleton:loadAsset', { url });
    }, []);

    const loadFromImageData = useCallback((imageData: ImageData) => {
      EventBus.emit('skeleton:loadImageData', { imageData });
    }, []);

    const playMotion = useCallback((type: MotionType) => {
      EventBus.emit('skeleton:play', { type });
    }, []);

    const stopMotion = useCallback(() => {
      EventBus.emit('skeleton:stop');
    }, []);

    const updateConfig = useCallback((config: Partial<MotionConfig>) => {
      EventBus.emit('skeleton:config', config);
    }, []);

    const setScale = useCallback((scale: number) => {
      EventBus.emit('skeleton:scale', { scale });
    }, []);

    useImperativeHandle(ref, () => ({
      loadAsset,
      loadFromImageData,
      playMotion,
      stopMotion,
      updateConfig,
      setScale,
    }), [loadAsset, loadFromImageData, playMotion, stopMotion, updateConfig, setScale]);

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

SkeletonPreview.displayName = 'SkeletonPreview';

// ═══════════════════════════════════════════════════════════════════
// 커스텀 훅: useSkeletonPreview
// ═══════════════════════════════════════════════════════════════════

export function useSkeletonPreview() {
  const ref = useRef<SkeletonPreviewRef>(null);

  const loadAsset = useCallback((url: string) => {
    ref.current?.loadAsset(url);
  }, []);

  const loadFromImageData = useCallback((imageData: ImageData) => {
    ref.current?.loadFromImageData(imageData);
  }, []);

  const playMotion = useCallback((type: MotionType) => {
    ref.current?.playMotion(type);
  }, []);

  const stopMotion = useCallback(() => {
    ref.current?.stopMotion();
  }, []);

  const updateConfig = useCallback((config: Partial<MotionConfig>) => {
    ref.current?.updateConfig(config);
  }, []);

  const setScale = useCallback((scale: number) => {
    ref.current?.setScale(scale);
  }, []);

  return {
    ref,
    loadAsset,
    loadFromImageData,
    playMotion,
    stopMotion,
    updateConfig,
    setScale,
  };
}
