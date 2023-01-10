import { Runtime } from "../runtime";

export interface ModuleRegisterFunctionOptions {
    context?: any;
}

export type ModuleRegisterFunction = (runtime: Runtime, options: ModuleRegisterFunctionOptions) => void;

export type RegisterModuleOptions = ModuleRegisterFunctionOptions;

export function registerModule(register: ModuleRegisterFunction, runtime: Runtime, options?: RegisterModuleOptions) {
    register(runtime, options);
}
