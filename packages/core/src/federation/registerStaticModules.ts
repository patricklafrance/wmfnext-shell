import type { ModuleRegisterFunction, RegisterModuleOptions } from "./registerModule";

import type { Runtime } from "../runtime";

export function registerStaticModules(registerFunctions: ModuleRegisterFunction[], runtime: Runtime, options?: RegisterModuleOptions): Promise<void> {
    return new Promise(resolve => {
        registerFunctions.forEach(x => {
            x(runtime, options);
        });

        resolve();
    });
}
