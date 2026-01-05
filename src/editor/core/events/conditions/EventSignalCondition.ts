import { ConditionRegistry } from "../ConditionRegistry";
import { SignalStore } from "../SignalStore";

/**
 * OnEventSignal - 이벤트 신호 수신
 * params: { signal: string }
 */
ConditionRegistry.register("OnEventSignal", (_ctx, params: Record<string, unknown>) => {
    const signal = params.signal as string;
    if (!signal) return false;

    return SignalStore.consume(signal);
});
