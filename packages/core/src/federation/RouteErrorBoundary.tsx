import { isRouteErrorResponse, useLocation, useRouteError } from "react-router-dom";

import type { Runtime } from "../runtime";

export interface RouteErrorBoundaryProps {
    runtime: Runtime;
}

export function RouteErrorBoundary({ runtime }: RouteErrorBoundaryProps) {
    const error = useRouteError();
    const location = useLocation();

    const message = isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}`
        : error instanceof Error
            ? error.message
            : JSON.stringify(error);

    runtime.logError(`An error occured while rendering the route with path ${location.pathname}`, error);

    const stack = error instanceof Error ? error.stack : null;
    const preStyles = { padding: "0.5rem", backgroundColor: "rgba(200,200,200, 0.5)" };

    return (
        <>
            <h2>A federated route failed to load.</h2>
            <h3 style={{ fontStyle: "italic" }}>{message}</h3>
            {stack ? <pre style={preStyles}>{stack}</pre> : null}
        </>
    );
}
