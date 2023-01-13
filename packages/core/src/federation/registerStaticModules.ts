import type { ModuleRegisterFunction, RegisterModuleOptions } from "./registerModule";

import type { Runtime } from "../runtime";

export function registerStaticModules(registerFunctions: ModuleRegisterFunction[], runtime: Runtime, options?: RegisterModuleOptions): Promise<void> {
    runtime.logger.information(`[shell] Found ${registerFunctions.length} static modules to register`);

    return new Promise(resolve => {
        registerFunctions.forEach((x, index) => {
            runtime.logger.information(`[shell] ${index + 1}/${registerFunctions.length} Registering static module`);

            x(runtime, options);

            runtime.logger.information(`[shell] ${index + 1}/${registerFunctions.length} Registering completed`);
        });

        resolve();
    });
}
