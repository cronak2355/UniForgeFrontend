// src/AssetsEditor/services/AnimationService.ts

import {
  ANIMATION_PRESETS,
  buildFramePrompt,
  NEGATIVE_KEYWORDS
} from '../data/AnimationPresets';
import type { AnimationPreset } from '../data/AnimationPresets';
import { authService } from '../../services/authService';
import { SagemakerService } from './SagemakerService';

// 배경 제거 전용 API (Backend - Bedrock Nova Canvas)
const REMOVE_BG_API_URL = '/api/remove-background';

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

function getAuthHeaders() {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

/**
 * 애니메이션 프레임들을 순차적으로 생성 (SageMaker Direct)
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
  let sharedSeed: number | undefined = undefined;  // 모든 프레임이 공유할 seed

  console.log(`🎬 애니메이션 생성 시작: ${preset.nameKo} (${preset.frameCount}프레임)`);
  console.log(`   방식: Seed 기반 txt2img (SageMaker)`);

  for (let i = 0; i < preset.frames.length; i++) {
    const frame = preset.frames[i];
    const prompt = buildFramePrompt(characterDescription, preset, i);

    onProgress?.(i + 1, preset.frameCount);
    console.log(`   프레임 ${i + 1}/${preset.frameCount}: ${frame.description}`);

    try {
      const response = await SagemakerService.generateAsset({
        prompt: prompt,
        negative_prompt: NEGATIVE_KEYWORDS,
        asset_type: 'character',
        width: 512,
        height: 512,
        mode: 'text-to-image',
        seed: sharedSeed // 첫 프레임 이후 동일한 seed 사용
      });

      if (!response.success || !response.image) {
        throw new Error(response.error || "Image generation failed");
      }

      // 첫 프레임에서 생성된 seed를 저장 (이후 프레임에서 재사용)
      if (i === 0 && response.seed !== undefined) {
        sharedSeed = response.seed;
        console.log(`   🎲 Seed 고정: ${sharedSeed}`);
      }

      const generatedFrame: GeneratedFrame = {
        frameIndex: i,
        imageData: response.image,
        prompt,
      };

      generatedFrames.push(generatedFrame);
      onFrameGenerated?.(i, response.image);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`   ❌ 프레임 ${i + 1} 실패: ${errorMsg}`);
      onError?.(errorMsg, i);
      throw new Error(`프레임 ${i + 1} 생성 실패: ${errorMsg}`);
    }

    // 서버 부하 방지를 위한 딜레이 (SageMaker는 빠르지만 안전하게)
    if (i < preset.frames.length - 1) {
      await delay(200);
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

  const response = await SagemakerService.generateAsset({
    prompt: prompt,
    negative_prompt: NEGATIVE_KEYWORDS,
    asset_type: 'character',
    width: 512,
    height: 512,
    mode: 'text-to-image',
    seed: seed
  });

  if (!response.success || !response.image) {
    throw new Error(response.error || "Regeneration failed");
  }

  return { image: response.image, seed: response.seed || 0 };
}

/**
 * 첫 프레임(기준 프레임)만 생성 (SageMaker)
 * 반환된 seed를 저장해서 나머지 프레임에 사용
 */
export async function generateBaseFrame(
  characterDescription: string,
  canvasSize: number
): Promise<{ image: string; seed: number }> {
  // 강제 프롬프트 유지
  const prompt = `${characterDescription}, standing pose, neutral stance, front view, centered, pixel art, game asset, single character, (white background:1.3), simple background`;

  const response = await SagemakerService.generateAsset({
    prompt: prompt,
    negative_prompt: NEGATIVE_KEYWORDS,
    asset_type: 'character',
    width: 512,
    height: 512,
    mode: 'text-to-image'
  });

  if (!response.success || !response.image) {
    throw new Error(response.error || "Base frame generation failed");
  }

  return { image: response.image, seed: response.seed || 0 };
}

/**
 * 기준 프레임의 seed를 사용해서 애니메이션 확장 생성 (SageMaker)
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

  console.log(`🎬 Seed ${baseSeed} 기반 애니메이션 확장 (SageMaker)`);

  for (let i = 0; i < preset.frames.length; i++) {
    const prompt = buildFramePrompt(characterDescription, preset, i);

    onProgress?.(i + 1, preset.frameCount);

    const response = await SagemakerService.generateAsset({
      prompt: prompt,
      negative_prompt: NEGATIVE_KEYWORDS,
      asset_type: 'character',
      width: 512,
      height: 512,
      mode: 'text-to-image',
      seed: baseSeed // 모든 프레임에 같은 seed 강제
    });

    if (!response.success || !response.image) {
      throw new Error(response.error || "Frame generation failed");
    }

    generatedFrames.push({
      frameIndex: i,
      imageData: response.image,
      prompt,
    });
    onFrameGenerated?.(i, response.image);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    throw new Error(`프레임 ${i + 1} 생성 실패: ${errorMsg}`);
  }

  await delay(200);
}

return generatedFrames;
}

/**
 * 단일 이미지 생성 (애니메이션 아닌 일반 생성) (SageMaker)
 */
export async function generateSingleImage(
  prompt: string,
  canvasSize: number,
  assetType: 'character' | 'object' | 'tile' | 'effect' = 'character'
): Promise<string> {
  // 강제 키워드 추가 (사용자 요청: 전신, 중앙 배치 등)
  // 단, assetTypes가 'tile'이나 'effect'일 경우 다를 수 있으나, 
  // 여기서는 사용자가 '캐릭터/오브젝트' 생성 시 주로 사용하므로 기본적으로 pixel art, game asset 등은 추가하는게 안전.
  // 다만 AnimationPresets의 CONSISTENCY_KEYWORDS는 캐릭터 전용이므로,
  // 여기서는 prompt에 기본적으로 'pixel art, game asset' 정도만 보장하거나, 
  // 입력된 prompt를 그대로 신뢰하되 SagemakerService가 처리.
  // 기존 BedrockService에서는 'pixel art style, solo, single isolated subject, centered'를 강제했음.
  // 이를 여기서 복원함.

  const enhancedPrompt = `pixel art style, solo, single isolated subject, centered, ${prompt}, (white background:1.3), simple background`;

  const response = await SagemakerService.generateAsset({
    prompt: enhancedPrompt,
    negative_prompt: NEGATIVE_KEYWORDS,
    asset_type: assetType,
    width: 512,  // Force 512
    height: 512, // Force 512
    mode: 'text-to-image'
  });

  if (!response.success || !response.image) {
    throw new Error(response.error || "Single image generation failed");
  }

  return response.image;
}

/**
 * AI 배경 제거 요청 (Backend - Bedrock Nova Canvas 유지)
 * SageMaker 엔드포인트에 배경 제거 기능이 없다면 Backend를 계속 사용.
 */
export async function removeBackground(base64Image: string): Promise<string> {
  try {
    const response = await fetch(REMOVE_BG_API_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        image: base64Image
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Background Removal Failed [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    return data.image;
  } catch (error) {
    console.error("Background Removal Error:", error);
    throw error;
  }
}

// 유틸리티
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}