/**
 * IEditorOperations - 에디터 조작 추상화 인터페이스
 * 
 * 에디터 씬에서 Phaser 함수를 직접 사용하지 않도록 추상화합니다.
 * Phaser, Three.js 등 다양한 엔진에서 동일한 인터페이스로 에디터 조작이 가능합니다.
 * 
 * Unity 호환: 동일한 인터페이스로 Unity Editor에서도 구현 가능
 */

import type { Vector3 } from "./core/modules/IModule";

/**
 * 선택된 오브젝트 정보
 */
export interface SelectedObjectInfo {
    /** 엔티티 ID */
    id: string;
    /** 엔티티 타입 */
    type: string;
    /** 월드 위치 */
    position: Vector3;
    /** 바운딩 박스 크기 */
    bounds?: { width: number; height: number };
}

/**
 * 카메라 뷰 정보
 */
export interface CameraViewInfo {
    /** 카메라 위치 */
    position: Vector3;
    /** 줌 레벨 */
    zoom: number;
    /** 뷰포트 크기 */
    viewport?: { width: number; height: number };
}

/**
 * 드래그 이벤트 정보
 */
export interface DragEventInfo {
    /** 시작 위치 (월드 좌표) */
    startPosition: Vector3;
    /** 현재 위치 (월드 좌표) */
    currentPosition: Vector3;
    /** 이동량 */
    delta: Vector3;
    /** 드래그 중인 오브젝트 ID */
    objectId?: string;
}

/**
 * 에디터 조작 인터페이스
 * 
 * 엔진 독립적으로 설계되어 Phaser, Three.js, Unity에서 동일하게 구현할 수 있습니다.
 */
export interface IEditorOperations {
    // ===== 오브젝트 선택 =====

    /**
     * 마우스 좌표에서 오브젝트 선택 (픽킹)
     * @param x 화면 X 좌표
     * @param y 화면 Y 좌표
     * @returns 선택된 오브젝트 ID (없으면 null)
     */
    pickObject(x: number, y: number): string | null;

    /**
     * 마우스 좌표에서 오브젝트 상세 정보 조회
     * @param x 화면 X 좌표
     * @param y 화면 Y 좌표
     * @returns 선택된 오브젝트 정보 (없으면 null)
     */
    pickObjectInfo(x: number, y: number): SelectedObjectInfo | null;

    /**
     * 영역 선택 (멀티 셀렉트)
     * @param x1 시작 X
     * @param y1 시작 Y
     * @param x2 끝 X
     * @param y2 끝 Y
     * @returns 선택된 오브젝트 ID 목록
     */
    pickObjectsInArea(x1: number, y1: number, x2: number, y2: number): string[];

    // ===== 오브젝트 조작 =====

    /**
     * 오브젝트 이동 (월드 좌표)
     * @param id 오브젝트 ID
     * @param worldPos 목표 월드 좌표
     */
    moveObject(id: string, worldPos: Vector3): void;

    /**
     * 오브젝트 회전
     * @param id 오브젝트 ID
     * @param rotation 회전 각도 (도 단위)
     */
    rotateObject(id: string, rotation: number): void;

    /**
     * 오브젝트 스케일 변경
     * @param id 오브젝트 ID
     * @param scale 스케일 (x, y, z)
     */
    scaleObject(id: string, scale: Vector3): void;

    /**
     * 오브젝트 삭제
     * @param id 오브젝트 ID
     */
    deleteObject(id: string): void;

    /**
     * 오브젝트 복제
     * @param id 원본 오브젝트 ID
     * @returns 복제된 오브젝트 ID
     */
    duplicateObject(id: string): string | null;

    // ===== 카메라 제어 =====

    /**
     * 카메라 뷰 설정
     * @param pos 카메라 위치
     * @param zoom 줌 레벨
     */
    setCameraView(pos: Vector3, zoom: number): void;

    /**
     * 현재 카메라 뷰 조회
     */
    getCameraView(): CameraViewInfo;

    /**
     * 카메라 이동 (현재 위치 기준 상대 이동)
     * @param deltaX X 이동량
     * @param deltaY Y 이동량
     */
    panCamera(deltaX: number, deltaY: number): void;

    /**
     * 카메라 줌
     * @param delta 줌 변화량 (양수: 확대, 음수: 축소)
     * @param centerX 줌 중심 X (화면 좌표)
     * @param centerY 줌 중심 Y (화면 좌표)
     */
    zoomCamera(delta: number, centerX?: number, centerY?: number): void;

    /**
     * 오브젝트에 카메라 포커스
     * @param id 오브젝트 ID
     */
    focusOnObject(id: string): void;

    /**
     * 전체 씬에 카메라 맞추기
     */
    fitCameraToScene(): void;

    // ===== 좌표 변환 =====

    /**
     * 화면 좌표 → 월드 좌표 변환
     */
    screenToWorld(screenX: number, screenY: number): Vector3;

    /**
     * 월드 좌표 → 화면 좌표 변환
     */
    worldToScreen(worldPos: Vector3): { x: number; y: number };

    // ===== 그리드/스냅 =====

    /**
     * 그리드 표시/숨김
     */
    setGridVisible(visible: boolean): void;

    /**
     * 그리드에 스냅
     * @param worldPos 원본 좌표
     * @param gridSize 그리드 크기
     * @returns 스냅된 좌표
     */
    snapToGrid(worldPos: Vector3, gridSize: number): Vector3;

    /**
     * 스냅 활성화 여부 설정
     */
    setSnapEnabled(enabled: boolean): void;

    // ===== 선택 상태 =====

    /**
     * 현재 선택된 오브젝트 ID 목록
     */
    getSelectedIds(): string[];

    /**
     * 오브젝트 선택
     * @param ids 선택할 오브젝트 ID 목록
     * @param additive 추가 선택 여부
     */
    selectObjects(ids: string[], additive?: boolean): void;

    /**
     * 선택 해제
     */
    clearSelection(): void;

    // ===== 히스토리 (Undo/Redo) =====

    /**
     * 실행 취소
     */
    undo(): void;

    /**
     * 다시 실행
     */
    redo(): void;

    /**
     * 실행 취소 가능 여부
     */
    canUndo(): boolean;

    /**
     * 다시 실행 가능 여부
     */
    canRedo(): boolean;
}
