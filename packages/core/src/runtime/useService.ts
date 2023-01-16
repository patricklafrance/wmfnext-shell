import { useRuntime } from "./RuntimeContext";

export function useService<T = unknown>(name: string) {
    const runtime = useRuntime();

    return runtime.getService<T>(name);
}
