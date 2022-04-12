import { resolve } from "path";

// This file is in ./src/shared/rootpath.ts
// When this code runs it is at ./dist/cjs/shared/rootpath.js or ./dist/esm/shared/rootpath.js
// So, the package root is at ../../..
let currentDir = __dirname;

if (process.platform === 'win32' && currentDir.startsWith('/')) {
    // tsc-esm-fix does not handle win32 file urls correctly, the drive letter in import.meta.url is prefixed with a slash: file:///C:/dir/file.js
    currentDir = currentDir.slice(1);
}

export const packageRootPath = resolve(currentDir, '../../..');

export default packageRootPath;
