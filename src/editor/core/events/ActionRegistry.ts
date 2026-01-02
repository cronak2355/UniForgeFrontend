import type { IModule } from "../modules/IModule";
import type { StatusModule } from "../modules/StatusModule";
import type { KineticModule } from "../modules/KineticModule";
import type { CombatModule } from "../modules/CombatModule";
import type { NarrativeModule } from "../modules/NarrativeModule";

/**
 * Action 실행 컨텍스트
 * 액션이 실행될 때 필요한 모든 정보를 담습니다.
 * 3D 환경을 고려하여 Vector3 타입을 지원합니다.
 */
export interface ActionContext {
    /** 액션을 수행하는 주체 엔티티 ID */
    entityId: string;

    /** 
     * 엔티티가 보유한 모듈 인스턴스 맵 
     * (데이터가 아닌 실제 동작 가능한 클래스 인스턴스)
     */
    modules: {
        Status?: StatusModule;
        Kinetic?: KineticModule;
        Combat?: CombatModule;
        Narrative?: NarrativeModule;
        [key: string]: IModule | undefined;
    };

    /** 이벤트를 발생시킨 원본 데이터 */
    eventData: Record<string, unknown>;

    /** 
     * 전역 컨텍스트 (필요 시) 
     * 예: 다른 엔티티 검색을 위한 GameCore 참조 등
     */
    globals?: Record<string, unknown>;
}

/**
 * Action 함수 타입
 */
export type ActionFn = (ctx: ActionContext, params: Record<string, unknown>) => void;

class ActionRegistryClass {
    private actions = new Map<string, ActionFn>();

    constructor() {
        console.log("[ActionRegistry] Initialized");
    }

    /**
     * 액션 등록
     * @param name 액션 이름 (예: "Jump", "Attack")
     * @param fn 실행 함수
     */
    register(name: string, fn: ActionFn) {
        if (this.actions.has(name)) {
            console.warn(`[ActionRegistry] Action '${name}' is being overwritten.`);
        }
        this.actions.set(name, fn);
    }

    /**
     * 액션 실행
     */
    run(name: string, ctx: ActionContext, params: Record<string, unknown>) {
        const action = this.actions.get(name);
        if (!action) {
            console.warn(`[ActionRegistry] Action '${name}' not found.`);
            return;
        }

        try {
            action(ctx, params);
        } catch (e) {
            console.error(`[ActionRegistry] Error running action '${name}':`, e);
        }
    }

    /**
     * 등록된 모든 액션 이름 목록 반환 (에디터 UI용)
     */
    getAvailableActions(): string[] {
        return Array.from(this.actions.keys());
    }
}

export const ActionRegistry = new ActionRegistryClass();
