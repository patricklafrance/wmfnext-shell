import chalk from "chalk";
import { es } from "./es.js";
import meow from "meow";
import shell from "shelljs";

const Usage = `
Usage
    $ create-dir <name>

    The <name> input is relative to the current working directory.

Examples
    $ create-dir name
`;

const cli = meow(Usage, {
    importMeta: import.meta,
    description: false
});

const name = cli.input[0];

if (!name) {
    cli.showHelp(1);
}

const projectPath = es(shell.pwd()).stdout;

const directoryPath = `${projectPath}/${name}`;

if (!shell.test("-d", directoryPath)) {
    shell.mkdir(directoryPath);

    console.log(chalk.green("success"), `${directoryPath} directory created.`);
}
