# wmfnext-shell

[Webpack Module Federation](https://webpack.js.org/concepts/module-federation) is a great infrastructure piece to makes sharing code and dependencies between different independant codebases easier. But as is, it's pretty raw as it's a low level mecanism.

This shell aims to add a very thin and opinionated layer on top of Webpack Module Federation to complement the sharing mecanism with additional functionalities. Those functionalities will gentle the adoption of a federated application architecture and provide an opinionated direction on how to implement a federated application.

The idea behind this shell is to have an host application responsible of loading modules and providing shared functionalities like routing, messaging and logging. With this shell, a module is considered as an independent codebase which should usually match a specific sub domain of the application. At bootstrap, the host application loads the modules and call a registration function for each of them with shared functionalities and a customazible context. During the registration phase, each module dynamically *register it's routes and navigation links* while also saving a reference on shared functionality services and other values provided through the context.

We recommend to aim for remote hosted modules loaded at runtime as it enables your teams to be fully autonomous by deploying their module independently from the other pieces of the application. Still, sometimes teams might want to gradually migrate toward this type of architecture and would prefer to extract sub domains into independent packages in a monorepos setup before going all-in with a runtime micro-frontends architecture. That's why, this shell also support loading modules from packages at build time. Dual bootstrapping setup is also supported, meaning an application could load a few remote hosted modules loaded at runtime while also loading a few other modules from packages at build time.

Please have a look at the [usage section](#usage) and the [full example](#full-example) to have a better understanding of the concepts behind this shell and how to use it.

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Contributors](./CONTRIBUTING.md)

## Features

This federated application shell include the following features:

- Load hosted remote modules at runtime
- Load modules from packages at build time
- Routing & navigation management
- User session management
- Cross application pub/sub
- Logging management
- Failures isolation
- Stubs for remote module development in isolation

## Installation

To install the package, [open a terminal in VSCode](https://code.visualstudio.com/docs/editor/integrated-terminal#_managing-multiple-terminals) and execute the following command at the root of the workspace:

```bash
yarn add wmfnext-shell
```

If you wish to include remote modules at runtime using Webpack Module Federation also execute the following command at the root of the workspace:

```bash
yarn add wmfnext-remote-loader
```

## Usage

To use the shell, you must create projects for an host application and a remote application. In this example, we'll called them "host" and "remote.

### Host application

> A full host example is available in the Github repository [wmfnext-host](https://github.com/patricklafrance/wmfnext-host).

The first thing to do is to create an host application. According to [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) best practices we'll create 3 files:

```
host-app
├── App.tsx
├── bootstrap.tsx
└── index.tsx
```

First, create an `App.tsx` file which will act as the entry point of your React application.

```tsx
// App.tsx

export function App() {
    return (
        <div>Hello world!</div>
    );
}
```

Then, create an `index.tsx` file which will strictly contain a dynamic import to the `bootstrap.tsx` file.

> We need this extra layer of indirection because it gives Webpack a chance to load all of the imports it needs to render the remote app.
> Otherwise, you would see an error.
>
> If you're not using any remote modules loaded at runtime with Webpack Module Federation you might not need to use a `bootstrap.tsx` file.

```ts
// index.tsx

import("./bootstrap");
```

Then, create a `bootstrap.tsx` file to render the React application. If your not loading any remote modules, skip the `bootstrap.tsx` file and move the code to the `index.tsx` file.

```tsx
// bootstrap.tsx

import { App } from "./App";
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root"));

root.render(
    <App />
);
```

At this point, you should be able to start your React application and see _Hello world!_

Now, let's assume that you want to load a remote module at runtime with [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) (make sure you installed `wmfnext-remote-loader` dependency).

The first thing to do is to configure Webpack and add the [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin).

```js
// webpack.cjs

const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
    mode: "development",
    target: "web",
    devtool: "inline-source-map",
    devServer: {
        port: 8080,
        historyApiFallback: true
    },
    entry: "./src/index.tsx",
    output: {
        // The trailing / is important otherwise hot reload doesn't work.
        publicPath: "http://localhost:8080/"
    },
    module: {
        rules: [
            {
                test: /\.ts[x]$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader",
                    options: {
                        transpileOnly: true,
                        configFile: path.resolve(__dirname, "tsconfig.json")
                    }
                }
            },
            {
                // https://stackoverflow.com/questions/69427025/programmatic-webpack-jest-esm-cant-resolve-module-without-js-file-exten
                test: /\.js/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                test: /\.(css)$/,
                exclude: /node_modules/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.(png|jpe?g|gif)$/i,
                type: "asset/resource"
            }
        ]
    },
    resolve: {
        // Must add ".js" for files imported from node_modules.
        extensions: [".js", ".ts", ".tsx", ".css"]
    },
    plugins: [
        new ModuleFederationPlugin({
            name: "host",
            shared: {
                "react": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the remote configuration.
                    requiredVersion: "YOUR_VERSION"
                },
                "react-dom": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the remote configuration.
                    requiredVersion: "YOUR_VERSION"
                },
                "react-router-dom": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the remote configuration.
                    requiredVersion: "YOUR_VERSION"
                }
            }
        }),
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        })
    ]
};
```

The previous Webpack configuration is for *development only* and implies that the project is using TypeScript and transpile directly with `tsc`.

As the [HtmlWebpackPlugin](https://webpack.js.org/plugins/html-webpack-plugin) is used, a `public` folder and with an `index.html` file must also be added at the root of the application.

```
host-app
├── public
├─────index.html
├── App.tsx
├── bootstrap.tsx
└── index.tsx
```

```html
// index.html

<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

Now, let's jump into the interesting stuff and start using the shell. For this example, we'll do most of the configuration in the `bootstrap.tsx` file.

```tsx
// bootstrap.tsx

import { ConsoleLogger, ShellRuntime } from "wmfnext-shell";
import type { RemoteDefinition, RemoteModuleRegistratorError } from "wmfnext-remote-loader";

import { App } from "./App";
import { createRoot } from "react-dom/client";
import { registerRemoteModules } from "wmfnext-remote-loader";

// Instanciate a runtime instance that will be shared among the host and the remote. The runtime contains the common functionalities such a the routing and navigation services.
const runtime = new ShellRuntime({
    // By default, the shell comes with a basic console logger. Custom logger can be implemented by implementing the Logger interface.
    loggers: [new ConsoleLogger()]
});

const Remotes: RemoteDefinition[] = [
    {
        url: "http://localhost:8081",
        // Will have to match the name defined in the remote application Webpack configuration that we'll define later.
        name: "remote1"
    }
];

// Load and register the remote modules at runtime.
registerRemoteModules(Remotes, runtime).then((errors: RemoteModuleRegistratorError[]) => {
    if (errors.length > 0) {
        runtime.logError("Errors occured during remotes registration: ", errors);
    }
});

const root = createRoot(document.getElementById("root"));

root.render(
    <App />
);
```

You can start the host application and make sure everything compile. Even if the remote application is not available, the host application will gracefully render with what is currently available.

### Remote application

It's time to get our first remote module! We'll use a file structure similar to what we used for the host application.

```
remote-app
├── public
├─────index.html
├── App.tsx
├── bootstrap.tsx
└── index.tsx
```

First, create an `App.tsx` file which will act as the entry point of your React application.

```tsx
// App.tsx

export function App() {
    return (
        <div>Hello from remote!</div>
    );
}
```

Then, create an `index.tsx` file which will strictly contain a dynamic import to the `bootstrap.tsx` file.

> We need this extra layer of indirection because it gives Webpack a chance to load all of the imports it needs to render the remote app.
> Otherwise, you would see an error.

```ts
// index.tsx

import("./bootstrap");
```

Then, create a `bootstrap.tsx` file to render the React application.

```tsx
// bootstrap.tsx

import { App } from "./App";
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root"));

root.render(
    <App />
);
```

Configure Webpack and add the [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin).

```js
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
    mode: "development",
    target: "web",
    devtool: "inline-source-map",
    devServer: {
        port: 8081,
        historyApiFallback: true,
        // Otherwise hot reload in the host failed with a CORS error.
        headers: {
            "Access-Control-Allow-Origin": "*"
        }
    },
    entry: "./src/register.tsx"
    output: {
        // The trailing / is important otherwise hot reload doesn't work.
        publicPath: "http://localhost:8081/"
    },
    module: {
        rules: [
            {
                test: /\.ts[x]$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader",
                    options: {
                        transpileOnly: true,
                        configFile: path.resolve(__dirname, "tsconfig.dev.json")
                    }
                }
            },
            {
                // https://stackoverflow.com/questions/69427025/programmatic-webpack-jest-esm-cant-resolve-module-without-js-file-exten
                test: /\.js/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                test: /\.(css)$/,
                exclude: /node_modules/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.(png|jpe?g|gif)$/i,
                type: "asset/resource"
            }
        ]
    },
    resolve: {
        // Must add ".js" for files imported from node_modules.
        extensions: [".js", ".ts", ".tsx", ".css"]
    },
    plugins: [
        new ModuleFederationPlugin({
            name: "remote1",
            filename: "remoteEntry.js",
            exposes: {
                "./register": "./src/register"
            },
            shared: {
                "react": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the host configuration.
                    requiredVersion: "VERSION"
                },
                "react-dom": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the host configuration.
                    requiredVersion: "VERSION"
                },
                "react-router-dom": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the host configuration.
                    requiredVersion: "VERSION"
                }
            }
        }),
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        })
    ]
};
```

The previous Webpack configuration is for *development only* and implies that the project is using TypeScript and transpile directly with `tsc`.

By convention, remote modules using the shell, must configure `ModuleFederationPlugin` with:

```js
{
    filename: "remoteEntry.js",
    exposes: {
        "./register": "./src/register"
    }
}
```

As the [HtmlWebpackPlugin](https://webpack.js.org/plugins/html-webpack-plugin) is used, a `public` folder and with an `index.html` file must also be added at the root of the application.

```
remote-app
├── public
├─────index.html
├── App.tsx
├── bootstrap.tsx
└── index.tsx
```

```html
// index.html

