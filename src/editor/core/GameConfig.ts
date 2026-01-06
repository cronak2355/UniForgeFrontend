/**
 * GameConfig - 게임 설정 인터페이스
 * 
 * 역할(role) 기반 기능 매핑을 정의합니다.
 * 하드코딩된 역할 문자열 대신 이 설정을 사용합니다.
 */

export interface GameConfig {
    /**
     * 키보드 입력을 받는 역할 목록
     * 이 역할을 가진 엔티티만 WASD/방향키로 조작됩니다.
     */
    controllableRoles: string[];

    /**
     * 카메라가 따라가는 역할 목록
     * 이 역할을 가진 엔티티 중 첫 번째를 카메라가 추적합니다.
     */
    cameraFollowRoles: string[];

    /**
     * HUD에 상태를 표시하는 역할 목록
     * 이 역할을 가진 엔티티의 HP/MP 등이 UI에 표시됩니다.
     */
    hudDisplayRoles: string[];

    /**
     * 자동 공격을 수행하는 역할 목록
     * 이 역할을 가진 엔티티만 Combat 모듈 자동 공격이 활성화됩니다.
     * 비어있으면 모든 역할이 자동 공격 가능 (기존 동작)
     */
    autoAttackRoles: string[];
}

/**
 * 기본 게임 설정
 * 일반적인 RPG/액션 게임의 기본값
 */
export const defaultGameConfig: GameConfig = {
    controllableRoles: ["player"],
    cameraFollowRoles: ["player"],
    hudDisplayRoles: ["player"],
    autoAttackRoles: ["enemy"], // 적만 자동 공격
};

/**
 * 역할이 주어진 역할 목록에 포함되는지 확인
 */
export function hasRole(role: string | undefined, roles: string[]): boolean {
    if (!role) return false;
    return roles.includes(role);
}
