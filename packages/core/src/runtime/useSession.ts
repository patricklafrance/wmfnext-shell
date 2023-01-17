import { useRuntime } from "./RuntimeContext";

export function useSession() {
    const runtime = useRuntime();

    return runtime.getSession();
}
