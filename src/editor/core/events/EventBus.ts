/**
 * EventBus - 게임 내 모든 이벤트의 중앙 허브
 * 
 * 입력(키보드/마우스), 물리(충돌), 게임 로직(타이머/변수변경) 등
 * 모든 이벤트를 표준화하여 전파합니다.
 * 
 * 친구분의 설계에 따라, 이곳은 "우체국" 역할만 수행하며
 * 실제 Phaser 이벤트와의 연결(Adapter)은 별도 소스에서 수행합니다.
 */

export interface GameEvent {
    /** 이벤트 타입 (예: "KEY_DOWN", "COLLISION", "TURN_START") */
    type: string;

    /** 이벤트 발생 대상의 ID (없으면 전역 이벤트) */
    targetId?: string;

    /** 추가 데이터 */
    data?: Record<string, unknown>;

    /** 이벤트 발생 시간 */
    timestamp: number;
}

export type EventHandler = (event: GameEvent) => void;

class EventBusClass {
    private handlers: EventHandler[] = [];
    private debugMode = false;

    /**
     * 이벤트 핸들러 등록
     */
    on(handler: EventHandler): void {
        this.handlers.push(handler);
    }

    /**
     * 이벤트 핸들러 제거
     */
    off(handler: EventHandler): void {
        this.handlers = this.handlers.filter(h => h !== handler);
    }

    /**
     * 이벤트 발행
     */
    emit(type: string, data?: Record<string, unknown>, targetId?: string): void {
        const event: GameEvent = {
            type,
            targetId,
            data: data ?? {},
            timestamp: Date.now()
        };

        if (this.debugMode) {
            console.log(`[EventBus] ${type}`, event);
        }

        // 모든 핸들러에게 전파
        this.handlers.forEach(h => {
            try {
                h(event);
            } catch (e) {
                console.error(`[EventBus] Error in handler for ${type}:`, e);
            }
        });
    }

    setDebug(enabled: boolean) {
        this.debugMode = enabled;
    }
}

export const EventBus = new EventBusClass();
