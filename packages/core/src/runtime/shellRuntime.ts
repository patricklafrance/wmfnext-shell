import { NavigationItemRegistry, RouteRegistry } from "../federation";
import type { RootNavigationItem, RootRoute } from "../federation";
import type { Runtime, SessionAccessorFunction } from "./runtime";

import type { Logger } from "../logging";
import { RuntimeLogger } from "./RuntimeLogger";

export interface ShellRuntimeOptions {
    loggers?: Logger[];
    sessionAccessor?: SessionAccessorFunction;
}

export class ShellRuntime implements Runtime {
    private _routeRegistry = new RouteRegistry();
    private _navigationItemRegistry = new NavigationItemRegistry();
    private _logger: RuntimeLogger;
    private _sessionAccessor: SessionAccessorFunction;

    constructor({ loggers = [], sessionAccessor }: ShellRuntimeOptions = {}) {
        this._logger = new RuntimeLogger(loggers);
        this._sessionAccessor = sessionAccessor;
    }

    registerRoutes(routes: RootRoute[]) {
        if (routes) {
            this._routeRegistry.add(routes);

            this._logger.debug("[shell] The following routes has been registered", routes);
        }
    }

    get routes() {
        return this._routeRegistry.routes;
    }

    registerNavigationItems(navigationItems: RootNavigationItem[]) {
        if (navigationItems) {
            this._navigationItemRegistry.add(navigationItems);

            this._logger.debug("[shell] The following navigation items has been registered", navigationItems);
        }
    }

    get navigationItems() {
        return this._navigationItemRegistry.items;
    }

    get logger() {
        return this._logger;
    }

    getSession() {
        if (!this._sessionAccessor) {
            throw new Error("[shell] Cannot retrieve the session because no session accessor has been provided");
        }

        return this._sessionAccessor();
    }
}
