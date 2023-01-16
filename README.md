# wmfnext-shell

> **Warning**
>
> This repository will not be maintained as it's purpose is to inspire teams by showcasing how a SPA federated application could be build on top of [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) and [React Router](https://reactrouter.com/).

[Webpack Module Federation](https://webpack.js.org/concepts/module-federation) is a great infrastructure piece to makes sharing code and dependencies between different independant codebases easier. But as is, it's pretty raw as it's a low level mecanism.

This shell aims to add a very thin and opinionated layer on top of Webpack Module Federation and [React Router](https://reactrouter.com/) to complement the federation mecanism with additional functionalities. Those functionalities will gentle the adoption of a federated application architecture and provide an opinionated direction on how to implement a federated SPA application.

The idea behind this shell is to have an host application responsible of loading modules and providing shared functionalities like routing, messaging and logging. With this shell, a module is considered as an independent codebase which should usually match a specific sub domain of the application. At bootstrap, the host application loads the modules and call a registration function for each of them with shared functionalities and a customazible context. During the registration phase, each module dynamically *register it's routes and navigation links*. Then, pages and components of a module can use the provided hooks to access shared functionalities.

We recommend to aim for remote hosted modules loaded at runtime as it enables your teams to be fully autonomous by deploying their module independently from the other pieces of the application. Still, sometimes teams might want to gradually migrate toward this type of architecture and would prefer to extract sub domains into independent modules in a mololithic way before fully committing to independent modules and autonomous teams. To accomodate different migration solutions, this shell also support loading modules from a static registration function at build time. The functions could come from a independent packages in a monorepos setup or could even come from a subdomain folder of a modular application. A dual bootstrapping setup is also supported, meaning an application could load a few remote hosted modules at runtime while also loading a few other modules at build time.

- [Features](#features)
- [Examples](#examples)
- [Installation](#installation)
- [Usage](#usage)
    - [Setup an host application](#setup-an-host-application)
    - [Setup a remote application](#setup-a-remote-application)
    - [Register a module routes](#register-a-module-routes)
    - [Re-render the host application after remote modules registration](#re-render-the-host-application-after-remote-modules-registration)
    - [Setup a static module application](#setup-a-static-module-application)
    - [Register a module dynamic navigation items](#register-a-module-dynamic-navigation-items)
    - [Isolate module failures](#isolate-module-failures)
    - [Override the host layout for a module page](#override-the-host-layout-for-a-module-page)
    - [Share a user session](#share-a-user-session)
    - [Use the event bus](#use-the-event-bus)
    - [Share a custom service](#share-a-custom-service)
    - [Use a custom logger](#use-a-custom-logger)
    - [Fetch data](#fetch-data)
- [API](#api)
- [Contributors](./CONTRIBUTING.md)

## Features

This federated application shell include the following features:

- Loading of hosted remote modules at runtime
- Loading of modules from a static function at build time
- Routing & navigation
- Share a user session
- Cross application messaging
- Logging
- Stubs to develop an independent module in isolation

## Examples

For examples of applications using this shell, have a look at the [wmfnext-host](https://github.com/patricklafrance/wmfnext-host) repository for a sample host application + a static module example and have a look at the [wmfnext-remote-1](https://github.com/patricklafrance/wmfnext-remote-1) repository for a sample remote module.

## Installation

To install the packages, [open a terminal in VSCode](https://code.visualstudio.com/docs/editor/integrated-terminal#_managing-multiple-terminals) and execute the following command at the root of the host and modules projects workspace:

```bash
yarn add wmfnext-shell
```

If you wish to include remote modules at runtime using [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) also execute the following command at the root of the host and modules projects workspace:

```bash
yarn add wmfnext-remote-loader
```

Once, installed, we recommend that you configure your projects to use [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) by default. To do so, open the `package.json` file of the project and add the root property `"type": "module"`:

```json
{
    "type": "module"
}
```

## Usage

> **Warning**
>
> While going through this tutorial, keep in mind that some parts of the application has ben intentionally left out from code samples to emphasis on the more important one's.
>
> For a complete example, or, if you prefer to skip this walkthrough and jump right into it have a look at the [wmfnext-host](https://github.com/patricklafrance/wmfnext-host) and [wmfnext-remote-1](https://github.com/patricklafrance/wmfnext-remote-1) repositories or the [API documentation](#api).

To use this shell, you must create projects for an host application and at least one module application. In this tutorial, we'll first load a remote module at runtime with [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) then, we'll load a static package module at build time.

### Setup an host application

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

> This indirection is called an "async boundary" and is needed so Webpack can load all the remote modules and their dependencies before rendering the host
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

At this point, you should be able to start your React application and see __Hello world!__

Now, let's assume that you want to load a remote module at runtime with [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) (make sure you installed `wmfnext-remote-loader` dependency).

👉 The first thing to do is to configure Webpack and add [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin).

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
        // You only need to setup the ModuleFederationPlugin plugin if you want to load remote modules at runtime.
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
> As the project is configured to use [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) by default, this example is using ESM syntax instead of [CommonJS](https://en.wikipedia.org/wiki/CommonJS) which is what most developpers are used to. If you're Webpack file use CommonJS, import the `wmfnext-remote-loader/createModuleFederationConfiguration.cjs` file instead.
>
> ```js
> require("wmfnext-remote-loader/createModuleFederationConfiguration.cjs");
> ```

You probably noticed that the [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin) is configured with the output of the  `createHostConfiguration()` function.

This is an utility function provided by the shell to gentle the configuration of the plugin and ensure the shell conventions are followed. The `createHostConfiguration` function accept as it's first parameter the name of the module and a `package.json` module. At build time, the function will look into the provided `package.json` module for the version of the dependencies which are shared by default by the shell and any additional shared dependencies provided by the caller for which the version is not specified.

> Dependencies shared by default are libraries like [react](https://reactjs.org/), react-dom, [react-router](https://reactrouter.com/) and the shell itself.

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
<!-- host - index.html -->

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
import type { RemoteDefinition } from "wmfnext-remote-loader";
import { App } from "./App";
import { createRoot } from "react-dom/client";
import { registerRemoteModules } from "wmfnext-remote-loader";

// Instanciate a runtime instance that will be shared among the host and the modules. The runtime contains common functionalities such as routing and navigation services.
const runtime = new ShellRuntime({
    // By default, the shell comes with a basic console logger. Custom logger can be implemented by implementing the Logger interface.
    loggers: [new ConsoleLogger()]
});

const Remotes: RemoteDefinition[] = [
    {
        url: "http://localhost:8081",
        // Have to match the name defined in the remote application Webpack configuration that we'll define later.
        name: "remote1"
    }
];

// Load and register the remote modules at runtime.
registerRemoteModules(Remotes, runtime);

const root = createRoot(document.getElementById("root"));

root.render(
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

> The remote modules must be registered in the `bootstrap.ts` file rather than the `App.tsx` file otherwise the registration will be outside of the remote boundary and it will not work.

The `registerRemoteModules()` function accept an array of remote modules and takes care of registering the modules asynchronously. Errors are automatically logged into the runtime logger but you can optionally handle them if needed or even use the resolved promise execute additional code. Registration errors are not rejected as failing to register a remote module isn't considered as a fatal error.

```js
import { RegistrationError } from "wmfnext-remote-loader";

registerRemoteModules(Remotes, runtime).then((errors: RegistrationError[]) => {
    if (errors.length > 0) {
        runtime.logger.error("Errors occured during remotes registration: ", errors);
    } else {
        runtime.logger.debug("All remotes module are registered");
    }
});
```

> The `registerRemoteModules()` function can only be called once.

👉 Start the host application and make sure everything compile. Even though the remote application is not available, the host application will gracefully render with what is currently available, meaning only the host application at the moment.

### Setup a remote application

> A remote application example is available in the Github repository [wmfnext-remote-1](https://github.com/patricklafrance/wmfnext-remote-1).

It's time to create our first remote module! We'll use a file structure similar to what was used for the host application.

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
// remote-1 - App.tsx

export function App() {
    return (
        <div>Hello from remote!</div>
    );
}
```

👉 Then, create an `index.ts` file which will strictly contain a dynamic import to the `bootstrap.tsx` file.

> An "async boundary" is also needed here to let Webpack negotiate the shared dependencies with the host application. Additional information is available [here](https://dev.to/infoxicator/module-federation-shared-api-ach#using-an-async-boundary).

```ts
// remote-1 - index.ts

import("./bootstrap");
```

👉 Next, create a `bootstrap.tsx` file to render the React application.

```tsx
// remote-1 - bootstrap.tsx

import { App } from "./App";
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root"));

root.render(
    <App />
);
```

👉 And configure Webpack to use [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin).

```js
// remote-1 - webpack.dev.js

import HtmlWebpackPlugin from "html-webpack-plugin";
import ModuleFederationPlugin from "webpack/lib/container/ModuleFederationPlugin.js";
import { createRemoteConfiguration } from "wmfnext-remote-loader/createModuleFederationConfiguration.js";
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

> The shell conventions are quite simple, there's only one... A remote module must configure `ModuleFederationPlugin` with:
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
<!-- remote-1 - index.html -->

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

Now, as stated previously, this shell add an opinionated layer on top of [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) dependencies sharing mecanism. Our take is that remote modules should not share standalone components but rather strictly share an whole sub domains of the application.

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
// remote-1 - register.js

import { ModuleRegisterFunction } from "wmfnext-shell";

export const register: ModuleRegisterFunction = (runtime, { context }) => {
    runtime.logger.log("Remote 1 registered", context);
};
```

For now we won't register anything, we'll use the `runtime` to log something in the console.

At this point, if you start both the host application and the remote application, you should see similar logs in the host application if you open dev tools:

```bash
[shell] Found 1 remote modules to register
[shell] 1/1 Loading module "./register" from container "remote1" of remote "http://localhost:8081/remoteEntry.js"
[shell] 1/1 Registering module "./register" from container "remote1" of remote "http://localhost:8081/remoteEntry.js"
Remote 1 registered
[shell] 1/1 container "remote1" of remote "http://localhost:8081/remoteEntry.js" registration completed"
```

### Register a module routes

If you completed the previous steps of the walkthrough, you now have a federated application which.... doesn't do much!

To start using routes provided by modules we'll have to make a few changes to the host application first.

👉 We'll start by adding [React Router](https://reactrouter.com/) to the `<App />` component. Any version greater than `6.4` will do as long as the new [createBrowserRouter](https://reactrouter.com/en/main/routers/create-browser-router) function is available.

```tsx
// host - App.tsx

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layouts";
import { Loading } from "./components";
import { lazy } from "react";

const HomePage = lazy(() => import("./pages/Home"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

export function App() {
    const router = createBrowserRouter([
        {
            path: "/",
            element: <RootLayout />,
            children: [
                {
                    index: true,
                    element: <HomePage />
                }
            ]
        },
        {
            path: "*",
            element: <NotFoundPage />
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
import { RootLayout } from "./layouts";
import { Loading } from "./components";
import { useRoutes } from "wmfnext-shell";
import { lazy } from "react";

const HomePage = lazy(() => import("./pages/Home"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

export function App() {
    // Retrieve the modules routes.
    const routes = useRoutes();

    const router = useMemo(() => {
        return createBrowserRouter([
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    {
                        index: true,
                        element: <HomePage />
                    },
                    // Add the retrieved modules routes to the router.
                    ...routes
                ]
            },
            {
                path: "*",
                element: <NotFoundPage />
            }
        ]);
    }, [routes]);

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

import { ConsoleLogger, RuntimeContext, ShellRuntime } from "wmfnext-shell";
import type { RemoteDefinition } from "wmfnext-remote-loader";
import { App } from "./App";
import { createRoot } from "react-dom/client";
import { lazy } from "react";
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

registerRemoteModules(Remotes, runtime);

const root = createRoot(document.getElementById("root"));

root.render(
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

By using the `useRoutes()` hook we'll get access to the modules routes registered in the runtime at bootstrap. By passing those routes to the router, they will be rendered in the host application.

The `runtime.registerRoutes()` function support the same syntax and options as React Router [createBrowserRouter()](https://reactrouter.com/en/main/routers/create-browser-router) `RouteObject`. Have a look at the [React Router documentation](https://reactrouter.com/en/main/route/route#type-declaration) to find out about the options.

👉 Now that the host application is ready to render modules routes, let's update the remote application to register some routes! To do so, open the `register.ts` file of the remote application and add routes by using the `runtime.registerRoutes()` function (you could also use `runtime.registerRoute()`).

```tsx
// remote-1 - register.ts

import type { ModuleRegisterFunction, Runtime } from "wmfnext-shell";
import { lazy } from "react";

const Page1 = lazy(() => import("./pages/Page1"));
const Page2 = lazy(() => import("./pages/Page2"));

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

```tsx
// host - App.tsx

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layouts";
import { Loading } from "./components";
import { lazy } from "react";

const HomePage = lazy(() => import("./pages/NotFound"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

export function App() {
    const routes = useRoutes();

    const router = createBrowserRouter([
        {
            path: "/",
            element: <RootLayout />,
            children: [
                {
                    index: true,
                    element: <HomePage />
                },
                ...routes
            ]
        },
        {
            path: "*",
            element: <NotFoundPage />
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

👉 Next update the host application root layout to add links to those newly registered remote module routes.

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

Start both applications and try navigating to the remote pages.

You probably noticed that you are redirected to the 404 page! What's going on?!

### Re-render the host application after remote modules registration

> **Note**
>
> You might not need this if your host application is using a technology like Redux and you update the store once the bootstrapping is completed.

The issue is that the host application finish rendering **before** the remote module is registered. Therefore, only the host application routes are rendered.

To fix this, we have to re-render the host application once the remote module is registered.

> It's only problematic with remote modules registered at runtime. When strictly using modules registered at build time, it's not an issue and you don't need to add the following code.

To help with that, the shell provide a `useAreRemotesReady()` hook. The `useAreRemotesReady()` hook will take care of re-rerendering the app once the remote modules registration is completed. The function will also return a boolean indicating if the remotes are ready. This is is quite useful as you probably don't want to show a blank page to your users while the remote modules are registering.

👉 First, update the host application `<App />` by adding the `useAreRemotesReady()` hook. Then, add code to display a loading message while the remote modules register.

```tsx
// host - App.tsx

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layouts";
import { Loading } from "./components";
import { useAreRemotesReady } from "wmfnext-remote-loader";
import { useRoutes } from "wmfnext-shell";
import { lazy } from "react";

const HomePage = lazy(() => import("./pages/Home"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

export function App() {
    const isReady = useAreRemotesReady();
    const routes = useRoutes(runtime);

    const router = useMemo(() => {
        return createBrowserRouter([
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    {
                        index: true,
                        element: <HomePage />
                    },
                    ...routes
                ]
            },
            {
                path: "*",
                element: <NotFoundPage />
            }
        ]);
    }, [routes]);

    if (!isReady) {
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

```tsx
// host - bootstrap.tsx

import { ConsoleLogger, RuntimeContext, ShellRuntime } from "wmfnext-shell";
import type { RemoteDefinition } from "wmfnext-remote-loader";
import { App } from "./App";
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

registerRemoteModules(Remotes, runtime);

const root = createRoot(document.getElementById("root"));

root.render(
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

👉 To conclude the routing section, let's move the homepage to the remote module.

```tsx
// host - App.tsx

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layouts";
import { Loading } from "./components";
import { useAreRemotesReady } from "wmfnext-remote-loader";
import { useRoutes } from "wmfnext-shell";
import { lazy } from "react";

const NotFoundPage = lazy(() => import("./pages/NotFound"));

export function App() {
    const isReady = useAreRemotesReady();
    const routes = useRoutes(runtime);

    const router = useMemo(() => {
        // Remove the home page from the host application routes.
        return createBrowserRouter([
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    ...routes
                ]
            },
            {
                path: "*",
                element: <NotFoundPage />
            }
        ]);
    }, [routes]);

    if (!isReady) {
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

```tsx
// host - RootLayout.tsx

import { Link, Outlet } from "react-router-dom";
import { Loading } from "../components";
import { Suspense } from "react";

export function RootLayout() {
    // Remove the home page from the links and update Remote1/Page1 link to "/" as it's now the index route.
    return (
        <div>
            <nav>
                <ul>
                    <li><Link to="/">Remote1/Page1 - Home</Link></li>
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

```tsx
// remote-1 - register.tsx

import type { ModuleRegisterFunction, Runtime } from "wmfnext-shell";
import { lazy } from "react";

const Page1 = lazy(() => import("./pages/Page1"));
const Page2 = lazy(() => import("./pages/Page2"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        {
            // Remove the route path and set the route as the index.
            index: true,
            element: <Page1 />
        },
        {
            path: "remote1/page-2",
            element: <Page2 />
        }
    ]);
};
```

Now you can start both applications again and try navigating between pages, everything should work.

### Setup a static module application

> A static module example is available in the Github repository [wmfnext-host](https://github.com/patricklafrance/wmfnext-host).

As mentionned earlier, the shell also support static modules loaded at build time to accomodate different migration scenarios. Still, keep in mind that we highly recommend to aim for remote hosted modules loaded at runtime as it enables your teams to be fully autonomous by deploying their module independently from the other pieces of the application.

Let's create a static module to see how it's done! 

Those static modules could either come from a sibling project in a monorepos setup or from standalone packages installed in the host application. For this examples, we'll use a sibling project in a monorepos setup with the following structure.

```
packages
├── app (the host application)
├─────src
├───────boostrap.tsx
├─────package.json
├── static-module-1
├─────src
├───────index.ts
├───────register.tsx
├─────package.json
```

👉 First configure the static module `package.json` file to use the `index.js` file as the package entry point and give the module a name and a version. In this example, we'll call it "wmfnext-static-module-1" and set the version as "0.0.1".

```json
{
    "name": "wmfnext-static-module-1",
    "version": "0.0.1",
    "main": "dist/index.js"
}
```

👉 Then export the `register.tsx` file the `index.ts` file.

```ts
// static-1 - index.ts

export * from "./register.tsx";
```

👉 And configure the `register.tsx` file to register a few pages to the shell runtime at bootstrap, similar to what we did for the remote module.

```tsx
// static-1 - register.tsx

import type { ModuleRegisterFunction, Runtime } from "wmfnext-shell";
import { lazy } from "react";

const Page1 = lazy(() => import("./pages/Page1"));
const Page2 = lazy(() => import("./pages/Page2"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        {
            path: "static1/page-1",
            element: <Page1 />
        },
        {
            path: "static1/page-2",
            element: <Page2 />
        }
    ]);
};
```

> Did you noticed that no `boostrap.tsx` file is required this time as it's a static module which doesn't depend on Module Webpack Federation.

👉 Now, let's go back to the host application and register the newly created package as a dependency of the application. Open the host application `package.json` file and add the following dependency.

```json
{
    "dependency": {
        "wmfnext-static-module-1": "file:../static-module-1"
    }
}
```

👉 Next, update the host application `bootstrap.tsx` file to import the register function from the static module package and register the static module at build time.

```tsx
// host - bootstrap.tsx

import { ConsoleLogger, RuntimeContext, ShellRuntime } from "wmfnext-shell";
import type { RemoteDefinition } from "wmfnext-remote-loader";
import { App } from "./App";
import { createRoot } from "react-dom/client";
import { registerRemoteModules } from "wmfnext-remote-loader";
import { register as registerStaticModule1 } from "wmfnext-static-module-1";

const StaticModules = [
    registerStaticModule1
];

const Remotes: RemoteDefinition[] = [
    {
        url: "http://localhost:8081",
        name: "remote1"
    }
];

const runtime = new ShellRuntime({
    loggers: [new ConsoleLogger()]
});

// Register the static modules at build time.
registerStaticModules(StaticModules, runtime);

registerRemoteModules(Remotes, runtime);

const root = createRoot(document.getElementById("root"));

root.render(
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

By calling the `registerStaticModules` function with the static module `register` function, the module routes will be added to the host application router at build time. As the function returns a promise, you can optionally execute code once the static modules are registered. 

```js
registerStaticModules([registerStaticModule1], runtime).then(() => {
    runtime.logger.debug("All static modules registered");
});
```

👉 Lastly, update the host application root layout to add links to those newly registered routes from the static module.

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
                    <li><Link to="/">Static1/Page1 - Home</Link></li>
                    <li><Link to="static1/page-2">Static1/Page2</Link></li>
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

👉 Start all the projects and try navigating to "/static1/page-1" and "static1/page-2".

### Register a module dynamic navigation items

That's pretty cool, we have a federated application displaying pages from a remote module loaded at runtime and a static module registered at build time.

Still, _module teams are not yet fully autonomous_ as the page urls are hardcoded in the host application root layout links. Teams will have to coordinate with each others to make changes to the host application navigation everytime a new page is created within their module or a page navigation information changed.

To help with that and _enable fully autonomous teams_, the shell offer a functionality to let both remote and static modules dynamically register their navigation items at bootstrap. Then, an host application can retrieve and parse those navigation items and render them as link components.

👉 First, update every module `register.tsx` file to add dynamic navigation items.

```tsx
// remote-1 - register.tsx

import type { ModuleRegisterFunction, Runtime } from "wmfnext-shell";
import { lazy } from "react";

const Page1 = lazy(() => import("./pages/Page1"));
const Page2 = lazy(() => import("./pages/Page2"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        {
            index: true,
            element: <Page1 />
        },
        {
            path: "remote1/page-2",
            element: <Page2 />
        }
    ]);

    // Newly added navigation items.
    runtime.registerNavigationItems([
        {
            to: "remote1/page-1",
            content: "Remote1/Page 1 - Home"
        },
        {
            to: "remote1/page-2",
            content: "Remote1/Page 2"
        }
    ]);
};
```

```tsx
// static-1 - register.tsx

import type { ModuleRegisterFunction, Runtime } from "wmfnext-shell";
import { ArchiveIcon } from "./ArchiveIcon";
import { lazy } from "react";

const Page1 = lazy(() => import("./pages/Page1"));
const Page2 = lazy(() => import("./pages/Page2"));
const Page3 = lazy(() => import("./pages/Page3"));
const Page4 = lazy(() => import("./pages/Page4"));
const Page5 = lazy(() => import("./pages/Page5"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        {
            path: "static1/page-1",
            element: <Page1 />
        },
        {
            path: "static1/page-2",
            element: <Page2 />
        },
        {
            path: "static1/page-3",
            element: <Page3 />
        },
        {
            path: "static1/page-4",
            element: <Page4 />
        },
        {
            path: "static1/page-5",
            element: <Page5 />
        }
    ]);

    runtime.registerNavigationItems([
        {
            to: "static1/page-1",
            content: (
                <>
                    <ArchiveIcon />
                    <span>Static1/Page 1 - Navigation item with a React element as content and additional Link props</span>
                </>
            ),
            style: {
                display: "flex",
                alignItems: "center"
            },
            target: "_blank"
        },
        {
            to: "static1/page-2",
            content: "Static1/Page 2 - Navigation item with children",
            children: [
                {
                    to: "static1/page-4",
                    content: "Static1/Page 4 - Child navigation item"
                },
                {
                    to: "static1/page-5",
                    content: "Static1/Page 5 - Child navigation item"
                }
            ]
        },
        {
            to: "static1/page-3",
            content: "Static1/Page 3 - Navigation item with a top priority and custom additional props",
            priority: 99,
            additionalProps: {
                highlight: true
            }
        }
    ]);
};
```

Independent modules can use the `registerNavigationItems()` function to tell the host application which navigation items should be rendered for their pages.

A navigation item must have a `to` and `content` props. The `content` prop can be a `string` value or a `React element`.

Let's focus on the navigation items registered by the static module (_"static-1 - register.tsx"_) as there are many "special" cases shown there.

The first thing to notice is that _"Static1/Page 3"_ as a `priority` prop. The `priority` props allow a module to have a say in the order at which the navigation item will be rendered. The higher the priority, the highest the navigation item will be rendered. Still, the priority will only hint the host application about the module preference. It's up to the host application to choose the final rendering order of the navigation items.

The second thing to notice is that _"Static1/Page 2"_ has a `children` prop containing nested navigation items. A navigation items tree structure can have an infinite number of levels, it's up to you and the host application ability to parse the tree structure correctly. In this example, only 2 levels are configured.

Going back to _"Static1/Page 3"_, you'll see an `additionalProps` prop. This is an untyped bucket allowing you to provide any number of contextual props to use later when rendering the navigation items in the host application.

The last thing to cover in this section are the `style` and `target` props defined for _"Static1/Page 1"_. A navigation items support any props supported by a [React Router Link component](https://reactrouter.com/en/main/components/link), including those 2.

👉 Now, update the host application root layout to render the navigation items registered by the modules.

```tsx
// host - RootLayout.tsx

import "./RootLayout.css";

import { Link, Outlet } from "react-router-dom";
import type { RenderItemFunction, RenderSectionFunction } from "wmfnext-shell";
import { Suspense, useCallback } from "react";
import { useNavigationItems, useRenderedNavigationItems } from "wmfnext-shell";
import { Loading } from "../components";
import type { ReactNode } from "react";
import type { RenderNavigationItem } from "wmfnext-shell";

export function RootLayout() {
    const navigationItems = useNavigationItems();

    const renderItem: RenderItemFunction = useCallback(({ content, linkProps, additionalProps: { highlight, ...additionalProps } }, index, level) => {
        return (
            <li key={`${level}-${index}`} className={highlight && "highlight"}>
                <Link {...linkProps} {...additionalProps}>
                    {content}
                </Link>
            </li>
        );
    }, []);

    const renderSection: RenderSectionFunction = useCallback((itemElements, index, level) => {
        return (
            <ul key={`${level}-${index}`}>
                {itemElements}
            </ul>
        );
    }, []);

    const renderedNavigationItems = useRenderedNavigationItems(navigationItems, renderItem, renderSection);

    return (
        <div>
            <nav className="nav">
                {renderedNavigationItems}
            </nav>
            <Suspense fallback={<Loading />}>
                <Outlet />
            </Suspense>
        </div>
    );
}
```

The `useNavigationItems()` hook return the navigation items as is, meaning you'll still have to recursively parse the tree structure to transform the items into actual React component.

As it's a non trivial process, the shell provide an optional utility hook called `useRenderedNavigationItems()` to help with that.

> If you prefer you can always parse the navigation items tree on your own without using the utility hook.

The `useRenderedNavigationItems()` accept 2 render functions as a second and third parameter. The second parameter is a function to render a single link from a navigation item and the third parameter is a function to render a section of navigation items.

In this example, there are 2 sections. A root section containing all the navigation items, and a nested section containing only _"Static1/Page 4"_ and _"Static1/Page 5"_.

Each render function must return a single `React element`.

Notice that the `renderItem` function receive the `highlight` additional props and use it to render an "highlight" CSS class on the link. This is the kind of usecase those `additionalProps` are for.

👉 Start all the projects and try navigating between pages.

> **Warning**
>
> It's important to provide memoized render functions to the `useRenderedNavigationItems()` hook as otherwise the navigation items will be parsed over and over on re-renders rather than being returned from the cache for the same navigation item tree structure.

### Isolate module failures

One of the key carateristic of micro-frontends implementations like [iframes](https://martinfowler.com/articles/micro-frontends.html#Run-timeIntegrationViaIframes) and subdomains is that a single module failure can't break the whole application. The host application and the other modules will still be fully functional even if one fail with an unmanaged error.

With an implementation such as Webpack Module Federation or even a build time implementation with static modules, this is not the case as all the modules live in the same domain and share the same DOM.

Still, the good news is that with [React Router](https://reactrouter.com/) we can build something which will behave very similarly to iframe failures isolation by leveraging [Outlet](https://reactrouter.com/en/main/components/outlet) and [errorElement](https://reactrouter.com/en/main/route/error-element).

For this example, the host application root layout is already using an `<Outlet />`, therefore all we have to do is to add a nested pathless route with an `errorElement` prop to catch unmanaged errors from modules.

👉 First, let's create an error boundary component in the host application to handle errors.

```tsx
// host - RootErrorBoundary.tsx

import "./RootErrorBoundary.css";

import { isRouteErrorResponse, useLocation, useRouteError } from "react-router-dom";
import { useLogger } from "wmfnext-shell";

function getErrorMessage(error: unknown) {
    if (isRouteErrorResponse(error)) {
        return `${error.status} ${error.statusText}`;
    }

    return error instanceof Error
        ? error.message
        : JSON.stringify(error);
}

export function RootErrorBoundary() {
    const error = useRouteError();
    const location = useLocation();
    const logger = useLogger();

    logger.error(`[shell] An unmanaged error occured while rendering the route with path ${location.pathname}`, error);

    return (
        <p className="error-message">
            An unmanaged error occured insisde a module and other parts of the application are still fully functional!
            <br />
            <span role="img" aria-label="pointer">👉</span> {getErrorMessage(error)}
        </p>
    );
}
```

👉 Next, update the host application router code to add the nested pathless route.

```tsx
// host - App.tsx

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Loading } from "./components";
import { NotFound } from "./pages";
import { RootErrorBoundary, RootLayout } from "./layouts";
import { useMemo } from "react";
import { useAreRemotesReady } from "wmfnext-remote-loader";
import { useRoutes } from "wmfnext-shell";
import { lazy } from "react";

const NotFoundPage = lazy(() => import("./pages/NotFound"));

export function App() {
    const isReady = useAreRemotesReady();
    const routes = useRoutes();

    const router = useMemo(() => {
        return createBrowserRouter([
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    {
                        // Pathless route to set an error boundary inside the layout instead of outside.
                        // It's quite useful to not lose the layout when an unmanaged error occurs.
                        errorElement: <RootErrorBoundary />,
                        children: [
                            ...routes,
                        ]
                    }
                ]
            },
            {
                path: "*",
                element: <NotFoundPage />
            }
        ]);
    }, [routes]);

    if (!isReady) {
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

As the pathless route has been declared under the root route (the one with the the root layout as `element`), when an unmanaged error bubbles up and the error boundary is rendered, only the [Outlet](https://reactrouter.com/en/main/components/outlet) output will be replaced by the error boundary output, meaning other parts of the root layout around the Outlet will still be rendered.

👉 Add a route throwing an error to the remote module.

```tsx
// remote-1 - Page3.tsx

export default function Page3(): JSX.Element {
    throw new Error("Page3 from \"remote-1\" failed to render");
}
```

```tsx
// remote-1 - register.tsx

import type { ModuleRegisterFunction, Runtime } from "wmfnext-shell";
import { lazy } from "react";

const Page3 = lazy(() => import("./pages/Page3"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        ...

        {
            path: "remote1/page-3",
            element: <Page3 />
        }
    ]);

    runtime.registerNavigationItems([
        ...

        {
            to: "remote1/page-3",
            content: "Remote1/Page 3 - Failing page"
        }
    ]);
};
```

👉 Start all the projects and navigate to _"Remote1/Page 3"_. The page will throw but the application should still be functional.

> **Warning**
>
> If your application support hoisted module routes (view the next section "[override the host layout for a module page](#override-the-host-layout-for-a-module-page)" for more information), failures isolation might not behave as explained in this section because hoisted routes will be rendered outside the host application error boundary. 
>
> To ensure strict failures isolation, an host application can either choose to not support hoisted module routes by not using the `useHoistedRoutes()` hook or restrict routes allowed to use hoisting with the `allowedPaths` option of the `useHoistedRoutes()` hook.

### Override the host layout for a module page

For most pages of an application, developpers tend to share a default layout having at least a navigation menu and an authenticated user avatar. 

This default layout is what will then be defined as the "root" layout of the application and be used by default. This concept is usually also true for federated applications. This is in fact exactly what we've done so far for the host application of this tutorial (minus the authenticated user avatar, which will come later on 😃).

Still, having a single shared layout for every module pages isn't always possible as there are use cases for which the default layout will not work. For example, a module might include a login page, or any other pages which are not bound to a user session. 

For those pages, the shell provide a mecanism called "page hoisting". Contrary to a regular page rendered under the root layout of the host application, an hoisted page will be rendered at the root of the router, meaning outside the boundaries of the host application root layout.

By doing so, the module is in full control of the hoisted page layout.

> **Note**
>
> As explained in the previous section "[isolate module failures](isole-module-failures)", by declaring a page as hoisted, the page will not be protected from failures anymore by the host application error boundary and could crash the application if an unmanaged error occurs. This is highly recommended that every hoisted page is assigned a React Router [errorElement](https://reactrouter.com/en/main/route/error-element) prop.

To define a module page as hoisted, set the page definition `hoist` prop as `true` during registration.

👉 Now, let's hoist a few pages of the remote module.

```tsx
// remote-1 - register.tsx

import type { ModuleRegisterFunction, Runtime } from "wmfnext-shell";
import { ErrorBoundary } from "./ErrorBoundary";
import { lazy } from "react";

const FullLayout = lazy(() => import("./layouts/FullPageLayout"));

const Page1 = lazy(() => import("./pages/Page1"));
const Page2 = lazy(() => import("./pages/Page2"));
const Page3 = lazy(() => import("./pages/Page3"));
const Page4 = lazy(() => import("./pages/Page4"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        ...

        {
            // By setting "hoist: true", the page is now hoisted.
            hoist: true,
            path: "remote1/page-2",
            element: <FullLayout />,
            errorElement: <ErrorBoundary />,
            children: [
                {
                    element: <Page2 />
                }
            ]
        },

        ...

        {
            hoist: true,
            path: "remote1/page-4",
            element: <Page4 />,
            errorElement: <ErrorBoundary />
        }
    ]);

    runtime.registerNavigationItems([
        ...

        {
            to: "remote1/page-2",
            content: "Remote1/Page 2 - Overrided layout"
        },

        ...

        {
            to: "remote1/page-4",
            content: "Remote1/Page 4 - Hoisted route"
        }
    ]);
};
```

By setting the `hoist` prop to `true` for page _"Remote1/Page 2"_ we tell the shell to render the page at the root of the router rather than under the root layout. 

Now that the page is not rendered anymore within the root layout of the host application, we can set a custom layout to _"Remote1/Page 2"_ the same way it's usually done with React Router, e.g. with [nested routes](https://reactrouter.com/en/main/start/overview#nested-routes) and an [Outlet](https://reactrouter.com/en/main/components/outlet) component.

Have you noticed that the _"Remote1/Page 4"_ page is also hoisted? An hoisted page doesn't have to be assigned a custom layout, it can be rendered on it's own!

👉 To test the changes, start all the projects and navigate to _"Remote1/Page 2"_ and _"Remote1/Page 4"_. You should still see the root layout of the host application for both pages. What's going on?

By default, the shell doesn't support page hoisting. To support page hoisting, the module routes must go through the `useHoistedRoutes()` hook before being passed down to the router.

👉 Update the host application by adding the `useHoistedRoutes()` hook.

```tsx
// host - App.tsx

import { Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import { lazy, useCallback, useMemo } from "react";
import { useHoistedRoutes, useRoutes } from "wmfnext-shell";
import { Loading } from "./components";
import { RootErrorBoundary, RootLayout } from "./layouts";
import { useAreRemotesReady } from "wmfnext-remote-loader";

const NotFoundPage = lazy(() => import("./pages/NotFound"));

export function App() {
    const isReady = useAreRemotesReady();
    const routes = useRoutes();

    const wrapManagedRoutes = useCallback(managedRoutes => {
        return {
            path: "/",
            element: <RootLayout />,
            children: [
                {
                    // Pathless route to set an error boundary inside the layout instead of outside.
                    // It's quite useful to not lose the layout when an unmanaged error occurs.
                    errorElement: <RootErrorBoundary />,
                    children: [
                        ...managedRoutes
                    ]
                }
            ]
        };
    }, []);

    // Using the useHoistedRoutes hook allow routes hoisted by modules to be rendered at the root of the router.
    // To disallow the hoisting functionality, do not use this hook.
    const hoistedRoutes = useHoistedRoutes(routes, {
        wrapManagedRoutes
    });

    const router = useMemo(() => {
        return createBrowserRouter([
            ...hoistedRoutes,
            {
                path: "*",
                element: <NotFoundPage />
            }
        ]);
    }, [hoistedRoutes]);

    if (!isReady) {
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

Notice that a `wrapManagedRoutes` option is provided to the `useHoistedRoutes()` hook. This is an optional function which allow the caller to nested the "non hoisted" routes under a "root" route. In this example, the `wrapManagedRoutes` option is used to wrap all the modules managed routes under a root layout and a root error boundary.

> It's important to provide a memoized function for the `wrapManagedRoutes` option as otherwise, the hoisting operation would be done over and over instead of using the cache.

It's been mentionned in a previous section that an host application could restrict page hoisting to specific routes. To do so, pass an array of route paths to the `allowedPaths` option of the `useHoistedRoutes()` hook. Any pages with a path which is not included in the array will generate an exception.

```tsx
const hoistedRoutes = useHoistedRoutes(routes, {
    wrapManagedRoutes,
    allowedPaths: [
        "remote1/page-2",
        "remote1/page-4"
    ]
});
```

👉 Now, let's start all the projects again and navigate to _"Remote1/Page 2"_ and _"Remote1/Page 4"_. You shouldn't see the host application root layout anymore for those pages.

### Share a user session

Let's face it, an application without authenticated pages is not that useful. Hopefully, with [React Router](https://reactrouter.com/), it's quite easy to secure routes and this federated application shell can help to share the session between the host and the modules.

👉 First, create a session object.

```ts
// host - session.ts

export class AppUser {
    private _name: string;

    constructor(name: string) {
        this._name = name;
    }

    get name() {
        return this._name;
    }
}

export class AppSession {
    private _user: AppUser;

    constructor(user: AppUser) {
        this._user = user;
    }

    get user() {
        return this._user;
    }
}
```

👉 Next, create a persistance layer to store the session, in this example, a session manager. The implementation is not included in this tutorial as it doesn't matter (have a look at [wmfnext-host repository](https://github.com/patricklafrance/wmfnext-host/blob/master/packages/app/src/session.ts) for the actual implementation).

```ts
// host - session.ts

import type { SessionAccessorFunction } from "wmfnext-shell";

export class AppUser {
    private _name: string;

    constructor(name: string) {
        this._name = name;
    }

    get name() {
        return this._name;
    }
}

export class AppSession {
    private _user: AppUser;

    constructor(user: AppUser) {
        this._user = user;
    }

    get user() {
        return this._user;
    }
}

class SessionManager {
    setSession(session: AppSession) { ... }

    getSession() { ... }

    clearSession() { ... }
}

export const sessionManager = new SessionManager();

// Accessor function that will be provided to the shell runtime.
export const sessionAccessor: SessionAccessorFunction = () => {
    return sessionManager.getSession();
};
```

The session manager will be used by the _"login"_ page to set the session. The `sessionAccessor()` is what the runtime will call to retrieve the current session when a module needs it.

👉 Then, add a login page to the host application using the newly created session manager.

```tsx
// host - Login.tsx

import { AppSession, AppUser, sessionManager } from "../session";
import type { ChangeEvent, MouseEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";

export default function Login() {
    const [username, setUserName] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();

        if (username === "temp" && password === "temp") {
            const user = new AppUser(username);
            const session = new AppSession(user);

            sessionManager.setSession(session);

            navigate("/");
        }
    }, [username, password, navigate]);

    const handleUserNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setUserName(event.target.value);
    }, []);

    const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setPassword(event.target.value);
    }, []);

    return (
        <main>
            <form>
                <div>
                    <label htmlFor="username">Username</label>
                    <input id="username" type="text" onChange={handleUserNameChange} />
                </div>
                <div>
                    <label htmlFor="password">Password</label>
                    <input id="password" type="password" onChange={handlePasswordChange} />
                </div>
                <div>
                    <button type="submit" onClick={handleClick}>
                        Login
                    </button>
                </div>
            </form>
        </main>
    );
}
```

When the user authenticate, a new user session is created which is then passed to the session manager. Since the session manager has access to the session, the shell runtime will also have access to the session through the session accessor function created earlier.

```tsx
// host - App.tsx

const LoginPage = lazy(() => import("./pages/Login"));

export function App() {
    ...

    const router = useMemo(() => {
        return createBrowserRouter([
            ...hoistedRoutes,
            {
                // Newly added login page.
                path: "login",
                element: <LoginPage />
            },
            {
                path: "*",
                element: <NotFoundPage />
            }
        ]);
    }, [hoistedRoutes]);

    ...
}
```

👉 And provide the session accessor to the shell runtime.

```tsx
// host - bootstrap.tsx

import { sessionAccessor } from "./session";

...

const runtime = new ShellRuntime({
    loggers: [new ConsoleLogger()],
    // The session accessor is passed down to the runtime.
    sessionAccessor
});

...

root.render(
    <RuntimeContext.Provider value={runtime}>
        {/* New required suspense boundary */}
        <Suspense fallback={<Loading />}>
            <App />
        </Suspense>
    </RuntimeContext.Provider>
);
```

The `sessionAccessor` created earlier is passed down to the shell runtime through the `sessionAccesor` option.

> A suspense boundary has also been added to wrap the `<App />` component. At the moment, I don't understand why it's necessary, but it's required otherwise the application will throw when navigating between pages.

👉 Now, before a module can use the shared session, the `AppUser` and `AppSession` types must be shared. To do so, let's create a new project in the host application monorepos to share stuff.

> For the sake of this example, a single "shared" project is created. For a real federated application thought, it is strongly recommended to split concerns in multiple packages rather than mixing everything together in a single one.

```
packages
├── app (the host application)
├── shared
├─────src
├───────index.ts
├────── session.ts
├─────package.json
```

👉 Then, add the session typings to the project.

```ts
// shared - session.ts

export interface AppUser {
    readonly name;
}

export interface AppSession {
    readonly user: AppUser;
}
```

👉 Next, update the host application to use those newly created types.

```ts
// host - session.ts

import type { AppSession as IAppSession, AppUser as IAppUser } from "wmfnext-shared";

// The class now implements the shared AppUser interface.
export class AppUser implements IAppUser {
    private _name: string;

    constructor(name: string) {
        this._name = name;
    }

    get name() {
        return this._name;
    }
}

// The class now implements the shared AppSession interface.
export class AppSession implements IAppSession {
    private _user: AppUser;

    constructor(user: AppUser) {
        this._user = user;
    }

    get user() {
        return this._user;
    }
}
```

👉 Then, create a new page in the remote module and use the current session to render the user name.

```tsx
// remote-1 - Page5.tsx

import { useLogger, useSession } from "wmfnext-shell";
import { AppSession } from "wmfnext-shared";

export default function Page5() {
    const logger = useLogger();
    const session = useSession<AppSession>();

    logger.debug("Rendering \"page5\" from module \"remote1\"");

    return (
        <main>
            <h1>Page 5</h1>
            <p>From remote-1</p>
            {/* Retrieving the user name from the shared session */}
            <p>Authenticated user: {session.user.name}</p>
        </main>
    );
}
```

👉 Start all the projects and navigate to the login page, authenticate with "temp" / "temp" and navigate to the _"Remote1/Page 5"_ page. You should see the logged in user in the page content.

👉 Now, it will work fine if every user manually navigate to the login page to authenticate before accessing a page using the session but I doubt those expections will stand for a real application. Let's conclude this section by using React Router to protect the routes using the user session.

```tsx
// host - App.jsx

import { Navigate, Outlet } from "react-router-dom";
import { useIsAuthenticated } from "wmfnext-shell";

// Will redirect to the login page if the user is not authenticated.
function AuthenticationBoundary() {
    return useIsAuthenticated() ? <Outlet /> : <Navigate to="/login" />;
}

export function App() {
    ...

    const wrapManagedRoutes = useCallback(managedRoutes => {
        return {
            // Pathless route to set an authentication boundary around the managed routes of the application.
            element: <AuthenticationBoundary />,
            children: [
                {
                    path: "/",
                    element: <RootLayout />,
                    children: [
                        {
                            errorElement: <RootErrorBoundary />,
                            children: [
                                ...managedRoutes
                            ]
                        }
                    ]
                }
            ]
        };
    }, []);

    ...
}
```

The `AuthenticationBoundary` component is using the `useIsAuthenticated()` hook to determine if a user is authenticated or not. Alternatively, the `useSession()` hook could also be used but it isn't necessary as the component doesn't need additional information from the session.

By wrapping the root layout with a pathless route bound to `<AuthenticationBoundary />`, only authenticated users will have access to the module routes that are not hoisted.

👉 Clear the session and navigate to any route protected by the authentication boundary. You should be redirected to the login page.

There might be times when you'll want to access the session outside of a React scope. Since the runtime has access the current user session you can do so from the runtime API.

```tsx
// remote-1 - register.tsx

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    const session = runtime.getSession<AppSession>();
});
```

### Use the event bus

Most independent parts of a distributed applications usually ends up needing to talk to each others in a loosely coupled manner. To help with that, the shell comes with a basic implementation of a pub/sub mecanism called the event bus.

👉 Update the host application root layout to add a counter and an event listener.

```tsx
// host - RootLayout.tsx

import { useEventBusListener } from "wmfnext-shell";
import { IncrementCountEvent } from "wmfnext-shared";

export function RootLayout() {
    ...

    // The counter is basically only a useState.
    const [count, setCount] = useState(0);

    // Add an event listener to react to increment request from independent modules.
    useEventBusListener(IncrementCountEvent, () => {
        setCount(x => x + 1);
    });

    ...

    return (
        <div className="wrapper">
            {session && (
                <div className="top-bar">
                    <div className="counter">
                        <span>Count: {count}</span>
                    </div>
                    <div>
                        <span>Current user: </span>{session.user.name}
                    </div>
                </div>
            )}
            <nav className="nav">
                {renderedNavigationItems}
            </nav>
            <Suspense fallback={<Loading />}>
                <Outlet />
            </Suspense>
        </div>
    );
}
```

In this example, the layout is using the `useEventBusListener` hook to start listening to an event. The hook will take care of adding and disposing of the listener through re-renders.

Did you notice that the constant variable `IncrementCountEvent` used as the event name of the listener is coming from a shared package? This is not mandatory but as a package was already shared between the host and the modules, it is used in the example to faciliate code updates.

👉 Add a new page to the remote module application dispatching events to increment the counter.

```tsx
// remote-1 - Page6.tsx

import { useEventBusDispatcher, useLogger } from "wmfnext-shell";
import { IncrementCountEvent } from "wmfnext-shared";
import { useCallback } from "react";

export default function Page6() {
    const logger = useLogger();
    const dispatch = useEventBusDispatcher();

    logger.debug("Rendering \"page6\" from module \"remote1\"");

    const handleIncrementCount = useCallback(() => {
        // When the button is clicked, an event is dispatched to inform that an increment is requested.
        dispatch(IncrementCountEvent);
    }, [dispatch]);

    return (
        <main>
            <h1>Page 6</h1>
            <p>From remote-1</p>
            <button type="button" onClick={handleIncrementCount}>
                Increment count
            </button>
        </main>
    );
}
```

👉 Start all the projects and navigation to the _*Remote1/Page 6*_. Click on the button "Increment count", you should notice the count at the top left corner of the page increments. 

There might be times when you'll want to using the event bus outside of a React scope. Since the runtime has access to the event bus you can do so from the runtime API.

```tsx
// remote-1 - register.tsx

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    const eventBus = runtime.eventBus;
});
```

### Share a custom service

The shell offer a few services by default but by no mean covers all the services a mature federated application will need.

That's why the shell runtime accept at instanciation a bucket of custom services which will then be made available to all the modules.

👉 First, create a custom tracking service in the host application.

```tsx
// host - trackingService.ts

export class TrackingService {
    track(data: unknown) {
        console.log("Tracking data: ", data);
    }
}
```

👉 Then register the service with the shell runtime by providing the `services` option.

```tsx
// host - bootstrap.tsx

import { TrackingService } from "./trackingService";
import { TrackingServiceKey } from "wmfnext-shared";

...

const runtime = new ShellRuntime({
    loggers: [new ConsoleLogger()],
    // Register the tracking service with "tracking" as the key.
    services: {
        "tracking": new TrackingService()
    },
    sessionAccessor
});

...
```

👉 Now, before a module can use the shared custom service, it's type must be shared. We'll reuse the "shared" project created earlier in this tutorial to do so.

```tsx
// shared - trackingService.ts

export interface TrackingService {
    track: (data: unknown) => void;
}
```

👉 Instead of retrieving a custom service through the runtime with an untyped key, we recommend creating a custom hook. In this example, we'll create the `useTrackingService()` hook.

```tsx
// shared - trackingService.ts

import { useRuntime } from "wmfnext-shell";

export interface TrackingService {
    track: (data: unknown) => void;
}

export function useTrackingService() {
    const runtime = useRuntime();

    return runtime.getService<TrackingService>("tracking");
}
```

👉 Then, create a new page in the remote module which will use the shared custom service.

```tsx
// remote-1 - Page7.tsx

import { useLogger } from "wmfnext-shell";
import { useTrackingService } from "wmfnext-shared";

export default function Page7() {
    const logger = useLogger();
    const trackingService = useTrackingService();

    logger.debug("Rendering \"page7\" from module \"remote1\"");

    trackingService.track({
        page: "page7",
        module: "remote-1"
    });

    return (
        <main>
            <h1>Page 7</h1>
            <p>From remote-1</p>
        </main>
    );
}
```

👉 Start all the projects and navigate to _"Remote1/Page 7"_. Open the console and you should see the following log:

```
Tracking data:  {page: 'page7', module: 'remote-1'}
```

### Use a custom logger

By default, the shell comes with a console logger. If you prefer not to use it, you can opt out by not providing it to the runtime at instanciation.

```diff
const runtime = new ShellRuntime({
-    loggers: [new ConsoleLogger()]
});
```

For many applications, a console logger will not be enough. An application might have to integrate with Datadog, Azure Application Insights or any other solutions out there that the product is using.

To do so, the shell accept any custom logger as long as it implements the `Logger` interface.

In this, tutorial, for the sake of simplicity, we'll define a custom logger which is also logging to the console.

👉 Define a custom logger.

```ts
// host - customLogger.ts

import { LogLevel } from "wmfnext-shell";
import type { Logger } from "wmfnext-shell";

export class CustomLogger implements Logger {
    private _logLevel: LogLevel;

    constructor(logLevel: LogLevel = LogLevel.critical) {
        this._logLevel = logLevel;
    }

    debug(log: string, ...rest: unknown[]): Promise<unknown> {
        if (this._logLevel >= LogLevel.debug) {
            console.log(`[custom-logger] ${log}`, ...rest);
        }

        return Promise.resolve();
    }

    information(log: string, ...rest: unknown[]): Promise<unknown> {
        if (this._logLevel >= LogLevel.information) {
            console.info(`[custom-logger] ${log}`, ...rest);
        }

        return Promise.resolve();
    }

    warning(log: string, ...rest: unknown[]): Promise<unknown> {
        if (this._logLevel >= LogLevel.warning) {
            console.warn(`[custom-logger] ${log}`, ...rest);
        }

        return Promise.resolve();
    }

    error(log: string, ...rest: unknown[]): Promise<unknown> {
        if (this._logLevel >= LogLevel.error) {
            console.error(`[custom-logger] ${log}`, ...rest);
        }

        return Promise.resolve();
    }

    critical(log: string, ...rest: unknown[]): Promise<unknown> {
        if (this._logLevel >= LogLevel.critical) {
            console.error(`[custom-logger] ${log}`, ...rest);
        }

        return Promise.resolve();
    }
}
```

👉 Update the host application to include the newly created `CustomLogger`.

```tsx
// host - bootstrap.tsx

import { CustomLogger } from "./customLogger";

...

const runtime = new ShellRuntime({
    loggers: [
        new ConsoleLogger(),
        // Added the new CustomLogger.
        new CustomLogger()
    ],
    services: {
        [TrackingServiceKey]: new TrackingService()
    },
    sessionAccessor
});

...
```

👉 Start all the projects, refresh the application, and you should now see all the logs twice in the console.

```
[shell] Found 1 static modules to register
[custom-logger] [shell] Found 1 static modules to register
```

### Fetch data

Static pages are usually not why an organization will create a federated application with [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) and [React Router](https://reactrouter.com/).

Data fetching is an important part of an application and React Router is really good at it with the [loader API](https://reactrouter.com/en/main/route/loader). In this example, we will render in a page the first 5 characters returned by the [Rick and Morty API](https://rickandmortyapi.com/).

👉 First, add a new page with a loader function to the remote module application.

```tsx
// remote-1 - Page8.tsx

import { useLoaderData } from "react-router-dom";
import { useLogger } from "wmfnext-shell";

// React Router loader function.
async function loader() {
    return fetch("https://rickandmortyapi.com/api/character/1,2,3,4,5", {
        method: "GET",
        headers: {
            "Accept": "application/json"
        }
    });
}

export { loader as page8Loader };

interface Character {
    id: number;
    name: string;
    species: string;
}

export default function Page8() {
    // React Router provide the useLoaderData hook to retrieve the data returned by the loader.
    const characters = useLoaderData() as Character[];
    const logger = useLogger();

    logger.debug("Rendering \"page8\" from module \"remote1\"");

    return (
        <main>
            <h1>Page 8</h1>
            <p>From remote-1</p>
            <div>
                {characters.map(x => {
                    return (
                        <div key={x.id}>
                            <span>Id: {x.id}</span>
                            <span> - </span>
                            <span>Name: {x.name}</span>
                            <span> - </span>
                            <span>Species: {x.species}</span>
                        </div>
                    );
                })}
            </div>
        </main>
    );
}
```

👉 Then, register the page with a `loader` function.

```tsx
// remote-1 - register.tsx

import { loader as page8Loader } from "./pages/Page8";

...

const Page8 = lazy(() => import("./pages/Page8"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        ...

        {
            path: "remote1/page-8",
            element: <Page8 />,
            loader: page8Loader
        }
    ]);

    runtime.registerNavigationItems([
        ...

        {
            to: "remote1/page-8",
            content: "Remote1/Page 8 - Fetch data"
        }
    ]);
};
```

👉 Start all the projects and navigate to the _"Remote1/Page 8"_ page. You should see the Rick and Morty characters at the bottom of the page.

### Use the fake runtime

TBD

## API

### Remote loader

TBD

### Package loader

TBD

### Runtime

TBD

### Routing

TBD

### Navigation

TBD

### Logging

TBD

### Event bus

TBD

### User session

TBD

### Fake runtime

TBD

## Contributors

Have a look at the [contributors guide](./CONTRIBUTING.md).
