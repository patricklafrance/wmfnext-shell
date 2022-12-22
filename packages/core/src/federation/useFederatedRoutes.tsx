import type { ReactNode } from "react";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import type { RouteObject } from "react-router-dom";
import { Runtime } from "../runtime";
import { useMemo } from "react";

export interface RenderRoutesOptions {
    errorElement?: ReactNode;
}

export function useFederatedRoutes(runtime: Runtime, { errorElement }: RenderRoutesOptions = {}) {
    const routes = runtime.getRoutes();

    return useMemo(() => {
        return routes.map((x: RouteObject) => {
            x.errorElement = x.errorElement || errorElement || <RouteErrorBoundary runtime={runtime} />;

            return x;
        });
    }, [routes, runtime, errorElement]);
}
