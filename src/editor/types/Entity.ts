import type { EditorVariable } from "./Variable";
import type { EditorEvent } from "./Event";
import type { EditorComponent } from "./Component";
import type { GameRule } from "../core/events/RuleEngine";
import type { EditorModule } from "./Module";

/**
 * EditorEntity - 에디터에서 관리하는 엔티티 데이터
 * 
 * Unity 내보내기 호환성을 위해 모든 필드가 명시적 타입을 가집니다.
 */
export interface EditorEntity {
    id: string;
    type: "sprite" | "container" | "nineSlice";
    name: string;
    x: number;
    y: number;
    z: number;
    rotation: number;      // radians
    scaleX: number;
    scaleY: number;

    texture?: string;

    /** 사용자 정의 변수 목록 */
    variables: EditorVariable[];

    /** 이벤트 핸들러 목록 */
    events: EditorEvent[];

    /** 컴포넌트 목록 (AutoRotate, Pulse 등) */
    components: EditorComponent[];

    /** EAC 시스템을 위한 게임 규칙 목록 */
    rules: GameRule[];

    /** 기능별 모듈 목록 (Status, Kinetic 등) */
    modules: EditorModule[];
}