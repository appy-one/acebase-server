import { resolve } from 'path';
// This file is in ./src/shared/rootpath.ts
// When this code runs it is at ./dist/cjs/shared/rootpath.js or ./dist/esm/shared/rootpath.js
// So, the package root is at ../../..
let currentDir = /file:\/\/(.+)\/[^/]/.exec(import.meta.url)[1];
if (process.platform === 'win32' && currentDir.startsWith('/')) {
    // tsc-esm-fix does not handle win32 file urls correctly, the drive letter in import.meta.url is prefixed with a slash: file:///C:/dir/file.js
    currentDir = currentDir.slice(1);
}
// tsc-esm-fix also does not use decodeURI to remove encoded characters (such as %20 for spaces)
currentDir = decodeURI(currentDir);
export const packageRootPath = resolve(currentDir, '../../..');
export default packageRootPath;
//# sourceMappingURL=rootpath.js.map