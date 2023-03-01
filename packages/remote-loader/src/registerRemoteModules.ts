import type { RemoteDefinition } from "./remoteDefinition";
import type { Runtime } from "wmfnext-shell";
import { loadRemote } from "./loadRemote";
import { registerModule } from "wmfnext-shell";

// By conventions, the remote:
//    - filename is always: "remoteEntry.js"
//    - only a single module called "./register" is exposed
const EntryPoint = "remoteEntry.js";
const ModuleName = "./register";

export type RegistrationStatus = "none" | "in-progress" | "ready";

export let registrationStatus: RegistrationStatus = "none";

export interface RegistrationError {
    // The remote base URL.
    url: string;
    // The remote container name.
    containerName: string;
    // The remote resource module name.
    moduleName: string;
    // The registration error.
    error: unknown;
}

export interface RegisterRemoteModulesOptions {
    context?: unknown;
}

export async function registerRemoteModules(remotes: RemoteDefinition[], runtime: Runtime, { context }: RegisterRemoteModulesOptions = {}) {
    if (registrationStatus !== "none") {
        throw new Error("[shell] The \"registerRemoteModules\" function can only be called once");
    }

    const errors: RegistrationError[] = [];

    runtime.logger.information(`[shell] Found ${remotes.length} remote module${remotes.length > 1 ? "s" : ""} to register`);

    registrationStatus = "in-progress";

    await Promise.allSettled(remotes.map(async (x, index) => {
        const remoteUrl = new URL(EntryPoint, x.url).toString();
        const containerName = x.name;

        try {
            runtime.logger.information(`[shell] ${index + 1}/${remotes.length} Loading module "${ModuleName}" from container "${containerName}" of remote "${remoteUrl}"`);

            const module = await loadRemote(remoteUrl, containerName, ModuleName);

            if (!module.register) {
                throw new Error(`[shell] A "register" function is not available for module "${ModuleName}" of container "${containerName}" from remote "${remoteUrl}". Make sure your remote "./register.js" file export a function named "register"`);
            }

            runtime.logger.information(`[shell] ${index + 1}/${remotes.length} Registering module "${ModuleName}" from container "${containerName}" of remote "${remoteUrl}"`);

            registerModule(module.register, runtime, context);

            runtime.logger.information(`[shell] ${index + 1}/${remotes.length} container "${containerName}" of remote "${remoteUrl}" registration completed"`);
        } catch (error: unknown) {
            runtime.logger.error(`[shell] An error occured while registering module "${ModuleName}" from container "${containerName}" of remote "${remoteUrl}"`, error);

            errors.push({
                url: remoteUrl,
                containerName,
                moduleName: ModuleName,
                error
            } as RegistrationError);
        }
    }));

    registrationStatus = "ready";

    return errors;
}
