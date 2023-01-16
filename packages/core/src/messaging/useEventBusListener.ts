import type { AddListenerOptions, EventCallbackFunction, EventName } from "./eventBus";

import { useEffect } from "react";
import { useEventBus } from "../runtime";

export function useEventBusListener(eventName: EventName, callback: EventCallbackFunction, { context, once }: AddListenerOptions = {}) {
    const eventBus = useEventBus();

    return useEffect(() => {
        eventBus.addListener(eventName, callback, { context, once });

        return () => {
            eventBus.removeListener(eventName, callback, { context, once });
        };
    }, [eventName, callback, context, once]);
}
