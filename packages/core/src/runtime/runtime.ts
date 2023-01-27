import { NavigationItemRegistry, RouteRegistry } from "../federation";
import type { RootNavigationItem, RootRoute } from "../federation";

import { EventBus } from "../messaging";
import type { Logger } from "../logging";
import { RuntimeLogger } from "./RuntimeLogger";

export interface RuntimeOptions {
    loggers?: Logger[];
    services?: Record<string, unknown>;
    sessionAccessor?: SessionAccessorFunction;
}

export type SessionAccessorFunction = () => Readonly<unknown>;

export class Runtime {
    protected _routeRegistry = new RouteRegistry();
    protected _navigationItemRegistry = new NavigationItemRegistry();
    protected _logger: RuntimeLogger;
    protected _eventBus: EventBus;
    protected _services: Record<string, unknown>;
    protected _sessionAccessor: SessionAccessorFunction;

    constructor({ loggers = [], services, sessionAccessor }: RuntimeOptions = {}) {
        this._logger = new RuntimeLogger(loggers);
        this._eventBus = new EventBus({ logger: this._logger });
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

    get eventBus() {
        return this._eventBus;
    }

    getService(serviceName: string) {
        return this._services[serviceName];
    }

    getSession() {
        if (!this._sessionAccessor) {
            throw new Error("[shell] Cannot retrieve the session because no session accessor has been provided");
        }

        return this._sessionAccessor();
    }
}
