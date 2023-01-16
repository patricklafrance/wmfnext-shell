import { NavigationItemRegistry, RouteRegistry } from "../federation";
import type { RootNavigationItem, RootRoute } from "../federation";
import type { Runtime, SessionAccessorFunction } from "./runtime";

import type { Logger } from "../logging";
import { RuntimeLogger } from "./RuntimeLogger";

export interface ShellRuntimeOptions {
    loggers?: Logger[];
    services?: Record<string, unknown>;
    sessionAccessor?: SessionAccessorFunction;
}

export class ShellRuntime implements Runtime {
    protected _routeRegistry = new RouteRegistry();
    protected _navigationItemRegistry = new NavigationItemRegistry();
    protected _logger: RuntimeLogger;
    protected _services: Record<string, unknown>;
    protected _sessionAccessor: SessionAccessorFunction;

    constructor({ loggers = [], services, sessionAccessor }: ShellRuntimeOptions = {}) {
        this._logger = new RuntimeLogger(loggers);
        this._services = services;
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

    getService<T = unknown>(name: string) {
        return this._services[name] as T;
    }

    getSession<T = unknown>() {
        if (!this._sessionAccessor) {
            throw new Error("[shell] Cannot retrieve the session because no session accessor has been provided");
        }

        return this._sessionAccessor() as T;
    }
}
