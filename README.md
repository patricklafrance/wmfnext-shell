# wmfnext-shell

[Webpack Module Federation](https://webpack.js.org/concepts/module-federation) is a great infrastructure piece to makes sharing code and dependencies between different independant codebases easier. But as is, it's pretty raw as it's a low level mecanism.

This shell aims to add a very thin and opinionated layer on top of Webpack Module Federation to complement the federation mecanism with additional functionalities. Those functionalities will gentle the adoption of a federated application architecture and provide an opinionated direction on how to implement a federated application.

The idea behind this shell is to have an host application responsible of loading modules and providing shared functionalities like routing, messaging and logging. With this shell, a module is considered as an independent codebase which should usually match a specific sub domain of the application. At bootstrap, the host application loads the modules and call a registration function for each of them with shared functionalities and a customazible context. During the registration phase, each module dynamically *register it's routes and navigation links*. Then, pages and components of a module can use the provided hooks to access shared functionalities whenever they please.

We recommend to aim for remote hosted modules loaded at runtime as it enables your teams to be fully autonomous by deploying their module independently from the other pieces of the application. Still, sometimes teams might want to gradually migrate toward this type of architecture and would prefer to extract sub domains into independent packages in a monorepos setup before going all-in with a runtime micro-frontends architecture. That's why, this shell also support loading modules from packages at build time. A dual bootstrapping setup is also supported, meaning an application could load a few remote hosted modules at runtime while also loading a few other modules from packages at build time.

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Full example](#full-example)
- [API](#api)
- [Contributors](./CONTRIBUTING.md)

## Features

This federated application shell include the following features:

- Loading of hosted remote modules at runtime
- Loading of modules from packages at build time
- Routing & navigation
- User session management
- Cross application pub/sub
- Logging
- Stubs for module development in isolation

## Installation

To install the package, [open a terminal in VSCode](https://code.visualstudio.com/docs/editor/integrated-terminal#_managing-multiple-terminals) and execute the following command at the root of the workspace:

```bash
yarn add wmfnext-shell
```

If you wish to include remote modules at runtime using [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) also execute the following command at the root of the workspace:

```bash
yarn add wmfnext-remote-loader
```

Once, installed, we recommend that you configure your project to use [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) by default. To do so, open the `package.json` file of the project and add the root property `"type": "module"`.

```json
{
    "type": "module"
}
```

> **Note**
>
> Make sure you install the packages and set the `type` property on every project, including the host and the modules.

## Usage

> If you'll prefer to skip this walkthrought and jump right into it, go directly to the [full example section](#full-example) or the [API section](#api).

To use this shell, you must create projects for an host application and a module application. In this example, since we'll load a remote module at runtime with [Webpack Module Federation](https://webpack.js.org/concepts/module-federation), we'll called them "host" and "remote".
To use this shell, you must create projects for an host application and a module application. In this example, since we'll load a remote module at runtime with [Webpack Module Federation](https://webpack.js.org/concepts/module-federation), we'll called them "host" and "remote".

### Host application

> An host application example is available in the Github repository [wmfnext-host](https://github.com/patricklafrance/wmfnext-host).

👉 The first thing to do is to create an host application. According to [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) best practices we'll create 3 files:

```
host-app
├── App.tsx
├── bootstrap.tsx
└── index.ts
```

👉 First, create an `App.tsx` file which will act as the entry point of your React application.

```tsx
// host - App.tsx

export function App() {
    return (
        <div>Hello world!</div>
    );
}
```

👉 Then, create an `index.ts` file which will strictly contain a dynamic import to the `bootstrap.tsx` file.

> This indirection called an "async boundary" is required so Webpack can load all the remote modules and their dependencies before rendering the host
> application. Additional information is available [here](https://dev.to/infoxicator/module-federation-shared-api-ach#using-an-async-boundary).
>
> If you're not using any remote modules loaded at runtime with [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) you don't need a `bootstrap.tsx` file.

```ts
// host - index.ts

import("./bootstrap");
```

👉 Next, create a `bootstrap.tsx` file to render the React application. If your not loading any remote modules, skip the `bootstrap.tsx` file and move the code to the `index.ts` file.

```tsx
// host - bootstrap.tsx

import { App } from "./App";
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root"));

root.render(
    <App />
);
```

At this point, you should be able to start your React application and see _Hello world!_

Now, let's assume that you want to load a remote module at runtime with [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) (make sure you installed `wmfnext-remote-loader` dependency).

👉 The first thing to do is to configure Webpack and add the [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin).

```js
// host - webpack.dev.js

import HtmlWebpackPlugin from "html-webpack-plugin";
import ModuleFederationPlugin from "webpack/lib/container/ModuleFederationPlugin.js";
import { createHostConfiguration } from "wmfnext-remote-loader/createModuleFederationConfiguration.js";
import path from "path";
import url from "url";
import packageJson from "./package.json" assert { type: "json" };

// "__dirname" is specific to CommonJS, must be done this way with ESM.
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import("webpack").Configuration} */
export default {
    mode: "development",
    target: "web",
    devtool: "inline-source-map",
    devServer: {
        port: 8080,
        historyApiFallback: true
    },
    entry: "./src/index.ts",
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
                // https://stackoverflow.com/questions/69427025/programmatic-webpack
                // -jest-esm-cant-resolve-module-without-js-file-exten
                test: /\.js/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                test: /\.(css)$/,
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
        new ModuleFederationPlugin(createHostConfiguration("host", packageJson)),
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        })
    ]
};
```

> **Note**
>
> The previous Webpack configuration is for *development only* and implies that the project is using TypeScript and transpile directly with the `tsc` CLI.
>
> As the project is configured to use [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) by default, this example is using ESM syntax instead of [CommonJS](https://en.wikipedia.org/wiki/CommonJS) which is what most are used to. If you're Webpack file use CommonJS, import the `wmfnext-remote-loader/createModuleFederationConfiguration.cjs` file instead.
>
> ```js
> require("wmfnext-remote-loader/createModuleFederationConfiguration.cjs");
> ```

You probably noticed that the [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin) is configured with the output of the  `createHostConfiguration()` function.

This is an utility function provided by the shell to gentle the configuration of the plugin and ensure the shell conventions are followed. The `createHostConfiguration` function accept as it's first parameter the name of the module and a `package.json` module. At build time, the function will look into the provided `package.json` module for the version of the dependencies which are shared by default by the shell and any additional shared dependencies provided by the caller for which the version is not specified.

> Dependencies shared by default are libraries like [react](https://reactjs.org/), [react-router](https://reactrouter.com/) and the shell itself.

The `createHostConfiguration` function also accept a third parameter, which is an optional object literal used to specify options. One of the option available with this third parameter is `sharedDependencies`. `sharedDependencies` allows a caller to specify additional shared dependencies which are specific to the application, like a design system library for example. If the `requiredVersion` is not specified for an additional shared dependency, the function will try to resolve it from the provided `package.json` module.

The `sharedDependencies` option accept the same options as the [ModuleFederationPlugin shared object](https://webpack.js.org/plugins/module-federation-plugin/#sharing-hints) minus the `version` property.

```js
new ModuleFederationPlugin(
    createHostConfiguration(
        "host",
        packageJson,
        {
            sharedDependencies: {
                "@sharegate/orbit-ui": {
                    singleton: true,
                    requiredVersion: "10.0.0"
                }
            }
        }
    )
)
```

👉 As the [HtmlWebpackPlugin](https://webpack.js.org/plugins/html-webpack-plugin) is used in this example, a `public` folder with an `index.html` file must also be added at the root of the application.

```
host-app
├── public
├─────index.html
├── App.tsx
├── bootstrap.tsx
└── index.ts
```

```html
// host - index.html

<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

👉 Now, let's jump into the interesting stuff and start using the shell. For this example, we'll do most of the configuration in the `bootstrap.tsx` file.

```tsx
// host - bootstrap.tsx

import { ConsoleLogger, RuntimeContext, ShellRuntime } from "wmfnext-shell";
import type { RegistrationError, RemoteDefinition } from "wmfnext-remote-loader";

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
registerRemoteModules(Remotes, runtime).then((errors: RegistrationError[]) => {
    if (errors.length > 0) {
        runtime.logger.error("Errors occured during remotes registration: ", errors);
    }
});

const root = createRoot(document.getElementById("root"));

root.render(
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

> The remote modules must be registered in the `bootstrap.ts` file rather than the `App.tsx` file otherwise the registration will be outside of the remote boundary and it will not work.

You can start the host application and make sure everything compile. Even though the remote application is not available, the host application will gracefully render with what is currently available, meaning only the host application at the moment.

### Remote application

> A remote application example is available in the Github repository [wmfnext-remote-1](https://github.com/patricklafrance/wmfnext-remote-1).

It's time to create our first remote module! We'll use a file structure similar to what we used for the host application.

```
remote-app
├── public
├─────index.html
├── App.tsx
├── bootstrap.tsx
└── index.ts
```

👉 First, create an `App.tsx` file which will act as the entry point of your React application.

```tsx
// remote - App.tsx

export function App() {
    return (
        <div>Hello from remote!</div>
    );
}
```

👉 Then, create an `index.ts` file which will strictly contain a dynamic import to the `bootstrap.tsx` file.

> An "async boundary" is also needed here to let Webpack negotiate the shared dependencies with the host application. Additional information is available [here](https://dev.to/infoxicator/module-federation-shared-api-ach#using-an-async-boundary).

```ts
// remote - index.ts

import("./bootstrap");
```

👉 Next, create a `bootstrap.tsx` file to render the React application.

```tsx
// remote - bootstrap.tsx

import { App } from "./App";
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root"));

root.render(
    <App />
);
```

👉 And configure Webpack to use [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin).

```js
// remote - webpack.dev.js

import HtmlWebpackPlugin from "html-webpack-plugin";
import ModuleFederationPlugin from "webpack/lib/container/ModuleFederationPlugin.js";
import { createRemoteConfiguration } from "wmfnext-remote-loader/createModuleFederationConfiguration.js";
import path from "path";
import url from "url";
import packageJson from "./package.json" assert { type: "json" };

// "__dirname" is specific to CommonJS: https://flaviocopes.com/fix-dirname-not-defined-es-module-scope/
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import("webpack").Configuration} */
export default {
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
                // https://stackoverflow.com/questions/69427025/programmatic-webpack
                // -jest-esm-cant-resolve-module-without-js-file-exten
                test: /\.js/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                test: /\.(css)$/,
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
        new ModuleFederationPlugin(createRemoteConfiguration("remote1", packageJson)),
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        })
    ]
};
```

> **Note**
>
> The previous Webpack configuration is for *development only* and implies that the project is using TypeScript and transpile directly with the `tsc` CLI.
>
> As the project is configured to use [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) by default, this example is using ESM syntax instead of [CommonJS](https://en.wikipedia.org/wiki/CommonJS) which is what most are used to. If you're Webpack file use CommonJS, import the `wmfnext-remote-loader/createModuleFederationConfiguration.cjs` file instead.
>
> ```js
> require("wmfnext-remote-loader/createModuleFederationConfiguration.cjs");
> ```

Again, you probably noticed that the [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin) is configured with the output of the  `createRemoteConfiguration()` function. The function has an identical signature as the `createHostConfiguration()` function described in the previous section and serve the same purpose, e.g. gentle the configuration of the plugin and ensure the shell conventions are followed.

> The shell conventions are quite simple, there's only one! A remote module using the shell, must configure `ModuleFederationPlugin` with:
>
> ```js
> {
>    filename: "remoteEntry.js",
>    exposes: {
>        "./register": "./src/register"
>    }
> }
> ```

👉 As the [HtmlWebpackPlugin](https://webpack.js.org/plugins/html-webpack-plugin) is used, a `public` folder with an `index.html` file must also be added at the root of the application.

```
remote-app
├── public
├─────index.html
├── App.tsx
├── bootstrap.tsx
└── index.ts
```

```html
// remote - index.html

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

Now, as stated previously, this shell add an opinionated layer on top of [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) dependencies sharing mecanism. Our take is that remote modules should not share standalone components but rather strictly sharing modules representing an whole sub domains of the application.

Remember earlier when we told that by convention a remote module must expose a `register.js` file?

At bootstrap, it's this file which will act as the remote module entry point, e.g. it will be loaded and called by the host application with all the shared stuff as parameters.

👉 So, let's create a `register.js` file at the root of the remote module application.

```
remote-app
├── public
├─────index.html
├── App.tsx
├── bootstrap.tsx
└── index.ts
└── register.js
```

```tsx
// remote - register.js

import { ModuleRegisterFunction } from "wmfnext-shell";

export const register: ModuleRegisterFunction = (runtime, { context }) => {
    runtime.logger.log("Remote 1 registered", context);
};
```

For now we won't register anything, we'll use the `runtime` to log something in the console.

At this point, if you start both the host application and the remote application, you should see the following logs in the host application if you open dev tools:

```bash
consoleLogger.js:16 Loading module "./register" from container "remote1" of remote "http://localhost:8081/remoteEntry.js"
consoleLogger.js:16 Registering module "./register" from container "remote1" of remote "http://localhost:8081/remoteEntry.js"
consoleLogger.js:22 Remote 1 registered
```

### Registering a module routes

If you completed the previous steps of the walkthrough, you now have a federated application which.... doesn't do much!

To start using routes provided by modules we'll have to make a few changes to the host application first.

👉 We'll start by adding [React Router](https://reactrouter.com/) to the `<App />` component. Any version greater than `6.4` will do as long as the new [createBrowserRouter](https://reactrouter.com/en/main/routers/create-browser-router) function is available.

```tsx
// host - App.tsx

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Home, NotFound } from "./pages";
import { RootLayout } from "./layouts";
import { Loading } from "./components";

export function App() {
    const router = createBrowserRouter([
        {
            path: "/",
            element: <RootLayout />,
            children: [
                {
                    index: true,
                    element: <Home />
                },
                {
                    path: "*",
                    element: <NotFound />
                }
            ]
        }
    ]);

   return (
        <RouterProvider
            router={router}
            fallbackElement={<Loading />}
        />
    );
}
```

You can start the application and you'll have an home page.

👉 But the home page is a local page of the host application, nothing special here! To start rendering remote pages we have a few other additions to make in the `<App />` component and the `bootstrap.tsx` file.

```tsx
// host - App.tsx

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Home, NotFound } from "./pages";
import { RootLayout } from "./layouts";
import { Loading } from "./components";

export function App() {
    const moduleRoutes = useModuleRoutes();

    const router = useMemo(() => {
        return createBrowserRouter([
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    ...moduleRoutes,
                    {
                        path: "*",
                        element: <NotFound />
                    }
                ]
            }
        ]);
    }, [moduleRoutes]);

   return (
        <RouterProvider
            router={router}
            fallbackElement={<Loading />}
        />
    );
}
```

```tsx
// host - bootstrap.tsx

const Remotes: RemoteDefinition[] = [
    {
        url: "http://localhost:8081",
        name: "remote1"
    }
];

const runtime = new ShellRuntime({
    loggers: [new ConsoleLogger()]
});

// Register host application page routes.
runtime.registerRoutes([
    {
        index: true,
        element: <Home />
    }
]);

registerRemoteModules(Remotes, runtime).then((errors: RemoteModuleRegistratorError[]) => {
    if (errors.length > 0) {
        runtime.logger.error("Errors occured during remotes registration: ", errors);
    }
});

const root = createRoot(document.getElementById("root"));

root.render(
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

By using the `useModuleRoutes()` hook you'll get access to all the modules routes registered in the runtime. By passing those routes to the router, they will be rendered in the host application router.

The host application could still register it's routes directly in the router configuration but it's convenient to move all routes registration to `runtime.registerRoutes()` as all the routes will be registered through the same entry point.

The `runtime.registerRoutes()` function support the same syntax and options as React Router [createBrowserRouter()](https://reactrouter.com/en/main/routers/create-browser-router) `RouteObject`. Please have a look at the library documentation to find out about the options.

👉 Now that the host application is ready to render modules routes, let's update the remote application to register some routes! To do so, open the `register.ts` file and add routes by using the `runtime.registerRoutes()` function (you could also use `runtime.registerRoute()` if you prefer).

```tsx
// remote - register.ts

import type { ModuleRegisterFunction, Runtime } from "wmfnext-shell";
import { Page1, Page2 } from "./pages";

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        {
            path: "remote1/page-1",
            element: <Page1 />
        },
        {
            path: "remote1/page-2",
            element: <Page2 />
        }
    ]);
};
```

👉 Next update your host application root layout to link to those remote module routes.

```tsx
// host - RootLayout.tsx

import { Link, Outlet } from "react-router-dom";

import { Loading } from "../components";
import { Suspense } from "react";

export function RootLayout() {
    return (
        <div>
            <nav>
                <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="remote1/page-1">Remote1/Page1</Link></li>
                    <li><Link to="remote1/page-2">Remote1/Page2</Link></li>
                </ul>
            </nav>
            <Suspense fallback={<Loading />}>
                <Outlet />
            </Suspense>
        </div>
    );
}
```

Start both applications and try navigating between local and remote pages.

You'll probably notice that the remote pages goes to the 404 pages! What's going on?!?!

### Rerender the application after modules registration 

The problem is that the application finish rendering *BEFORE* the remote module is registered. Therefore, the React Router is rendered with only the host application pages.

To fix this issue, we have to re-render the application once all the modules are registered.

> This issue will only occurs with remote modules loaded at runtime. When using module from packages at build time, it's not an issue at all.

To help with that, the shell provide a `useRerenderOnceRemotesRegistrationCompleted()` but sadly, the solution also involve a little bit of custom code.

👉 First, update the host application `<App />` component to add the `useRerenderOnceRemotesRegistrationCompleted()` hook. We'll also display a loading message while the remote modules register.

```tsx
// host - App.tsx

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Home, NotFound } from "./pages";
import { RootLayout } from "./layouts";
import { Loading } from "./components";
import { useRerenderOnceRemotesRegistrationCompleted } from "wmfnext-remote-loader";
import { useModuleRoutes } from "wmfnext-shell";

export function App() {
    useRerenderOnceRemotesRegistrationCompleted(() => window.__is_registered__);

    const moduleRoutes = useModuleRoutes(runtime);

    const router = useMemo(() => {
        return createBrowserRouter([
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    ...moduleRoutes,
                    {
                        path: "*",
                        element: <NotFound />
                    }
                ]
            }
        ]);
    }, [moduleRoutes]);

    if (!window.__is_registered__) {
        return <Loading />;
    }

   return (
        <RouterProvider
            router={router}
            fallbackElement={<Loading />}
        />
    );
}
```

What is that `window.__is_registered__` thing?

Since the module registration occurs in the `bootstrap.tsx` file (because of the "async boundary"), we have to share a completion status between the `boostrap.tsx` file and the `<App />` component, that's `window.__is_registered__` purpose.

👉 To conclude the routing section, set `window.__is_registered__` state in the `bootstrap.tsx` file.

```tsx
// host - bootstrap.tsx

import { ConsoleLogger, RuntimeContext, ShellRuntime } from "wmfnext-shell";
import type { RemoteDefinition, RemoteModuleRegistratorError } from "wmfnext-remote-loader";

import { App } from "./App";
import { Home } from "./pages";
import { RegistrationStatus } from "./registrationStatus";
import { createRoot } from "react-dom/client";
import { registerRemoteModules } from "wmfnext-remote-loader";

const Remotes: RemoteDefinition[] = [
    {
        url: "http://localhost:8081",
        name: "remote1"
    }
];

const runtime = new ShellRuntime({
    loggers: [new ConsoleLogger()]
});

// Register host application page routes.
runtime.registerRoutes([
    {
        index: true,
        element: <Home />
    }
]);

window.__registration_state__ = RegistrationStatus.inProgress;

registerRemoteModules(Remotes, runtime).then((errors: RemoteModuleRegistratorError[]) => {
    if (errors.length > 0) {
        runtime.logger.error("Errors occured during remotes registration: ", errors);
    }

    window.__registration_state__ = RegistrationStatus.completed;
});

const root = createRoot(document.getElementById("root"));

root.render(
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

Now you can start both applications again and try navigating between local and remote pages, everything should work.

### Override root layout from a module

### Registering a module navigation items

That's pretty cool, we have a federated application displaying pages from remote modules.

Still, a module team is not yet fully autonomous as the pages urls are hardcoded in the host application.

### Configuring a local environment to develop a module in isolation

## Full example

## API

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
