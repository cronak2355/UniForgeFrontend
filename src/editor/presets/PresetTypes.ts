import type { EditorModule } from "../types/Module";
import type { GameRule } from "../core/events/RuleEngine";

/**
 * 엔티티 프리셋 (역할 정의)
 * 사용자가 "Player"나 "Monster"를 선택하면 이 설정이 적용됩니다.
 */
export interface EntityPreset {
    /** 프리셋 ID (예: "player_platformer") */
    id: string;

    /** 표시 이름 (예: "Player (Platformer)") */
    label: string;

    /** 설명 */
    description: string;

    /** 포함할 모듈 목록 (초기 데이터) */
    modules: EditorModule[];

    /** 포함할 게임 규칙 목록 (EAC) */
    rules: GameRule[];
}
