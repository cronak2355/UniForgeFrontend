
export interface StyleDefinition {
    id: string;
    label: string;
    description: string;
    promptModifier: string; // The text appended to the prompt
    imageUrl?: string; // Placeholder for now, can be replaced with real assets later
}

export const STYLE_CATEGORIES = {
    ART_STYLE: "Art Style",
    THEME: "Theme",
    MOOD: "Mood"
};

export const ART_STYLES: StyleDefinition[] = [
    {
        id: "pixel_art",
        label: "픽셀 아트",
        description: "고전적인 8비트/16비트 레트로 게임 스타일",
        promptModifier: "pixel art, 16-bit, sprite sheet style, sharp edges, non-anti-aliased, flat colors, clean lines",
        imageUrl: "/assets/styles/pixel_art.png"
    },
    {
        id: "2d_cartoon",
        label: "2D 카툰",
        description: "생동감 있고 깔끔한 애니메이션 스타일",
        promptModifier: "2d game asset, cartoon style, cell shaded, vibrant colors, clean outlines, vector art style",
        imageUrl: "/assets/styles/cartoon.png"
    },
    {
        id: "isometric",
        label: "아이소메트릭 3D",
        description: "아이소메트릭 시점의 3D 렌더링 스타일",
        promptModifier: "isometric view, 3d render, blender style, low poly, soft lighting, game asset",
        imageUrl: "/assets/styles/isometric.png"
    },
    {
        id: "hand_drawn",
        label: "손그림 (수채화/잉크)",
        description: "거칠고 예술적인 수채화 또는 잉크 스타일",
        promptModifier: "hand drawn, watercolor style, ink outlines, artistic, painterly, rough edges",
        imageUrl: "/assets/styles/hand_drawn.png"
    },
    {
        id: "realistic",
        label: "실사 (Realistic)",
        description: "높은 퀄리티의 디테일한 텍스처",
        promptModifier: "photorealistic, unreal engine 5 render, 8k, highly detailed, pbr textures, cinematic lighting",
        imageUrl: "/assets/styles/realistic.png"
    }
];

export const THEMES: StyleDefinition[] = [
    {
        id: "fantasy",
        label: "판타지",
        description: "기사, 마법, 드래곤",
        promptModifier: "fantasy setting, medieval, magical, rpg style, sword and sorcery",
    },
    {
        id: "sci_fi",
        label: "SF (공상과학)",
        description: "우주, 로봇, 미래 기술",
        promptModifier: "sci-fi, cyberpunk, futuristic, high tech, mechanical, neon lights, metallic",
    },
    {
        id: "modern",
        label: "현대 (Modern)",
        description: "현대 도시, 일상적인 물건",
        promptModifier: "modern day, contemporary, urban, city life, realistic everyday object",
    },
    {
        id: "horror",
        label: "호러",
        description: "무섭고, 어둡고, 기괴한 분위기",
        promptModifier: "horror theme, jagged edges, scary, dark fantasy, eldritch",
    }
];

export const MOODS: StyleDefinition[] = [
    {
        id: "cheerful",
        label: "활기찬 (Cheerful)",
        description: "밝고 행복하며 환영하는 분위기",
        promptModifier: "bright lighting, saturated colors, happy atmosphere, warm colors",
    },
    {
        id: "dark",
        label: "어두운 (Dark)",
        description: "우울하고 신비로우며 그림자 진 분위기",
        promptModifier: "dark atmosphere, low key lighting, desaturated, gloomy, mysterious",
    },
    {
        id: "epic",
        label: "웅장한 (Epic)",
        description: "거대하고 압도적인 전설적인 분위기",
        promptModifier: "epic scale, dramatic lighting, god rays, majestic, legendary",
    }
];

export const CATEGORY_PREFIXES = {
    CHARACTER: "game character, full body, standing pose",
    OBJECT: "game item, icon, single object, centered",
    FX: "visual effect, particle effect, magical aura, game vfx, transparent background",
    TILE: "seamless texture, game tile, top down view, floor texture"
};
