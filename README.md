# wmfnext-shell

## Motivation

[Webpack Module Federation](https://webpack.js.org/concepts/module-federation) is a great infrastructure piece to makes sharing code and dependencies between different codebases easier. But as is, it's pretty raw as it's a low level mecanism.

This shell aims to add a very thin and opinionated layer on top of Webpack Module Federation to complement the sharing mecanism with additional functionalities. Those functionalities will gentle the adoption of a federated application architecture by most teams and save on repetitive development work.

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

Configure ModuleFederationPlugin

registerRemoteModules

useRerenderOnceRemotesAreRegistred

Remote isolation (ErrorBoundary)

### Register a remote

Configure ModuleFederationPlugin (or our custom one if going this way)

register.js function

### Full example

Either show code here or link to code samples in wmfnext-host and wmfnext-remote-1

### Using a fake runtime for local development

TBD

## Contributors

Have a look at the [contributors guide](./CONTRIBUTING.md).
