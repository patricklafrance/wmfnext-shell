import { useRuntime } from "./RuntimeContext";

export function useNavigationItems() {
    const runtime = useRuntime();

    return runtime.navigationItems;
}
