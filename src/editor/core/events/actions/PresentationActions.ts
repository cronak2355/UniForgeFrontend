import { ActionRegistry, type ActionContext } from "../ActionRegistry";
import { EventBus } from "../EventBus";

/**
 * ShowDialogue - 대사 출력
 * params: { text: string }
 */
ActionRegistry.register("ShowDialogue", (ctx: ActionContext, params: Record<string, unknown>) => {
    const text = params.text as string;
    if (!text) {
        console.warn("[Action] ShowDialogue: No text provided");
        return;
    }

    EventBus.emit("DIALOGUE_SHOW", {
        entityId: ctx.entityId,
        text
    });
});

/**
 * PlaySound - 소리 출력
 * params: { soundKey: string, volume?: number }
 */
ActionRegistry.register("PlaySound", (ctx: ActionContext, params: Record<string, unknown>) => {
    const soundKey = params.soundKey as string;
    if (!soundKey) {
        console.warn("[Action] PlaySound: No soundKey provided");
        return;
    }

    const volume = (params.volume as number) ?? 1.0;

    EventBus.emit("PLAY_SOUND", {
        entityId: ctx.entityId,
        soundKey,
        volume
    });
});

/**
 * EmitEventSignal - 이벤트 신호 발생
 * params: { signal: string }
 */
ActionRegistry.register("EmitEventSignal", (ctx: ActionContext, params: Record<string, unknown>) => {
    const signal = params.signal as string;
    if (!signal) {
        console.warn("[Action] EmitEventSignal: No signal provided");
        return;
    }

    EventBus.emit("EVENT_SIGNAL", {
        signal,
        sourceEntityId: ctx.entityId
    });
});

console.log("[PresentationActions] 3 actions registered: ShowDialogue, PlaySound, EmitEventSignal");
