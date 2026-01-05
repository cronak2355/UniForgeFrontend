// src/AssetsEditor/data/animationPresets.ts

export interface AnimationFrame {
  frameIndex: number;
  prompt: string;
  strength: number;
  description: string;
}

export interface AnimationPreset {
  id: string;
  name: string;
  nameKo: string;
  frameCount: number;
  basePrompt: string;
  frames: AnimationFrame[];
  loopType: 'loop' | 'pingpong' | 'once';
}

// ⚠️ 중요: "animation", "spritesheet", "sequence" 같은 단어 절대 사용 금지!
// AI가 여러 포즈를 한 장에 그리려고 함
export const CONSISTENCY_KEYWORDS = 
  "single character, solo, one person, full body, side view, white background, pixel art, game asset";

// 네거티브 프롬프트 (서버에서 사용)
export const NEGATIVE_KEYWORDS =
  "multiple characters, spritesheet, sprite sheet, multiple poses, grid, collage, sequence, frames, collection, group, crowd, multiple views";

// ==================== 애니메이션 프리셋 정의 ====================

export const ANIMATION_PRESETS: Record<string, AnimationPreset> = {
  
  // ==================== IDLE (대기) ====================
  idle: {
    id: "idle",
    name: "Idle",
    nameKo: "대기",
    frameCount: 4,
    basePrompt: "standing still",
    loopType: "pingpong",
    frames: [
      {
        frameIndex: 0,
        prompt: "standing straight, relaxed pose",
        strength: 0.0,
        description: "기본 자세"
      },
      {
        frameIndex: 1,
        prompt: "standing, slight inhale, chest raised",
        strength: 0.25,
        description: "숨 들이쉬기"
      },
      {
        frameIndex: 2,
        prompt: "standing, breath held, tall posture",
        strength: 0.22,
        description: "숨 최고점"
      },
      {
        frameIndex: 3,
        prompt: "standing, exhaling, relaxing",
        strength: 0.25,
        description: "숨 내쉬기"
      }
    ]
  },

  // ==================== WALK (걷기) ====================
  walk: {
    id: "walk",
    name: "Walk",
    nameKo: "걷기",
    frameCount: 4,
    basePrompt: "walking",
    loopType: "loop",
    frames: [
      {
        frameIndex: 0,
        prompt: "walking pose, left leg stepping forward, right leg back, mid-stride",
        strength: 0.0,
        description: "왼발 앞"
      },
      {
        frameIndex: 1,
        prompt: "walking pose, legs together, both feet on ground, standing straight",
        strength: 0.60,
        description: "다리 모음"
      },
      {
        frameIndex: 2,
        prompt: "walking pose, right leg stepping forward, left leg back, mid-stride",
        strength: 0.62,
        description: "오른발 앞"
      },
      {
        frameIndex: 3,
        prompt: "walking pose, legs crossing, transitioning step",
        strength: 0.60,
        description: "다리 교차"
      }
    ]
  },

  // ==================== RUN (달리기) ====================
  run: {
    id: "run",
    name: "Run",
    nameKo: "달리기",
    frameCount: 4,
    basePrompt: "running fast",
    loopType: "loop",
    frames: [
      {
        frameIndex: 0,
        prompt: "running, left knee raised high, right foot on ground, dynamic pose",
        strength: 0.0,
        description: "왼무릎 높이"
      },
      {
        frameIndex: 1,
        prompt: "running, both feet off ground, airborne, leaping forward",
        strength: 0.65,
        description: "공중"
      },
      {
        frameIndex: 2,
        prompt: "running, right knee raised high, left foot on ground, dynamic pose",
        strength: 0.68,
        description: "오른무릎 높이"
      },
      {
        frameIndex: 3,
        prompt: "running, airborne again, mid-air stride",
        strength: 0.65,
        description: "공중 복귀"
      }
    ]
  },

  // ==================== ATTACK SLASH (베기) ====================
  attack_slash: {
    id: "attack_slash",
    name: "Attack (Slash)",
    nameKo: "공격 (베기)",
    frameCount: 4,
    basePrompt: "sword attack",
    loopType: "once",
    frames: [
      {
        frameIndex: 0,
        prompt: "combat stance, sword held ready at side, preparing to attack",
        strength: 0.0,
        description: "준비"
      },
      {
        frameIndex: 1,
        prompt: "sword raised high above head, arms up, winding up attack",
        strength: 0.62,
        description: "올리기"
      },
      {
        frameIndex: 2,
        prompt: "sword swinging down, slashing motion, arms extended forward",
        strength: 0.65,
        description: "베기"
      },
      {
        frameIndex: 3,
        prompt: "sword lowered after swing, recovery stance",
        strength: 0.58,
        description: "마무리"
      }
    ]
  },

  // ==================== ATTACK THRUST (찌르기) ====================
  attack_thrust: {
    id: "attack_thrust",
    name: "Attack (Thrust)",
    nameKo: "공격 (찌르기)",
    frameCount: 4,
    basePrompt: "stabbing attack",
    loopType: "once",
    frames: [
      {
        frameIndex: 0,
        prompt: "combat stance, weapon at side, ready to strike",
        strength: 0.0,
        description: "대기"
      },
      {
        frameIndex: 1,
        prompt: "pulling weapon back, body coiling, aiming forward",
        strength: 0.60,
        description: "당기기"
      },
      {
        frameIndex: 2,
        prompt: "thrusting weapon forward, lunging pose, arm fully extended",
        strength: 0.65,
        description: "찌르기"
      },
      {
        frameIndex: 3,
        prompt: "pulling back, returning to neutral stance",
        strength: 0.55,
        description: "복귀"
      }
    ]
  },

  // ==================== ATTACK MAGIC (마법) ====================
  attack_magic: {
    id: "attack_magic",
    name: "Attack (Magic)",
    nameKo: "공격 (마법)",
    frameCount: 4,
    basePrompt: "casting spell",
    loopType: "once",
    frames: [
      {
        frameIndex: 0,
        prompt: "standing with hands together, concentrating, gathering power",
        strength: 0.0,
        description: "집중"
      },
      {
        frameIndex: 1,
        prompt: "hands glowing with energy, magical aura, charging spell",
        strength: 0.58,
        description: "충전"
      },
      {
        frameIndex: 2,
        prompt: "arms thrust forward, releasing magic blast, energy shooting out",
        strength: 0.65,
        description: "발사"
      },
      {
        frameIndex: 3,
        prompt: "arms lowering, spell complete, relaxing pose",
        strength: 0.55,
        description: "마무리"
      }
    ]
  },

  // ==================== HIT (피격) ====================
  hit: {
    id: "hit",
    name: "Hit",
    nameKo: "피격",
    frameCount: 3,
    basePrompt: "taking damage",
    loopType: "once",
    frames: [
      {
        frameIndex: 0,
        prompt: "flinching back, hit by attack",
        strength: 0.0,
        description: "충격"
      },
      {
        frameIndex: 1,
        prompt: "staggering, off balance, hurt",
        strength: 0.45,
        description: "휘청"
      },
      {
        frameIndex: 2,
        prompt: "recovering, regaining balance",
        strength: 0.40,
        description: "회복"
      }
    ]
  },

  // ==================== DIE (사망) ====================
  die: {
    id: "die",
    name: "Die",
    nameKo: "사망",
    frameCount: 4,
    basePrompt: "defeated falling",
    loopType: "once",
    frames: [
      {
        frameIndex: 0,
        prompt: "hit hard, body jerking",
        strength: 0.0,
        description: "치명타"
      },
      {
        frameIndex: 1,
        prompt: "knees buckling, falling down",
        strength: 0.50,
        description: "무릎 꺾임"
      },
      {
        frameIndex: 2,
        prompt: "collapsing sideways, falling over",
        strength: 0.55,
        description: "쓰러짐"
      },
      {
        frameIndex: 3,
        prompt: "lying on ground, motionless",
        strength: 0.48,
        description: "사망"
      }
    ]
  },

  // ==================== JUMP (점프) ====================
  jump: {
    id: "jump",
    name: "Jump",
    nameKo: "점프",
    frameCount: 4,
    basePrompt: "jumping",
    loopType: "once",
    frames: [
      {
        frameIndex: 0,
        prompt: "crouching low, knees bent, preparing to jump, coiled pose",
        strength: 0.0,
        description: "웅크림"
      },
      {
        frameIndex: 1,
        prompt: "jumping upward, legs pushing off, leaving ground, arms rising",
        strength: 0.65,
        description: "도약"
      },
      {
        frameIndex: 2,
        prompt: "at peak of jump, floating in air, legs tucked, highest point",
        strength: 0.62,
        description: "최고점"
      },
      {
        frameIndex: 3,
        prompt: "landing on ground, knees bending to absorb impact",
        strength: 0.60,
        description: "착지"
      }
    ]
  },

  // ==================== IDLE NOD (고개 끄덕임) ====================
  idle_nod: {
    id: "idle_nod",
    name: "Idle (Nod)",
    nameKo: "대기 (끄덕임)",
    frameCount: 4,
    basePrompt: "standing still",
    loopType: "pingpong",
    frames: [
      {
        frameIndex: 0,
        prompt: "standing, looking forward",
        strength: 0.0,
        description: "정면"
      },
      {
        frameIndex: 1,
        prompt: "standing, head tilting down",
        strength: 0.28,
        description: "고개 숙임"
      },
      {
        frameIndex: 2,
        prompt: "standing, head lowered, nodding",
        strength: 0.25,
        description: "끄덕임"
      },
      {
        frameIndex: 3,
        prompt: "standing, head rising back up",
        strength: 0.28,
        description: "올림"
      }
    ]
  }
};

// ==================== 헬퍼 함수 ====================

export function buildFramePrompt(
  characterDescription: string,
  preset: AnimationPreset,
  frameIndex: number
): string {
  const frame = preset.frames[frameIndex];
  if (!frame) return "";
  
  // 순서: 캐릭터 설명 먼저, 그 다음 포즈, 마지막에 일관성 키워드
  return `${characterDescription}, ${frame.prompt}, ${CONSISTENCY_KEYWORDS}`;
}

export function getPresetsByCategory(): Record<string, AnimationPreset[]> {
  return {
    "기본": [ANIMATION_PRESETS.idle, ANIMATION_PRESETS.idle_nod],
    "이동": [ANIMATION_PRESETS.walk, ANIMATION_PRESETS.run, ANIMATION_PRESETS.jump],
    "전투": [ANIMATION_PRESETS.attack_slash, ANIMATION_PRESETS.attack_thrust, ANIMATION_PRESETS.attack_magic],
    "반응": [ANIMATION_PRESETS.hit, ANIMATION_PRESETS.die]
  };
}

export function getPresetById(id: string): AnimationPreset | undefined {
  return ANIMATION_PRESETS[id];
}