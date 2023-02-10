# wmfnext-shell

> **Warning**
>
> This repository will not be maintained as it's purpose is to inspire teams by showcasing how a federated SPA could be build on top of [Webpack Module Federation](https://webpack.js.org/concepts/module-federation) and [React Router](https://reactrouter.com/).

Webpack Module Federation is a powerful tool for sharing code and dependencies across independent codebases. However, as is, it's pretty raw as it's a low level mecanism.

This shell adds a thin layer on top of Webpack Module Federation by complementing the sharing mechanism with additional functionalities. These functionalities aim to ease the adoption of a federated application architecture by providing an opinionated direction on how it should be implemented.

### How does it work?

1. At bootstrap, the host application will try to load predefined modules and call a registration function matching a specific name and signature for each module that is successfully loaded.

2. During it's registration, a module will receive the shared services of the federation application and use them to dynamically register its routes and navigation items.

3. Once all the remote modules are registered, the host application will create a React Router instance with the registered routes and will also render a navigation menu with the registered navigation items.

That's it in a nutshell. Of course, there's more to it, but those are the main ideas.

One more thing, a module is always a set of pages for a unique subdomain of the application. There is no such thing as loading a standalone remote component with this shell.

### Remote modules vs Static modules

Loading remote modules at runtime with Webpack Module Federation is the reason why this shell exists and it is what we recommend products to aim for. It enables teams to be fully autonomous by deploying their modules independently from the other parts of the application.

However, we understand that _teams working on mature products_ will most likely prefer to _gradually migrate towards a distributed architecture_ by first extracting subdomains into independent modules in their current monolithic setup before fully committing to remote modules loaded at runtime.

To facilitate the transition, this shell also supports static modules registered at build time.

A static module is a local code bundle exposing a registration function. A registration function could be imported from a standalone package, a sibling project in a monorepo setup, or even a local folder of the host application.

Both remote and static modules can be used in the same application as this shell supports dual bootstrapping. For example, an application could be configured to load a few remote modules at runtime and also register a few static modules at build time."

## 📌 Table of contents

