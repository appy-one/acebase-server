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
exports.DatabaseLog = void 0;
class DatabaseLog {
    constructor(logRef) {
        this.logRef = logRef;
    }
    /**
     * Logs an action initiated by a client/user with a positive or negative outcome. Used by `success` and `failure`
     * @param action action identifier
     * @param success whether the action was successful
     * @param details any additional details to be logged
     */
    event(action, details) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield ((_a = this.logRef) === null || _a === void 0 ? void 0 : _a.push(Object.assign({ type: 'event', action, date: new Date() }, details)));
        });
    }
    /**
     * Logs a system warning
     * @param action action identifier
     * @param code warning code
     * @param details any additional details to be logged
     */
    warning(action, code, details) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield ((_a = this.logRef) === null || _a === void 0 ? void 0 : _a.push(Object.assign({ type: 'warning', action, code, date: new Date() }, details)));
        });
    }
    /**
     * Logs a system or client/user error
     * @param action action identifier
     * @param code error code
     * @param details any additional details to be logged
     */
    error(action, code, details, unexpectedError) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const errorDetails = unexpectedError instanceof Error
                ? { error: (_a = unexpectedError.stack) !== null && _a !== void 0 ? _a : unexpectedError.message }
                : { error: (_c = (_b = unexpectedError === null || unexpectedError === void 0 ? void 0 : unexpectedError.message) !== null && _b !== void 0 ? _b : unexpectedError === null || unexpectedError === void 0 ? void 0 : unexpectedError.toString()) !== null && _c !== void 0 ? _c : null };
            yield ((_d = this.logRef) === null || _d === void 0 ? void 0 : _d.push(Object.assign(Object.assign({ type: 'error', action, code, date: new Date() }, errorDetails), details)));
        });
    }
    /**
     * Query the logs
     * @returns
     */
    query() {
        if (!this.logRef) {
            throw new Error('Logging is not enabled');
        }
        return this.logRef.query();
    }
    /**
     * Reference to the logs database collection
     */
    get ref() {
        return this === null || this === void 0 ? void 0 : this.logRef;
    }
}
exports.DatabaseLog = DatabaseLog;
//# sourceMappingURL=logger.js.map