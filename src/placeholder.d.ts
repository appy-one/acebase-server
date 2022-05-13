
/**
 * When using `@types/node@10.17.60` to check for backward compatibility with Node.js 10,
 * tsc will throw errors on `@types/fs-extra` that references types `fs.Dir`, 
 * `fs.OpenDirOptions` and `fs.RmDirOptions`, which are not declared.
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/44946
 */
declare module 'fs' {
    interface Dir {}
    interface OpenDirOptions {}
    interface RmDirOptions {}
}