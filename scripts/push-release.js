import { default as chalk } from "chalk";
import { es } from "./es.js";
import { default as meow } from "meow";
import { default as shell } from "shelljs";

const Usage = `
Usage
    $ push-release <git-tag>

Examples
    $ push-release yyyy-MM-dd
    $ push-release 2019-09-04
    $ push-release 2019-09-04-patch
`;

const cli = meow(Usage, {
    importMeta: import.meta,
    description: false
});

const gitTag = cli.input[0];

if (!gitTag) {
    cli.showHelp(1);
}

// A Git annotated tag (instead of a lightweigh tag) must be used to tag the release otherwise Lerna will not be able to determine which packages changed the next time we release.
es(shell.exec("git push"));
es(shell.exec(`git tag -a ${gitTag} -m "${gitTag}"`));
es(shell.exec(`git push origin ${gitTag}`));

console.log(chalk.green("success"), ` The release has been push to Git with the tag ${gitTag}`);



