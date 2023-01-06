import type { Logger } from "../logging";
import type { RouteObject } from "react-router-dom";
import type { Runtime } from "./runtime";
import { RuntimeLogger } from "./RuntimeLogger";
import { moduleRouteRegistry } from "../federation/internal";

export interface ShellRuntimeOptions {
    loggers?: Logger[];
}

export class ShellRuntime implements Runtime {
    private _logger: RuntimeLogger;

    constructor({ loggers = [] }: ShellRuntimeOptions = {}) {
        this._logger = new RuntimeLogger(loggers);
    }
    routes: RouteObject[];

    registerRoute(route: RouteObject) {
        this.registerRoutes([route]);
    }

    registerRoutes(routes: RouteObject[]) {
        moduleRouteRegistry.registerRoutes(routes);
    }

    get logger() {
        return this._logger;
    }
}
