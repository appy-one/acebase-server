"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Starts a test server for debugging sessions
const server_1 = require("./server");
// Make sure development environment is set
process.env.NODE_ENV = 'development';
const server = new server_1.AceBaseServer('default', { logLevel: 'verbose', host: 'localhost', port: 3000, path: '.' });
server.once('ready', () => {
    console.log(`Ready to debug!`);
});
//# sourceMappingURL=test.js.map