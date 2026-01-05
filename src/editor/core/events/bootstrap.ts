import { EventBus } from "./EventBus";
import { SignalStore } from "./SignalStore";

EventBus.on(event => {
    if (event.type === "EVENT_SIGNAL") {
        const signal = event.data?.signal;
        if (typeof signal === "string") {
            SignalStore.push(signal);
        }
    }
});
