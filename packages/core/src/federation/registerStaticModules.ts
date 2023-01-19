import type { ModuleRegisterFunction, RegisterModuleOptions } from "./registerModule";

import type { Runtime } from "../runtime";

let isRegistered = false;

export async function registerStaticModules(registerFunctions: ModuleRegisterFunction[], runtime: Runtime, options?: RegisterModuleOptions) {
    if (isRegistered) {
        throw new Error("[shell] The \"registerRemoteModules\" function can only be called once");
    }

    runtime.logger.information(`[shell] Found ${registerFunctions.length} static module${registerFunctions.length > 1 ? "s" : ""} to register`);

    registerFunctions.forEach((x, index) => {
        runtime.logger.information(`[shell] ${index + 1}/${registerFunctions.length} Registering static module`);

        x(runtime, options);

        runtime.logger.information(`[shell] ${index + 1}/${registerFunctions.length} Registration completed`);
    });

    isRegistered = true;
}
