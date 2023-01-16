import { useRuntime } from "./RuntimeContext";

export function useSession<T = unknown>() {
    const runtime = useRuntime();

    return runtime.getSession<T>();
}
