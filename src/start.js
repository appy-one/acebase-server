const { AceBaseServer } = require('./acebase-server');

// If one executes "node start.js [dbname=name] [host=ip] [port=nr]"
function getVariable(name, defaultValue) {
    // Checks if an argument with the name was passed, 
    // or if an environment variable was set with that name,
    // else it will return the default value
    name = name.toUpperCase();
    const arg = process.argv.find(arg => arg.toUpperCase().startsWith(`${name}=`));
    if (arg) { return arg.split('=')[1]; }
    if (typeof process.env[name] !== 'undefined') { return process.env[name]; }
    return defaultValue;
}

const path = getVariable('DBPATH', '.');
const dbname = getVariable('DBNAME', 'default');
const host = getVariable('HOST', '0.0.0.0');
const port = parseInt(getVariable('PORT', 3000));
const clusterPort = parseInt(getVariable('CLUSTER_PORT', 0));
const options = { host, port, path };
if (clusterPort > 0) {
    options.cluster = { enabled: true, port: clusterPort };
}
if (+getVariable('TXLOG', 0) === 1) {
    options.transactions = {
        log: true,
        maxAge: +getVariable('TXDAYS', 30)
    };
}
const server = new AceBaseServer(dbname, options);
server.once("ready", () => {
    server.debug.log(`AceBase server running`);
});