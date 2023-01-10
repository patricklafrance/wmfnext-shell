import { NavigationItemRegistry, RouteRegistry } from "../federation";
import type { RootNavigationItem, Route } from "../federation";

import type { Logger } from "../logging";
import type { Runtime } from "./runtime";
import { RuntimeLogger } from "./RuntimeLogger";

export interface ShellRuntimeOptions {
    loggers?: Logger[];
}

export class ShellRuntime implements Runtime {
    private _routeRegistry = new RouteRegistry();
    private _navigationItemRegistry = new NavigationItemRegistry();
    private _logger: RuntimeLogger;

    constructor({ loggers = [] }: ShellRuntimeOptions = {}) {
        this._logger = new RuntimeLogger(loggers);
    }

    registerRoutes(routes: Route[]) {
        this._routeRegistry.add(routes);

        this._logger.debug("[shell] The following routes has been registered", routes);
    }

    get routes() {
        return this._routeRegistry.routes;
    }

    registerNavigationItems(navigationItems: RootNavigationItem[]) {
        this._navigationItemRegistry.add(navigationItems);

        this._logger.debug("[shell] The following navigation items has been registered", navigationItems);
    }

    get navigationItems() {
        return this._navigationItemRegistry.items;
    }

    get logger() {
        return this._logger;
    }
}
