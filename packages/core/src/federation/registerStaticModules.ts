import type { ModuleRegisterFunction } from "./registerModule";
import type { Runtime } from "../runtime";

export interface RegisterStaticModulesOptions {
    context?: unknown;
}

let isRegistered = false;

export async function registerStaticModules(registerFunctions: ModuleRegisterFunction[], runtime: Runtime, { context }: RegisterStaticModulesOptions = {}) {
    if (isRegistered) {
        throw new Error("[shell] The \"registerRemoteModules\" function can only be called once");
    }

    runtime.logger.information(`[shell] Found ${registerFunctions.length} static module${registerFunctions.length > 1 ? "s" : ""} to register`);

    registerFunctions.forEach((x, index) => {
        runtime.logger.information(`[shell] ${index + 1}/${registerFunctions.length} Registering static module`);

        x(runtime, context);

        runtime.logger.information(`[shell] ${index + 1}/${registerFunctions.length} Registration completed`);
    });

    isRegistered = true;
}
