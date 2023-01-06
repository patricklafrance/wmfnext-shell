import { RouteObject } from "react-router-dom";

class ModuleRouteRegistry {
    private _routes: RouteObject[];

    constructor() {
        this._routes = [];
    }

    registerRoutes(routes: RouteObject[]) {
        const newRoutes = [];

        routes.forEach(x => {
            if (x) {
                newRoutes.push(x);
            }
        });

        // Create a new array everytime so the consumer has the options
        // to memoize the routes if needed.
        this._routes = [...this._routes, ...newRoutes];
    }

    get routes() {
        return this._routes;
    }
}

export const moduleRouteRegistry = new ModuleRouteRegistry();
