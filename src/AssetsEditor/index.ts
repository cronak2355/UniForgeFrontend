// src/AssetsEditor/index.ts

export { default as AssetsEditorPage } from './components/AssetsEditorPage';
export { AssetsEditorProvider, useAssetsEditor } from './context/AssetsEditorContext';
export { PixelEngine } from './engine/PixelEngine';
export type { RGBA, PixelSize } from './engine/PixelEngine';

// Types (Phaser 의존성 없음)
export type { MotionType, MotionConfig } from './types/animation';
export { DEFAULT_MOTION_CONFIG } from './types/animation';
