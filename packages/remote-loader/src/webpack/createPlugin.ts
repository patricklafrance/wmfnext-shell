import { createHostConfiguration, createModuleConfiguration } from "./createConfiguration.js";

import type { CreateConfigurationFunction } from "./createConfiguration";
import ModuleFederationPlugin from "webpack/lib/container/ModuleFederationPlugin.js";

export const createHostPlugin: CreateConfigurationFunction<typeof ModuleFederationPlugin> = (...params) => {
    const config = createHostConfiguration(...params);

    return new ModuleFederationPlugin(config);
};

export const createModulePlugin: CreateConfigurationFunction<typeof ModuleFederationPlugin> = (...params) => {
    const config = createModuleConfiguration(...params);

    return new ModuleFederationPlugin(config);
};
