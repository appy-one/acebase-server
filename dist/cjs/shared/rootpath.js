"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageRootPath = void 0;
const path_1 = require("path");
// This file is in ./src/shared/rootpath.ts
// When this code runs it is at ./dist/cjs/shared/rootpath.js or ./dist/esm/shared/rootpath.js
// So, the package root is at ../../..
let currentDir = __dirname;
if (process.platform === 'win32' && currentDir.startsWith('/')) {
    // tsc-esm-fix does not handle win32 file urls correctly, the drive letter in import.meta.url is prefixed with a slash: file:///C:/dir/file.js
    currentDir = currentDir.slice(1);
}
// tsc-esm-fix also does not use decodeURI to remove encoded characters (such as %20 for spaces) 
currentDir = decodeURI(currentDir);
exports.packageRootPath = (0, path_1.resolve)(currentDir, '../../..');
exports.default = exports.packageRootPath;
//# sourceMappingURL=rootpath.js.map