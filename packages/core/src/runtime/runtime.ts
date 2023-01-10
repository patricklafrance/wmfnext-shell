import type { RootNavigationItem, Route } from "../federation";

import type { RuntimeLogger } from "./RuntimeLogger";

export interface Runtime {
    registerRoutes: (routes: Route[]) => void;
    readonly routes: Readonly<Route[]>;

    registerNavigationItems: (navigationItems: RootNavigationItem[]) => void;
    readonly navigationItems: Readonly<RootNavigationItem[]>;

    readonly logger: RuntimeLogger;
}
