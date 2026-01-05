// src/AssetsEditor/phaser/skeleton/index.ts
// 스켈레톤 애니메이션 시스템 내보내기

export { BoneSystem, Bone, DEFAULT_BONE_CONFIG, DEFAULT_TRANSFORM } from './BoneSystem';
export type { BoneType, BoneConfig, BoneTransform } from './BoneSystem';

export { SkeletonController, Easing } from './SkeletonController';
export type { MotionType, MotionConfig, VFXCallbacks } from './SkeletonController';

export { SkeletonScene } from './SkeletonScene';

export { SkeletonPreview, useSkeletonPreview } from './SkeletonPreview';
export type { SkeletonPreviewProps, SkeletonPreviewRef } from './SkeletonPreview';
