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
exports.fetch = void 0;
const https_1 = require("https");
/**
 * Very lightweight custom fetch implementation to avoid additional dependencies
 * @param url
 * @param options
 */
function fetch(url, options) {
    return new Promise((resolve, reject) => {
        const method = (options === null || options === void 0 ? void 0 : options.method) || 'GET';
        const headers = options === null || options === void 0 ? void 0 : options.headers;
        const req = (0, https_1.request)(url, { method, headers }, res => {
            // res.setEncoding('binary'); // will result in strings!!!! 
            const ready = new Promise((resolve, reject) => {
                let chunks = [];
                res.on('data', data => {
                    chunks.push(data);
                });
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(buffer);
                });
                res.on('error', (err) => {
                    reject(err);
                });
            });
            const response = {
                get status() { return res.statusCode; },
                get headers() {
                    return {
                        get(name) {
                            let val = res.headers[name.toLowerCase()];
                            if (val instanceof Array) {
                                return val.join(', ');
                            }
                            return val;
                        }
                    };
                },
                text() {
                    return __awaiter(this, void 0, void 0, function* () {
                        const buffer = yield ready;
                        return buffer.toString('utf8');
                    });
                },
                json() {
                    // return Promise.resolve(JSON.parse(body));
                    return this.text().then(json => JSON.parse(json));
                },
                arrayBuffer() {
                    return __awaiter(this, void 0, void 0, function* () {
                        const data = yield ready;
                        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
                        return arrayBuffer;
                    });
                }
            };
            resolve(response);
        });
        req.on('error', reject);
        (options === null || options === void 0 ? void 0 : options.body) && req.write(options.body, 'utf8');
        req.end();
    });
}
exports.fetch = fetch;
//# sourceMappingURL=simple-fetch.js.map