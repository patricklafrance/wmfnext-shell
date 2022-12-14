import chalk from "chalk";
import { es } from "./es.js";
import meow from "meow";
import shell from "shelljs";

const Usage = `
Usage
    $ clear-dir <name>

    The <name> input is relative to the current working directory.

Examples
    $ clear-dir dist
`;

const cli = meow(Usage, {
    importMeta: import.meta,
    description: false
});

const folder = cli.input[0];

if (!folder) {
    cli.showHelp(1);
}

const projectPath = es(shell.pwd()).stdout;

const directoryPath = `${projectPath}/${folder}`;

if (shell.test("-d", directoryPath)) {
    es(shell.rm("-rf", `${directoryPath}/*`));

    console.log(chalk.green("success"), ` Cleared directory ${directoryPath}`);
}


