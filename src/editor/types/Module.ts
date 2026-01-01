/**
 * EditorModule - 인스펙터에서 사용하는 모듈 타입 정의
 * 
 * StatusModule, KineticModule, NarrativeModule, CombatModule의
 * 에디터 직렬화 형태입니다.
 */

/**
 * 모듈 타입
 */
export type ModuleType = "Status" | "Kinetic" | "Narrative" | "Combat";

/**
 * 기본 모듈 인터페이스
 */
export interface BaseModule {
    id: string;
    type: ModuleType;
}

/**
 * Status 모듈 (HP/MP/스탯)
 */
export interface StatusModuleData extends BaseModule {
    type: "Status";
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed: number;
}

/**
 * Kinetic 모듈 (이동/물리)
 */
export type KineticMode = "TopDown" | "Platformer" | "Path";

export interface KineticModuleData extends BaseModule {
    type: "Kinetic";
    mode: KineticMode;
    maxSpeed: number;
    friction: number;
    gravity: number;     // Platformer용
    jumpForce: number;   // Platformer용
}

/**
 * Narrative 모듈 (대사/분기)
 */
export interface NarrativeModuleData extends BaseModule {
    type: "Narrative";
    dialogueCount: number;  // 대사 수 (상세 편집은 별도 에디터)
}

/**
 * Combat 모듈 (전투/투사체)
 */
export type BulletPattern = "Single" | "Spread" | "Circle" | "Spiral" | "Aimed";

export interface CombatModuleData extends BaseModule {
    type: "Combat";
    attackRange: number;
    attackInterval: number;
    damage: number;
    bulletPattern: BulletPattern;
    bulletCount: number;
}

/**
 * 에디터 모듈 유니온 타입
 */
export type EditorModule =
    | StatusModuleData
    | KineticModuleData
    | NarrativeModuleData
    | CombatModuleData;

/**
 * 모듈 기본값
 */
export const ModuleDefaults: { [K in ModuleType]: Omit<Extract<EditorModule, { type: K }>, "id"> } = {
    Status: {
        type: "Status",
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 10,
        defense: 5,
        speed: 1,
    },
    Kinetic: {
        type: "Kinetic",
        mode: "TopDown",
        maxSpeed: 200,
        friction: 0.8,
        gravity: 980,
        jumpForce: 400,
    },
    Narrative: {
        type: "Narrative",
        dialogueCount: 0,
    },
    Combat: {
        type: "Combat",
        attackRange: 100,
        attackInterval: 1,
        damage: 10,
        bulletPattern: "Single",
        bulletCount: 1,
    },
};
