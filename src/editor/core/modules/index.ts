/**
 * Core Modules - 배럴 Export
 * 
 * 6대 장르 통합 모듈 시스템
 */

// 기본 인터페이스 및 유틸리티
export {
    type IModule,
    type Vector3,
    type ModuleFactory,
    Vec3,
    toPascalCase,
    serializeForUnity,
} from "./IModule";

// StatusModule - HP/MP/스탯 관리
export {
    StatusModule,
    type StatusData,
    type StatusChangeCallback,
} from "./StatusModule";

// KineticModule - 이동/물리
export {
    KineticModule,
    type KineticMode,
    type KineticData,
    type InputDirection,
} from "./KineticModule";

// NarrativeModule - 대사/분기
export {
    NarrativeModule,
    type DialogueLine,
    type DialogueChoice,
    type NarrativeData,
    type NarrativeVarValue,
    type DialogueEventType,
    type DialogueCallback,
} from "./NarrativeModule";

// CombatModule - 전투/투사체
export {
    CombatModule,
    type AttackType,
    type TargetingMode,
    type BulletPattern,
    type CombatData,
    type ProjectileSpawnSignal,
    type CombatEventType,
    type CombatCallback,
    type TargetInfo,
} from "./CombatModule";
