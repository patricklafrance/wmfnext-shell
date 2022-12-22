# wmfnext-shell

[Webpack Module Federation](https://webpack.js.org/concepts/module-federation) is a great infrastructure piece to makes sharing code and dependencies between different independant codebases easier. But as is, it's pretty raw as it's a low level mecanism.

This shell aims to add a very thin and opinionated layer on top of Webpack Module Federation to complement the sharing mecanism with additional functionalities. Those functionalities will gentle the adoption of a federated application architecture and provide an opinionated direction on how to implement a federated application.

The idea behind this shell is to have an host application responsible of loading modules and providing shared functionalities like routing, messaging and logging. With this shell, a module is considered as an independent codebase which should usually match a specific sub domain of the application. At bootstrap, the host application loads the modules and call a registration function for each of them with shared functionalities and a customazible context. During the registration phase, each module dynamically *register it's routes and navigation links* while also saving a reference on shared functionality services and other values provided through the context.

We recommend to aim for remote hosted modules loaded at runtime as it enables your teams to be fully autonomous by deploying their module independently from the other pieces of the application. Still, sometimes teams might want to gradually migrate toward this type of architecture and would prefer to extract sub domains into independent packages in a monorepos setup before going all-in with a runtime micro-frontends architecture. That's why, this shell also support loading modules from packages at build time. Dual bootstrapping setup is also supported, meaning an application could load a few remote hosted modules loaded at runtime while also loading a few other modules from packages at build time.

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
- Failure isolation
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

## Usage

> If you'll prefer to skip this walkthrought and jump right into it, go directly to the [full example section](#full-example) or the [API section](#api).

To use this shell, you must create projects for an host application and a module application. In this example, since we'll load a remote modules at runtime with [Webpack Module Federation](https://webpack.js.org/concepts/module-federation), we'll called them "host" and "remote".

### Host application

> A full host example is available in the Github repository [wmfnext-host](https://github.com/patricklafrance/wmfnext-host).

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

> We need this extra layer of indirection because it gives Webpack a chance to load all of the imports it needs to render the remote app.
> Otherwise, you would see an error.
>
> If you're not using any remote modules loaded at runtime with Webpack Module Federation you might not need to use a `bootstrap.tsx` file.

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
// host - webpack.cjs

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
                // https://stackoverflow.com/questions/69427025/programmatic-webpack-jest-esm-cant-resolve-module-without-js-file-exten
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
        new ModuleFederationPlugin({
            name: "host",
            shared: {
                "react": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the remote configuration.
                    requiredVersion: "REACT_VERSION"
                },
                "react-dom": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the remote configuration.
                    requiredVersion: "REACT_DOM_VERSION"
                },
                "react-router-dom": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the remote configuration.
                    requiredVersion: "REACT_ROUTER_DOM_VERSION"
                },
                "wmfnext-shell": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the remote configuration.
                    requiredVersion: "WMFNEXT_SHELL_VERSION"
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

👉 As the [HtmlWebpackPlugin](https://webpack.js.org/plugins/html-webpack-plugin) is used, a `public` folder and with an `index.html` file must also be added at the root of the application.

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
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

> The remote modules must be registered in the `bootstrap.ts` file rather than the `App.tsx` file otherwise it will not work.

You can start the host application and make sure everything compile. Even though the remote application is not available, the host application will gracefully render with what is currently available, meaning only the host application for the moment.

### Remote application

> A full host example is available in the Github repository [wmfnext-remote-1](https://github.com/patricklafrance/wmfnext-remote-1).

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

> We need this extra layer of indirection because it gives Webpack a chance to load all of the imports it needs to render the remote app.
> Otherwise, you would see an error.

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
                    requiredVersion: "REACT_VERSION"
                },
                "react-dom": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the host configuration.
                    requiredVersion: "REACT_DOM_VERSION"
                },
                "react-router-dom": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the host configuration.
                    requiredVersion: "REACT_ROUTER_DOM_VERSION"
                },
                "wmfnext-shell": {
                    singleton: true,
                    // IMPORTANT: Make sure this version match the version specified in the remote configuration.
                    requiredVersion: "WMFNEXT_SHELL_VERSION"
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

👉 As the [HtmlWebpackPlugin](https://webpack.js.org/plugins/html-webpack-plugin) is used, a `public` folder and with an `index.html` file must also be added at the root of the application.

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

Now, as stated previously, this shell add an opinionated layer on top of [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) dependencies sharing mecanism. Our take is that remote modules should not strictly share standalone components but rather share modules which represents whole sub domains of the application.

Remember earlier when we told the `ModuleFederationPlugin` to expose a `register.js` file?

It's this file which will receive the host and runtime and register the remote module pages and navigation items.

👉 So, let's create a `register.js` file at the root of the application.

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
    runtime.logInformation("Remote 1 registered", context);
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

👉 We'll start by adding [React Router](https://reactrouter.com/) to the `<App />` component first. Any version greater than `6.4` will do as long as the new [createBrowserRouter](https://reactrouter.com/en/main/routers/create-browser-router) router is available.

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
    const runtime = useRuntime();
    const federatedRoutes = useFederatedRoutes(runtime);

    const router = useMemo(() => {
        return createBrowserRouter([
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    ...federatedRoutes,
                    {
                        path: "*",
                        element: <NotFound />
                    }
                ]
            }
        ]);
    }, [federatedRoutes]);

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
        runtime.logError("Errors occured during remotes registration: ", errors);
    }
});

