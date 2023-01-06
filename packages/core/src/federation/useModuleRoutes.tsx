import { moduleRouteRegistry } from "./internal";

export function useModuleRoutes() {
    return moduleRouteRegistry.routes;
}
