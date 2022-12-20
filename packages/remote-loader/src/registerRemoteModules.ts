import type { RemoteDefinition } from "./RemoteDefinition";
import type { Runtime } from "wmfnext-shell";
import { loadRemote } from "./loadRemote";
import { registerModule } from "wmfnext-shell";

// By conventions entry point and module name.
const EntryPoint = "remoteEntry.js";
const ModuleName = "./register";

export interface RemoteModuleRegistratorError {
    // The remote base URL.
    url: string;
    // The remote container name.
    containerName: string;
    // The remote resource module name.
    moduleName: string;
    // The registration error.
    error: any;
}

export interface RegisterRemoteModulesOptions {
    context?: any;
}

export async function registerRemoteModules(remotes: RemoteDefinition[], runtime: Runtime, { context }: RegisterRemoteModulesOptions = {}): Promise<RemoteModuleRegistratorError[]> {
    const errors: RemoteModuleRegistratorError[] = [];

    await Promise.allSettled(remotes.map(async x => {
        const remoteUrl = new URL(EntryPoint, x.url).toString();
        const containerName = x.name;

        try {
            runtime.logDebug(`Loading module "${ModuleName}" from container "${containerName}" of remote "${remoteUrl}"`);

            const module = await loadRemote(remoteUrl, containerName, ModuleName);

            if (!module.register) {
                throw new Error(`Register function is not available for module "${ModuleName}" of container "${containerName}" from remote "${remoteUrl}"`);
            }

            runtime.logDebug(`Registering module "${ModuleName}" from container "${containerName}" of remote "${remoteUrl}"`);

            registerModule(module.register, runtime, { context });
        } catch (error: unknown) {
            errors.push({
                url: remoteUrl,
                containerName,
                moduleName: ModuleName,
                error
            } as RemoteModuleRegistratorError);
        }
    }));

    return errors;
}
