// Updating the extension of the CommonJS file because project using ESM can't import a CommonJS without the ".cjs" extension.

import fs from "fs";

const Files = [
    "./dist/cjs/createConfiguration",
    "./dist/cjs/createPlugin",
    "./dist/cjs/getFileDirectory",
    "./dist/cjs/index"
];

Files.forEach(x => {
    fs.rename(`${x}.js`, `${x}.cjs`, error => {
        if (error) {
            console.log(error);
        }
    });
});
