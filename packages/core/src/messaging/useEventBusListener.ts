import type { AddListenerOptions, EventCallbackFunction, EventName } from "./eventBus";

import { useEffect } from "react";
import { useEventBus } from "../runtime";

export function useEventBusListener(eventName: EventName, callback: EventCallbackFunction, { once }: AddListenerOptions = {}) {
    const eventBus = useEventBus();

    return useEffect(() => {
        eventBus.addListener(eventName, callback, { once });

        return () => {
            eventBus.removeListener(eventName, callback, { once });
        };
    }, [eventName, callback, once]);
}
