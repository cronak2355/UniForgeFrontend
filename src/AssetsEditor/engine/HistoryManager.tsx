// src/AssetsEditor/engine/HistoryManager.ts

import type { RGBA } from './PixelEngine';

/**
 * 단일 픽셀 변경 정보
 * - 메모리 최적화: 좌표와 색상만 저장
 */
export interface PixelChange {
  x: number;
  y: number;
  oldColor: RGBA;  // Undo 시 복원할 색상
  newColor: RGBA;  // Redo 시 적용할 색상
}

/**
 * 히스토리 엔트리 타입
 */
export type HistoryActionType = 'stroke' | 'erase' | 'fill' | 'ai' | 'clear';

/**
 * 하나의 액션에 대한 히스토리 엔트리
 * - 마우스 다운~업 = 1 엔트리
 * - AI 생성 결과 = 1 엔트리
 */
export interface HistoryEntry {
  type: HistoryActionType;
  changes: PixelChange[];
  timestamp: number;
}

/**
 * Diff 기반 Undo/Redo 히스토리 매니저
 * 
 * 동작 흐름:
 * 1. beginBatch() - pointerdown 시 호출
 * 2. recordChange() - 픽셀 변경마다 호출 (중복 좌표는 첫 oldColor만 유지)
 * 3. commitBatch() - pointerup 시 호출, 엔트리 생성
 * 4. undo()/redo() - 변경사항 적용/복원
 */
export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private currentBatch: Map<string, PixelChange> = new Map();
  private currentBatchType: HistoryActionType = 'stroke';
  private isRecording = false;
  private maxHistorySize: number;

  constructor(maxHistorySize = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * 배치 기록 시작 (pointerdown)
   */
  beginBatch(type: HistoryActionType = 'stroke'): void {
    this.currentBatch.clear();
    this.currentBatchType = type;
    this.isRecording = true;
  }

  /**
   * 픽셀 변경 기록
   * - 같은 좌표의 첫 번째 oldColor만 보존 (드래그 중 여러 번 같은 픽셀 변경 시)
   */
  recordChange(x: number, y: number, oldColor: RGBA, newColor: RGBA): void {
    if (!this.isRecording) return;
    
    const key = `${x},${y}`;
    const existing = this.currentBatch.get(key);
    
    if (existing) {
      // 같은 픽셀이 이미 있으면 newColor만 업데이트 (oldColor는 최초 값 유지)
      existing.newColor = { ...newColor };
    } else {
      this.currentBatch.set(key, {
        x,
        y,
        oldColor: { ...oldColor },
        newColor: { ...newColor },
      });
    }
  }

  /**
   * 배치 커밋 (pointerup)
   * - 변경사항이 있으면 히스토리에 추가
   * - Redo 스택은 클리어 (새 액션이 발생했으므로)
   */
  commitBatch(): HistoryEntry | null {
    this.isRecording = false;
    
    if (this.currentBatch.size === 0) {
      return null;
    }

    const entry: HistoryEntry = {
      type: this.currentBatchType,
      changes: Array.from(this.currentBatch.values()),
      timestamp: Date.now(),
    };

    this.undoStack.push(entry);
    this.redoStack = []; // 새 액션 시 redo 스택 클리어

    // 최대 크기 초과 시 가장 오래된 항목 제거
    while (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    this.currentBatch.clear();
    return entry;
  }

  /**
   * 배치 취소 (ESC 등으로 취소 시)
   */
  cancelBatch(): void {
    this.isRecording = false;
    this.currentBatch.clear();
  }

  /**
   * Undo 실행
   * @returns 복원해야 할 픽셀 변경들 (oldColor로 복원)
   */
  undo(): PixelChange[] | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;

    this.redoStack.push(entry);
    return entry.changes;
  }

  /**
   * Redo 실행
   * @returns 다시 적용해야 할 픽셀 변경들 (newColor로 적용)
   */
  redo(): PixelChange[] | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;

    this.undoStack.push(entry);
    return entry.changes;
  }

  /**
   * Undo 가능 여부
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Redo 가능 여부
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 현재 기록 중인지 여부
   */
  isInBatch(): boolean {
    return this.isRecording;
  }

  /**
   * 히스토리 전체 클리어
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentBatch.clear();
    this.isRecording = false;
  }

  /**
   * 상태 정보 (디버깅/UI용)
   */
  getState(): { undoCount: number; redoCount: number; maxSize: number } {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      maxSize: this.maxHistorySize,
    };
  }

  /**
   * 최대 히스토리 크기 설정
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    while (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }
}