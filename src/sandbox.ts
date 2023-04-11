import { createContext, runInContext } from 'vm';

export async function executeSandboxed(code: string, env: any) {
    // Using eval to execute code is dangerous, so we have to make sure we run in a sandbox
    // so no globally available objects are accessible.
    const context = createContext(env);
    const result = await runInContext(code, context, { filename: 'sandbox', timeout: 10000, displayErrors: true, breakOnSigint: true });
    return result ? true : false;
}

export function isCodeSafe(code: string) {
    return /prototype|require|import/.test(code); // Do not allow prototype access, require or import statements
}
