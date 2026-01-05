/**
 * ModuleFactory - EditorModule 데이터를 런타임 모듈 인스턴스로 변환
 * 
 * ECA 시스템에서 액션이 모듈 메서드를 호출할 수 있도록
 * JSON 데이터를 실제 클래스 인스턴스로 변환합니다.
 */

import type { EditorModule } from "../../types/Module";
import type { IModule } from "./IModule";
import { StatusModule } from "./StatusModule";
import { KineticModule } from "./KineticModule";
import { CombatModule } from "./CombatModule";
import { NarrativeModule } from "./NarrativeModule";

/**
 * RuntimeEntity - 런타임에서 사용하는 엔티티 구조
 * 모듈 인스턴스를 보유하여 메서드 호출 가능
 */
export interface RuntimeEntity {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    z: number;

    /** 실제 모듈 인스턴스 맵 (메서드 호출 가능) */
    modules: {
        Status?: StatusModule;
        Kinetic?: KineticModule;
        Combat?: CombatModule;
        Narrative?: NarrativeModule;
        [key: string]: IModule | undefined;
    };
}

/**
 * EditorModule 데이터를 런타임 모듈 인스턴스로 변환
 */
export function createModuleInstance(data: EditorModule): IModule | null {
    switch (data.type) {
        case "Status":
            return new StatusModule(data.id, {
                hp: data.hp,
                maxHp: data.maxHp,
                mp: data.mp,
                maxMp: data.maxMp,
                attack: data.attack,
                defense: data.defense,
                speed: data.speed,
            });

        case "Kinetic":
            return new KineticModule(data.id, {
                mode: data.mode,
                maxSpeed: data.maxSpeed,
                friction: data.friction,
                gravity: data.gravity,
                jumpForce: data.jumpForce,
            });

        case "Combat":
            return new CombatModule(data.id, {
                attackRange: data.attackRange,
                attackInterval: data.attackInterval,
                damage: data.damage,
                bulletPattern: data.bulletPattern,
                bulletCount: data.bulletCount,
            });

        case "Narrative":
            return new NarrativeModule(data.id, {});

        default:
            console.warn(`[ModuleFactory] Unknown module type: ${(data as EditorModule).type}`);
            return null;
    }
}

/**
 * EditorModule 배열을 RuntimeEntity의 modules 맵으로 변환
 */
export function createModulesMap(editorModules: EditorModule[] | undefined): RuntimeEntity["modules"] {
    const modules: RuntimeEntity["modules"] = {};

    if (!editorModules) return modules;

    for (const data of editorModules) {
        const instance = createModuleInstance(data);
        if (instance) {
            modules[instance.type] = instance;
        }
    }

    return modules;
}

/**
 * 런타임 엔티티 맵 (전역)
 * GameCore 또는 PhaserRenderer에서 초기화하여 사용
 */
export const runtimeEntities = new Map<string, RuntimeEntity>();

/**
 * 런타임 엔티티 등록
 */
export function registerRuntimeEntity(
    id: string,
    type: string,
    name: string,
    x: number,
    y: number,
    z: number,
    editorModules: EditorModule[] | undefined
): RuntimeEntity {
    const entity: RuntimeEntity = {
        id,
        type,
        name,
        x,
        y,
        z,
        modules: createModulesMap(editorModules)
    };

    runtimeEntities.set(id, entity);
    console.log(`[ModuleFactory] Registered runtime entity: ${id} with modules:`, Object.keys(entity.modules));
    return entity;
}

/**
 * 런타임 엔티티 해제
 */
export function unregisterRuntimeEntity(id: string): void {
    const entity = runtimeEntities.get(id);
    if (entity) {
        // 모듈 정리
        for (const module of Object.values(entity.modules)) {
            module?.destroy?.();
        }
        runtimeEntities.delete(id);
    }
}

/**
 * 런타임 엔티티 조회
 */
export function getRuntimeEntity(id: string): RuntimeEntity | undefined {
    return runtimeEntities.get(id);
}

/**
 * 모든 런타임 엔티티 정리
 */
export function clearRuntimeEntities(): void {
    for (const [id] of runtimeEntities) {
        unregisterRuntimeEntity(id);
    }
    runtimeEntities.clear();
}
