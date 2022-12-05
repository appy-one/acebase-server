import { packageRootPath } from "../shared/rootpath.js";
import { join as joinPaths } from 'path';
export const addRoutes = (env) => {
    const webManagerDir = `/webmanager/`;
    // Add redirect from root to webmanager
    env.app.get('/', (req, res) => {
        res.redirect(env.rootPath + webManagerDir.slice(1));
    });
    // Serve static files from webmanager directory
    env.app.get(`${webManagerDir}*`, (req, res) => {
        const filePath = req.path.slice(webManagerDir.length);
        const assetsPath = joinPaths(packageRootPath, '/webmanager');
        if (filePath.length === 0) {
            // Send default file
            res.sendFile(joinPaths(assetsPath, '/index.html'));
        }
        else {
            res.sendFile(joinPaths(assetsPath, '/', filePath));
        }
    });
};
export default addRoutes;
//# sourceMappingURL=webmanager.js.map