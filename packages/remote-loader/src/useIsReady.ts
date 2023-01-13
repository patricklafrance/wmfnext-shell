import { useEffect, useState } from "react";

import { registrationStatus } from "./registerRemoteModules";

export interface UseIsReadyOptions {
    // The interval is in milliseconds.
    interval?: number;
}

export function useIsReady({ interval = 10 }: UseIsReadyOptions = {}) {
    // Using a state hook to force a rerender once ready.
    const [, isReady] = useState(false);

    // Perform a reload once the modules are registered.
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (registrationStatus === "ready") {
                clearInterval(intervalId);
                isReady(true);
            }
        }, interval);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, []);

    return registrationStatus;
}
