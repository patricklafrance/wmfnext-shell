import type { PackageJson } from "type-fest";

// Based on https://webpack.js.org/plugins/module-federation-plugin/#sharing-hints
export interface SharedDependency {
    eager: boolean;
    import: false | string;
    packageName: string;
    version: false | string;
    requiredVersion: false | string;
    shareKey: string;
    shareScope: string;
    singleton: boolean;
    strictVersion: boolean;
}

export type SharedDependencies = Record<string, SharedDependency>;

const RequiredDependencies = ["react", "react-dom", "react-router-dom", "wmfnext-shell", "wmfnext-remote-loader"] as const;

function parseDependencyObject(obj: Record<string, string>, targetDependencies: string[]) {
    const found = targetDependencies.reduce((acc, x) => {
        if (obj[x]) {
            acc[x] = obj[x];
        }

        return acc;
    }, {});

    return found;
}

function parsePackageDependencies(packageJson: PackageJson, targetDependencies: string[]) {
    // "dependencies" have priority over "devDependencies", it doesn't really make sense that shared dependencies would be defined as "dev".
    return {
        ...parseDependencyObject(packageJson.devDependencies ?? {}, targetDependencies),
        ...parseDependencyObject(packageJson.dependencies ?? {}, targetDependencies)
    };
}

function findDependenciesVersion(packageJson: PackageJson, targetDependencies: string[]) {
    const foundVersions = parsePackageDependencies(packageJson, targetDependencies);
    const foundKeys = Object.keys(foundVersions);

    if (foundKeys.length !== targetDependencies.length) {
        const missingVersions = targetDependencies.filter(x => !foundKeys.includes(x));

        throw Error(`[shell] Cannot find the following dependencies in the provided package.json file: ${missingVersions.map(x => `"${x}"`).join(", ")}.`);
    }

    console.log("[shell] Found unresolved dependency versions:", foundVersions);

    return foundVersions;
}

function hasDependencyVersion(dependency: SharedDependency) {
    if (dependency) {
        if (dependency.version || dependency.requiredVersion) {
            return true;
        }
    }

    return false;
}

function getUnresolvedDependencies(sharedDependencies: SharedDependencies) {
    // A required dependency is considered as resolved if the provided shared dependencies object
    // has a version for that specific dependency.
    // It's useful for usecases like when the development environment is using symlink because a specific
    // version of package hasn't been published yet, or even the package hasn't been published yet.
    const unresolvedRequiredDependencies = RequiredDependencies.filter(x => !hasDependencyVersion(sharedDependencies[x]));
    const unresolvedAdditionalSharedDependencies = Object.keys(sharedDependencies).filter(x => !hasDependencyVersion(sharedDependencies[x]));

    return [
        ...unresolvedRequiredDependencies,
        ...unresolvedAdditionalSharedDependencies
    ];
}

// Creates the plugin "shared" object by merging the hardcoded required dependencies and the  additional dependencies
// provided with the "sharedDependencies" option. Then, resolved versions are applied when applicable.
// A caller can overwrite a default required dependency by providing the dependency as part of the "sharedDependencies"
// option object.
function createSharedObject(foundVersions: Record<string, string>, sharedDependencies: SharedDependencies) {
    // Create an object matching the plugin expected syntax for every required dependency which hasn't been overwrited
    // by the "sharedDependencies" option.
    const versionedRequiredDependencies = RequiredDependencies.reduce((acc, x) => {
        if (!sharedDependencies[x]) {
            // Default required dependencies only specify those 2 options. If a caller want additional options,
            // he have to specify the required dependency as an additional dependency.
            acc[x] = {
                singleton: true,
                requiredVersion: foundVersions[x]
            };
        }

        return acc;
    }, {});

    // Set the resolved version for every provided "sharedDependencies" object missing the "requiredVersion" prop.
    const versionedAdditionalSharedDependencies = Object.keys(sharedDependencies).reduce((acc: SharedDependencies, x) => {
        acc[x] = sharedDependencies[x];

        if (!hasDependencyVersion(acc[x])) {
            acc[x].requiredVersion = foundVersions[x];
        }

        return acc;
    }, {});

    return {
        ...versionedRequiredDependencies,
        ...versionedAdditionalSharedDependencies
    };
}

export interface CreateConfigurationOptions {
    sharedDependencies?: SharedDependencies;
}

// TODO: find a way to import ModuleFederationPluginOptions type.
export type CreateConfigurationFunction<T = unknown> = (moduleName: string, packageJson: PackageJson, options: CreateConfigurationOptions) => T;

export const createHostConfiguration: CreateConfigurationFunction = (moduleName, packageJson, { sharedDependencies = {} } = {}) => {
    const unresolvedDependencies = getUnresolvedDependencies(sharedDependencies);
    const foundVersions = findDependenciesVersion(packageJson, unresolvedDependencies);

    return {
        name: moduleName,
        shared: createSharedObject(foundVersions, sharedDependencies)
    };
};

// By conventions, the remote:
//    - filename is always: "remoteEntry.js"
//    - only a single module called "./register" is exposed
//
export const createModuleConfiguration: CreateConfigurationFunction = (moduleName, packageJson, { sharedDependencies = {} } = {}) => {
    const unresolvedDependencies = getUnresolvedDependencies(sharedDependencies);
    const foundVersions = findDependenciesVersion(packageJson, unresolvedDependencies);

    return {
        name: moduleName,
        filename: "remoteEntry.js",
        exposes: {
            "./register": "./src/register"
        },
        shared: createSharedObject(foundVersions, sharedDependencies)
    };
};
