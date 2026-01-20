import { EventBus } from "./EventBus";
import { SignalStore } from "./SignalStore";

// Prevent duplicate registration during HMR or re-imports
if (!(window as any).__SIGNAL_HANDLER_REGISTERED) {
    EventBus.on(event => {
        if (event.type === "EVENT_SIGNAL") {
            const signal = event.data?.signal;
            if (typeof signal === "string") {
                SignalStore.push(signal);
            }
        }
    });
    (window as any).__SIGNAL_HANDLER_REGISTERED = true;
}
