import type { LogicComponent } from "../types/Component";

export interface ComponentPreset {
    id: string;
    name: string;
    description: string;
    icon: string;
    components: Omit<LogicComponent, "id">[];
}

export const COMPONENT_PRESETS: ComponentPreset[] = [
    {
        id: "wasd-move",
        name: "WASD 이동",
        description: "W/A/S/D 키로 상하좌우 이동",
        icon: "🎮",
        components: [
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [{ type: "InputKey", key: "KeyW" }],
                conditionLogic: "AND",
                actions: [{ type: "Move", direction: { type: "literal", value: { x: 0, y: -1 } }, speed: 200 }],
            },
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [{ type: "InputKey", key: "KeyS" }],
                conditionLogic: "AND",
                actions: [{ type: "Move", direction: { type: "literal", value: { x: 0, y: 1 } }, speed: 200 }],
            },
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [{ type: "InputKey", key: "KeyA" }],
                conditionLogic: "AND",
                actions: [{ type: "Move", direction: { type: "literal", value: { x: -1, y: 0 } }, speed: 200 }],
            },
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [{ type: "InputKey", key: "KeyD" }],
                conditionLogic: "AND",
                actions: [{ type: "Move", direction: { type: "literal", value: { x: 1, y: 0 } }, speed: 200 }],
            },
        ],
    },
    {
        id: "arrow-move",
        name: "화살표 이동",
        description: "↑↓←→ 키로 상하좌우 이동",
        icon: "⬆️",
        components: [
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [{ type: "InputKey", key: "ArrowUp" }],
                conditionLogic: "AND",
                actions: [{ type: "Move", direction: { type: "literal", value: { x: 0, y: -1 } }, speed: 200 }],
            },
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [{ type: "InputKey", key: "ArrowDown" }],
                conditionLogic: "AND",
                actions: [{ type: "Move", direction: { type: "literal", value: { x: 0, y: 1 } }, speed: 200 }],
            },
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [{ type: "InputKey", key: "ArrowLeft" }],
                conditionLogic: "AND",
                actions: [{ type: "Move", direction: { type: "literal", value: { x: -1, y: 0 } }, speed: 200 }],
            },
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [{ type: "InputKey", key: "ArrowRight" }],
                conditionLogic: "AND",
                actions: [{ type: "Move", direction: { type: "literal", value: { x: 1, y: 0 } }, speed: 200 }],
            },
        ],
    },
    {
        id: "platformer-jump",
        name: "점프 (플랫포머)",
        description: "Space 키로 점프 (땅에 닿았을 때만)",
        icon: "🦘",
        components: [
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [
                    { type: "InputDown", key: "Space" },
                    { type: "IsGrounded" },
                ],
                conditionLogic: "AND",
                actions: [{ type: "Jump", force: 400 }],
            },
        ],
    },
    {
        id: "platformer-wasd",
        name: "플랫포머 좌우이동",
        description: "A/D 키로 좌우 이동만 (중력 게임용)",
        icon: "🏃",
        components: [
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [{ type: "InputKey", key: "KeyA" }],
                conditionLogic: "AND",
                actions: [{ type: "Move", direction: { type: "literal", value: { x: -1, y: 0 } }, speed: 200 }],
            },
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [{ type: "InputKey", key: "KeyD" }],
                conditionLogic: "AND",
                actions: [{ type: "Move", direction: { type: "literal", value: { x: 1, y: 0 } }, speed: 200 }],
            },
        ],
    },
    {
        id: "projectile-spawn",
        name: "발사체 발사 (클릭)",
        description: "마우스 클릭 시 발사체 프리팹 소환",
        icon: "🔫",
        components: [
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [{ type: "InputDown", key: "Mouse0" }],
                conditionLogic: "AND",
                actions: [{
                    type: "SpawnEntity",
                    sourceType: "prefab",
                    prefabId: "",
                    positionMode: "relative",
                    offsetX: 0,
                    offsetY: 0,
                }],
            },
        ],
    },
    {
        id: "projectile-behavior",
        name: "발사체 동작",
        description: "마우스 방향 이동 + 적 충돌 시 데미지",
        icon: "💥",
        components: [
            {
                type: "Logic",
                event: "OnUpdate",
                conditions: [],
                conditionLogic: "AND",
                actions: [{
                    type: "Move",
                    direction: { type: "mouse", mode: "relative" },
                    speed: 500,
                }],
            },
            {
                type: "Logic",
                event: "OnCollision",
                conditions: [{ type: "CompareTag", tag: "Enemy" }],
                conditionLogic: "AND",
                actions: [
                    { type: "TakeDamage", amount: 10 },
                    { type: "Disable" },
                ],
            },
        ],
    },
];
