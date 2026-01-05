import type { EntityPreset } from "./PresetTypes";

/**
 * 기본 제공 프리셋 목록
 */
export const DefaultPresets: Record<string, EntityPreset> = {
    // --- 플레이어 (플랫포머) ---
    "player_platformer": {
        id: "player_platformer",
        label: "Player (Platformer)",
        description: "좌우 이동과 점프가 가능한 플랫포머 주인공입니다.",
        modules: [
            {
                type: "Kinetic",
                id: "kinetic_main",
                mode: "Platformer",
                friction: 0.9,
                maxSpeed: 200,
                jumpForce: 400,
                gravity: 800
            },
            {
                type: "Status",
                id: "status_main",
                hp: 100,
                maxHp: 100,
                mp: 0,
                maxMp: 0,
                speed: 1,
                attack: 10,
                defense: 0
            }
        ],
        rules: [
            // 점프 (Space)
            {
                event: "KEY_DOWN",
                eventParams: { key: "Space" },
                conditions: [
                    { type: "IsGrounded" }
                ],
                actions: [
                    { type: "Jump", force: 400 }
                ]
            },
            // 왼쪽 이동 (ArrowLeft)
            {
                event: "KEY_DOWN",
                eventParams: { key: "ArrowLeft" },
                actions: [
                    { type: "Move", x: -1, y: 0, speed: 200 }
                ]
            },
            {
                event: "KEY_DOWN",
                eventParams: { key: "ArrowRight" },
                actions: [
                    { type: "Move", x: 1, y: 0, speed: 200 }
                ]
            }
        ]
    },

    // --- 플레이어 (탑다운/RPG) ---
    "player_topdown": {
        id: "player_topdown",
        label: "Player (TopDown/RPG)",
        description: "8방향 자유 이동이 가능한 RPG 스타일 주인공입니다.",
        modules: [
            {
                type: "Kinetic",
                id: "kinetic_main",
                mode: "TopDown",
                friction: 0.9,
                maxSpeed: 200,
                jumpForce: 0,
                gravity: 0
            },
            {
                type: "Status",
                id: "status_main",
                hp: 100,
                maxHp: 100,
                mp: 50,
                maxMp: 50,
                speed: 1,
                attack: 10,
                defense: 5
            }
        ],
        rules: []
    },

    // --- 몬스터 (추적자) ---
    "enemy_chaser": {
        id: "enemy_chaser",
        label: "Enemy (Chaser)",
        description: "플레이어를 발견하면 쫓아오는 몬스터입니다.",
        modules: [
            {
                type: "Kinetic",
                id: "kinetic_enemy",
                mode: "TopDown",
                friction: 0.9,
                maxSpeed: 100,
                jumpForce: 0,
                gravity: 0
            },
            {
                type: "Combat",
                id: "combat_enemy",
                attackRange: 50,
                damage: 10,
                attackInterval: 1000,
                bulletCount: 1,
                bulletPattern: "Single"
            }
        ],
        rules: [
            // 추후 구현
        ]
    }
};