<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

You can start the host application and make sure everything compile, you should see __Hello from remote!__.

Now, as stated previously, this shell add an opinionated layer on top of [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) dependencies sharing mecanism. Our take is that remote modules should not strictly share standalone components but rather share modules which represents whole sub domains of the application.

Remember earlier when we told the `ModuleFederationPlugin` to expose a `register.js` file?

It's this file which will receive the host and runtime and register the remote module pages and navigation items.

So, let's create a `register.js` file at the root of the application.

```
remote-app
├── public
├─────index.html
├── App.tsx
├── bootstrap.tsx
└── index.tsx
└── register.js
```

```tsx
// register.js

import { ModuleRegisterFunction } from "wmfnext-shell";

export const register: ModuleRegisterFunction = (runtime, { context }) => {
    runtime.logInformation("Remote 1 registered", context);
};
```

For now we won't register anything, we'll use the `runtime` to log something in the console.

At this point, if you start both the host application and the remote application, you should see the following in your dev tools console:

```bash
[webpack-dev-server] Server started: Hot Module Replacement enabled, Live Reloading enabled, Progress disabled, Overlay enabled.
log.js:24 [HMR] Waiting for update signal from WDS...
consoleLogger.js:16 Loading module "./register" from container "remote1" of remote "http://localhost:8081/remoteEntry.js"
index.js:551 [webpack-dev-server] Server started: Hot Module Replacement enabled, Live Reloading enabled, Progress disabled, Overlay enabled.
log.js:24 [HMR] Waiting for update signal from WDS...
consoleLogger.js:16 Registering module "./register" from container "remote1" of remote "http://localhost:8081/remoteEntry.js"
consoleLogger.js:22 Remote 1 registered
```

### Registering routes and navigation items



### Fix the loading spinner

### Full example

### Configuring your local environ with a fake runtime and a shared layout

### API


### Runtime

Instance runtime

RuntimeContext

### Routing

Register routes

Render routes

TBD

### User session

### Event bus

### Logging

Configure logger

User logger

### Setup an host

Conventions

Configure ModuleFederationPlugin -> seulement si utilise des remotes modules

registerRemoteModules / registerPackageModules

useRerenderOnceModulesRegistrationCompleted

Remote isolation (ErrorBoundary) -> Nom devrait avoir changé

### Register a module

Conventions

Configure ModuleFederationPlugin (or our custom one if going this way)

register.js function

### Full example

Either show code here or link to code samples in wmfnext-host and wmfnext-remote-1

### Using a fake runtime for local development

TBD

## Contributors

Have a look at the [contributors guide](./CONTRIBUTING.md).
