import { Runtime } from "../runtime";

export type ModuleRegisterFunction = (runtime: Runtime, context?: unknown) => void;

export function registerModule(register: ModuleRegisterFunction, runtime: Runtime, context?: unknown) {
    register(runtime, context);
}
