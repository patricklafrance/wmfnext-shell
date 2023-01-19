# wmfnext-shell

> **Warning**
>
> This repository will not be maintained as it's purpose is to inspire teams by showcasing how a SPA federated application could be build on top of [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) and [React Router](https://reactrouter.com/).

Webpack Module Federation is a great infrastructure piece to share code and dependencies between different independent codebases easier. But as is, it's pretty raw as it's a low level mecanism.

This shell aims to add a very thin and opinionated layer on top of Webpack Module Federation and React Router to complement the sharing mecanism with additional functionalities. Those functionalities will gentle the adoption of a federated application architecture and provide an opinionated direction on how to implement a federated SPA application.

The idea behind this shell is to have an host application responsible of loading modules and providing shared functionalities like routing, messaging and logging. With this shell, a module is considered as an independent codebase matching a specific subdomain of the application. At bootstrap, the host application loads the modules and call a registration function for each of them with shared functionalities and an optional context. During the registration phase, each module dynamically *register it's routes and navigation links*. Then, pages and components of a module can use the provided hooks to access shared functionalities provided by the shell.

We recommend to aim for remote hosted modules loaded at runtime as it enables your teams to be fully autonomous by deploying their modules independently from the other parts of the application. Still, sometimes teams might want to gradually migrate toward a distributed architecture and would prefer to extract subdomains into independent modules in a monolithic but decoupled way before fully committing to remote modules. To accomodate those migration solutions, this shell support loading modules from a static registration function at build time. The functions could come from a package in a monorepos setup or could even come from a subdomain folder of a modular monolith. A dual bootstrapping setup is also supported, meaning an application could load a few remote hosted modules at runtime while also loading a few other modules at build time.

