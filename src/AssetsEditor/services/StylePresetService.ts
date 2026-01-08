export interface VisualStyle {
    id: string;
    name: string;
    artStyle: string;
    promptModifier: string;
}

export interface ThemePreset {
    id: string;
    name: string;
    keywords: string[];
}

export interface MoodPreset {
    id: string;
    name: string;
    keywords: string[];
}

// 1. Visual Styles (Rendering Technique)
const DEFAULT_VISUAL_STYLES: VisualStyle[] = [
    {
        id: 'pixel_art',
        name: '픽셀 아트 (Pixel Art)',
        artStyle: 'Pixel Art',
        promptModifier: '16-bit Pixel Art, Retro Game Style, Clean outlines, high quality sprite'
    },
    {
        id: 'gameboy',
        name: '게임보이 (GameBoy)',
        artStyle: 'Monochrome Pixel',
        promptModifier: 'Gameboy style, 4-color palette, dot matrix, greenish tint'
    },
    {
        id: 'isometric',
        name: '아이소메트릭 (Isometric)',
        artStyle: 'Isometric 3D',
        promptModifier: 'Isometric view, 3D Rendered style, Pre-rendered, sharp details'
    },
    {
        id: 'watercolor',
        name: '수채화 (Watercolor)',
        artStyle: 'Watercolor',
        promptModifier: 'Watercolor painting, Wet on wet, Bleeding colors, soft edges, artistic'
    },
    {
        id: 'oil_painting',
        name: '유화 (Oil Painting)',
        artStyle: 'Oil Painting',
        promptModifier: 'Oil Painting, Impasto, Canvas texture, heavy brush strokes'
    },
    {
        id: 'hand_drawn',
        name: '손그림 (Hand Drawn)',
        artStyle: 'Sketch',
        promptModifier: 'Pencil Sketch, Graphite, Hand-drawn, rough lines, paper texture'
    },
    {
        id: 'anime',
        name: '애니메이션 (Anime)',
        artStyle: 'Anime',
        promptModifier: 'Anime Style, Cel Shaded, Japanese Animation, Studio Ghibli style, vibrant'
    },
    {
        id: 'sd_character',
        name: 'SD 캐릭터 (Super Deformed)',
        artStyle: 'SD Character',
        promptModifier: 'Super Deformed, Chibi style, Big head small body, 2 heads tall, Cute proportions, Expressive'
    },
    {
        id: 'voxel',
        name: '복셀 (Voxel)',
        artStyle: 'Voxel',
        promptModifier: 'Voxel Art, 3D Cube style, MagicaVoxel, blocky, lego-like'
    },
    {
        id: 'low_poly',
        name: '로우 폴리 (Low Poly)',
        artStyle: 'Low Poly',
        promptModifier: 'Low Poly 3D, Flat Shading, Sharp facets, geometric, minimalist'
    },
    {
        id: 'vector',
        name: '벡터 (Vector)',
        artStyle: 'Vector Art',
        promptModifier: 'Vector Art, Flat Design, Rounded, thick outlines, simple shapes'
    },
    {
        id: 'blueprint',
        name: '청사진 (Blueprint)',
        artStyle: 'Technical Drawing',
        promptModifier: 'Blueprint, Schematics, White lines on blue background, technical'
    },
    {
        id: 'claymation',
        name: '클레이 (Claymation)',
        artStyle: 'Clay',
        promptModifier: 'Claymation, Stop motion, Plasticine texture, soft lighting'
    }
];

