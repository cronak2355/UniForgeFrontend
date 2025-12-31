// src/AssetsEditor/phaser/index.ts
// Phaser 모듈 export

export { PhaserCanvas, usePhaserCanvas } from './PhaserCanvas';
export type { PhaserCanvasProps, PhaserCanvasRef } from './PhaserCanvas';

export { EventBus, DEFAULT_MOTION_CONFIG } from './EventBus';
export type { MotionType, MotionConfig, EventTypes } from './EventBus';

export { MainScene } from './scenes/MainScene';
export { MotionController } from './controllers/MotionController';
