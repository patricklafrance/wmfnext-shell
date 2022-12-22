import type { RouteObject } from "react-router-dom";

export interface Runtime {
    registerRoutes: (routes: RouteObject[]) => void;
    getRoutes: () => RouteObject[];

    logDebug: (log: string, ...rest: any[]) => Promise<PromiseSettledResult<any>[]>;
    logInformation: (log: string, ...rest: any[]) => Promise<PromiseSettledResult<any>[]>;
    logWarning: (log: string, ...rest: any[]) => Promise<PromiseSettledResult<any>[]>;
    logError: (log: string, ...rest: any[]) => Promise<PromiseSettledResult<any>[]>;
    logCritical: (log: string, ...rest: any[]) => Promise<PromiseSettledResult<any>[]>;
}
