import { AceBase } from 'acebase';
import { AceBaseServer } from './server.js';
const cluster = require('cluster');
const numCPUs = 2; //require('os').cpus().length;
/**
 * Node.js cluster example. You can use this as a reference how to create an AceBaseServer cluster using Node.js'
 * built-in cluster functionality.
 *
 * If you want to run a pm2 or cloud-based cluster instead, do NOT use this code.
 * To do that, see https://github.com/appy-one/acebase-ipc-server
 *
 */
let dbname = "default";
let options = { /* default options */}; // Load from cluster.config.js!
options.authentication = { enabled: false };
options.https = { enabled: false };
if (cluster.isMaster) {
    // Startup master
    console.log(`Starting database server cluster with ${numCPUs} workers`);
    const master = new AceBase(dbname, options);
    master.once('ready', () => {
        console.log(`Master database server started on process ${process.pid}`);
    });
    for (let i = 0; i < numCPUs; i++) {
        const worker = cluster.fork();
        worker.on('disconnect', () => {
            console.error(`worker ${worker.process.pid} disconnected`);
        });
        worker.on('message', (msg) => {
            if (msg === 'acebase-server-shutdown') {
                // We could handle shutdown message here to kill the worker safely, but we'll do it in the worker threads instead: see below
                // worker.kill();
            }
        });
    }
    cluster.on('exit', (worker, code, signal) => {
        console.error(`worker ${worker.process.pid} died`);
    });
}
else {
    console.log(`Worker ${process.pid} is running`);
    const server = new AceBaseServer(dbname, options);
    server.ready(() => {
        console.log(`Worker database server started on process ${process.pid}`);
    });
    // Handle shutdown event to exit the worker process safely
    server.on('shutdown', () => {
        process.exit();
    });
    // Other option:
    // process.on('acebase-server-shutdown', () => {
    //     process.exit();
    // });
}
//# sourceMappingURL=cluster.js.map