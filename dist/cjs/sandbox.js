"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCodeSafe = exports.executeSandboxed = void 0;
const vm_1 = require("vm");
function executeSandboxed(code, env) {
    return __awaiter(this, void 0, void 0, function* () {
        // Using eval to execute code is dangerous, so we have to make sure we run in a sandbox
        // so no globally available objects are accessible.
        const context = (0, vm_1.createContext)(env);
        const result = yield (0, vm_1.runInContext)(code, context, { filename: 'sandbox', timeout: 10000, displayErrors: true, breakOnSigint: true });
        return result;
    });
}
exports.executeSandboxed = executeSandboxed;
function isCodeSafe(code) {
    return /eval|prototype|require|import/.test(code); // Do not allow prototype access, require or import statements
}
exports.isCodeSafe = isCodeSafe;
//# sourceMappingURL=sandbox.js.map