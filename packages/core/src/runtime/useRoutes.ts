import { useRuntime } from "./RuntimeContext";

export function useRoutes() {
    const runtime = useRuntime();

    return runtime.routes;
}
