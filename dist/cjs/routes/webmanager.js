"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const rootpath_1 = require("../shared/rootpath");
const path_1 = require("path");
const addRoutes = (env) => {
    const webManagerDir = `webmanager`;
    // Add redirect from root to webmanager
    env.app.get('/', (req, res) => {
        res.redirect(`/${env.rootPath ? `${env.rootPath}/` : ''}${webManagerDir}/`);
    });
    // Serve static files from webmanager directory
    env.app.get(`/${webManagerDir}/*`, (req, res) => {
        const filePath = req.path.slice(webManagerDir.length + 2);
        const assetsPath = (0, path_1.join)(rootpath_1.packageRootPath, '/webmanager');
        if (filePath.length === 0) {
            // Send default file
            res.sendFile((0, path_1.join)(assetsPath, '/index.html'));
        }
        else {
            res.sendFile((0, path_1.join)(assetsPath, '/', filePath));
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=webmanager.js.map