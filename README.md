# wmfnext-shell

[Webpack Module Federation](https://webpack.js.org/concepts/module-federation) is a great infrastructure piece to makes sharing code and dependencies between different independant codebases easier. But as is, it's pretty raw as it's a low level mecanism.

This shell aims to add a very thin and opinionated layer on top of Webpack Module Federation to complement the federation mecanism with additional functionalities. Those functionalities will gentle the adoption of a federated application architecture and provide an opinionated direction on how to implement a federated SPA application.

The idea behind this shell is to have an host application responsible of loading modules and providing shared functionalities like routing, messaging and logging. With this shell, a module is considered as an independent codebase which should usually match a specific sub domain of the application. At bootstrap, the host application loads the modules and call a registration function for each of them with shared functionalities and a customazible context. During the registration phase, each module dynamically *register it's routes and navigation links*. Then, pages and components of a module can use the provided hooks to access shared functionalities.

We recommend to aim for remote hosted modules loaded at runtime as it enables your teams to be fully autonomous by deploying their module independently from the other pieces of the application. Still, sometimes teams might want to gradually migrate toward this type of architecture and would prefer to extract sub domains into independent modules in a mololithic way before fully committing to independent modules and autonomous teams. To accomodate different migration solutions, this shell also support loading modules from a static registration function at build time. The functions could come from a independent packages in a monorepos setup or could even come from a subdomain folder of a modular application. A dual bootstrapping setup is also supported, meaning an application could load a few remote hosted modules at runtime while also loading a few other modules at build time.

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Contributors](./CONTRIBUTING.md)

## Features

This federated application shell include the following features:

- Loading of hosted remote modules at runtime
- Loading of modules from a static function at build time
- Routing & navigation
- User session management
- Cross application pub/sub
- Logging
- Stubs for module development in isolation

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

### Setup a remote application

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
<!-- remote - index.html -->

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

At this point, if you start both the host application and the remote application, you should see the following logs in the host application if you open dev tools:

```bash
consoleLogger.js:16 Loading module "./register" from container "remote1" of remote "http://localhost:8081/remoteEntry.js"
consoleLogger.js:16 Registering module "./register" from container "remote1" of remote "http://localhost:8081/remoteEntry.js"
consoleLogger.js:22 Remote 1 registered
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
                },
                {
                    path: "*",
                    element: <NotFoundPage />
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
import { RootLayout } from "./layouts";
import { Loading } from "./components";
import { useRoutes } from "wmfnext-shell";

export function App() {
    // Retrieve the modules routes.
    const routes = useRoutes();

    const router = useMemo(() => {
        return createBrowserRouter([
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    // Add the retrieved modules routes to the router.
                    ...routes
                ]
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
import type { RegistrationError, RemoteDefinition } from "wmfnext-remote-loader";

import { App } from "./App";
import { createRoot } from "react-dom/client";
import { lazy } from "react";
import { registerRemoteModules } from "wmfnext-remote-loader";

const HomePage = lazy(() => import("./pages/Home"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

const Remotes: RemoteDefinition[] = [
    {
        url: "http://localhost:8081",
        name: "remote1"
    }
];

const runtime = new ShellRuntime({
    loggers: [new ConsoleLogger()]
});

// Register host application page routes with the same entry point as modules routes.
runtime.registerRoutes([
    {
        index: true,
        element: <Home />
    },
    {
        path: "*",
        element: <NotFound />
    }
]);

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

By using the `useRoutes()` hook we'll get access to the modules routes registered in the runtime at bootstrap. By passing those routes to the router, they will be rendered in the host application router.

The host application could still register it's routes directly in the router configuration but it's convenient to move all routes registration to `runtime.registerRoutes()` as all the routes will be registered through the same entry point.

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

Start both applications and try navigating between local and remote pages.

You'll probably notice that the remote pages goes to the 404 pages! What's going on?!

### Re-render the host application after remote modules registration

> **Note**
>
> You might not need this if your host application is using Redux and you update the store once the bootstrapping is completed.

The issue is that the host application finish rendering **before** the remote module is registered. Therefore, only the host application routes are rendered.

To fix this issue, we have to re-render the application once the remote module is registered.

> This issue will only occurs with remote modules registered at runtime. When strictly using modules registered at build time, it's not an issue and you don't need to add the following code.

To fix the issue, the shell provide a `useRerenderOnceRemotesRegistrationCompleted()` function. Sadly thought, the solution also involve adding a little bit of custom code to link everything together.

👉 First, update the host application `<App />` by adding the `useRerenderOnceRemotesRegistrationCompleted()` hook. Then, add code to display a loading message while the remote modules register.

```tsx
// host - App.tsx

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./layouts";
import { Loading } from "./components";
import { useRerenderOnceRemotesRegistrationCompleted } from "wmfnext-remote-loader";
import { useRoutes } from "wmfnext-shell";

