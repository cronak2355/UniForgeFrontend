import type { EntityPreset } from "./PresetTypes";

export const DefaultPresets: Record<string, EntityPreset> = {
    player_platformer: {
        id: "player_platformer",
        label: "Player (Platformer)",
        description: "Platformer player with jump and left/right movement.",
        variables: [
            { id: "preset-physics-mode", name: "physicsMode", type: "string", value: "Platformer" },
            { id: "preset-max-speed", name: "maxSpeed", type: "float", value: 200 },
            { id: "preset-jump-force", name: "jumpForce", type: "float", value: 400 },
            { id: "preset-gravity", name: "gravity", type: "float", value: 800 },
            { id: "preset-hp", name: "hp", type: "float", value: 100 },
            { id: "preset-max-hp", name: "maxHp", type: "float", value: 100 },
            { id: "preset-mp", name: "mp", type: "float", value: 0 },
            { id: "preset-max-mp", name: "maxMp", type: "float", value: 0 },
            { id: "preset-speed", name: "speed", type: "float", value: 1 },
            { id: "preset-attack", name: "attack", type: "float", value: 10 },
            { id: "preset-defense", name: "defense", type: "float", value: 0 }
        ]
            },
            {
                event: "KEY_DOWN",
                eventParams: { key: "ArrowLeft" },
                actions: [{ type: "Move", x: -1, y: 0, speed: 200 }]
            },
            {
                event: "KEY_DOWN",
                eventParams: { key: "ArrowRight" },
                actions: [{ type: "Move", x: 1, y: 0, speed: 200 }]
            }
        ]
    },
    player_topdown: {
        id: "player_topdown",
        label: "Player (TopDown/RPG)",
        description: "Top-down RPG player with 8-direction movement.",
        variables: [
            { id: "preset-physics-mode", name: "physicsMode", type: "string", value: "TopDown" },
            { id: "preset-max-speed", name: "maxSpeed", type: "float", value: 200 },
            { id: "preset-jump-force", name: "jumpForce", type: "float", value: 0 },
            { id: "preset-gravity", name: "gravity", type: "float", value: 0 },
            { id: "preset-hp", name: "hp", type: "float", value: 100 },
            { id: "preset-max-hp", name: "maxHp", type: "float", value: 100 },
            { id: "preset-mp", name: "mp", type: "float", value: 50 },
            { id: "preset-max-mp", name: "maxMp", type: "float", value: 50 },
            { id: "preset-speed", name: "speed", type: "float", value: 1 },
            { id: "preset-attack", name: "attack", type: "float", value: 10 },
            { id: "preset-defense", name: "defense", type: "float", value: 5 }
        ]
    },
    enemy_chaser: {
        id: "enemy_chaser",
        label: "Enemy (Chaser)",
        description: "Enemy that can chase the player.",
        variables: [
            { id: "preset-physics-mode", name: "physicsMode", type: "string", value: "TopDown" },
            { id: "preset-max-speed", name: "maxSpeed", type: "float", value: 100 },
            { id: "preset-attack-range", name: "attackRange", type: "float", value: 50 },
            { id: "preset-damage", name: "damage", type: "float", value: 10 },
            { id: "preset-attack-interval", name: "attackInterval", type: "float", value: 1000 },
            { id: "preset-hp", name: "hp", type: "float", value: 50 },
            { id: "preset-max-hp", name: "maxHp", type: "float", value: 50 }
        ]
    }
};
