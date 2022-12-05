import * as express from 'express';
const createExpress = express.default ?? express; // ESM and CJS compatible approach
/**
 * Creates an app that handles http requests, adds json body parsing.
 * @param settings
 * @returns
 */
export const createApp = (settings) => {
    const app = createExpress();
    // When behind a trusted proxy server, req.ip and req.hostname will be set the right way
    app.set('trust proxy', settings.trustProxy);
    // Parse json request bodies
    app.use(express.json({ limit: settings.maxPayloadSize })); // , extended: true ?
    return app;
};
/**
 * Creates an express router
 * @returns
 */
export const createRouter = () => {
    return createExpress.Router();
};
//# sourceMappingURL=http.js.map