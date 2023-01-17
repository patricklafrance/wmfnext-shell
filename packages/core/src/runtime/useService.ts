import { useRuntime } from "./RuntimeContext";

export function useService(name: string) {
    const runtime = useRuntime();

    return runtime.getService(name);
}
