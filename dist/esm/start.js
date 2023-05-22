import { AceBaseServer } from './server.js';
/*

Use environment variables or pass arguments to this script to start an AceBase server
instance from the command-line.

Command-line arguments format:
`npx acebase-server start DBNAME=mydb HOST=localhost PORT=3000`
You can use all variables mentioned below (without 'ACEBASE_' prefix)

All environment variables MUST be prefixed with 'ACEBASE_' (except for PORT if ACEBASE_PORT is not specified).
Currently available environment variables:

# File and network settings:
ACEBASE_DBNAME='mydb'
ACEBASE_DBPATH='.'
ACEBASE_HOST='localhost'
ACEBASE_PORT='3000'
ACEBASE_ROOT_PATH=''

# Transaction logging settings:
ACEBASE_TXLOG='true'
ACEBASE_TXDAYS='30'

# Auth settings:
ACEBASE_AUTH='true'
ACEBASE_AUTH_USER_SIGNUP='true'
ACEBASE_AUTH_DEFAULT_ACCESS_RULE='deny'
ACEBASE_AUTH_DEFAULT_ADMIN_PASSWORD=''
ACEBASE_AUTH_NEW_USER_RATE_LIMIT='0'
ACEBASE_AUTH_SEPARATE_DB='false'
ACEBASE_AUTH_TOKENS_EXPIRE='0'

# IPC configuration for single machine clusters
ACEBASE_IPC='socket'

# IPC configuration for multiple machine clusters (Make sure there is ONLY ONE 'master' instance)
ACEBASE_IPC_PORT='9163'
ACEBASE_IPC_HOST='ipc.example.com'
ACEBASE_IPC_ROLE='master'
ACEBASE_IPC_SSL='true'
ACEBASE_IPC_TOKEN='secret'

*/
// If one executes "node start.js [dbname=name] [host=ip] [port=nr]"
function getVariable(name, defaultValue) {
    // Checks if an argument with the name was passed,
    // or if an environment variable was set with that name,
    // else it will return the default value
    name = name.toUpperCase();
    const arg = process.argv.find(arg => arg.toUpperCase().startsWith(`${name}=`));
    if (arg) {
        return arg.split('=')[1];
    }
    const envName = `ACEBASE_${name}`;
    if (typeof process.env[envName] !== 'undefined') {
        return process.env[envName];
    }
    if (name === 'PORT' && typeof process.env[name] !== 'undefined') {
        return process.env[name];
    }
    return defaultValue;
}
const options = {
    host: getVariable('HOST', 'localhost'),
    port: +getVariable('PORT', 3000),
    path: getVariable('DBPATH', '.'),
    rootPath: getVariable('ROOT_PATH', ''),
};
// Check if we should use a remote IPC server, let AceBase use a local IPC socket otherwise
const ipcPort = +getVariable('IPC_PORT', 0);
if (ipcPort > 0) {
    const role = getVariable('IPC_ROLE');
    if (!['master', 'worker'].includes(role)) {
        throw new Error('IPC_ROLE must be either "master" or "worker"');
    }
    options.ipc = {
        host: getVariable('IPC_HOST'),
        port: ipcPort,
        ssl: +getVariable('IPC_SSL', 0) === 1,
        token: getVariable('IPC_TOKEN'),
        role,
    };
}
else if (getVariable('IPC') === 'socket') {
    // Use local IPC socket, will become default soon
    options.ipc = 'socket';
}
// Check if transaction logging should be enabled (not enabled by default)
if (getVariable('TXLOG', 'false') === 'true' || +getVariable('TXLOG', 0) === 1) {
    options.transactions = {
        log: true,
        maxAge: +getVariable('TXDAYS', 30),
    };
}
// Check if authentication should be enabled (default)
if (getVariable('AUTH', 'true') === 'true' || +getVariable('AUTH', 1) === 1) {
    options.authentication = {
        enabled: true,
        allowUserSignup: +getVariable('AUTH_USER_SIGNUP', 1) === 1,
        defaultAccessRule: getVariable('AUTH_DEFAULT_ACCESS_RULE'),
        defaultAdminPassword: getVariable('AUTH_DEFAULT_ADMIN_PASSWORD'),
        newUserRateLimit: +getVariable('AUTH_NEW_USER_RATE_LIMIT', 0),
        separateDb: getVariable('AUTH_SEPARATE_DB', false),
        tokensExpire: +getVariable('AUTH_TOKENS_EXPIRE', 0), // No implemented yet
    };
}
else {
    options.authentication = { enabled: false };
}
const dbname = getVariable('DBNAME', 'default');
const server = new AceBaseServer(dbname, options);
server.once('ready', () => {
    server.debug.log(`AceBase server running`);
    process.send?.('ready'); // When using pm2, you can use --wait-ready flag (see https://pm2.keymetrics.io/docs/usage/signals-clean-restart/)
});
//# sourceMappingURL=start.js.map