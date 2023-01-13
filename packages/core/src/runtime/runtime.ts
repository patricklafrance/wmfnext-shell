import type { RootNavigationItem, RootRoute } from "../federation";

import type { RuntimeLogger } from "./RuntimeLogger";
import type { Session } from "../session";

export type RuntimeSession = Readonly<Session> | undefined;

export type SessionAccessorFunction = () => RuntimeSession;

export interface Runtime {
    registerRoutes: (routes: RootRoute[]) => void;
    readonly routes: Readonly<RootRoute[]>;

    registerNavigationItems: (navigationItems: RootNavigationItem[]) => void;
    readonly navigationItems: Readonly<RootNavigationItem[]>;

    readonly logger: RuntimeLogger;

    getSession: () => RuntimeSession;
}
