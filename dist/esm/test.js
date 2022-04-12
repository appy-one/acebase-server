// Starts a test server for debugging sessions
import { AceBaseServer } from './server.js';
// Make sure development environment is set
process.env.NODE_ENV = 'development';
const server = new AceBaseServer('default', { logLevel: 'verbose', host: 'localhost', port: 3000, path: '.' });
server.once('ready', () => {
    console.log(`Ready to debug!`);
});
//# sourceMappingURL=test.js.map