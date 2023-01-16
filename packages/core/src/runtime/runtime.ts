import type { RootNavigationItem, RootRoute } from "../federation";

import type { EventBus } from "../messaging";
import type { RuntimeLogger } from "./RuntimeLogger";

export type SessionAccessorFunction = () => unknown;

export interface Runtime {
    registerRoutes: (routes: RootRoute[]) => void;
    readonly routes: Readonly<RootRoute[]>;

    registerNavigationItems: (navigationItems: RootNavigationItem[]) => void;
    readonly navigationItems: Readonly<RootNavigationItem[]>;

    readonly logger: RuntimeLogger;
    readonly eventBus: EventBus;

    getService: <T = unknown>(name: string) => T;
    getSession: <T = unknown>() => Readonly<T> | undefined;
}