- [Features](#-features)
- [Examples](#-examples)
- [Installation](#-installation)
- [Basic usage](#-basic-usage)
- [Guides](#-guides)
    - [Setup an host application](#setup-an-host-application)
    - [Setup a remote module](#setup-a-remote-module)
    - [Register a module routes](#register-a-module-routes)
    - [Re-render the host application after the remote modules are ready](#re-render-the-host-application-after-the-remote-modules-are-ready)
    - [Setup a static module](#setup-a-static-module)
    - [Register a module navigation items](#register-a-module-navigation-items)
    - [Isolate module failures](#isolate-module-failures)
    - [Override the host layout](#override-the-host-layout)
    - [Share a user session](#share-a-user-session)
    - [Use the event bus](#use-the-event-bus)
    - [Share a custom service](#share-a-custom-service)
    - [Use a custom logger](#use-a-custom-logger)
    - [Data and state](#data-and-state)
    - [Develop a module in isolation](#develop-a-module-in-isolation)
- [API](#-api)
    - [wmfnext-shell package](#wmfnext-shell-package)
        - [Runtime](#runtime)
        - [Static modules registration](#static-modules-registration)
        - [Routing](#routing)
        - [Navigation items](#navigation-items)
        - [Logging](#logging)
        - [Messaging](#messaging)
        - [Utils](#utils)
    - [wmfnext-remote-loader package](#wmfnext-remote-loader-package)
        - [Remote modules registration](#remote-modules-registration)
        - [Webpack config utils](#webpack-config-utils)
    - [wmfnext-fakes package](#wmfnext-fakes-package)
- [Contributors guide](./CONTRIBUTING.md)

## 🙌 Features

- Loading of hosted remote modules at runtime
- Loading of static modules at build time
- Routing
- Navigation
- Shared user session
- Cross application messaging
- Logging
- Failures isolation
- Development of modules in isolation

## 🎉 Examples

- [Live example](https://wmfnext-host.netlify.app) hosted on Netlify.
- [wmfnext-host](https://github.com/patricklafrance/wmfnext-host) is an example of an host application. The repository also includes a static module example.
- [wmfnext-remote-1](https://github.com/patricklafrance/wmfnext-remote-1) is an example of a remote module.

## 🤘 Installation

To install the packages, [open a terminal in VSCode](https://code.visualstudio.com/docs/editor/integrated-terminal#_managing-multiple-terminals) and execute the following command at the root of the projects workspaces (host and modules):

```bash
yarn add wmfnext-shell
```

❗ If you wish to include remote modules also execute the following command at the root of the projects workspaces (host and every remote module):

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

If you don't want to go through our guides, here's a minimal example of how to create a federated SPA using this shell. The example focuses solely on a remote modules and omits static modules.

To learn more about the built-in features/options of this shell and static modules, refer to the [guides](#-guides) and the [API](#-api) section.

### Host application

👉 First, create a new application with the following files:

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

👉 Then, in the `boostrap.tsx` file, instanciate the shell `Runtime` and load the remote module:

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

> To learn more about the `bootstrap.tsx` file, read the following [article](https://dev.to/infoxicator/module-federation-shared-api-ach#using-an-async-boundary).

👉 Next, in the `App.tsx` file, retrieve the routes registered by the module and create the router:

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

    // Retrieve the routes registered by the module.
    const routes = useRoutes(runtime);

    // Create the router with an home page and the module routes.
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

👉 Then, create the `RootLayout` component to render the navigation items:

```tsx
// host - RootLayout.tsx

import { Link, Outlet } from "react-router-dom";
import { Suspense } from "react";
import { useNavigationItems } from "wmfnext-shell";

export function RootLayout() {
    // Retrieve the navigation items registered by the module.
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

👉 Finally, add `ModuleFederationPlugin` to the `webpack.config.js` file by using the `createHostPlugin()` function:

```js
// host webpack.config.js

import { createHostPlugin } from "wmfnext-remote-loader/webpack.js";
import packageJson from "../package.json" assert { type: "json" };

export default {
    plugins: [
        createHostPlugin("host", packageJson)
    ]
}
```

👉 Start the host application, you should see the home page. Even if the remote module application doesn't exist yet, the host application will render what is currently available, e.g. only the host application at the moment.

### Remote module

👉 Start by creating a new application with a `register.tsx` file and a page:

```
remote-1
├── src
├──── register.tsx
├──── Page1.tsx
├── webpack.config.js
```

👉 Then, use the `register.tsx` file to register the module pages and navigation items:

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

👉 And add the `ModuleFederationPlugin` to the `webpack.config.js` file by using the `createModulePlugin()` function. Make sure the `entry` property value is set to `./src/register.tsx` rather than the default index file:

```js
import { createModulePlugin } from "wmfnext-remote-loader/webpack.js";
import packageJson from "../package.json" assert { type: "json" };

export default {
    entry: "./src/register.tsx",
    plugins: [
        createModulePlugin("remote1", packageJson)
    ]
}
```

👉 Start the remote module application, then the host application. You should see a navigation item named _"Remote1/Page 1"_. Click on the link to navigate to the federated page.

> If you are having issues, make sure that both applications `package.json` files have `react`, `react-dom`, `react-router-dom`, `wmfnext-shell` and `wmfnext-remote-loader` listed in their dependencies. The dependency versions should be the same for both applications.

## 📚 Guides

In the following guides, we'll go through the process of creating a federated SPA leveraging this shell. As we progress, we'll gradually add more parts to the application, ultimately resulting in an application that matches the following diagram:

<br />
<p align="center">
    <img alt="Target application" src="./diagram-dark.svg#gh-dark-mode-only" />
    <img alt="Target application" src="./diagram-light.svg#gh-light-mode-only" />
</p>

### Setup an host application

👉 First, create an host application. According to [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) best practices we'll create 3 files:

```
host-app
├── src
├──── App.tsx
├──── bootstrap.tsx
└──── index.ts
```

👉 Then, add an `App` component to the `App.tsx` file. The `App` component will be the entry point of the React application:

```tsx
// host - App.tsx

export function App() {
    return (
        <div>Hello world!</div>
    );
}
```

👉 Then, add a dynamic import to the `bootstrap.tsx` file:

> This indirection is called an "async boundary". It is necessary so that Webpack can load all the remote modules and their dependencies before rendering the host
> application. More information can be found [here](https://dev.to/infoxicator/module-federation-shared-api-ach#using-an-async-boundary).
>
> If you're not using any remote modules you don't need a `bootstrap.tsx` file.

```ts
// host - index.ts

import("./bootstrap");
```

👉 Next, add the following code to the `boostrap.tsx` file to render the React application:

```tsx
// host - bootstrap.tsx

import { App } from "./App";
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root"));

root.render(
    <App />
);
```

> **Note**
>
> If your application is not loading any remote modules, you can skip the `bootstrap.tsx` file and move the previous code to the `index.ts` file.

Now, let's say that you want to load a remote module at runtime using [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/) (make sure you installed `wmfnext-remote-loader` dependency).

👉 First, add the [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin) plugin to the Webpack configuration with the `createHostPlugin(moduleName, packageJson, options)` function:

```js
// host - webpack.dev.js

import { createHostPlugin } from "wmfnext-remote-loader/webpack.js";
import packageJson from "./package.json" assert { type: "json" };

export default {
    plugins: [
        // Only use the ModuleFederationPlugin plugin if you
        // are loading remote modules at runtime.
        createHostPlugin("host", packageJson)
    ]
}
```

<details>
    <summary>View the full Webpack config</summary>
    <br />

```js
// host - webpack.dev.js

import { createHostPlugin, getFileDirectory } from "wmfnext-remote-loader/webpack.js";
import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import packageJson from "./package.json" assert { type: "json" };

const __dirname = getFileDirectory(import.meta);

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
        // Only use the ModuleFederationPlugin plugin if you
        // are loading remote modules at runtime.
        createHostPlugin("host", packageJson),
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        })
    ]
};
```

```html
<!-- host - public/index.html -->

<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```
</details>

> **Note**
>
> If you are using a [CommonJS](https://en.wikipedia.org/wiki/CommonJS) Webpack configuration file, import the `createHostPlugin()` function from `wmfnext-remote-loader/webpack.cjs` instead.

You may have noticed that the `ModuleFederationPlugin` instance is created by the `createHostPlugin()` function.

The `createHostPlugin()` function is a built-in utility function that helps configure the federation plugin by enforcing the shell conventions and adding the mandatory shared dependencies.

The function takes as it's first parameter the name of the application and as its second parameter a `package.json` configuration. At build time, the function parses the package configuration to search for the version of the mandatory shared dependencies of the shell.

> Mandatory shared dependencies are libraries like [react](https://reactjs.org/), react-dom, [react-router-dom](https://reactrouter.com/) and the shell itself.

The `createHostPlugin()` function also accepts a third parameter, an object literal used to specify options. One of those option is a `sharedDependencies` object. With this object, you can specify additional shared dependencies that are specific to your application, such as a design system library.

If the `requiredVersion` of a shared dependency is not specified, the `createHostPlugin()` function will try to resolve the dependency version from the provided package configuration.

The `sharedDependencies` object support the same syntax as the `ModuleFederationPlugin` [shared object](https://webpack.js.org/plugins/module-federation-plugin/#sharing-hints).

```js
export default {
    plugins: [
        createHostPlugin(
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
    ]
};
```

👉 Then, add your [TypeScript configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) to the root of the project and include a command in the `package.json` file to start Webpack in development mode:

```json
{
    "scripts": {
        "dev": "webpack serve --config webpack.dev.js"
    }
}
```

> **Note**
>
> You can find a TS configuration sample in the [host application example repository](https://github.com/patricklafrance/wmfnext-host/tree/master/packages/app).

👉 Now that the basics are covered, let's dive into the more exciting stuff and start using built-in features of the shell. Open the `bootstrap.tsx` file and instanciate a `Runtime` object:

```tsx
// host - bootstrap.tsx

import { ConsoleLogger, RuntimeContext, Runtime } from "wmfnext-shell";
import { App } from "./App";
import { createRoot } from "react-dom/client";

// Instanciate a runtime instance to share among the host and the modules.
// The runtime instance will give modules access to functionalities such as
// routing and navigation.
const runtime = new Runtime({
    // The shell comes with a basic console logger.
    loggers: [new ConsoleLogger()]
});

const root = createRoot(document.getElementById("root"));

root.render(
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

👉 Then, register the remote module:

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
        // The remote name must match the name defined in the remote application
        // Webpack configuration that we'll define later.
        name: "remote1"
    }
];

// Instanciate a runtime instance to share among the host and the modules.
// The runtime instance will give modules access to functionalities such as
// routing and navigation.
const runtime = new Runtime({
    // The shell comes with a basic console logger.
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

> The remote modules are registered in the `bootstrap.ts` file rather than the `App.tsx` file as they must be loaded inside the "async boundary".

At bootstrap, the `registerRemoteModules(modules, runtime)` function will try to load the provided modules asynchronously, and then register every module that succesfully loads.

If an error occurs during the process, a message will automatically be logged with the runtime logger.

If you prefer to handle errors manually, you can chain an handler to the returned [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) object:

```js
import { RegistrationError } from "wmfnext-remote-loader";

registerRemoteModules(Remotes, runtime)
    .then((errors: RegistrationError[]) => {
        if (errors.length > 0) {
            runtime.logger.error("Errors occured while registering remotes: ", errors);
        }
    });
```

> **Note**
>
> The `registerRemoteModules()` function can only be called once. Attempting to call the function twice will result in an error.

👉 Start the host application with the `dev` command. You should see a page displaying _"Hello world!"_. Even if the remote module application has not been created yet, the host application will render what is currently available. In this case, it's the default page of the host application.

### Setup a remote module

Now that we have a working host application, it's time to create our first module.

👉 Let's start by creating a new application with the following files:

```
remote-1
├── src
├──── App.tsx
└──── index.tsx
```

👉 Then, add an `App` component to the `App.tsx` file. It will be the entry point of the React application:

```tsx
// remote-1 - App.tsx

export function App() {
    return (
        <div>Hello from remote!</div>
    );
}
```

👉 And, add the following code to the `index.tsx` file to render the React application:

```tsx
// remote-1 - index.tsx

import { App } from "./App";
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root"));

root.render(
    <App />
);
```

👉 Next, add the [ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin) plugin to the Webpack config file with the `createModulePlugin(moduleName, packageJson, options)` function:

```js
// remote-1 - webpack.dev.js

import { createModulePlugin } from "wmfnext-remote-loader/webpack.js";
import packageJson from "./package.json" assert { type: "json" };

export default {
    plugins: [
        createModuleConfiguration("remote1", packageJson)
    ]
}
```

<details>
    <summary>View the full Webpack configuration</summary>
    <br />

```js
// remote-1 - webpack.dev.js

import HtmlWebpackPlugin from "html-webpack-plugin";
import { createModulePlugin, getFileDirectory } from "wmfnext-remote-loader/webpack.js";
import path from "path";
import packageJson from "./package.json" assert { type: "json" };

const __dirname = getFileDirectory(import.meta);

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
        createModuleConfiguration("remote1", packageJson),
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        })
    ]
};
```

```html
<!-- remote-1 - public/index.html -->

<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```
</details>

> **Note**
>
> If you are using a [CommonJS](https://en.wikipedia.org/wiki/CommonJS) Webpack configuration file, import the `createModulePlugin()` function from `wmfnext-remote-loader/webpack.cjs` instead.

The `createModulePlugin()` function serve the same purpose as the `createHostPlugin()` but return a `ModuleFederationPlugin` instance configured for a remote module application instead.

👉 Then, add your [TypeScript configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) to the root of the project and include a command in the `package.json` file to start Webpack in development mode:

```json
{
    "scripts": {
        "dev": "webpack serve --config webpack.dev.js"
    }
}
```

> **Note**
>
> You can find a TS configuration sample in the [remote-1 application example repository](https://github.com/patricklafrance/wmfnext-remote-1).

👉 Start the remote module application with the `dev` command. You should see a page displaying __Hello from remote!__.

Now, as stated in the introduction of this document, the purpose of the shell is to provide an _opinionated direction_ on how to _implement a federation application_.

💡 Our first take is that a module should _always match a subdomain_ of the application business domain and should _only export pages_.

To do so, by convention, a remote module must share a single file named `remoteEntry.js` and that file must expose a single module named `./register` exporting a `register(runtime, context)` function responsible of registering the pages and navigation items of the remote module.

👉 So, let's create a `register.tsx` file at the root of the remote module project with the following files:

```
remote-1
├── src
├──── App.tsx
└──── index.ts
└──── register.tsx
```

```tsx
// remote-1 - register.tsx

import { ModuleRegisterFunction } from "wmfnext-shell";

export const register: ModuleRegisterFunction = (runtime, context) => {
    runtime.logger.log("Remote 1 registered", context);
};
```

For now we won't register any routes or navigation items. Instead, we'll use the `Runtime` instance to log something in the console.

👉 Update the Webpack config to use the `/src/register.tsx` file as the entry point of the application rather than the default index file:

```js
export default {
    entry: "./src/register.tsx"
};
```

👉 In separate terminals, start the remote module application with the `dev` command, then the host application with the `dev` command. Refresh the host application, you should see similar logs if you open the dev tools:

```bash
[shell] Found 1 remote modules to register
[shell] 1/1 Loading module "./register" from container "remote1" of remote "http://localhost:8081/remoteEntry.js"
[shell] 1/1 Registering module "./register" from container "remote1" of remote "http://localhost:8081/remoteEntry.js"
Remote 1 registered
[shell] 1/1 container "remote1" of remote "http://localhost:8081/remoteEntry.js" registration completed"
```

### Register a module routes

If you successfully completed the previous steps, you should have a federated application that.... doesn't do much.

To start rendering federated routes, we'll have to make a few changes to both applications.

👉 Let's start by adding [React Router](https://reactrouter.com/) to the `App` component. Any version greater than `6.4` will work as long as the new [createBrowserRouter()](https://reactrouter.com/en/main/routers/create-browser-router) function is available:

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

👉 Start the application to validate that the home page successfully renders.

That's great progress but the home page is a local page of the host application; there's nothing fancy there! To render federated routes, there are a few other additions to make.

👉 First, retrieve the module routes with the `useRoutes()` hook and add those routes to the router:

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
    // Retrieve the routes registered by the modules.
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
                    // Add the modules routes to the router.
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

👉 Then update the remote module `register.tsx` file to register a few routes with the `runtime.registerRoutes(routes)` function:

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

The `runtime.registerRoutes()` function accepts an array of route objects. These route objects accept the same properties as the React Router [`RouteObject`](https://reactrouter.com/en/main/route/route#type-declaration) with a few additional properties (which will be revealed in upcoming guides).

👉 Next update the host application `RootLayout` component to add links to those newly registered federated routes:

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

👉 Start both applications and try navigating to _"/remote1/page-1"_ and _"remote1/page-2"_. You should be redirected to a 404 page, what's going on?

### Re-render the host application after the remote modules are ready

> **Warning**
>
> You can skip this section if your host application is strictly importing static modules.

You are redirected to a 404 page because the host application rendered **before** the remote module is registered. Therefore, only the host application routes were added to the router at the time the application rendered.

To fix this, the host application must re-render once the remote module is registered.

To help with that, the shell comes with a build-in `useAreRemotesReady()` hook.

The `useAreRemotesReady()` hook takes care of re-rendering the application once all the remote modules are ready (registered) and return a `boolean` value indicating if the remote applications are ready. This is useful as you'll probably want to show a loading indicator while the remote modules are registering.

> If you are not using the `useAreRemotesReady()` hook and you need access to the remote modules registration status you can import a `registrationStatus` variable from the `wmfnext-remote-loader` package.

👉 To fix this, first update the host application `App` component to use the `useAreRemotesReady()` hook. Then, use the `boolean` value returned by the hook to conditionally render a loading message:

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

👉 Finally, move the home page to the remote module by replacing the page registration object `path` property with an `index` property and deleting the `HomePage` component from the host application:

```tsx
// host - App.tsx

export function App() {
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
}
```

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
                    {/* Remove the home page from the links and update the "Remote1/Page1"
                        page link "to" property to "/" as it's now the index route.
                    */}
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

const Page1 = lazy(() => import("./pages/Page1"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        {
            // Remove the "path" property and add an "index" property.
            index: true,
            element: <Page1 />
        }
    ]);
};
```

👉 Start both applications again and try navigating between pages. Everything should be working fine now.

> If you are still having issues, make sure that both applications `package.json` files have `react`, `react-dom`, `react-router-dom`, `wmfnext-shell` and `wmfnext-remote-loader` listed in their dependencies. The dependency versions should be the same for the host and the module application.

### Setup a static module

> **Warning**
>
> Before reading this section, make sure you already when trough the following sections:
> - [Setup an host application](#setup-an-host-application)
> - [Register a module routes](#register-a-module-routes)

This shell also supports static modules loaded at build time to accomodate different migration scenarios.

A static module can be a sibling project of the host application in a monorepo setup, a standalone package developed in its own repository or even a folder of the host application.

For this example, our static module will be a sibling project in the host application monorepo:

```
packages
├── app (the host application)
├── static-1
├─────src
├───────register.tsx
├─────package.json
```

👉 First, create the project with the following `package.json` fields:

```json
{
    "name": "wmfnext-static-1",
    "version": "0.0.1",
    "main": "dist/register.js"
}
```

👉 Then, register a few pages in the `register.tsx` file using the `runtime.registerRoutes()` function:

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

👉 Now, open the host application's `package.json` file and add a dependency to the newly created project:

```json
{
    "dependency": {
        "wmfnext-static-1": "0.0.1"
    }
}
```

👉 Next, update the host application's `bootstrap.tsx` file to import the `register` function of the static module package and use it to register the module at build time using the `registerStaticModules(registerFunctions, runtime, options)` function:

```tsx
// host - bootstrap.tsx

import { ConsoleLogger, RuntimeContext, Runtime, registerStaticModules } from "wmfnext-shell";
import type { RemoteDefinition } from "wmfnext-remote-loader";
import { App } from "./App";
import { createRoot } from "react-dom/client";
import { registerRemoteModules } from "wmfnext-remote-loader";
import { register as registerModule } from "wmfnext-static-1";

const StaticModules = [
    registerModule
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

By calling the `registerStaticModules()` function with the static module's `register` function, the module's routes will be added to the host application router at build time.

👉 Then, update the host application's `RootLayout` component to add links to the static module's pages:

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

👉 And, add your [TypeScript configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) to the root of the project and include a command in the `package.json` file to transpile the code using the `tsc` CLI.

```json
{
    "scripts": {
        "dev": "tsc --watch --project ./tsconfig.json"
    }
}
```

> **Note**
>
> You can find a TS configuration sample in the [static-1 application example repository](https://github.com/patricklafrance/wmfnext-host/tree/master/packages/static-module-1).

👉 Finally, update the host application's file `package.json` file to add a reference to the newly created `wmfnext-static-module-1` package.

👉 Start the applications with the `dev` command and navigate to _"static1/page-1"_ and _"static1/page-2"_, the pages should render without any errors.

### Register a module navigation items

We now have a federated SPA displaying pages from a remote module loaded at runtime and a static module registered at build time.

Still, _teams are not fully autonomous yet_ as links to pages are hardcoded in the host application layout. To change those links, teams have to coordinate with each others.

💡 Our second take is that a module should be fully autonomous. It shouldn't have to coordinate with other parts of the application for things as trivial as navigation links.

To _enable fully autonomous teams_, the shell has built-in support for dynamic navigation items. With this feature, a module can dynamically register its navigation items at registration.

👉 To use the feature, first update every module's `register.tsx` file to add navigation items with the `runtime.registerNavigationItems(navigationItems)` function.

```tsx
// remote-1 - register.tsx

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
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

import { ArchiveIcon } from "./ArchiveIcon";

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
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

A navigation item object accepts the same properties as a React Router [Link](https://reactrouter.com/en/main/components/link) component with the addition of the `content`, `priority`, `children` and `additionalProps` properties.

There are a couple things worth mentionning in the previous code sample:

1. The navigation item labelled  _"Static1/Page 1"_ has rich content value. The `content` property accepts a `string` value or a `React element` value.

2. The navigation item labelled  _"Static1/Page 1"_ has a `style` and `target` properties. Those properties are valid because they are supported by the React Router [Link](https://reactrouter.com/en/main/components/link) component.

3. The navigation item labelled _"Static1/Page 3"_ has a `priority` property. The `priority` property allows a navigation item to render higher in the navigation items hierarchy. The higher the `priority`, the higher the navigation item will be rendered.

4. The navigation item labelled _"Static1/Page 3"_ also has an an `additionalProps` property. It's an untyped bucket property to provide contextual value to the render function of the application.

5. The navigation item labelled _"Static1/Page 2"_ has a `children` property with nested navigation items. The navigation registry is a tree structure with an infinite numbers of levels.

👉 Now, update the host application's `RootLayout` component to render the module navigation items with the `useNavigationItems()` hook:

```tsx
// host - RootLayout.tsx

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

The `useNavigationItems()` hook returns the navigation items tree structure as is, meaning you'll still have to recursively parse the structure to transform the items into actual React components.

As it's a non-trivial process, the shell provides a utility hook called `useRenderedNavigationItems(navigationItems, renderItem, renderSection)` to help with that.

The `useRenderedNavigationItems()` hook accepts two render functions as its second and third parameters. The *second parameter* function renders a single link from a navigation item and the *third parameter* function renders a section from a collection of items.

In the previous example, there are two sections. A root section containing all the navigation items, and a nested section containing only _"Static1/Page 4"_ and _"Static1/Page 5"_ navigation items.

👉 Start the applications and try navigating between pages. Everything should work fine.

> **Note**
>
> It's important to provide memoized render functions to the `useRenderedNavigationItems()` hook, as otherwise, the navigation items will be parsed over and over on re-renders rather than being returned from the cache.

### Isolate module failures

One of the key characteristics of micro-frontends implementations like [iframes](https://martinfowler.com/articles/micro-frontends.html#Run-timeIntegrationViaIframes) and subdomains is that a single module failure can't break the whole application.

With our implementation, this is not the case, as all the modules live in the same domain and share the same DOM.

Still, we can get very close to iframes failure isolation by leveraging React Router [Outlet](https://reactrouter.com/en/main/components/outlet) component and routes' [errorElement](https://reactrouter.com/en/main/route/error-element) property.

Our host application `RootLayout` component is already rendering an `Outlet` component. Therefore, to support failure isolation, we only need to add a nested pathless route with an `errorElement` property under the root layout to catch unmanaged errors from modules.

👉 First, let's create a `RootErrorBoundary` component in the host application to handle errors:

```tsx
// host - RootErrorBoundary.tsx

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

👉 Then, update the host application's router code to add the nested pathless route under the root layout route:

```tsx
// host - App.tsx

import { RootErrorBoundary } from "./layouts";

export function App() {
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
}
```

As the pathless route with the error boundary has been declared under the root layout route, when an unmanaged error bubbles up, the `Outlet` component output is replaced by the `RootErrorBoundary` component's output. Hence, other parts of the `RootLayout` component, like the navigation section are still rendered.

👉 Next, add to the remote module a new route component called `Page3` that will throw an error on render:

```tsx
// remote-1 - Page3.tsx

export default function Page3(): JSX.Element {
    throw new Error("Page3 from \"remote-1\" failed to render");
}
```

```tsx
// remote-1 - register.tsx

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

👉 Start the applications and navigate to the _"remote1/page-3"_ page. The page will throw an error but other parts of the application should still be functional.

### Override the host layout

Most applications usually have a default layout with at least a navigation section and a user profile menu, as a majority of the application's pages tend to use the same layout. However, there are usually a few pages for which the default layout will not work, often because they are not bound to a user session, such as a login page.

To accommodate for these pages, the shell has a built-in mechanism called "page hoisting". Unlike a regular page, a hoisted page is added at the root of the router, outside of the boundaries of the host application's root layout. This means that a hoisted page is not affected by the default layout and has full control over its rendering.

> **Warning**
>
> By declaring a page as hoisted, other parts of the application will not be isolated anymore from this page's failures as the page will be rendered outside of the host application's root error boundary. To avoid breaking the entire application when an hoisted page cause unmanaged errors, it is highly recommended to set a React Router [errorElement](https://reactrouter.com/en/main/route/error-element) property for every hoisted pages.

👉 Now, let's hoist a few pages of the remote module by adding the `hoist` property to the route definition:

```tsx
// remote-1 - register.tsx

const FullLayout = lazy(() => import("./layouts/FullPageLayout"));

const Page2 = lazy(() => import("./pages/Page2"));
const Page4 = lazy(() => import("./pages/Page4"));

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    runtime.registerRoutes([
        {
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

By setting the `hoist` property to `true` for the _"Remote1/Page 2"_ route, we are telling the shell to add this page at the root of the router rather than under the root layout of the host application.

Since the page is not rendered within the boundaries of the host application root layout, we can now set a custom layout to the _"Remote1/Page 2"_ page by nesting the route under a new layout. For this example, we'll use the `FullLayout` component.

The _"Remote1/Page 4"_ page is also hoisted. An hoisted page doesn't have to be assigned a custom layout, it can be rendered on its own.

👉 To test the changes, start the applications and navigate to _"remote1/page-2"_ and _"remote1/page-4"_ pages. The root layout should not be rendered for both pages, as they are hoisted and rendered outside of the boundaries of the host application's root layout. What's going on?

By default, the shell doesn't support page hoisting. To support page hoisting, the host application must use the `useHoistedRoutes(routes, options)` hook.

👉 Update the host application to support page hoisting by adding the `useHoistedRoutes(routes, options)` hook:

```tsx
// host - App.tsx

import { useHoistedRoutes, useRoutes } from "wmfnext-shell";;

const NotFoundPage = lazy(() => import("./pages/NotFound"));

export function App() {
    const routes = useRoutes();

    const wrapManagedRoutes = useCallback((managedRoutes: Readonly<Route[]>) => {
        return {
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
        };
    }, []);

    // The "useHoistedRoutes" hook move hoisted pages at the root.
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
}
```

You may have noticed that a `wrapManagedRoutes` option is passed to the `useHoistedRoutes()` hook. This is an optional function, which allows the host application to nest the *"non hoisted routes"* under a specific route.

In this example, the `wrapManagedRoutes` option is used to wrap all the _"non hoisted routes"_ under the `RootLayout` component and the `RootErrorBoundary` to isolate module failures.

> It's important to memoize the `wrapManagedRoutes` function, otherwise, the hoisting code will be executed on every re-render rather than returning from the cache.

An host application can choose to disallow page hoisting by not using the `useHoistedRoutes()` hook or using the `allowedPaths` option of the `useHoistedRoutes()` hook to specify a subset of module routes that are eligible for hoisting.

```tsx
const hoistedRoutes = useHoistedRoutes(routes, {
    wrapManagedRoutes,
    allowedPaths: [
        "remote1/page-2",
        "remote1/page-4"
    ]
});
```

👉 Now, let's start the applications again and navigate to _"remote1/page-2"_ and _"remote1/page-4"_ pages. You should not see the host application root layout anymore.

### Share a user session

The shell facilitates the sharing of a user session object between the host application and the module applications through its runtime instance.

To keep things simple, in this example, we'll use the fake `SessionManager` implementation of the `wmfnext-fakes` package. For a real application, you should implement your own session provider.

> The `wmfnext-fakes` package is a collection of fake implementations offered to accelerate the setup of an environment to develop a module in isolation.

👉 To share a user session, first, create an instance of the `SessionManager` to store the session object and define a `sessionAccessor()` function to access the session:

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

> The `wmfnext-shared` package will be created later in this section.

👉 Then, add a login page to the host application and use the newly created `sessionManager` instance to store the session object once a user is authenticated:

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
}
```

👉 Then, associate the `sessionAccessor()` function to the `runtime` instance created in the host application and wrap the `App` component within a `Suspense` boundary:

```tsx
// host - bootstrap.tsx

import { sessionAccessor } from "./session";

const runtime = new Runtime({
    loggers: [new ConsoleLogger()],
    sessionAccessor
});

root.render(
    <RuntimeContext.Provider value={runtime}>
        {/* New required suspense boundary */}
        <Suspense fallback={<Loading />}>
            <App />
        </Suspense>
    </RuntimeContext.Provider>
);
```

Since the `sessionManager` instance has access to the user session and the `sessionAccessor()` function is bound to the `sessionManager` instance, modules that receive the `runtime` instance will now have access to the user session.

There's 2 ways for a module to access the user session:

1. By using the `useSession()` hook

2. By using `runtime.getSession()`

👉 Now, for the host application and the remote module to share the same `Session` type, a shared package must be created. In this example, we'll add a `shared` project to the host application monorepo:

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
> For the sake of this demo, all shared assets will be added to a single shared package. However, when developing a real application, it is recommend to split shared assets into multiple standalone packages to maximise dependency segregation, improve cohesion and minimize the scope of an update.

👉 First, add a `Session` type to the `wmfnext-shared` package:

```ts
// shared - session.ts

export interface Session {
    user: {
        name: string;
    };
}
```

👉 Next, create a new page in the remote module using the current user session to render the user name:

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

To test that the session is shared:

1. Navigate to the login page
2. Authenticate with "temp" / "temp"
3. Navigate to _"remote1/page-6"_
4. The user name should be rendered in the page content.

👉 Next, let's use React Router [nested routes](https://reactrouter.com/en/main/start/overview#nested-routes) to add an authentication boundary and redirect unauthenticated users to the login page:

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
            // New pathless route to set an authentication boundary around the
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

The `AuthenticationBoundary` component uses the `useIsAuthenticated()` hook to determine if a user is authenticated or not. Alternatively, the `useSession()` hook could also be used. 

By wrapping the root layout within the `AuthenticationBoundary` component, only authenticated users have access to the managed module routes.

👉 To test the changes, clear your session storage and navigate to any route protected by the authentication boundary. You should be redirected to the login page.

Before jumping to the next section, since we added a new package called `wmfnext-shared` which is shared by every part of the federated application, we need to make sure that it is added as a [shared singleton dependency](https://dev.to/infoxicator/module-federation-shared-api-ach).

👉 Let's add the shared dependency to the application's Webpack configuration file:

```js
// host - webpack.dev.js

import { createHostPlugin } from "wmnext-remote-loader/webpack.js";

export default {
    plugins: [
        createHostPlugin("host", packageJson, {
            sharedDependencies: {
                "wmfnext-shared": {
                    singleton: true,
                    requiredVersion: "0.0.1"
                }
            }
        })
    ]
}
```

```js
// remote-1 - webpack.dev.js

import { createModulePlugin } from "wmnext-remote-loader/webpack.js";

export default {
    plugins: [
        createModulePlugin("remote1", packageJson, {
            sharedDependencies: {
                "wmfnext-shared": {
                    singleton: true,
                    requiredVersion: "0.0.1"
                }
            }
        })
    ]
}
```

### Use the event bus

💡 Our third take is that a federated application should feel homogenous. Different parts of a federation application should have the ability to communicate with each others and react to changes happening outside of their boundaries.

To enable a loosely coupled communication between the parts of the application, the shell offer a basic implementation of a pub/sub mecanism called the event bus.

👉 To showcase how it works, we'll start by adding a counter functionality to the host application and an event listener to increment the value when a specific event is dispatched:

```tsx
// host - RootLayout.tsx

import { useCallback } from "react";
import { useEventBusListener } from "wmfnext-shell";
import { IncrementCountEvent } from "wmfnext-shared";

export function RootLayout() {
    // The counter is basically only a useState.
    const [count, setCount] = useState(0);

    const handleIncrementCountEvent = useCallback(() => {
        setCount(x => x + 1);
    }, [setCount]);

    // Add an event listener to react to increment request from independent modules.
    useEventBusListener(IncrementCountEvent, handleIncrementCountEvent);

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

In this example, the `RootLayout` component is using the `useEventBusListener(eventName, callback, options)` hook to listen for increment events.

There are 2 ways to liste to events:

1. Use the `useEventBusListener()` hook as we did in the previous example. It's convenient for components as the listener will be disposed automatically when the components is disposed.

2. Access the event bus directly from the `runtime` instance with `runtime.eventBus`.

> **Note**
>
> To prevent the event listener from being removed through re-renders, it's important to provide a memoized function.

👉 Next, add a new page to the remote module application to dispatch increment events:

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

👉 Start the applications and navigate to _*remote1/page-6*_. Click on the button *"Increment count"*. Everytime the button is clicked, the top left counter should increment by 1.

### Share a custom service

The shell runtime offers a few built-in services. However, by no mean these services alone can support the needs of a mature application. That's why custom services can be added to the shell runtime.

👉 First, add a `TrackingService` class to the host application:

```tsx
// host - trackingService.ts

export class TrackingService {
    track(data: unknown) {
        console.log("[tracking] Tracking the following data: ", data);
    }
}
```

👉 Then, make the service available to all the registered modules by passing a `TrackingService` instance to the runtime with the `services` option:

```tsx
// host - bootstrap.tsx

import { TrackingService } from "./trackingService";

const runtime = new Runtime({
    loggers: [new ConsoleLogger()],
    // Register the tracking service with "tracking" as key.
    services: {
        "tracking": new TrackingService()
    },
    sessionAccessor
});
```

👉 Before a module can use the shared instance of `TrackingService`, it's type must be shared. To do this, we'll use move the `TrackingService` class to the `wmfnext-shared` package created earlier:

```tsx
// shared - trackingService.ts

export interface TrackingService {
    track: (data: unknown) => void;
}
```

👉 The service instance can now be retrieved by any modules by using the runtime `runtime.getService(serviceName)` function:

```ts
// remote-1 - register.tsx

export const register: ModuleRegisterFunction = (runtime: Runtime) => {
    const trackingService = runtime.getService("tracking");
});
```

👉 For convenience we'll also add a `useTrackingService()` hook to retrieve the service instance. This way, modules can easily access the service without hardcoding it's key and manually force a cast:

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

👉 Finally, create a new page in the remote module and use the tracking service:

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

👉 Start the applications and navigate to the _"remote1/page-7"_ page. Open the console and you should see the following log:

```
[tracking] Tracking the following data: {page: 'page7', module: 'remote-1'}
```

### Use a custom logger

Many applications must integrates with specific remote logging solutions like [Datadog](https://www.datadoghq.com/) and [Azure Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview).

To help with that, the shell runtime accept any custom loggers that implements the `Logger` interface.

👉 Let's add a `CustomLogger` class to the host application:

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

👉 Then, update the host application to register an instance of the `CustomLogger`:

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

👉 Start the applications and open the dev tools. Refresh the page. The console logs should be displayed twice:

```
[shell] Found 1 static modules to register
[custom-logger] [shell] Found 1 static modules to register
```

### Data and state

This shell doesn't offer any build-in feature to handle data and state management. Why?

💡 It's our 4th take! Data and state should never be shared between parts of a federated application. Even if two parts needs the same data or the same state values, they should load, store and manage those independently.

### Develop a module in isolation

To develop their own module, an independent team should not be required to install the host application or any other modules they do not own. However, they should still have a way to integrate with the federated application shell (root layout, root error boundary, etc..) while developing their module in isolation.

To achieve this, the first step is to move the federated application shell to the `wmfnext-shared` package.

👉 Let's move the host application's `RootLayout`, `RootErrorBoundary` and `AuthenticationBoundary` components to the `app-shell` folder of the `wmfnext-shared` package:

```
shared
├── src
├──── app-shell
├────── AuthenticationBoundary.tsx
├────── RootErrorBoundary.tsx
├────── RootLayout.tsx
```

> For a real application, it is recommend to move the federated application shell into its own package to prevent the code from being bundled with the actual module code. If its not possible, at least declare the package as a shared singleton dependency.

👉 Then, refactor the host application's `App` component router initialization code into a reusable `useAppRouter(options)`:

```tsx
// shared - useAppRouter.tsx

import { Route, useHoistedRoutes, useRoutes } from "wmfnext-shell";
import { useCallback, useMemo, useState } from "react";
import { AuthenticationBoundary } from "./AuthenticationBoundary";
import { RootErrorBoundary } from "./RootErrorBoundary";
import { RootLayout } from "./RootLayout";
import { createBrowserRouter } from "react-router-dom";

export interface UseAppRouterOptions {
    rootRoutes?: Route[];
}

export function useAppRouter({ rootRoutes = [] }: UseAppRouterOptions = {}) {
    // Hack to reuse the same array reference through re-renders.
    const [memoizedRootRoutes] = useState(rootRoutes);

    const routes = useRoutes();

    const wrapManagedRoutes = useCallback((managedRoutes: Readonly<Route[]>) => {
        return {
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

    const hoistedRoutes = useHoistedRoutes(routes, {
        wrapManagedRoutes,
        allowedPaths: [
            "remote1/page-2",
            "remote1/page-4"
        ]
    });

    const router = useMemo(() => {
        return createBrowserRouter([...hoistedRoutes, ...memoizedRootRoutes]);
    }, [hoistedRoutes, memoizedRootRoutes]);

    return router;
}
```

👉 Finally, update the host application's `App.tsx` file to use the newly created `useAppRouter()` hook:

```tsx
// host - App.tsx

import { Loading, useAppRouter } from "wmfnext-shared";
import { RouterProvider } from "react-router-dom";
import { lazy } from "react";
import { useAreRemotesReady } from "wmfnext-remote-loader";

const LoginPage = lazy(() => import("./pages/Login"));
const LogoutPage = lazy(() => import("./pages/Logout"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

export function App() {
    const isReady = useAreRemotesReady();

    const router = useAppRouter({
        rootRoutes: [
            {
                path: "login",
                element: <LoginPage />
            },
            {
                path: "logout",
                element: <LogoutPage />
            },
            {
                path: "*",
                element: <NotFoundPage />
            }
        ]
    });

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

With this setup in place, we can now configure our module applications to be developed in isolation.

#### Remote modules

For a remote module application to be developed in isolation, there are a few steps to take:

1. Create a new `index.tsx` file that will instanciate a `Runtime` instance and register the remote module as a static module.
2. Create a new `App.tsx` component to render the federated application shell.
3. Add Webpack `public` folder at the root of the project.
4. Add a new command to serve the app as a local application rather than a federated module.
5. Update the Webpack config `entry` file to `.src/index.tsx` instead of `.src/register.tsx`.
6. Replace the `ModuleFederationPlugin` with the `HtmlWebpackPlugin`.

👉 Let's starts by creating the new `index.tsx` and `App.tsx` files:

```tsx
// remote-1 - index.tsx

import { ConsoleLogger, Runtime, RuntimeContext, deepFreeze, registerStaticModules } from "wmfnext-shell";
import { Loading, TrackingService, TrackingServiceKey } from "wmfnext-shared";
import { App } from "./App";
import type { Session } from "wmfnext-shared";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { register } from "./register";

// Creating a runtime instance with a fake user session.
// To use an in-memory session the "wmfnext-fakes"
// SessionManager implementation can be used instead.
const runtime = new Runtime({
    loggers: [new ConsoleLogger()],
    services: {
        [TrackingServiceKey]: new TrackingService()
    },
    sessionAccessor: () => {
        const session = deepFreeze({
            user: {
                name: "temp"
            }
        });

        return session as Readonly<Session>;
    }
});

// Registering the remote module as a static module because the
// "register" is local when developing in isolation.
registerStaticModules([register], runtime);

const root = createRoot(document.getElementById("root"));

root.render(
    <RuntimeContext.Provider value={runtime}>
        <Suspense fallback={<Loading />}>
            <App />
        </Suspense>
    </RuntimeContext.Provider>
);
```

```tsx
// remote-1 - App.tsx

import { Loading, useAppRouter } from "wmfnext-shared";
import { RouterProvider } from "react-router-dom";

export function App() {
    // We are using again the hook that we created at the beginning
    // of this section. useAppRouter takes care of creating the router
    // instance and setuping the federated application shell.
    const router = useAppRouter();

    return (
        <RouterProvider
            router={router}
            fallbackElement={<Loading />}
        />
    );
}
```

👉 Next, add a new `dev-local` command to the `package.json` file to start the local development server:

```json
{
    "dev": "webpack serve --config webpack.dev.js",
    "dev-local": "cross-env LOCAL=true webpack serve --config webpack.dev.js",
}
```

The `dev-local` command is very similar to the `dev` command but it defines a `LOCAL` environment variable. This new environment variable will be read by the `webpack.dev.js` file to adapt the Webpack configuration accordingly.

👉 Next, update the `webpack.dev.js` file to leverage the `LOCAL` environment variable:

```js
// remote-1 - webpack.dev.js

import { createModulePlugin, isLocal } from "wmfnext-shared/webpack.js";
import HtmlWebpackPlugin from "html-webpack-plugin";
import packageJson from "./package.json" assert { type: "json" };

/** @type {import("webpack").Configuration} */
export default {
    entry: isLocal ? "./src/index.tsx" : "./src/register.tsx",
    plugins: [
        isLocal
            ? new HtmlWebpackPlugin({ template: "./public/index.html" })
            : createModulePlugin("remote1", packageJson)
    ]
};
```

👉 Start the local application by running the `dev-local` command. The federated application shell should wrap the content of the index route of the module.

#### Static modules

Putting in place a development setup for a static module application is very similar to what we've done previously for a remote module application. The key difference is that since a static module is never served as a remote bundle, we start with a blank Webpack configuration file.

Here's what we'll do:

1. Create a new `index.tsx` file that will instanciate a `Runtime` instance and register the static module.
2. Create a new `App.tsx` component to render the federated application shell.
3. Add Webpack `public` folder at the root of the project.
4. Add a new command to serve the local application.
5. Create a `webpack.config.js` file.

👉 First, create the new `index.tsx` and `App.tsx` files:

```tsx
// static-1 - index.tsx

import { ConsoleLogger, Runtime, RuntimeContext, deepFreeze, registerStaticModules } from "wmfnext-shell";
import { Loading, TrackingService, TrackingServiceKey } from "wmfnext-shared";

import { App } from "./App";
import type { Session } from "wmfnext-shared";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { register } from "./register";

// Creating a runtime instance with a fake user session.
// To use an in-memory session the "wmfnext-fakes"
// SessionManager implementation can be used instead.
const runtime = new Runtime({
    loggers: [new ConsoleLogger()],
    services: {
        [TrackingServiceKey]: new TrackingService()
    },
    sessionAccessor: () => {
        const session = deepFreeze({
            user: {
                name: "temp"
            }
        });

        return session as Readonly<Session>;
    }
});

registerStaticModules([register], runtime);

const root = createRoot(document.getElementById("root"));

root.render(
    <RuntimeContext.Provider value={runtime}>
        <Suspense fallback={<Loading />}>
            <App />
        </Suspense>
    </RuntimeContext.Provider>
);
```

```tsx
// static-1 - App.tsx

import { Loading, useAppRouter } from "wmfnext-shared";
import { RouterProvider } from "react-router-dom";

export function App() {
    // We are using again the hook that we created at the beginning
    // of this section. useAppRouter takes care of creating the router
    // instance and setuping the federated application shell.
    const router = useAppRouter();

    return (
        <RouterProvider
            router={router}
            fallbackElement={<Loading />}
        />
    );
}
```

👉 Next, add a new `dev-local` command to the `package.json` file to start the local development server:

```json
{
    "dev": "tsc --watch --project ./tsconfig.json",
    "dev-local": "webpack serve --config webpack.config.js"
}
```

👉 Next, create a `webpack.config.js` and add the following configuration:

<details>
    <summary>View configuration</summary>
    <br />

```js
// static-1 - webpack.config

import HtmlWebpackPlugin from "html-webpack-plugin";
import { getFileDirectory } from "wmfnext-remote-loader/webpack.js";
import path from "path";

const __dirname = getFileDirectory(import.meta);

/** @type {import("webpack").Configuration} */
export default {
    mode: "development",
    target: "web",
    devtool: "inline-source-map",
    devServer: {
        port: 8082,
        historyApiFallback: true
    },
    entry: "./src/index.tsx",
    output: {
        // The trailing / is very important, otherwise paths will ne be resolved correctly.
        publicPath: "http://localhost:8082/"
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
        new HtmlWebpackPlugin({
            template: "./public/index.html"
        })
    ]
};
```

```html
<!-- static-1 - public/index.html -->

<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```
</details>

👉 Run the local application with the `dev-local` command. The federated application shell should wrap the content of the index route of the module.

## 🔧 API

### wmfnext-shell package

#### Runtime

##### class Runtime({ loggers, services, sessionAccessor })

```ts
import { Runtime } from "wmfnext-shell";

const runtime = new Runtime({
    loggers: [],
    services: {},
    sessionAccessor: () => {}
});

runtime.registerRoutes([
    {
        path: "/page-1",
        element: <Page />
    }
]);

const routes = runtime.routes;

runtime.registerNavigationItems([
    {
        to: "/page-1",
        content: "Page 1"
    }
]);

const navigationItems = runtime.navigationItems;

const logger = runtime.logger;

const eventBus = runtime.eventBus;

const service = runtime.getService("serviceName") as TService;

const session = runtime.getSession() as TSession;
```

##### RuntimeContext

```tsx
import { RuntimeContext } from "wmfnext-shell";

const runtime = new Runtime();

root.render(
    <RuntimeContext.Provider value={runtime}>
        <App />
    </RuntimeContext.Provider>
);
```

##### useRuntime()

```ts
import { useRuntime } from "wmfnext-shell";

const runtime = useRuntime();
```

##### useRoutes()

```ts
import { useRoutes } from "wmfnext-shell";

const routes = useRoutes();
```

##### useNavigationItems()

```ts
import { useNavigationItems } from "wmfnext-shell";

const items = useNavigationItems();
```

##### useLogger()

```ts
import { useLogger } from "wmfnext-shell";

const logger = useLogger();
```

##### useSession()

```ts
import { useSession } from "wmfnext-shell";

const session = useSession() as T;
```

##### useService(serviceName)

```ts
import { useService } from "wmfnext-shell";

const service = useService("serviceName") as T;
```

#### Static modules registration

##### registerStaticModule(registerFunctions, runtime, { context })

```ts
import { registerStaticModule, Runtime, ModuleRegisterFunction } from "wmfnext-shell";

const register: ModuleRegisterFunction = (runtime, context) => {
    runtime.logger.debug(context.foo);
};

const runtime = new Runtime();

registerStaticModules([register], runtime, {
    context: {
        foo: "bar"
    }
});
```

#### Routing

##### useHoistedRoutes(routes, { wrapManagedRoutes, allowedPaths })

```tsx
import { useRoutes, useHoistedRoutes, Route } from "wmfnext-shell";
import { useCallback } from "react";

const routes = useRoutes();

const wrapManagedRoutes = useCallback((managedRoutes: Readonly<Route[]>) => {
    return {
        path: "/",
        element: <RootLayout />,
        children: [
            ...managedRoutes
        ]
    };
}, []);

const hoistedRoutes = useHoistedRoutes(routes, {
    wrapManagedRoutes,
    allowedPaths: [
        "page-1"
    ]
});
```

#### Navigation items

##### useRenderedNavigationItems(navigationItems, renderItem, renderSection)

```tsx
import { useNavigationItems, useRenderedNavigationItems } from "wmfnext-shell";
import { useCallback } from "react";
import { Link } from "react-router-dom";

const navigationItems = useNavigationItems();

const renderItem: RenderItemFunction = useCallback(({ content, linkProps, index, level }) => {
    return (
        <li key={`${level}-${index}`}>
            <Link {...linkProps}>
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
```

#### Logging

##### interface Logger

```ts
import { Logger } from "wmfnext-shell";

class CustomLogger: Logger {
    debug(log) { ... }
    information(log) { ... }
    warning(log) { ... }
    error(log) { ... }
    critical(log) { ... }
}
```

##### class ConsoleLogger

```ts
import { ConsoleLogger, LogLevel } from "wmfnext-shell";

const logger = new ConsoleLogger(Loglevel.debug);

logger.debug("Debug log", { foo: "bar" });
logger.information("Info log");
logger.warning("Warning log");
logger.error("Error log");
logger.critical("Critical log");
```

#### Messaging

##### class EventBus({ logger })

```ts
import { EventBus, ConsoleLogger } from "wmfnext-shell";

const eventBus = new EventBus({
    logger: new ConsoleLogger()
});

const handleFoo = (data, context) => {
    // do something...
}

eventBus.addListener("foo", handleFoo);
eventBus.removeListener("foo", handleFoo);

eventBus.addListener("foo-once", handleFoo, { once: true });
eventBus.removeListener("foo-once", handleFoo, { once: true });

eventBus.dispatch("foo", "bar");
```

##### useEventBusListener(eventName, callback, { once })

```ts
import { useEventBusListener } from "wmfnext-shell";
import { useCallback } from "react";

const handleFoo = useCallback(() => {
    // do something...
}, []);

useEventBusListener("foo", handleFoo);
```

##### useEventBusDispatcher(eventName, data)

```ts
import { useEventBusDispatcher } from "wmfnext-shell";

const dispatch = useEventBusDispatcher();

dispatch("foo", "bar");
```

#### Utils

##### deepFreeze(obj)

```ts
import { deepFreeze } from "wmfnext-shell";

deepFreeze({
    foo: {
        bar: {
            to: "to"
        }
    }
});
```

### wmfnext-remote-loader package

#### Remote modules registration

##### registerRemoteModule(remotes, runtime, { context })

```ts
import { registerRemoteModules, RemoteDefinition } from "wmfnext-remote-loader";
import { Runtime } from "wmfnext-shell";

const runtime = new Runtime();

const remotes: RemoteDefinition[] = [
    { name: "remote-1", url: "http://localhost:8081" }
];

registerRemoteModules(remotes, runtime, {
    context: {
        foo: "bar"
    }
});
```

##### useAreRemotesReady()

```ts
import { useAreRemotesReady } from "wmfnext-remote-loader";

const isReady = useAreRemotesReady();

if (!isReady) {
    // do something...
}
```

##### registrationStatus

```ts
import { registrationStatus } from "wmnext-remote-loader";

if (registrationStatus !== "ready") {
    // dom something...
}
```

#### Webpack config utils

##### getFileDirectory(meta)

```ts
import { getFileDirectory } from "wmfnext-remote-loader/webpack.js";

const __dirname = getFileDirectory(import.meta);
```

##### createHostConfiguration(moduleName, packageJson, { sharedDependencies })

```ts
import { createHostConfiguration } from "wmfnext-remote-loader/webpack.js";
import packageJson from "./package.json" assert { type: "json" };
import ModuleFederationPlugin from "webpack/lib/container/ModuleFederationPlugin.js";

const config = createHostConfiguration("host", packageJson);
const plugin = new ModuleFederationPlugin(config);
```

##### createModuleConfiguration(moduleName, packageJson, { sharedDependencies })

```ts
import { createModuleConfiguration } from "wmfnext-remote-loader/webpack.js";
import packageJson from "./package.json" assert { type: "json" };
import ModuleFederationPlugin from "webpack/lib/container/ModuleFederationPlugin.js";

const config = createModuleConfiguration("remote1", packageJson);
const plugin = new ModuleFederationPlugin(config);
```

##### createHostPlugin(moduleName, packageJson, { sharedDependencies })

```ts
import { createHostPlugin } from "wmfnext-remote-loader/webpack.js";
import packageJson from "./package.json" assert { type: "json" };

const plugin = createHostPlugin("host", packageJson);
```

##### createModulePlugin(moduleName, packageJson, { sharedDependencies })

```ts
import { createModulePlugin } from "wmfnext-remote-loader/webpack.js";
import packageJson from "./package.json" assert { type: "json" };

const plugin = createModulePlugin("remote1", packageJson);
```

### wmfnext-fakes package

##### class SessionManager({ key })

```ts
import { SessionManager } from "wmfnext-fakes";

const sessionManager = new SessionManager();

sessionManager.setSession({ username: "Foo" });

const session = sessionManager.getSession();

sessionManager.clearSession();
```

## 🙏 Contributors guide

To contribute, have a look at the [contributors guide](./CONTRIBUTING.md).
