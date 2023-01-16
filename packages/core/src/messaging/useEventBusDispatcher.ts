import type { EventName } from "./eventBus";
import { useEventBus } from "../runtime";

export function useEventBusDispatcher() {
    const eventBus = useEventBus();

    return (eventName: EventName, data?: unknown) => {
        eventBus.dispatch(eventName, data);
    };
}
