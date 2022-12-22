import type { Logger } from "../logging";
import type { RouteObject } from "react-router-dom";
import type { Runtime } from "./runtime";

export interface ShellRuntimeOptions {
    loggers?: Logger[];
}

export class ShellRuntime implements Runtime {
    private _loggers: Logger[];
    private _routes: RouteObject[];

    constructor({ loggers = [] }: ShellRuntimeOptions = {}) {
        this._loggers = loggers;
        this._routes = [];
    }

    registerRoutes(routes: RouteObject[]): void {
        const newRoutes = [];

        routes.forEach(x => {
            if (x) {
                newRoutes.push(x);
            }
        });

        // Create a new array everytime so the routes can be memoized later on.
        this._routes = [...this._routes, ...newRoutes];
    }

    getRoutes(): RouteObject[] {
        return this._routes;
    }

    private log(action: (logger: Logger) => Promise<any>): Promise<PromiseSettledResult<any>[]> {
        return Promise.allSettled(this._loggers.map((x: Logger) => action(x)));
    }

    logDebug(log: string, ...rest: any[]): Promise<PromiseSettledResult<any>[]> {
        return this.log((x: Logger) => x.debug(log, ...rest));
    }

    logInformation(log: string, ...rest: any[]): Promise<PromiseSettledResult<any>[]> {
        return this.log((x: Logger) => x.information(log, ...rest));
    }

    logWarning(log: string, ...rest: any[]): Promise<PromiseSettledResult<any>[]> {
        return this.log((x: Logger) => x.warning(log, ...rest));
    }

    logError(log: string, ...rest: any[]): Promise<PromiseSettledResult<any>[]> {
        return this.log((x: Logger) => x.error(log, ...rest));
    }

    logCritical(log: string, ...rest: any[]): Promise<PromiseSettledResult<any>[]> {
        return this.log((x: Logger) => x.critical(log, ...rest));
    }
}
