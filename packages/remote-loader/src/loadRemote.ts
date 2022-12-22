interface LoadRemoteScriptOptions {
    timeoutDelay?: number;
}

function loadRemoteScript(url: string, { timeoutDelay = 2000 }: LoadRemoteScriptOptions = {}) {
    return new Promise((resolve, reject) => {
        const element = document.createElement("script");

        element.src = url;
        element.type = "text/javascript";
        element.async = true;

        let timeoutId = undefined;

        function cancel(error: unknown) {
            element.parentElement.removeChild(element);

            reject({
                error,
                hasCanceled: true
            });
        }

        element.onload = () => {
            clearTimeout(timeoutId);

            element.parentElement.removeChild(element);
            resolve({});
        };

        element.onerror = (error: unknown) => {
            clearTimeout(timeoutId);

            element.parentElement.removeChild(element);

            reject({
                error,
                hasCanceled: false
            });
        };

        document.head.appendChild(element);

        // Eagerly reject the loading of a script, it's too long when a remote is unavailable.
        timeoutId = setTimeout(() => {
            cancel(new Error(`Remote script "${url}" time-outed.`));
        }, timeoutDelay);
    });
}

export type LoadRemoteOptions = LoadRemoteScriptOptions;

// Implementation of https://webpack.js.org/concepts/module-federation/#dynamic-remote-containers.
// It's done this way rather than using the managed mecanism provided with ModuleFederationPlugin config because it's doesn't throw an error if a module is not available.
export async function loadRemote(url: string, containerName: string, moduleName: string, options: LoadRemoteOptions = {}) {
    await loadRemoteScript(url, options);

    // Initializes the share scope. It fills the scope with known provided modules from this build and all remotes.
    await __webpack_init_sharing__("default");

    // Retrieve the module federation container.
    const container = window[containerName];

    if (!container) {
        throw new Error(`Container "${containerName}" is not available for remote "${url}".`);
    }

    // Initialize the container, it may provide shared modules.
    // @ts-ignore
    await container.init(__webpack_share_scopes__.default);

    // Retrieve the module.
    // @ts-ignore
    const factory = await container.get(moduleName);

    if (!factory) {
        throw new Error(`Module "${module}" is not available for container "${containerName}" of remote "${url}".`);
    }

    return factory();
}
