import type { RouteObject } from "react-router-dom";
import type { RuntimeLogger } from "./RuntimeLogger";

export interface Runtime {
    registerRoute: (routes: RouteObject) => void;
    registerRoutes: (routes: RouteObject[]) => void;

    readonly logger: RuntimeLogger;
}