export function App() {
    useRerenderOnceRemotesRegistrationCompleted(() => window.__is_registered__);

    const routes = useRoutes(runtime);

    const router = useMemo(() => {
        return createBrowserRouter([
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    ...routes
                ]
            }
        ]);
    }, [routes]);

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
import type { RemoteDefinition, RegistrationError } from "wmfnext-remote-loader";
import { App } from "./App";
import { RegistrationStatus } from "./registrationStatus";
import { createRoot } from "react-dom/client";
import { registerRemoteModules } from "wmfnext-remote-loader";
import { lazy } from "react";

const HomePage = lazy(() => import("./pages/Home"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

const Remotes: RemoteDefinition[] = [
    {
        url: "http://localhost:8081",
        name: "remote1"
    }
];

const runtime = new ShellRuntime({
    loggers: [new ConsoleLogger()]
});

runtime.registerRoutes([
    {
        index: true,
        element: <HomePage />
    },
    {
        path: "*",
        element: <NotFoundPage />
    }
]);

window.__registration_state__ = RegistrationStatus.inProgress;

registerRemoteModules(Remotes, runtime).then((errors: RegistrationError[]) => {
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

### Setup a package module application

> A static module example is available in the Github repository [wmfnext-host](https://github.com/patricklafrance/wmfnext-host).

As mentionned earlier, the shell also support static modules loaded at build time to accomodate different migration scenarios. Still, keep in mind that we highly recommend to aim for remote hosted modules loaded at runtime as it enables your teams to be fully autonomous by deploying their module independently from the other pieces of the application.

Let's create a static module to see how it's done! 

Those static modules could either come from a sibling project in a monorepos setup or from standalone packages installed in the host application. For this examples, we'll use a sibling project in a monorepos setup with the following structure.

```
packages
├── app (the host application)
├─────src
├───────boostrap.tsx
├───────package.json
├── static-module-1
├─────src
├───────index.ts
├───────register.tsx
├───────package.json
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
import type { RemoteDefinition, RegistratorError } from "wmfnext-remote-loader";
import { App } from "./App";
import { RegistrationStatus } from "./registrationStatus";
import { createRoot } from "react-dom/client";
import { registerRemoteModules } from "wmfnext-remote-loader";
import { register as registerStaticModule1 } from "wmfnext-static-module-1";
import { lazy } from "react";

const HomePage = lazy(() => import("./pages/Home"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

const Remotes: RemoteDefinition[] = [
    {
        url: "http://localhost:8081",
        name: "remote1"
    }
];

const runtime = new ShellRuntime({
    loggers: [new ConsoleLogger()]
});

runtime.registerRoutes([
    {
        index: true,
        element: <HomePage />
    },
    {
        path: "*",
        element: <NotFoundPage />
    }
]);

window.__registration_state__ = RegistrationStatus.inProgress;

// Register the static modules at build time.
registerStaticModules([registerStaticModule1], runtime).then(() => {
    runtime.logger.debug("All static modules registered.");
});

registerRemoteModules(Remotes, runtime).then((errors: RegistratorError[]) => {
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

By calling the `registerStaticModules` function with the static module `register` function, the module routes will be added to the host application router at build time.

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
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="static1/page-1">Static1/Page1</Link></li>
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

👉 Start all the applications and try navigating to "/static1/page-1" and "static1/page-2".

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
            path: "remote1/page-1",
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
            content: "Remote1/Page 1"
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
                    <span>Static1/Page 1</span>
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
            content: "Static1/Page 2",
            children: [
                {
                    to: "static1/page-4",
                    content: "Static1/Page 4"
                },
                {
                    to: "static1/page-5",
                    content: "Static1/Page 5"
                }
            ]
        },
        {
            to: "static1/page-3",
            content: "Static1/Page 3",
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
import { Suspense, useCallback } from "react";
import { useNavigationItems, useRenderNavigationItems } from "wmfnext-shell";

import { Loading } from "../components";
import type { ReactNode } from "react";
import type { RenderNavigationItem } from "wmfnext-shell";

export function RootLayout() {
    const navigationItems = useNavigationItems();

    const renderItem = useCallback(({ content, linkProps, additionalProps: { highlight, ...additionalProps } }: RenderNavigationItem, index: number, level: number) => {
        return (
            <li key={`${level}-${index}`} className={highlight && "highlight"}>
                <Link {...linkProps} {...additionalProps}>
                    {content}
                </Link>
            </li>
        );
    }, []);

    const renderSection = useCallback((itemElements: ReactNode[], index: number, level: number) => {
        return (
            <ul key={`${level}-${index}`}>
                {itemElements}
            </ul>
        );
    }, []);

    const renderedNavigationItems = useRenderNavigationItems(navigationItems, renderItem, renderSection);

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

As it's a non trivial process, the shell provide an optional utility hook called `useRenderNavigationItems()` to help with that.

> If you prefer you can always parse the navigation items tree on your own without using the utility hook.

The `useRenderNavigationItems()` accept 2 render functions as a second and third parameter. The second parameter is a function to render a single link from a navigation item and the third parameter is a function to render a section of navigation items.

In this example, there are 2 sections. A root section containing all the navigation items, and a nested section containing only _"Static1/Page 4"_ and _"Static1/Page 5"_.

Each render function must return a single `React element`.

Notice that the `renderItem` function receive the `highlight` additional props and use it to render an "highlight" CSS class on the link. This is the kind of usecase those `additionalProps` are for.

👉 Start all the applications and try navigating between pages.

> **Warning**
>
> It's important to provide memoized render functions to the `useRenderNavigationItems()` hook as otherwise the navigation items will be parsed over and over on re-renders rather than being returned from the cache for the same navigation item tree structure.

### Isolate module failures

One of they key carateristic of a micro-frontends implementations like [iframes](https://martinfowler.com/articles/micro-frontends.html#Run-timeIntegrationViaIframes) and subdomains is that a single module failure can't break the whole application, e.g. other parts will still be fully functional even if one fail with an unmanaged error.

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
import { RegistrationStatus } from "./registrationStatus";
import { RootErrorBoundary } from "./RootErrorBoundary";
import { RootLayout } from "./layouts";
import { useMemo } from "react";
import { useRerenderOnceRemotesRegistrationCompleted } from "wmfnext-remote-loader";
import { useRoutes } from "wmfnext-shell";

export function App() {
    useRerenderOnceRemotesRegistrationCompleted(() => window.__registration_state__ === RegistrationStatus.completed);

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
            }
        ]);
    }, [federatedRoutes]);

    if (window.__registration_state__ === RegistrationStatus.inProgress) {
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

As the pathless route has been declared under the root route (the one with the the root layout as `element`), when an unmanaged error bubble up and the error boundary is rendered, only the [Outlet](https://reactrouter.com/en/main/components/outlet) output will be replaced by the error boundary output, meaning other parts of the root layout around the Outlet will still be rendered.

👉 Add a route throwing an error to the remote module.

```tsx
// remote-1 - Page3.tsx

export default function Page3(): JSX.Element {
    throw new Error("Page3 from \"remote-1\" failed to render.");
}
```

```tsx
// remote-1 - register.tsx

import type { ModuleRegisterFunction, Runtime } from "wmfnext-shell";

import { lazy } from "react";

const Page1 = lazy(() => import("./pages/Page1"));
const Page2 = lazy(() => import("./pages/Page2"));
const Page3 = lazy(() => import("./pages/Page3"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        {
            path: "remote1/page-1",
            element: <Page1 />
        },
        {
            path: "remote1/page-2",
            element: <Page2 />
        },
        {
            path: "remote1/page-3",
            element: <Page3 />
        }
    ]);

    runtime.registerNavigationItems([
        {
            to: "remote1/page-1",
            content: "Remote1/Page 1"
        },
        {
            to: "remote1/page-2",
            content: "Remote1/Page 2"
        },
        {
            to: "remote1/page-3",
            content: "Remote1/Page 3"
        }
    ]);
};
```

👉 Start all the applications and navigate to _"Remote1/Page 3"_. The page will fail to render but the application should still be functional.

### Override the host layout from a module

TBD

### Use the event bus

TBD

### Register a custom logger

TBD

### Register a custom service

TBD

useService<TService>("service-name")

new ShellRuntime({ 
    services: {
        "service-name": new CustomService() 
    } 
})

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