const root = createRoot(document.getElementById("root"));

root.render(
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

By using the `useFederatedRoutes()` hook we get access to all the modules routes registered in the runtime. By passing those routes to the router, they will be available in the host application.

Since the `useFederatedRoutes()` hook ensure that the routes are rendered in isolation, meaning, they can't break the whole application, we now configure the home page route with `runtime.registerRoutes()` in the `boostrap.tsx` file rather than directly in the router configuration to benefit from this isolation feature.

The `runtime.registerRoutes()` function support the same syntax and options as React Router [createBrowserRouter](https://reactrouter.com/en/main/routers/create-browser-router) RouteObject. Please have a look at the library documentation to find out about the options.

👉 As mentionned earlier, federated routes retrieved from `useFederatedRoutes()` are isolated by default. To do so, the shell provide a default `errorElement` to every route which doesn't have one. You can override the default `errorElement` by providing a custom one on the route definition or provide a global one when calling `useFederatedRoutes()`.

```tsx
const federatedRoutes = useFederatedRoutes(runtime, { errorElement: CustomErrorElement });
```

👉 Now that the host application is ready to render modules routes, let's update the remote application to register some routes! To do so, open the `register.ts` file and add route by using the `runtime.registerRoutes()` function.

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

The problem is that the application finish rendering *BEFORE* the remote module is registered. Therefore, the React Router is rendered with only the host application pages.

To fix the issue, we have to re-render the application once all the modules are registered.

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

export function App() {
    useRerenderOnceRemotesRegistrationCompleted(() => window.__is_registered__);

    const runtime = useRuntime();
    const federatedRoutes = useFederatedRoutes(runtime);

    const router = useMemo(() => {
        return createBrowserRouter([
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    ...federatedRoutes,
                    {
                        path: "*",
                        element: <NotFound />
                    }
                ]
            }
        ]);
    }, [federatedRoutes]);

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

Since the module registration occurs in the `bootstrap.tsx` file (that's a limitation specific to Webpack Module Federation), we need a way to share a completion status between the `boostrap.tsx` file and the `<App />` component, that's `window.__is_registered__` purpose.

👉 To conclude our routing section, we have to update the `bootstrap.tsx` file with the `window.__is_registered__` state.

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
        runtime.logError("Errors occured during remotes registration: ", errors);
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

### Override root layout from a module

### Registering a module navigation items

That's pretty cool, we have a federated application displaying remote pages from modules.

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
