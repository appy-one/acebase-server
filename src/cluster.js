const { AceBase } = require('acebase');
const { AceBaseServer } = require('./acebase-server');
const cluster = require('cluster');
const numCPUs = 2; //require('os').cpus().length;

let dbname = "default";
let options = { /* default options */ }; // Load from cluster.config.js!
options.authentication = { enabled: false };
options.https = { enabled: false };

if (cluster.isMaster) {
    // Startup master
    console.log(`Master ${process.pid} is running`);

    options.cluster = {
        enabled: true,
        isMaster: true,
        workers: []
    };

    for (let i = 0; i < numCPUs; i++) {
        let worker = cluster.fork();
        worker.on("disconnect", (worker, code, signal) => {
            console.error(`worker ${worker.process.pid} disconnected`);
            // TODO: restart!
        });
        options.cluster.workers.push(worker);
    }

    process.on("unhandledRejection", (reason, p) => {
        console.log("Unhandled Rejection in master ", process.pid, " at: ", reason.stack);
    });

    console.log(`Starting database server with ${options.cluster.workers.length} workers`);
    const master = new AceBase(dbname, options);
    master.once("ready", () => {
        console.log(`Master database server started on process ${process.pid}`);
    });

    cluster.on("exit", (worker, code, signal) => {
        console.error(`worker ${worker.process.pid} died`);
    });
}
else {
    console.log(`Worker ${process.pid} is running`);

    options.cluster = {
        enabled: true,
        isMaster: false,
        master: process
    };
    process.on("unhandledRejection", (reason, p) => {
        console.log("Unhandled Rejection in worker ", process.pid, " at: ", reason.stack);
    });

    const workerServer = new AceBaseServer(dbname, options);
    workerServer.ready(() => {
        console.log(`Worker database server started on process ${process.pid}`);
    });

}
