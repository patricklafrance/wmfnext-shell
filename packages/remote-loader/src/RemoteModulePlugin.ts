import { ModuleFederationPlugin } from "webpack/lib/container/ModuleFederationPlugin";
import type { ModuleFederationPluginOptions } from "webpack/lib/container/ModuleFederationPlugin";

export type RemoteModulePluginOptions = Omit<ModuleFederationPluginOptions, "filename" | "exposes">;

export function RemoteModulePlugin(options: RemoteModulePluginOptions) {
    return ModuleFederationPlugin({
        ...options,
        filename: "remoteEntry.js",
        exposes: {
            "./register": "./src/register"
        }
    });
}