- [Features](#features)
- [Examples](#examples)
- [Installation](#installation)
- [Basic usage](#basic-usage)
- [Guides](#guides)
    - [Setup an host application](#setup-an-host-application)
    - [Setup a remote application](#setup-a-remote-application)
    - [Register a module routes](#register-a-module-routes)
    - [Re-render the host application after the remote modules are ready](#re-render-the-host-application-after-the-remote-modules-are-ready)
    - [Setup a static module application](#setup-a-static-module-application)
    - [Register a module dynamic navigation items](#register-a-module-dynamic-navigation-items)
    - [Isolate module failures](#isolate-module-failures)
    - [Override the host layout for a module page](#override-the-host-layout-for-a-module-page)
    - [Share a user session](#share-a-user-session)
    - [Use the event bus](#use-the-event-bus)
    - [Share a custom service](#share-a-custom-service)
    - [Use a custom logger](#use-a-custom-logger)
    - [Fetch data](#fetch-data)
    - [Develop a module in isolation](#develop-a-module-in-isolation)
- [API](#api)
- [Contributors guide](./CONTRIBUTING.md)

## 🙌 Features

The following features are supported by this shell:

- Loading of hosted remote modules at runtime
- Loading of static modules at build time
- Routing
- Navigation
- Shared user session
- Cross application messaging
- Logging
- Failures isolation
- Module development in isolation

## 🎉 Examples

For full examples of applications using this shell, have a look at:
- [wmfnext-host](https://github.com/patricklafrance/wmfnext-host) repository for an host application example + a static module example
- [wmfnext-remote-1](https://github.com/patricklafrance/wmfnext-remote-1) repository for a remote module example

## 🤘 Installation

To install the packages, [open a terminal in VSCode](https://code.visualstudio.com/docs/editor/integrated-terminal#_managing-multiple-terminals) and execute the following command at the root of the projects (host and modules) workspace:

```bash
yarn add wmfnext-shell
```

If you wish to include remote modules loaded at runtime using [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) also execute the following command at the root of the projects (host and *remote* modules) workspace:

```bash
yarn add wmfnext-remote-loader
```

Once, installed, we recommend that you configure your projects to use [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) by default. To do so, open the `package.json` file and add the `type` property:

```json
{
    "type": "module"
}
```

## 📄 Basic usage

In the following example, to keep it brief, we'll focus only on creating a single remote module and we will only showcase the basic functionalities of the shell. To know more about the other options, have a look at [guides](#📚-guides) and the [API](#🔧-api) section.

> To learn how to create a static module application, have a look at the section ["setup a static module application"](#setup-a-static-module-application) of the guides.

### Host application

👉 Create a new application with the following files.

```
host-app
├── src
├──── App.tsx
├──── RootLayout.tsx
├──── HomePage.tsx
├──── bootstrap.tsx
├──── index.ts
├── webpack.config.js
```

> To learn more about the `bootstrap.tsx` file, read the following [article](https://dev.to/infoxicator/module-federation-shared-api-ach#using-an-async-boundary).

👉 In the `boostrap.tsx` file, instanciate the shell `Runtime` and load the remote module.

```tsx
// host - boostrap.tsx

import { ConsoleLogger, RuntimeContext, Runtime } from "wmfnext-shell";
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

// Create the shell runtime.
const runtime = new Runtime({
    loggers: [new ConsoleLogger()]
});

// Register the remote module.
registerRemoteModules(Remotes, runtime);

const root = createRoot(document.getElementById("root"));

// Render the React app.
root.render(
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

👉 In the `App.tsx` file, retrieve the routes registered by the module and render the router.

```tsx
// host - App.tsx

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { lazy, useMemo } from "react";
import { useRoutes } from "wmfnext-shell";
import { RootLayout } from "./RootLayout";
import { useAreRemotesReady } from "wmfnext-remote-loader";

const HomePage = lazy(() => import("./HomePage"));

export function App() {
    // Re-render the application once the remote module is registered.
    const isReady = useAreRemotesReady();

    // Retrieve the module routes.
    const routes = useRoutes(runtime);

    // Create the router with an homepage and the module routes.
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
            }
        ]);
    }, [routes]);

    // Display a loading until the remote module is registered.
    if (!isReady) {
        return <Loading />;
    }

    // Render the router.
    return (
        <RouterProvider
            router={router}
            fallbackElement={<Loading />}
        />
    );
}
```

👉 Create the `RootLayout` component to render the navigation items.

```tsx
// host - RootLayout.tsx

import { Link, Outlet } from "react-router-dom";
import { Suspense } from "react";
import { useNavigationItems } from "wmfnext-shell";

export function RootLayout() {
    const navigationItems = useNavigationItems();

    return (
        <>
            <nav>
                <ul>
                    {navigationItems.map((x, index) => {
                        <li key={index}>
                            <Link to={x.to}>
                                {x.content}
                            </Link>
                        </li>
                    })}
                </ul>
            </nav>
            <Suspense fallback={<Loading />}>
                <Outlet />
            </Suspense>
        </>
    );
}
```

👉 Add the Webpack Module Federation plugin to the `webpack.config.js` file by using the `createHostConfiguration` function to follow the shell conventions.

```js
// host webpack.config.js

import ModuleFederationPlugin from "webpack/lib/container/ModuleFederationPlugin.js";
import { createHostConfiguration } from "wmfnext-remote-loader/createModuleFederationConfiguration.js";
import packageJson from "../package.json" assert { type: "json" };

export default {
    plugins: [
        new ModuleFederationPlugin(
            createHostConfiguration("host", packageJson)
        )
    ]
}
```

👉 Start the host application, you should see the home page. Even if the remote module application doesn't exist yet, the host application will render what is currently available, meaning only the host application at the moment.

### Remote module application

👉 Create a new application with a `register.tsx` file and a page.

```
remote-app
├── src
├──── register.tsx
├──── Page1.tsx
├── webpack.config.js
```

👉 Use the `register.tsx` file, to register the module pages and navigation items.

```tsx
// remote-1 - register.tsx

import { ModuleRegisterFunction, Runtime, registerRoutes, registerNavigationItems } from "wmfnext-shell";
import { lazy } from "react";

const Page1 = lazy(() => import("./Page1"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    // This route will then be returned by "useRoutes()" in the host application.
    runtime.registerRoutes([
        {
            {
                path: "/remote1/page-1",
                element: <Page1 />
            },
        }
    ]);

    // This navigation item will then be returned by "useNavigationItems()" in the host application.
    runtime.registerNavigationItems([
        {
            to: "/remote1/page-1",
            content: "Remote1/Page 1"
        }
    ]);
}
```

👉 Add the Webpack Module Federation plugin to the `webpack.config.js` file by using the `createModuleConfiguration` function to follow the shell conventions. Make sure the `entry` prop value is using the `register.tsx` file rather than the default index file.

```js
import ModuleFederationPlugin from "webpack/lib/container/ModuleFederationPlugin.js";
import { createModuleConfiguration } from "wmfnext-remote-loader/createModuleFederationConfiguration.js";
import packageJson from "../package.json" assert { type: "json" };

export default {
    entry: "./src/register.tsx",
    plugins: [
        new ModuleFederationPlugin(
            createModuleConfiguration("remote1", packageJson)
        )
    ]
}
```

👉 Start the remote application, then the host application. You should see a navigation item to the _"Remote1/Page 1"_ and be able to navigate to the page by clicking on the item.

> If you are having issues, make sure that both applications `package.json` file have `react`, `react-dom`, `react-router-dom`, `wmfnext-shell`, `wmfnext-remote-loader` listed in their dependencies and that they are using the same dependency versions.

## 📚 Guides

> **Warning**
>
> While going through those step by step guides, keep in mind that some parts of the application has ben intentionally left out from code samples to emphasis the more important stuff.
>
> For a complete example, or, if you prefer to jump right into it, have a look at the [wmfnext-host](https://github.com/patricklafrance/wmfnext-host) and [wmfnext-remote-1](https://github.com/patricklafrance/wmfnext-remote-1) repositories or the [API documentation](#🔧-api).

### Setup an host application

> An host application example is available in the Github repository [wmfnext-host](https://github.com/patricklafrance/wmfnext-host).

👉 The first thing to do is to create an host application. According to [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) best practices we'll create 3 files:

```
host-app
├── src
├──── App.tsx
├──── bootstrap.tsx
└──── index.ts
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

Now, let's assume that you want to load a remote module at runtime with [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) (make sure you installed `wmfnext-remote-loader` dependency).

👉 The first thing to do is updating the Webpack config to add the [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin).

```js
// host - webpack.dev.js

import ModuleFederationPlugin from "webpack/lib/container/ModuleFederationPlugin.js";
import { createHostConfiguration } from "wmfnext-remote-loader/createModuleFederationConfiguration.js";

import packageJson from "./package.json" assert { type: "json" };


export default {
    plugins: [
        // You only need to setup the ModuleFederationPlugin plugin if you 
        // want to load remote modules at runtime.
        new ModuleFederationPlugin(
            createHostConfiguration("host", packageJson)
        )
    ]
}
```

<details>
    <summary>View the full Webpack config</summary>
    <br />

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
                test: /\.(ts|tsx)$/,
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
        // You only need to setup the ModuleFederationPlugin plugin if you 
        // want to load remote modules at runtime.
        new ModuleFederationPlugin(createHostConfiguration("host", packageJson)),
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        })
    ]
};
```
</details>

> **Note**
>
> The previous Webpack configuration is for *development only* and implies that the project is using TypeScript loader for transpilation.
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

👉 Finally, add your [TypeScript configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) at the root of the project and a command in the `package.json` file to start Webpack in development mode.

```json
{
    "scripts": {
        "dev": "webpack serve --config webpack.dev.js"
    }
}
```

👉 Now, let's jump into the interesting stuff and start using the shell. For this example, we'll do most of the configuration in the `bootstrap.tsx` file.

```tsx
// host - bootstrap.tsx

import { ConsoleLogger, RuntimeContext, Runtime } from "wmfnext-shell";
import type { RemoteDefinition } from "wmfnext-remote-loader";
import { App } from "./App";
import { createRoot } from "react-dom/client";
import { registerRemoteModules } from "wmfnext-remote-loader";

// Instanciate a runtime instance that will be shared among the host and the modules. 
// The runtime contains common functionalities such as routing and navigation services.
const runtime = new Runtime({
    // By default, the shell comes with a basic console logger.
    // Custom logger can be implemented by implementing the Logger interface.
    loggers: [new ConsoleLogger()]
});

const Remotes: RemoteDefinition[] = [
    {
        url: "http://localhost:8081",
        // Have to match the name defined in the remote applicatio
        // Webpack configuration that we'll define later.
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

> The remote modules must be registered in the `bootstrap.ts` file rather than the `App.tsx` file otherwise the registration will be done outside of the remote boundary and it will not work.

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

👉 Start the host application with the `dev` command. Even thought the remote application is not available, the host application will render what is currently available, meaning only the host application at the moment.

### Setup a remote application

> A remote application example is available in the Github repository [wmfnext-remote-1](https://github.com/patricklafrance/wmfnext-remote-1).

It's time to create our first remote module! We'll use a file structure similar to what was used for the host application.

```
remote-app
├── src
├──── App.tsx
└──── index.tsx
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

👉 Then, create an `index.tsx` file to render the React application.

```tsx
// remote-1 - index.tsx

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

import ModuleFederationPlugin from "webpack/lib/container/ModuleFederationPlugin.js";
import { createModuleConfiguration } from "wmfnext-remote-loader/createModuleFederationConfiguration.js";

import packageJson from "./package.json" assert { type: "json" };

export default {
    plugins: [
        new ModuleFederationPlugin(
            createModuleConfiguration("remote1", packageJson)
        )
    ]
}
```

<details>
    <summary>View the full Webpack config</summary>
    <br />

```js
// remote-1 - webpack.dev.js

import HtmlWebpackPlugin from "html-webpack-plugin";
import ModuleFederationPlugin from "webpack/lib/container/ModuleFederationPlugin.js";
import { createModuleConfiguration } from "wmfnext-remote-loader/createModuleFederationConfiguration.js";
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
                test: /\.(ts|tsx)$/,
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
        new ModuleFederationPlugin(createModuleConfiguration("remote1", packageJson)),
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        })
    ]
};
```
</details>

> **Note**
>
> The previous Webpack configuration is for *development only* and implies that the project is using TypeScript loader for transpilation.
>
> As the project is configured to use [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) by default, this example is using ESM syntax instead of [CommonJS](https://en.wikipedia.org/wiki/CommonJS) which is what most are used to. If you're Webpack file use CommonJS, import the `wmfnext-remote-loader/createModuleFederationConfiguration.cjs` file instead.
>
> ```js
> require("wmfnext-remote-loader/createModuleFederationConfiguration.cjs");
> ```

Again, you probably noticed that the [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin) is configured with the output of the  `createModuleConfiguration()` function. The function has an identical signature as the `createHostConfiguration()` function described in the previous section and serve the same purpose, e.g. gentle the configuration of the plugin and ensure the shell conventions are followed.

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

👉 Finally, add your [TypeScript configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) at the root of the project and a command in the `package.json` file to start Webpack in development mode.

```json
{
    "scripts": {
        "serve-dev": "webpack serve --config webpack.dev.js"
    }
}
```

> We'll explain in the *module development environment* section why this command is named `serve-dev` instead of `dev`.

👉 Start the remote module application with the `serve-dev` command, you should see __Hello from remote!__.

Now, as stated previously, this shell add an opinionated layer on top of [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) dependencies sharing mecanism. Our take is that remote modules should not share standalone components but rather strictly share an whole subdomain of the application.

Remember earlier when we told that by convention a remote module must expose a `register.js` file?

At bootstrap, it's this file which will act as the remote module entry point, e.g. it will be loaded and called by the host application with all the shared stuff as parameters.

👉 So, let's create a `register.tsx` file at the root of the remote module application.

```
remote-app
├── src
├──── App.tsx
└──── index.ts
└──── register.tsx
```

```tsx
// remote-1 - register.tsx

import { ModuleRegisterFunction } from "wmfnext-shell";

export const register: ModuleRegisterFunction = (runtime, { context }) => {
    runtime.logger.log("Remote 1 registered", context);
};
```

For now we won't register anything, we'll use the `runtime` to log something in the console.

👉 Update the Webpack config to use the `register.tsx` file as an entry point rather than the index file.

```js
export default {
    entry: "./src/register.tsx"
};
```

👉 In distinct terminals, start the remote module application with the `serve-dev` command, then the host application with the `dev` command. You should see similar logs in the host application if you open the dev tools:

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

👉 Start the application and you'll have an home page.

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

import { ConsoleLogger, RuntimeContext, Runtime } from "wmfnext-shell";
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

const runtime = new Runtime({
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

By using the `useRoutes()` hook you'll get access to the modules routes registered in the runtime at bootstrap. By passing those routes to the router, they will be rendered in the host application.

The `runtime.registerRoutes()` function support the same syntax and options as React Router [createBrowserRouter()](https://reactrouter.com/en/main/routers/create-browser-router) `RouteObject` and a few additional custom properties. Have a look at the [React Router documentation](https://reactrouter.com/en/main/route/route#type-declaration) to find out about the options.

👉 Now that the host application is ready to render modules routes, let's update the remote application to register some routes! To do so, open the `register.tsx` file of the remote application and add routes by using the `runtime.registerRoutes()` function (you could also use `runtime.registerRoute()`).

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

👉 Start both applications and try navigating to the remote pages.

You probably noticed that you are redirected to the 404 page! What's going on?!

### Re-render the host application after the remote modules are ready

> **Note**
>
> You might not need this if your host application is using a technology like Redux and you use the store to persist a flag once the bootstrapping is completed.

The issue is that the host application finish rendering **before** the remote module is registered. Therefore, only the host application routes are rendered.

To fix this, the host application have to re-render once the remote module is registered.

> It's only problematic with remote modules registered at runtime. When strictly using modules registered at build time, it's not an issue and you don't need to add the following code.

To help with that, the shell provide a `useAreRemotesReady()` hook. The `useAreRemotesReady()` hook will take care of re-rerendering the app once the remote modules registration is completed. The function will also return a boolean indicating if the remotes are ready. This is is quite useful as you probably don't want to show a blank page to your users while the remote modules are registering.

> If you are not using the `useAreRemotesReady()` hook and you need access to the registration status you can import the `registrationStatus` variable from the `wmfnext-remote-loader` package.

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

import { ConsoleLogger, RuntimeContext, Runtime } from "wmfnext-shell";
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

const runtime = new Runtime({
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

👉 Then, move the homepage to the remote module.

> You can keep as many pages as you want in the host application. In those guides we'll move most of them in modules.

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
    // Remove the home page from the links and update Remote1/Page1 link 
    // to "/" as it's now the index route.
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

👉 Now you can start both applications again and try navigating between pages, everything should work fine.

> If you are having issues, make sure that the host application and the remote module application `package.json` file have `react`, `react-dom`, `react-router-dom`, `wmfnext-shell`, `wmfnext-remote-loader` listed in their dependencies and that they are using the same dependency versions.

### Setup a static module application

> A static module example is available in the Github repository [wmfnext-host](https://github.com/patricklafrance/wmfnext-host).

As mentionned earlier, the shell also support static modules loaded at build time to accomodate different migration scenarios. Keep in mind thought that we highly encourage products to aim for remote hosted modules loaded at runtime as it enables teams to be fully autonomous by deploying their module independently from the other parts of the application.

Let's create a static module to see how it's done! 

Static modules can either come from a sibling project in a monorepos setup or from standalone packages installed in the host application. For this examples, we'll use a sibling project in a monorepos setup with the following structure.

```
packages
├── app (the host application)
├── static-module-1
├─────src
├───────index.ts
├───────register.tsx
├─────package.json
```

👉 First configure the static module `package.json` file to use the `index.js` file as the package entry point and give the module a name and a version. In this example, we'll call it `wmfnext-static-module-1` and set the version as `0.0.1`.

```json
{
    "name": "wmfnext-static-module-1",
    "version": "0.0.1",
    "main": "dist/index.js"
}
```

👉 Then export the `register.tsx` file in the `index.ts` file.

```ts
// static-1 - index.ts

export * from "./register.tsx";
```

👉 And use the `register.tsx` file to register a few pages to the shell runtime at bootstrap, similar to what we did for the remote module.

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

👉 Now, let's go back to the host application and register the newly created package as a dependency of the application. Open the host application `package.json` file and add the following dependency.

```json
{
    "dependency": {
        "wmfnext-static-module-1": "0.0.1"
    }
}
```

👉 Next, update the host application `bootstrap.tsx` file to import the register function from the static module package and register the static module at build time.

```tsx
// host - bootstrap.tsx

import { ConsoleLogger, RuntimeContext, Runtime } from "wmfnext-shell";
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

const runtime = new Runtime({
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

👉 Update the host application root layout to add links to those newly registered routes from the static module.

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

The `package.json` file indicates that the main file will be available in a `/dist` folder. That's because the module will share transpiled code. 

👉 To do so, add your [TypeScript configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) at the root of the project and a command in the `package.json` file to transpile the code using the `tsx` CLI.

```json
{
    "scripts": {
        "dev": "tsc --watch --project ./tsconfig.dev.json"
    }
}
```

👉 Start the project with the `dev` command, then start all the applications and libraries and navigate to "/static1/page-1" and "static1/page-2".

### Register a module dynamic navigation items

That's pretty cool, we have a federated application displaying pages from a remote module loaded at runtime and a static module registered at build time.

Still, _module teams are not yet fully autonomous_ as the page urls are hardcoded in the host application root layout links. Teams will have to coordinate with each others to make changes to the host application navigation everytime a new page is created or a page URL is updated.

To _enable fully autonomous teams_, the shell offer a functionality to let both remote and static modules dynamically register their navigation items at bootstrap.

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
                    <span>
                        Static1/Page 1 - Item with a React element as content + additional Link props
                    </span>
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
            content: "Static1/Page 2 - Item with children",
            children: [
                {
                    to: "static1/page-4",
                    content: "Static1/Page 4 - Child item"
                },
                {
                    to: "static1/page-5",
                    content: "Static1/Page 5 - Child item"
                }
            ]
        },
        {
            to: "static1/page-3",
            content: "Static1/Page 3 - Item with a top priority and custom additional props",
            priority: 99,
            additionalProps: {
                highlight: true
            }
        }
    ]);
};
```

Modules can use the `registerNavigationItems()` function to inform the host application about their navigation items. A navigation item must have a `to` and `content` props. The `content` prop can be a `string` value or a `React element`.

Let's focus on the navigation items registered by the static module as there are many features shown there.

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

    const renderItem: RenderItemFunction = useCallback(
        ({ content, linkProps, additionalProps: { highlight, ...additionalProps } }, index, level) => {
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

As it's a non trivial process, the shell provide an optional utility hook called `useRenderedNavigationItems()` to faciliate the parsing.

> If you prefer, you can parse the navigation items tree by yourself without using the utility hook.

The `useRenderedNavigationItems()` accept 2 render functions as a second and third parameter. The *second parameter* is a function to render a single link from a navigation item and the *third parameter* is a function to render a section of navigation items.

In this example, there are 2 sections. A root section containing all the navigation items, and a nested section containing only _"Static1/Page 4"_ and _"Static1/Page 5"_.

Each render function must return a single `React element`.

Notice that the `renderItem` function receive the `highlight` additional props. When provided, the host application root layout will render an "highlight" CSS class on the link. This is the type of use cases `additionalProps` are for.

👉 Start all the applications and libraries and try navigating between pages.

> **Note**
>
> It's important to provide memoized render functions to the `useRenderedNavigationItems()` hook as otherwise the navigation items will be parsed over and over on re-renders rather than being returned from the cache.

### Isolate module failures

One of the key caracteristic of micro-frontends implementations like [iframes](https://martinfowler.com/articles/micro-frontends.html#Run-timeIntegrationViaIframes) and subdomains is that a single module failure can't break the whole application. In our scenarion, the host application and the other modules would still be fully functional even if one fail with an unmanaged error.

With an implementation such as [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) or even a build time implementation with static modules, this is not the case by default as all the modules live in the same domain and share the same DOM.

The good news is that with [React Router](https://reactrouter.com) we can build something which will behave very similarly to iframe failures isolation by leveraging [Outlet](https://reactrouter.com/en/main/components/outlet) and a route [errorElement](https://reactrouter.com/en/main/route/error-element) prop.

In this example, the host application root layout is already using an `<Outlet />`, therefore all we have to do is adding a nested pathless route with an `errorElement` prop under the root layout to catch unmanaged errors from modules.

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

    logger.error(`[shell] An unmanaged error occured while rendering the 
        route with path ${location.pathname}`, error);

    return (
        <p className="error-message">
            An unmanaged error occured insisde a module and other parts of the application 
            are still fully functional!
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

As the pathless route has been declared under the root layout (the one with the the root layout as `element`), when an unmanaged error bubbles up and the error boundary is rendered, only the [Outlet](https://reactrouter.com/en/main/components/outlet) output will be replaced by the error boundary output, meaning other parts of the root layout around the Outlet will still be rendered.

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
        {
            path: "remote1/page-3",
            element: <Page3 />
        }
    ]);

    runtime.registerNavigationItems([
        {
            to: "remote1/page-3",
            content: "Remote1/Page 3 - Failing page"
        }
    ]);
};
```

👉 Start all the applications and libraries and navigate to _"Remote1/Page 3"_. The page will throw but the application should still be functional.

> **Warning**
>
> If your application support hoisted module routes (view the next section [override the host layout for a module page](#override-the-host-layout-for-a-module-page) for more information), failures isolation might not behave as explained in this section because hoisted routes will be rendered outside the host application error boundary. 
>
> To ensure strict failures isolation, an host application can either choose to not support hoisted module routes by not using the `useHoistedRoutes()` hook or allow only a predetermined subset of routes to be hoisted by using the `allowedPaths` option of the `useHoistedRoutes()` hook.

### Override the host layout for a module page

Most applications, usually have a default layout with at least a navigation menu and an authenticated user avatar. It's useful as 90% of the pages of an application tend to use the same layout. In fact, this is what we've done so far in those guides with the host application root layout (minus the authenticated user avatar, which will come later on 😃).

For the remaining 10%, there are use cases for which the default layout will not work thought. For example, a module might include a login page, or any other pages which are not bound to a user session.

For those pages, the shell provide a mecanism called "page hoisting". Contrary to a regular page, an hoisted page will be rendered at the root of the router, meaning outside the boundaries of the host application root layout.

Therefore, an hoisted page will not be affected by the default layout and is in full control of it's layout.

> **Note**
>
> By declaring a page as hoisted, the page will not be protected from failures anymore by the host application error boundary and could crash the whole application if an unmanaged error occurs. This is highly recommended that every hoisted page is assigned a React Router [errorElement](https://reactrouter.com/en/main/route/error-element) prop.

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
        {
            hoist: true,
            path: "remote1/page-4",
            element: <Page4 />,
            errorElement: <ErrorBoundary />
        }
    ]);

    runtime.registerNavigationItems([
        {
            to: "remote1/page-2",
            content: "Remote1/Page 2 - Overrided layout"
        },
        {
            to: "remote1/page-4",
            content: "Remote1/Page 4 - Hoisted route"
        }
    ]);
};
```

By setting the `hoist` prop to `true` for page _"Remote1/Page 2"_ we tell the shell to render the page at the root of the router rather than under the root layout of the host application. 

Since the page is not rendered within the boundaries of the host application root layout, we can set a custom layout to _"Remote1/Page 2"_ by [nesting routes](https://reactrouter.com/en/main/start/overview#nested-routes) adding an [Outlet](https://reactrouter.com/en/main/components/outlet) component.

The _"Remote1/Page 4"_ page is also hoisted. An hoisted page doesn't have to be assigned a custom layout, it can be rendered at the root on it's own!

👉 To test the changes, start all the applications and navigate to _"Remote1/Page 2"_ and _"Remote1/Page 4"_. You should still see the root layout of the host application for both pages. What's going on?

By default, the shell doesn't allow page hoisting. To use page hoisting, the module routes must go through the `useHoistedRoutes()` hook before being passed down to the router.

👉 Let's update the host application to support page hoisting by adding the `useHoistedRoutes()` hook.

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

    const wrapManagedRoutes = useCallback((managedRoutes: Readonly<Route[]>) => {
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

    // Using the useHoistedRoutes hook allow routes hoisted by modules to 
    // be rendered at the root of the router.
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

Notice that a `wrapManagedRoutes` option is provided to the `useHoistedRoutes()` hook. This is an optional function which allow the caller to nest the *"non hoisted routes"* under a specific route. In this example, the `wrapManagedRoutes` option is used to wrap all the modules managed routes under a root layout and a root error boundary.

> It's important to provide a memoized function for the `wrapManagedRoutes` option. Not doing so will cause the hoisting code to be executed on every re-render instead of using the cache.

As mentionned in the [isolate module failures](#isolate-module-failures) section, an host application could only allow page hoisting to a subset of predeterminate routes. To do so, pass an array of route paths to the `allowedPaths` option of the `useHoistedRoutes()` hook. Any pages with a path which is not included in the array will generate an exception.

```tsx
const hoistedRoutes = useHoistedRoutes(routes, {
    wrapManagedRoutes,
    allowedPaths: [
        "remote1/page-2",
        "remote1/page-4"
    ]
});
```

👉 Now, let's start all the applications again and navigate to _"Remote1/Page 2"_ and _"Remote1/Page 4"_. You shouldn't see the host application root layout anymore.

### Share a user session

The shell runtime offer a mecanism to share a user session object between the host and the modules.

To keep things simple, for this example, we'll use the fake user session manager implementation from the `wmfnext-fakes` package. 

> The `wmfnext-fakes` package is a collection of fake implementation designed to faciliate the development of a module in isolation and demos applications like this one.

👉 The first things to do, are to create a session manager instance to store the session object and a session accessor function to access the session.

```ts
// host -session.ts

import type { Session } from "wmfnext-shared";
import type { SessionAccessorFunction } from "wmfnext-shell";
import { SessionManager } from "wmfnext-fakes";

export const sessionManager = new SessionManager<Session>();

export const sessionAccessor: SessionAccessorFunction = () => {
    return sessionManager.getSession();
};
```

> The `SessionManager` instance has been created with a shared TS type called `Session` imported from the package `wmfnext-shared`. We'll create this package later in this section and explain why we need it.

👉 Then, add a login page to the host application and use the newly created session manager to store the session object. Make sure to register the login page at the root of the router.

```tsx
// host - Login.tsx

import { sessionManager } from "../session";
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
            sessionManager.setSession({
                user: {
                    name: temp
                }
            });

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

👉 The last step before creating the shared package and and using the session in the remote module is to connect everything together by passing the session accessor to the shell runtime at instanciation.

```tsx
// host - bootstrap.tsx

import { sessionAccessor } from "./session";

...

const runtime = new Runtime({
    loggers: [new ConsoleLogger()],
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

The `sessionAccessor()` function created earlier is passed down to the shell runtime at instanciation through the `sessionAccesor` option. Since the `sessionManager` instance have access to the user session and the `sessionAccessor()` function knows how to accessed the current user session from the `sessionManager`, modules will have access to the session through the runtime instance.

The runtime session instance can either be accessed anywhere from the runtime instance:

```tsx
// remote-1 - register.tsx

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    const session = runtime.getSession();
});
```

Or in a React component scope with the `useSession` hook:

```tsx
export function Page() {
    const session = useSession() as Session;
    ...
}
```

> A suspense boundary has also been added around the `<App />` component. *At the moment, I don't understand why it is necessary, but otherwise the application will throw when navigating between pages.*

👉 Now, for the host application and the remote module to share the same `Session` TS type, there's no secret magic sauce, we must create a shared package. The package can live it's own repo or be part of the host application monorepos. For this example, we'll add the project to the host application monorepos.

```
packages
├── app (the host application)
├── shared (the new shared package)
├─────src
├────── components
├────── services
├────── events
├────── utils
├────── types
├───────── session.ts
├────── index.ts
├─────package.json
```

> **Note**
>
> To keep things simple for those guides, everything is added to the same shared package. When developing a real application, we recommend splitting the shared code in multiple standalone packages to maximise dependency segregation, improve cohesion and minimize the scope of a package update.

👉 Create the new shared project and add the session TS type.

```ts
// shared - session.ts

export interface Session {
    user: {
        name: string;
    };
}
```

👉 Next, create a new page in the remote module using the current user session to render the user name.

```tsx
// remote-1 - Page5.tsx

import { useLogger, useSession } from "wmfnext-shell";
import { Session } from "wmfnext-shared";

export default function Page5() {
    const logger = useLogger();
    const session = useSession() as Session;

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

👉 Then, add references to the newly created `wmfnext-shared` package and start everything. 

1. Navigate to the login page
2. Authenticate with "temp" / "temp"
3. Navigate to the _"Remote1/Page 5"_ page
4. The user name should be rendered in the page content.

👉 The application will work fine has long as every users manually do the previous steps. I doubt those expections will stand with real users. Let's use React Router [nested routes](https://reactrouter.com/en/main/start/overview#nested-routes) to protect the routes depending on the user session by redirecting unauthenticated users to the login page.

```tsx
// host - App.jsx

import { Navigate, Outlet } from "react-router-dom";
import { useIsAuthenticated } from "wmfnext-shell";

// Will redirect to the login page if the user is not authenticated.
function AuthenticationBoundary() {
    return useIsAuthenticated() ? <Outlet /> : <Navigate to="/login" />;
}

export function App() {
    const wrapManagedRoutes = useCallback((managedRoutes: Readonly<Route[]>) => {
        return {
            // Pathless route to set an authentication boundary around the 
            // managed routes of the application.
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
}
```

The `AuthenticationBoundary` component is using the `useIsAuthenticated()` hook to determine if a user is authenticated or not. Alternatively, the `useSession()` hook could also be used.

By wrapping the root layout with the `<AuthenticationBoundary />` element, only authenticated users will have access to the managed module routes that are not hoisted.

👉 Clear your session storage and navigate to any route protected by the authentication boundary. You should be redirected to the login page.

There's one more thing to do thought. [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) have this concept called [shared dependencies](https://dev.to/infoxicator/module-federation-shared-api-ach) and... well we added a package shared by every application.

👉 Before jumping to the next section, let's add the `wmfnext-shared` package as a shared singleton for the host application and the remote module.

```js
// host - webpack.dev.js

export default {
    plugins: [
        new ModuleFederationPlugin(
            createHostConfiguration("host", packageJson, {
                sharedDependencies: {
                    "wmfnext-shared": {
                        singleton: true,
                        requiredVersion: "0.0.1"
                    }
                }
            })
        )
    ]
}
```

```js
// remote-1 - webpack.dev.js

export default {
    plugins: [
        new ModuleFederationPlugin(
            createModuleConfiguration("remote1", packageJson, {
                sharedDependencies: {
                    "wmfnext-shared": {
                        singleton: true,
                        requiredVersion: "0.0.1"
                    }
                }
            })
        )
    ]
}
```

### Use the event bus

To faciliate a loosely coupled communication between the parts of the federated applications, the shell offer a basic implementation of a pub/sub mecanism called the event bus.

👉 To showcase how it works, we'll start by adding a counter functionality to the host application and an event listener to increment the value when a specific event is dispatched.

```tsx
// host - RootLayout.tsx

import { useEventBusListener } from "wmfnext-shell";
import { IncrementCountEvent } from "wmfnext-shared";

export function RootLayout() {
    // The counter is basically only a useState.
    const [count, setCount] = useState(0);

    // Add an event listener to react to increment request from independent modules.
    useEventBusListener(IncrementCountEvent, () => {
        setCount(x => x + 1);
    });

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

In this example, the root layout is using the `useEventBusListener` hook to listening for increment event. The listener could also have been added by using the runtime API but in a component, it's convenient to use the hook as it also takes care of disposing the listener when the component re-render.

If you want to use the event bus outside of a React component scope, access the event bus directly from the runtime:

```tsx
// remote-1 - register.tsx

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    const eventBus = runtime.eventBus;
});
```

👉 Next, add a new page to the remote module application to dispatch increment events.

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
        // When the button is clicked, an increment event is dispatched.
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

👉 Start all the applications and libraries and navigate to the _*Remote1/Page 6*_ page. Click on the button *"Increment count"*. Everytime the button is clicked, the top left counter should increment by 1.

### Share a custom service

The shell offer a few services by default but by no mean covers all the services a mature application will need. That's why the shell runtime accept at instanciation a bucket of additional custom services to make available for all the modules.

👉 First, create a custom tracking service in the host application.

```tsx
// host - trackingService.ts

export class TrackingService {
    track(data: unknown) {
        console.log("[tracking] Tracking the following data: ", data);
    }
}
```

👉 Then register the service with the runtime by passing the `services` option.

```tsx
// host - bootstrap.tsx

import { TrackingService } from "./trackingService";

const runtime = new Runtime({
    loggers: [new ConsoleLogger()],
    // Register the tracking service with "tracking" as the key.
    services: {
        "tracking": new TrackingService()
    },
    sessionAccessor
});
```

👉 Before a module can use the shared custom service, it's TS type must be shared. To do so, we'll reuse the *"shared"* package created earlier.

```tsx
// shared - trackingService.ts

export interface TrackingService {
    track: (data: unknown) => void;
}
```

The tracking service instance can now be retrieved by any module from the runtime:

```ts
// remote-1 - register.tsx

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    const trackingService = runtime.getService("tracking");
});
```

👉 As the tracking service will mostly be used by React components, for convenience and maintability, we'll create a `useTrackingService()` hook to retrieve the service instance.

```tsx
// shared - trackingService.ts

import { useRuntime } from "wmfnext-shell";

export interface TrackingService {
    track: (data: unknown) => void;
}

export function useTrackingService() {
    const runtime = useRuntime();

    return runtime.getService("tracking") as TrackingService;
}
```

👉 Finally, create a new page in the remote module and use the tracking service.

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

👉 Start all the application and navigate to the _"Remote1/Page 7"_ page. Open the console and you should see the following log:

```
[tracking] Tracking the following data: {page: 'page7', module: 'remote-1'}
```

### Use a custom logger

For most applications, a console logger is not enough as the application have to integrate with specific remote logging solutions like [Datadog](https://www.datadoghq.com/) and [Azure Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview).

Hopefully, the shell runtime accepts any custom loggers as long as it implements the `Logger` interface.

👉 For this example, we'll create a new logger in the host application that also log to the console.

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

👉 Once it's created, update the host application to register an instance of the `CustomLogger` in the runtime.

```tsx
// host - bootstrap.tsx

import { CustomLogger } from "./customLogger";

const runtime = new Runtime({
    loggers: [
        new ConsoleLogger(),
        new CustomLogger()
    ],
    services: {
        [TrackingServiceKey]: new TrackingService()
    },
    sessionAccessor
});
```

👉 Start all the applications and libraries, then open the dev tools and refresh the application. The console logs should now be displayed twice.

```
[shell] Found 1 static modules to register
[custom-logger] [shell] Found 1 static modules to register
```

### Fetch data

React Router v6+ is really good at data fetching with the [loader API](https://reactrouter.com/en/main/route/loader). For this example, we'll render the first 5 characters returned by the [Rick and Morty API](https://rickandmortyapi.com/).

 > Depending of the needs of your application, there might be a more appropriate data feching solution than React Router loaders for your application. To only name one, [TanStack Query](https://tanstack.com/query/latest) is also a great choice if your application needs to prefetch a lot of data and you are thinking about using a client side state management solution. 
 
👉 First, add a new page to the remote module application.

```tsx
// remote-1 - Page8.tsx

import { useLoaderData } from "react-router-dom";
import { useLogger } from "wmfnext-shell";

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

👉 Then, register the page and set a React Router [loader](https://reactrouter.com/en/main/route/loader) function.

```tsx
// remote-1 - register.tsx

...

const Page8 = lazy(() => import("./pages/Page8"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        {
            path: "remote1/page-8",
            element: <Page8 />,
            // New loader function fetching the API data.
            loader: async function loader() {
                return fetch("https://rickandmortyapi.com/api/character/1,2,3,4,5", {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    }
                });
            }
        }
    ]);

    runtime.registerNavigationItems([
        {
            to: "remote1/page-8",
            content: "Remote1/Page 8 - Fetch data"
        }
    ]);
};
```

👉 Start all the applications and libraries and navigate to the _"Remote1/Page 8"_ page. You should see the Rick and Morty characters at the bottom of the page.

### Develop a module in isolation

Intro with a shared project

#### Remote modules

#### Static modules

## 🔧 API

### Remote module loader

TBD

### Static module loader

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

### Configure for production

TBD

## 🙏 Contributors guide

To contribute, have a look at the [contributors guide](./CONTRIBUTING.md).
