import type { RootRoute, Route } from "./routeRegistry";
import { useMemo, useState } from "react";

export type WrapManagedRoutesFunction = (routes: Readonly<Route[]>) => Route;

export interface UseHoistedRoutesOptions {
    wrapManagedRoutes?: WrapManagedRoutesFunction;
    allowedPaths?: string[];
}

function getAllRoutePaths(route: Route) {
    const current = route.path;

    if (route.children) {
        const childPaths = route.children.reduce((acc, x) => {
            acc.push(...getAllRoutePaths(x));

            return acc;
        }, []);

        if (current) {
            return [current, ...childPaths];
        }

        return childPaths;
    }

    return current ? [current] : [];
}

export function useHoistedRoutes(routes: Readonly<RootRoute[]>, { wrapManagedRoutes, allowedPaths }: UseHoistedRoutesOptions = {}) {
    // Hack to reuse the same array reference through re-renders.
    const [memoizedAllowedPaths] = useState(allowedPaths);

    return useMemo(() => {
        const hoistedRoutes: Route[] = [];
        const managedRoutes: Route[] = [];

        routes.forEach(({ hoist, ...route }) => {
            if (hoist === true) {
                hoistedRoutes.push(route);
            } else {
                managedRoutes.push(route);
            }
        });

        if (memoizedAllowedPaths) {
            // Find hoisted routes which are not included in allowedPaths
            hoistedRoutes.forEach(x => {
                const allRoutePaths = getAllRoutePaths(x);
                const restrictedPaths = allRoutePaths.filter(y => !memoizedAllowedPaths.includes(y));

                if (restrictedPaths.length > 0) {
                    throw new Error(`[shell] A module is hoisting the following routes [${restrictedPaths.map(y => `"${y}"`).join(", ")}] which are not included in the provided "allowedRoutes" option`);
                }
            });
        }

        const allRoutes = [
            ...hoistedRoutes,
            ...(wrapManagedRoutes ? [wrapManagedRoutes(Object.freeze(managedRoutes))] : managedRoutes)
        ];

        return Object.freeze(allRoutes);
    }, [routes, wrapManagedRoutes, memoizedAllowedPaths]);
}
