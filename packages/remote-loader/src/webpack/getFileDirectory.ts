import path from "path";
import url from "url";

export function getFileDirectory(meta: ImportMeta) {
    const filename = url.fileURLToPath(meta.url);
    const dirname = path.dirname(filename);

    return dirname;
}
