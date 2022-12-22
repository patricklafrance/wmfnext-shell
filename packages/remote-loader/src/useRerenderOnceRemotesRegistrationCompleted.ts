import { useEffect, useState } from "react";

export interface UseRerenderOnceRemotesRegistrationCompletedOptions {
    // The interval is in milliseconds.
    interval?: number;
}

export function useRerenderOnceRemotesRegistrationCompleted(isCompleted: () => boolean, { interval = 10 }: UseRerenderOnceRemotesRegistrationCompletedOptions = {}) {
    const [, completed] = useState(false);

    // Perform a reload once the modules are registered.
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (isCompleted()) {
                clearInterval(intervalId);
                completed(true);
            }
        }, interval);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, []);
}
