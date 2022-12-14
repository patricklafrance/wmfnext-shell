import chalk from "chalk";
import shell from "shelljs";

export function es(result, errorMessage) {
    if (result.code !== 0) {
        if (errorMessage) {
            console.error(chalk.red("error"), ` ${errorMessage}`);
        }

        shell.exit(1);
    }

    return result;
}
