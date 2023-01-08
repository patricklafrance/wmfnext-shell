import { deepFreeze } from "../shared";
import { moduleRouteRegistry } from "./internal";
import { useMemo } from "react";

export function useModuleRoutes() {
    const routes = moduleRouteRegistry.routes;

    return useMemo(() => deepFreeze(routes), [routes]);
}