// 2. Themes (Genre / Setting)
const DEFAULT_THEMES: ThemePreset[] = [
    {
        id: 'fantasy',
        name: '판타지 (Fantasy)',
        keywords: ['Fantasy', 'Magic', 'Medieval', 'Sword and Sorcery']
    },
    {
        id: 'sci_fi',
        name: 'SF (Sci-Fi)',
        keywords: ['Sci-Fi', 'Spaceship', 'Futuristic', 'Alien technology']
    },
    {
        id: 'cyberpunk',
        name: '사이버펑크 (Cyberpunk)',
        keywords: ['Cyberpunk', 'High Tech', 'Low Life', 'Neon Lights', 'Dystopian']
    },
    {
        id: 'steampunk',
        name: '스팀펑크 (Steampunk)',
        keywords: ['Steampunk', 'Brass', 'Gears', 'Victorian', 'Steam Engine']
    },
    {
        id: 'horror',
        name: '공포 (Horror)',
        keywords: ['Horror', 'Eerie', 'Creepy', 'Blood', 'Nightmare']
    },
    {
        id: 'western',
        name: '서부 (Western)',
        keywords: ['Wild West', 'Cowboy', 'Desert', 'Saloon', 'Dusty']
    },
    {
        id: 'noir',
        name: '누아르 (Noir)',
        keywords: ['Film Noir', 'Detective', 'Shadows', 'Crime', 'Rainy']
    },
    {
        id: 'modern',
        name: '현대 (Modern)',
        keywords: ['Modern City', 'Urban', 'Contemporary', 'Realistic day life']
    },
    {
        id: 'nature',
        name: '자연 (Nature)',
        keywords: ['Nature', 'Forest', 'Organic', 'Flowers', 'Jungle']
    },
    {
        id: 'post_apoc',
        name: '포스트 아포칼립스',
        keywords: ['Post-Apocalyptic', 'Ruins', 'Rust', 'Overgrown', 'Survival']
    },
    {
        id: 'space_opera',
        name: '스페이스 오페라',
        keywords: ['Space Opera', 'Galactic', 'Stars', 'Nebula', 'Epic']
    },
    {
        id: 'pirate',
        name: '해적 (Pirate)',
        keywords: ['Pirate', 'Tropical', 'Ocean', 'Ship', 'Treasure']
    }
];

// 3. Moods (Atmosphere)
const DEFAULT_MOODS: MoodPreset[] = [
    {
        id: 'neutral',
        name: '보통 (Neutral)',
        keywords: []
    },
    {
        id: 'gloomy',
        name: '우울한 (Gloomy)',
        keywords: ['Gloomy', 'Depressing', 'Foggy', 'Muted colors']
    },
    {
        id: 'vibrant',
        name: '활기찬 (Vibrant)',
        keywords: ['Vibrant', 'Energetic', 'Saturated', 'Colorful']
    },
    {
        id: 'mysterious',
        name: '신비로운 (Mysterious)',
        keywords: ['Mysterious', 'Magical', 'Glowing', 'Ethereal']
    },
    {
        id: 'peaceful',
        name: '평화로운 (Peaceful)',
        keywords: ['Peaceful', 'Calm', 'Serene', 'Soft lighting']
    },
    {
        id: 'chaotic',
        name: '혼란스러운 (Chaotic)',
        keywords: ['Chaotic', 'Destruction', 'Messy', 'Dynamic']
    },
    {
        id: 'scary',
        name: '무서운 (Scary)',
        keywords: ['Scary', 'Ominous', 'Darkness', 'Fear']
    },
    {
        id: 'cute',
        name: '귀여운 (Cute)',
        keywords: ['Cute', 'Chibi', 'Adorable', 'Pastel colors']
    },
    {
        id: 'minimalist',
        name: '미니멀 (Minimalist)',
        keywords: ['Minimalist', 'Clean', 'Simple', 'Less is more']
    },
    {
        id: 'retro',
        name: '레트로 (Retro)',
        keywords: ['Retro', 'Vintage', 'Nostalgic', 'Old school']
    }
];

export const StylePresetService = {
    getVisualStyles: (): VisualStyle[] => DEFAULT_VISUAL_STYLES,
    getThemes: (): ThemePreset[] => DEFAULT_THEMES,
    getMoods: (): MoodPreset[] => DEFAULT_MOODS,

    buildPrompt: (userPrompt: string, styleId?: string, themeId?: string, moodId?: string): string => {
        const style = DEFAULT_VISUAL_STYLES.find(s => s.id === styleId);
        const theme = DEFAULT_THEMES.find(t => t.id === themeId);
        const mood = DEFAULT_MOODS.find(m => m.id === moodId);

        const parts = [];

        // 1. Theme Keywords (Subject Context)
        if (theme) {
            parts.push(theme.keywords.join(', '));
        }

        // 2. Mood Keywords (Atmosphere)
        if (mood && mood.keywords.length > 0) {
            parts.push(mood.keywords.join(', '));
        }

        // 3. Visual Style Modifiers (Art Technique)
        if (style) {
            parts.push(style.promptModifier);
        }

        // Combine: "User Prompt. Theme. Mood. Style."
        return `${userPrompt}. ${parts.join(', ')}`;
    }
};
