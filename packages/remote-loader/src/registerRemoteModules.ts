import type { RemoteDefinition } from "./RemoteDefinition";
import type { Runtime } from "wmfnext-shell";
import { loadRemote } from "./loadRemote";
import { registerModule } from "wmfnext-shell";

// By conventions, the remote:
//    - filename is always: "remoteEntry.js"
//    - only a single module called "./register" is exposed
//
const EntryPoint = "remoteEntry.js";
const ModuleName = "./register";

export interface RegistrationError {
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

export async function registerRemoteModules(remotes: RemoteDefinition[], runtime: Runtime, { context }: RegisterRemoteModulesOptions = {}): Promise<RegistrationError[]> {
    const errors: RegistrationError[] = [];

    await Promise.allSettled(remotes.map(async x => {
        const remoteUrl = new URL(EntryPoint, x.url).toString();
        const containerName = x.name;

        try {
            runtime.logger.debug(`[shell] Loading module "${ModuleName}" from container "${containerName}" of remote "${remoteUrl}."`);

            const module = await loadRemote(remoteUrl, containerName, ModuleName);

            if (!module.register) {
                throw new Error(`[shell] A "register" function is not available for module "${ModuleName}" of container "${containerName}" from remote "${remoteUrl}". Make sure your remote "./register.js" file export a function named "register".`);
            }

            runtime.logger.debug(`[shell] Registering module "${ModuleName}" from container "${containerName}" of remote "${remoteUrl}."`);

            registerModule(module.register, runtime, { context });
        } catch (error: unknown) {
            runtime.logger.error(`[shell] An error occured while registering module "${ModuleName}" from container "${containerName}" of remote "${remoteUrl}."`, error);

            errors.push({
                url: remoteUrl,
                containerName,
                moduleName: ModuleName,
                error
            } as RegistrationError);
        }
    }));

    return errors;
}
