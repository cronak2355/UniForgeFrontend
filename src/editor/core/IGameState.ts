/**
 * IGameState - 게임 상태 인터페이스
 * 
 * PhaserRenderer 등 외부 모듈에서 게임 상태에 접근할 때 사용하는 추상화 계층입니다.
 * 이 인터페이스를 통해 전역 editorCore 참조를 제거하고 의존성 주입을 적용합니다.
 */

import type { EditorEntity } from "../types/Entity";

/**
 * 게임 상태 인터페이스
 */
export interface IGameState {
    /**
     * 모든 엔티티 반환
     */
    getEntities(): Map<string, EditorEntity>;

    /**
     * ID로 엔티티 조회
     */
    getEntity(id: string): EditorEntity | undefined;

    /**
     * 엔티티 존재 여부 확인
     */
    hasEntity(id: string): boolean;
}
