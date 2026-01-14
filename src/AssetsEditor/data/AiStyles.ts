
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
        label: "Pixel Art",
        description: "Classic 8-bit/16-bit retro game style",
        promptModifier: "pixel art, 16-bit, sprite sheet style, sharp edges, non-anti-aliased, flat colors, clean lines",
        imageUrl: "/assets/styles/pixel_art.png"
    },
    {
        id: "2d_cartoon",
        label: "2D Cartoon",
        description: "Vibrant, clean animated style",
        promptModifier: "2d game asset, cartoon style, cell shaded, vibrant colors, clean outlines, vector art style",
        imageUrl: "/assets/styles/cartoon.png"
    },
    {
        id: "isometric",
        label: "Isometric 3D",
        description: "3D rendered style with isometric view",
        promptModifier: "isometric view, 3d render, blender style, low poly, soft lighting, game asset",
        imageUrl: "/assets/styles/isometric.png"
    },
    {
        id: "hand_drawn",
        label: "Hand Drawn",
        description: "Sketchy, artistic watercolor or ink style",
        promptModifier: "hand drawn, watercolor style, ink outlines, artistic, painterly, rough edges",
        imageUrl: "/assets/styles/hand_drawn.png"
    },
    {
        id: "realistic",
        label: "Realistic",
        description: "High fidelity, detailed textures",
        promptModifier: "photorealistic, unreal engine 5 render, 8k, highly detailed, pbr textures, cinematic lighting",
        imageUrl: "/assets/styles/realistic.png"
    }
];

export const THEMES: StyleDefinition[] = [
    {
        id: "fantasy",
        label: "Fantasy",
        description: "Knights, magic, dragons",
        promptModifier: "fantasy setting, medieval, magical, rpg style, sword and sorcery",
    },
    {
        id: "sci_fi",
        label: "Sci-Fi",
        description: "Space, robots, futuristic technology",
        promptModifier: "sci-fi, cyberpunk, futuristic, high tech, mechanical, neon lights, metallic",
    },
    {
        id: "modern",
        label: "Modern",
        description: "Contemporary city life, everyday items",
        promptModifier: "modern day, contemporary, urban, city life, realistic everyday object",
    },
    {
        id: "horror",
        label: "Horror",
        description: "Scary, dark, unsettling",
        promptModifier: "horror theme, jagged edges, scary, dark fantasy, eldritch",
    }
];

export const MOODS: StyleDefinition[] = [
    {
        id: "cheerful",
        label: "Cheerful",
        description: "Bright, happy, welcoming",
        promptModifier: "bright lighting, saturated colors, happy atmosphere, warm colors",
    },
    {
        id: "dark",
        label: "Dark",
        description: "Gloomy, mysterious, shadowed",
        promptModifier: "dark atmosphere, low key lighting, desaturated, gloomy, mysterious",
    },
    {
        id: "epic",
        label: "Epic",
        description: "Grand, imposing, legendary",
        promptModifier: "epic scale, dramatic lighting, god rays, majestic, legendary",
    }
];

export const CATEGORY_PREFIXES = {
    CHARACTER: "game character, full body, standing pose",
    OBJECT: "game item, icon, single object, centered",
    FX: "visual effect, particle effect, magical aura, game vfx, transparent background",
    TILE: "seamless texture, game tile, top down view, floor texture"
};
