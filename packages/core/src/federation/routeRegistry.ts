import { RouteObject } from "react-router-dom";
import { deepFreeze } from "../shared";

export type Route = RouteObject;

export class RouteRegistry {
    private _routes: Readonly<RouteObject[]>;

    constructor() {
        this._routes = Object.freeze([]);
    }

    add(routes: Route[]) {
        // Create a new array so the routes array is immutable.
        this._routes = deepFreeze([...this._routes, ...routes.filter(x => x)]);
    }

    get routes() {
        return this._routes;
    }
}
