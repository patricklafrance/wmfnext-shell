import type { RootRoute, Route } from "./routeRegistry";

import { deepFreeze } from "../shared";
import { useMemo } from "react";

export type WrapRoutesFunction = (routes: Readonly<Route[]>) => Route;

export interface UseHoistedRoutesOptions {
    wrapNonHoistedRoutes?: WrapRoutesFunction;
}

export function useHoistedRoutes(routes: Readonly<RootRoute[]>, { wrapNonHoistedRoutes }: UseHoistedRoutesOptions = {}) {
    return useMemo(() => {
        const hoistedRoutes: Route[] = [];
        const otherRoutes: Route[] = [];

        routes.forEach(({ hoist, ...route }) => {
            if (hoist === true) {
                hoistedRoutes.push(route);
            } else {
                otherRoutes.push(route);
            }
        });


        const newRoutes = [
            ...hoistedRoutes,
            ...(wrapNonHoistedRoutes ? [wrapNonHoistedRoutes(deepFreeze(otherRoutes))] : otherRoutes)
        ];

        return deepFreeze(newRoutes);
    }, [routes, wrapNonHoistedRoutes]);
}
