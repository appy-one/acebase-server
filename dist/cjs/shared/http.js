"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express = require("express");
const createExpress = (_a = express.default) !== null && _a !== void 0 ? _a : express; // ESM and CJS compatible approach
/**
 * Creates an app that handles http requests, adds json body parsing.
 * @param settings
 * @returns
 */
const createApp = (settings) => {
    const app = createExpress();
    // When behind a trusted proxy server, req.ip and req.hostname will be set the right way
    app.set('trust proxy', settings.trustProxy);
    // Parse json request bodies
    app.use(express.json({ limit: settings.maxPayloadSize })); // , extended: true ?
    return app;
};
exports.createApp = createApp;
//# sourceMappingURL=http.js.map