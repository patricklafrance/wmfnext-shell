# wmfnext-shell

[Webpack Module Federation](https://webpack.js.org/concepts/module-federation) is a great infrastructure piece to makes sharing code and dependencies between different independant codebases easier. But as is, it's pretty raw as it's a low level mecanism.

This shell aims to add a very thin and opinionated layer on top of Webpack Module Federation to complement the sharing mecanism with additional functionalities. Those functionalities will gentle the adoption of a federated application architecture and provide an opinionated direction on how to implement a federated application.

The idea behind this shell is to have an host application responsible of loading modules and providing shared functionalities like routing, messaging and logging. With this shell, a module is considered as an independent codebase which should usually match a specific bounded context of the application. At bootstrap, the host application loads the modules and call a registration function for each of them with shared functionalities and a customazible context. During the registration phase, each module dynamically *register it's routes and navigation links* while also saving a reference on shared functionality services and other values provided through the context.

We recommend to aim for remote hosted modules loaded at runtime as it enables your teams to be fully autonomous by deploying their module independently from the other pieces of the application. Still, sometimes teams might want to gradually migrate toward this type of architecture and would prefer to extract bounded context into independent packages in a monorepos setup before going all-in with a runtime micro-frontends architecture. That's why, this shell also support loading modules from packages at build time. Dual bootstrapping setup is also supported, meaning an application could load a few remote hosted modules loaded at runtime while also loading a few other modules from packages at build time.

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
yarn add TBD
```

## Usage

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
