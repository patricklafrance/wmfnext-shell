import { useRuntime } from "./RuntimeContext";

export function useEventBus() {
    const runtime = useRuntime();

    return runtime.eventBus;
}
