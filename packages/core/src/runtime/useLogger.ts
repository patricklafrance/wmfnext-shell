import { useRuntime } from "./RuntimeContext";

export function useLogger() {
    const runtime = useRuntime();

    return runtime.logger;
}
