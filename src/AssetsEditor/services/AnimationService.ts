// src/AssetsEditor/services/animationService.ts

import { 
  ANIMATION_PRESETS, 
  buildFramePrompt,
  NEGATIVE_KEYWORDS
} from '../data/AnimationPresets';
import type { AnimationPreset } from '../data/AnimationPresets';

// 애니메이션 프레임 전용 API (seed 기반 일관성)
const ANIMATION_API_URL = 'http://localhost:8000/api/generate-animation-frame';

// 기존 단일 이미지 생성 API
const GENERATE_API_URL = 'http://localhost:8000/api/AIgenerate';

export interface GenerateOptions {
  characterDescription: string;  // 예: "blue armored knight with sword"
  presetId: string;              // 예: "walk"
  canvasSize: number;            // 32, 64, 128
  onFrameGenerated?: (frameIndex: number, imageData: string) => void;
  onProgress?: (current: number, total: number) => void;
  onError?: (error: string, frameIndex: number) => void;
}

export interface GeneratedFrame {
  frameIndex: number;
  imageData: string;  // base64
  prompt: string;
}

/**
 * 애니메이션 프레임들을 순차적으로 생성
 * 
 * 핵심 변경: 모든 프레임을 txt2img로 생성하되, 같은 seed 사용
 * - seed가 같으면 캐릭터 스타일이 일관되게 유지됨
 * - 프롬프트가 다르면 포즈가 달라짐 (걷기, 뛰기 등)
 */
export async function generateAnimation(
  options: GenerateOptions
): Promise<GeneratedFrame[]> {
  const { 
    characterDescription, 
    presetId, 
    canvasSize,
    onFrameGenerated,
    onProgress,
    onError 
  } = options;

  const preset = ANIMATION_PRESETS[presetId];
  if (!preset) {
    throw new Error(`프리셋을 찾을 수 없습니다: ${presetId}`);
  }

  const generatedFrames: GeneratedFrame[] = [];
  let sharedSeed: number | null = null;  // 모든 프레임이 공유할 seed

  console.log(`🎬 애니메이션 생성 시작: ${preset.nameKo} (${preset.frameCount}프레임)`);
  console.log(`   방식: Seed 기반 txt2img (포즈 변화 O, 스타일 일관성 O)`);

  for (let i = 0; i < preset.frames.length; i++) {
    const frame = preset.frames[i];
    const prompt = buildFramePrompt(characterDescription, preset, i);
    
    onProgress?.(i + 1, preset.frameCount);
    console.log(`   프레임 ${i + 1}/${preset.frameCount}: ${frame.description}`);

    try {
      const requestBody: Record<string, unknown> = {
        prompt,
        size: canvasSize,
        asset_type: 'character',
        negative_prompt: NEGATIVE_KEYWORDS,
        frame_index: i,
      };

      // 첫 프레임이 아니면 저장된 seed 사용 (일관성 유지)
      if (sharedSeed !== null) {
        requestBody.seed = sharedSeed;
      }

      const response = await fetch(ANIMATION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.image) {
        // 첫 프레임에서 생성된 seed를 저장 (이후 프레임에서 재사용)
        if (i === 0 && data.seed !== undefined) {
          sharedSeed = data.seed;
          console.log(`   🎲 Seed 고정: ${sharedSeed}`);
        }
        
        const generatedFrame: GeneratedFrame = {
          frameIndex: i,
          imageData: data.image,
          prompt,
        };
        
        generatedFrames.push(generatedFrame);
        onFrameGenerated?.(i, data.image);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`   ❌ 프레임 ${i + 1} 실패: ${errorMsg}`);
      onError?.(errorMsg, i);
      throw new Error(`프레임 ${i + 1} 생성 실패: ${errorMsg}`);
    }

    // 서버 부하 방지를 위한 딜레이
    if (i < preset.frames.length - 1) {
      await delay(300);
    }
  }

  console.log(`✅ 애니메이션 생성 완료! (${generatedFrames.length}프레임)`);
  return generatedFrames;
}

/**
 * 단일 프레임만 재생성 (특정 프레임만 다시 만들고 싶을 때)
 * seed를 지정하면 스타일 일관성 유지
 */
export async function regenerateFrame(
  characterDescription: string,
  preset: AnimationPreset,
  frameIndex: number,
  canvasSize: number,
  seed?: number  // seed 지정으로 일관성 유지
): Promise<{ image: string; seed: number }> {
  const frame = preset.frames[frameIndex];
  if (!frame) {
    throw new Error(`프레임 인덱스가 유효하지 않습니다: ${frameIndex}`);
  }

  const prompt = buildFramePrompt(characterDescription, preset, frameIndex);
  
  const requestBody: Record<string, unknown> = {
    prompt,
    size: canvasSize,
    asset_type: 'character',
    negative_prompt: NEGATIVE_KEYWORDS,
    frame_index: frameIndex,
  };

  if (seed !== undefined) {
    requestBody.seed = seed;
  }

  const response = await fetch(ANIMATION_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return { image: data.image, seed: data.seed };
}

/**
 * 첫 프레임(기준 프레임)만 생성
 * 반환된 seed를 저장해서 나머지 프레임에 사용
 */
export async function generateBaseFrame(
  characterDescription: string,
  canvasSize: number
): Promise<{ image: string; seed: number }> {
  const prompt = `${characterDescription}, standing pose, neutral stance, front view, centered`;

  const response = await fetch(ANIMATION_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      size: canvasSize,
      asset_type: 'character',
      negative_prompt: NEGATIVE_KEYWORDS,
      frame_index: 0,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return { image: data.image, seed: data.seed };
}

/**
 * 기준 프레임의 seed를 사용해서 애니메이션 확장 생성
 */
export async function generateAnimationFromBase(
  baseSeed: number,  // 기준 프레임의 seed (일관성 유지)
  characterDescription: string,
  presetId: string,
  canvasSize: number,
  onFrameGenerated?: (frameIndex: number, imageData: string) => void,
  onProgress?: (current: number, total: number) => void
): Promise<GeneratedFrame[]> {
  const preset = ANIMATION_PRESETS[presetId];
  if (!preset) {
    throw new Error(`프리셋을 찾을 수 없습니다: ${presetId}`);
  }

  const generatedFrames: GeneratedFrame[] = [];

  console.log(`🎬 Seed ${baseSeed} 기반 애니메이션 확장`);

  for (let i = 0; i < preset.frames.length; i++) {
    const prompt = buildFramePrompt(characterDescription, preset, i);
    
    onProgress?.(i + 1, preset.frameCount);

    try {
      const response = await fetch(ANIMATION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          size: canvasSize,
          asset_type: 'character',
          negative_prompt: NEGATIVE_KEYWORDS,
          seed: baseSeed,  // 모든 프레임에 같은 seed
          frame_index: i,
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      if (data.image) {
        generatedFrames.push({
          frameIndex: i,
          imageData: data.image,
          prompt,
        });
        onFrameGenerated?.(i, data.image);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
      throw new Error(`프레임 ${i + 1} 생성 실패: ${errorMsg}`);
    }

    await delay(300);
  }

  return generatedFrames;
}

/**
 * 단일 이미지 생성 (애니메이션 아닌 일반 생성)
 */
export async function generateSingleImage(
  prompt: string,
  canvasSize: number,
  assetType: string = 'character'
): Promise<string> {
  const response = await fetch(GENERATE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      size: canvasSize,
      asset_type: assetType,
      negative_prompt: NEGATIVE_KEYWORDS,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.image;
}

// 유틸리티
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}