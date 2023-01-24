# Contributing

The following documentation is only for the maintainers of this repository.

- [Monorepo setup](#monorepo-setup)
- [Installation](#installation)
- [Start developing](#start-developing)
- [Release the packages](#release-the-packages)
- [Linting](#linting)
- [Available commands](#commands)
- [Add a new package to the monorepo](#add-a-new-package-to-the-monorepo)
- [Add a new Yarn script](#add-a-new-yarn-script)
- [Updating npm packages version](#updating-npm-packages-version)

## Monorepo setup

This repository is managed as a monorepo that is composed of many npm packages. 

### Lerna

[Lerna](https://github.com/lerna/lerna) is used to manage this monorepo. The packages of the monorepo can be found in the [packages](/packages) directory. 

Since Yarn workspace feature offer native mono-repo capabilities and a seemless integration with Lerna this is our goto package manager for this project.

When Lerna is configured to use Yarn, the installation of the npm dependencies and the management of the packages inter-dependencies will be delegated to Yarn. It result in an increase of performance and a more reliable experience than using the same features from Lerna. The native integration between Lerna and Yarn make it worthwill to switch from npm to Yarn for this project.

So why do we use Lerna if Yarn workspace take care of everything?

Lerna workflow greatly facilitate the release of the packages of a monorepo. 

For more information, read the following Lerna commands documentation:

- [version](https://github.com/lerna/lerna/tree/master/commands/version)
- [publish](https://github.com/lerna/lerna/tree/master/commands/publish)

This monorepo is configured to release the packages independently. The decision to release or not a package is based on whether or not the code of the package has changed.

### Yarn workspace

This monorepo is using Yarn workspace feature to handle the installation of the npm dependencies and manage the packages inter-dependencies.

It's important to note that Yarn workspace will **hoist** the npm dependencies at the root of the workspace. This means that there might not be a *node_modules* directory nested in the packages directories. The npm dependencies are installed in a *node_modules* directory at the root of the workspace and a single *yarn.lock* file is generated at the root of the workspace.

## Installation

This project use Yarn workspace. Therefore, you must install Yarn:

```
choco install yarn
``` 

For more options to install Yarn, view https://yarnpkg.com/lang/en/docs/install/#windows-stable.

To install the project, open a terminal at the root of the workspace and execute the following command:

```bash
yarn install
```

The installation should take up to 5 minutes.

## Start developing

To start developing, [open a terminal in VSCode](https://code.visualstudio.com/docs/editor/integrated-terminal#_managing-multiple-terminals) and execute the following command at the root of the workspace:

```bash
yarn dev
```

To only start the core package in development mode, use the following command instead:

```bash
yarn dev-core
```

## Release the packages

Releasing the packages includes several steps:

1. Compile the packages code for production
2. Identifies packages that have been updated since the previous release (Read the [Lerna](#lerna) section.)
3. Bump the version of the identified packages
4. Modifies package metadata to reflect new release
5. Publish the packages to npm
6. Push those changes to Git with a tag
7. Create a new Github release associated to the tag created previously

Fortunately, this is all automated with a few commands!

Before you release, make sure you are in the `master` branch, have **write access** to every selected npm packages and that you are [logged in to npm](https://docs.npmjs.com/cli/v9/commands/npm-login).

To release, open a terminal at the root of the workspace and execute the following commands:

```bash
yarn new-version
yarn release
yarn push-release <VERSION> (e.g. yarn push-release 22.0.2)
```

Ex:

```bash
yarn new-version
yarn release
yarn push-release 19.0.1
```

After you released the packages, create a [Github release](https://github.com/gsoft-inc/sg-orbit/releases) for the Git annotated tag [@sharegate/orbit-ui package version] created earlier by the `push-release` command and list all the changes that has been published.

Don't forget to **publish** the release.

## Linting

This monorepo doesn't use prettier. Instead it's leveraging ESLint and TypeScript to ensure code quality.

To manually lint the project execute the following command:

```bash
yarn lint
```

To only validate the TypeScript types, use the following command instead:

```bash
yarn check-types
```

Instead of manually executing the commands and wasting precious compilation resources to execute ESLint CLI, we recommend [using ESLint VSCode extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint). The extension will provide Just In Time linting while typing.

To enable ESLint autofix on save, add the following configuration to your VSCode project settings:

```json
{
    "editor.codeActionsOnSave": {
        "source.fixAll": true,
        "source.organizeImports": false
    },
    "editor.formatOnSave": true,
    "[html]": {
        "editor.formatOnSave": false
    },
    "javascript.format.enable": false,
    "javascript.validate.enable": true,
    "json.format.enable": false,
    "eslint.alwaysShowStatus": true,
    "eslint.validate": ["javascript", "typescript", "typescriptreact"]
}
```

## Available commands

### install

Install the npm dependencies for every packages of the monorepo and setup the project.

Depending of the packages, the setup step will perform a number of required additional installation tasks using the `postinstall` npm hook.

```bash
yarn install
```

### dev

Compile all the packages & start watch mode.

```bash
yarn dev
```

### build

Build all the packages and Storybook for production.

```bash
yarn build
```

### reset

Reset the monorepo installation. The following will be deleted:

- All the *node_modules* directories
- All the *yarn.lock* files
- All the compiled & cache folders

```bash
yarn reset
```

If you encounter the following error:

```bash
C:\Dev\20_gsoft\sg-orbit\node_modules\rimraf\bin.js:47
      throw er
      ^

[Error: EPERM: operation not permitted, unlink 'XXX\sg-orbit\node_modules\@types'] {
```

Close & re-open VSCode and delete manually the *node_modules* folder at the root of the workspace.

### lint

Execute all the linters & validate the TypeScript types.

```bash
yarn lint
```

#### check-types

Validate the TypeScript types.

```bash
yarn check-types
```

### setup

Link local packages together, install remaining package dependencies and generate symlinks.

```bash
yarn setup
```

### release

Deploy the packages. View [the release section](#release-the-packages).

```bash
yarn release
```

### new-version

Bump the version of the monorepo packages containing changes since the last release. View [the release section](#release-the-packages).

```bash
yarn new-version
```

### push-release 

Push the updated packages.json to Git and the new release tag. View [the release section](#release-the-packages).

```bash
yarn push-release <VERSION> (e.g. yarn push-release 22.0.2)
```

## Add a new Yarn script

When adding a new script, there is a few rules to follow.

### Think in terms of atomic scripts

A script should only do one thing. This practice promote better readability and reusability.

Then you can write top level script that compose all those atomic scripts to provide a functionnality.

Instead of doing:

```javascript
"scripts": {
    "build": "rimraf dist && babel src -d dist"
}
```

Do:

```javascript
"scripts": {
    "build": "run-s delete transpile",
    "delete": "rimraf dist",
    "transpile": "babel src -d dist"
}
```

### A script should be executable from the root of the workspace

Make sure you add a script entry in the [package.json](package.json) file at the root of the workspace even if your script is already define in a package or the website.

### Lerna scripts should be executed from the root of the workspace

Lerna provide the ability to [run](https://github.com/lerna/lerna/tree/master/commands/run) or [execute](https://github.com/lerna/lerna/tree/master/commands/exec) a script through all the packages of the monorepo.

Those scripts must be added in the *package.json* file at the root of the workspace since Lerna is installed at the root.

### Use run-p or run-s

To run multiple commands simultaneously, use `run-p`.

To run multiple commands sequentially, use `run-s`.

Otherwise use `yarn`.

### Naming

If a script can be called in batch, separate the discriminant by ":"

Example:

```bash
"scripts": {
    "build": "run-p build:*",
    "build:pkg": "...",
    "build:root": "..."
}
```

Otherwise, separare words with "-"

Example:

```bash
"scripts": {
    "deploy-core": "..."
}
```

## Add a new package to the monorepo

There are a few steps to add a new packages to the monorepo.

Before you add a new package, please read the [GSoft Github guidelines](https://github.com/gsoft-inc/github-guidelines#npm-package-name).

## Updating npm packages version

To udpate our packages use a package called ![npm-check-updates](https://www.npmjs.com/package/npm-check-updates). Dont install it locally, use `npx`.

In a terminal, use the followings commands

- To list the available updates, type `npx --yes npm-check-updates`
- If you want to proceed with the updates, your must first delete `yarn.lock`
- Then type `npx --yes npm-check-updates -u` to bump the versions in the `package.json` file
- Install the new packages with `yarn install`
