/**
 * IRenderer - 엔진 독립적 렌더러 인터페이스
 * 
 * 모든 렌더링 명령은 이 인터페이스를 거쳐야 합니다.
 * Phaser, Three.js 등 다양한 엔진으로 구현할 수 있습니다.
 */

/**
 * 3D 좌표 (z축 포함)
 * Phaser에서는 z를 setDepth()로 매핑
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

/**
 * 화면 좌표 (2D)
 */
export interface ScreenCoord {
    x: number;
    y: number;
}

/**
 * 엔티티 스폰 옵션
 */
export interface SpawnOptions {
    texture?: string;
    width?: number;
    height?: number;
    color?: number;
}

/**
 * 렌더러 추상 인터페이스
 * 
 * 설계 원칙:
 * 1. ID 동기화 보장: spawn()은 외부에서 전달받은 ID를 그대로 사용
 * 2. 좌표계 변환: worldToScreen / screenToWorld 메서드 제공
 * 3. Lifecycle 관리: destroy() 시 모든 리소스 해제
 */
export interface IRenderer {
    // ===== Lifecycle =====

    /**
     * 렌더러 초기화
     * @param container 렌더링할 DOM 요소
     */
    init(container: HTMLElement): Promise<void>;

    /**
     * 렌더러 정리 - 모든 엔티티와 리소스 해제
     * - Map에 저장된 모든 엔티티 destroy
     * - Game 인스턴스 정리
     * - 이벤트 리스너 제거
     * - 참조 null 처리
     */
    destroy(): void;

    // ===== Entity Management =====

    /**
     * 엔티티 생성
     * @param id 외부(EditorState)에서 전달받은 ID - 자체 생성 금지
     * @param type 엔티티 타입
     * @param x X 좌표
     * @param y Y 좌표
     * @param z Z 좌표 (기본값 0, Phaser에서는 depth로 매핑)
     * @param options 추가 옵션
     */
    spawn(id: string, type: string, x: number, y: number, z?: number, options?: SpawnOptions): void;

    /**
     * 엔티티 업데이트
     * @param id 엔티티 ID
     * @param x X 좌표
     * @param y Y 좌표
     * @param z Z 좌표 (선택적)
     * @param rotation 회전 각도 (선택적, 도 단위)
     */
    update(id: string, x: number, y: number, z?: number, rotation?: number): void;

    /**
     * 스케일 변경
     */
    setScale(id: string, scaleX: number, scaleY: number, scaleZ?: number): void;

    /**
     * 알파(투명도) 변경 (0~1)
     */
    setAlpha(id: string, alpha: number): void;

    /**
     * 틴트(색상) 변경
     */
    setTint(id: string, color: number): void;

    /**
     * 엔티티 제거
     * @param id 엔티티 ID
     */
    remove(id: string): void;

    /**
     * 엔티티 존재 여부 확인 - ID 동기화 검증용
     * @param id 엔티티 ID
     */
    hasEntity(id: string): boolean;

    /**
     * 모든 엔티티 ID 목록 반환 - 동기화 검증용
     */
    getAllEntityIds(): string[];

    // ===== Animation =====

    /**
     * 애니메이션 재생
     * @param id 엔티티 ID
     * @param name 애니메이션 이름
     */
    playAnim(id: string, name: string): void;

    // ===== Camera =====

    /**
     * 카메라 위치 설정
     */
    setCameraPosition(x: number, y: number, z?: number): void;

    /**
     * 카메라 줌 설정
     */
    setCameraZoom(zoom: number): void;

    /**
     * 현재 카메라 위치 반환
     */
    getCameraPosition(): Vector3;

    /**
     * 현재 카메라 줌 반환
     */
    getCameraZoom(): number;

    // ===== Coordinate Transformation =====

    /**
     * 월드 좌표 → 화면 좌표 변환
     * Phaser: 좌상단 기준
     * Three.js: 중앙 기준 (구현체에서 변환)
     */
    worldToScreen(x: number, y: number, z?: number): ScreenCoord;

    /**
     * 화면 좌표 → 월드 좌표 변환
     */
    screenToWorld(screenX: number, screenY: number): Vector3;

    // ===== Tile System =====

    /**
     * 타일 설정
     */
    setTile(x: number, y: number, tileIndex: number): void;

    /**
     * 타일 제거
     */
    removeTile(x: number, y: number): void;

    /**
     * 프리뷰 타일 설정 (마우스 호버 시)
     */
    setPreviewTile(x: number, y: number, tileIndex: number): void;

    /**
     * 프리뷰 타일 제거
     */
    clearPreviewTile(): void;

    // ===== Grid =====

    /**
     * 그리드 표시/숨김
     */
    setGridVisible(visible: boolean): void;

    // ===== Interaction Callbacks =====

    /**
     * 엔티티 클릭 시 호출
     */
    onEntityClick?: (id: string) => void;

    /**
     * 포인터 다운 시 호출 (월드 좌표)
     */
    onPointerDown?: (worldX: number, worldY: number, worldZ: number) => void;

    /**
     * 포인터 이동 시 호출 (월드 좌표)
     */
    onPointerMove?: (worldX: number, worldY: number, worldZ: number) => void;

    /**
     * 포인터 업 시 호출 (월드 좌표)
     */
    onPointerUp?: (worldX: number, worldY: number, worldZ: number) => void;

    /**
     * 스크롤 시 호출
     */
    onScroll?: (deltaY: number) => void;
}
