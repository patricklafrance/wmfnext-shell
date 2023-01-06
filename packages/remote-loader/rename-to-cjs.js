// Updating the extension of the CommonJS file because project using ESM can't import a CommonJS without the ".cjs" extension.

import fs from "fs";

const FileName = "./dist/cjs/createModuleFederationConfiguration";

fs.rename(`${FileName}.js`, `${FileName}.cjs`, error => {
    if (error) {
        console.log(error);
    }
});
