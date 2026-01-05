// src/AssetsEditor/phaser/EventBus.ts
// React ↔ Phaser 양방향 통신 브릿지

import Phaser from 'phaser';

/**
 * 모션 타입 (6대 코어 모션)
 */
export type MotionType = 'idle' | 'walk' | 'jump' | 'attack' | 'hit' | 'rotate' | 'none';

/**
 * 모션 설정
 */
export interface MotionConfig {
  speed: number;        // 0.25 ~ 2.0 (기본 1.0)
  intensity: number;    // 0.25 ~ 2.0 (기본 1.0)
  loop: boolean;
}

/**
 * 이벤트 타입 정의
 */
export interface EventTypes {
  // ═══ Legacy Motion Events ═══
  'motion:play': { type: MotionType };
  'motion:stop': void;
  'asset:load': { url: string; key: string };
  'asset:clear': void;
  'config:update': Partial<MotionConfig>;
  'preview:zoom': { scale: number };
  'phaser:ready': { scene: Phaser.Scene };
  'motion:started': { type: MotionType };
  'motion:completed': { type: MotionType };
  'asset:loaded': { key: string; width: number; height: number };
  'asset:error': { key: string; error: string };
  
  // ═══ Skeleton Animation Events ═══
  // React → Phaser
  'skeleton:loadAsset': { url: string };
  'skeleton:loadImageData': { imageData: ImageData };
  'skeleton:play': { type: MotionType };
  'skeleton:stop': void;
  'skeleton:config': Partial<MotionConfig>;
  'skeleton:scale': { scale: number };
  
  // Phaser → React
  'skeleton:ready': void;
  'skeleton:assetLoaded': { width: number; height: number };
  'skeleton:motionStarted': { type: MotionType };
  'skeleton:motionStopped': void;
}

export interface MotionConfig {
  speed: number;        // 0.5 ~ 2.0 (기본 1.0)
  intensity: number;    // 0.5 ~ 2.0 (기본 1.0)
  loop: boolean;
}

/**
 * EventBus 싱글톤
 * - Phaser.Events.EventEmitter 기반
 * - 타입 안전한 이벤트 발행/구독
 */
class EventBusClass extends Phaser.Events.EventEmitter {
  private static instance: EventBusClass;

  private constructor() {
    super();
  }

  static getInstance(): EventBusClass {
    if (!EventBusClass.instance) {
      EventBusClass.instance = new EventBusClass();
    }
    return EventBusClass.instance;
  }

  /**
   * 타입 안전한 이벤트 발행
   */
  emit<K extends keyof EventTypes>(
    event: K,
    ...args: EventTypes[K] extends void ? [] : [EventTypes[K]]
  ): boolean {
    return super.emit(event, ...args);
  }

  /**
   * 타입 안전한 이벤트 구독
   */
  on<K extends keyof EventTypes>(
    event: K,
    fn: EventTypes[K] extends void ? () => void : (data: EventTypes[K]) => void,
    context?: unknown
  ): this {
    return super.on(event, fn as (...args: unknown[]) => void, context);
  }

  /**
   * 이벤트 구독 해제
   */
  off<K extends keyof EventTypes>(
    event: K,
    fn?: EventTypes[K] extends void ? () => void : (data: EventTypes[K]) => void,
    context?: unknown
  ): this {
    return super.off(event, fn as (...args: unknown[]) => void, context);
  }

  /**
   * 한 번만 실행되는 구독
   */
  once<K extends keyof EventTypes>(
    event: K,
    fn: EventTypes[K] extends void ? () => void : (data: EventTypes[K]) => void,
    context?: unknown
  ): this {
    return super.once(event, fn as (...args: unknown[]) => void, context);
  }

  /**
   * 모든 리스너 제거 (cleanup용)
   */
  removeAllListeners(): this {
    return super.removeAllListeners();
  }
}

// 싱글톤 인스턴스 export
export const EventBus = EventBusClass.getInstance();

// 기본 모션 설정
export const DEFAULT_MOTION_CONFIG: MotionConfig = {
  speed: 1.0,
  intensity: 1.0,
  loop: true,
};
