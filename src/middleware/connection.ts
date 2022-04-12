import type { Duplex } from 'stream';
import type { RouteInitEnvironment } from '../shared/env';

/**
 * Adds connection management middleware. Add this as very first handler!
 * @param env
 */
export const addMiddleware = (env: RouteInitEnvironment) => {

    const sockets = new Set<Duplex>();
    let terminating = false;
    const destroySocket = (socket: Duplex) => {
        socket.destroy();
    };
    const addConnection = (socket: Duplex) => {
        // console.log(`event: server.connection`);
        if (terminating) {
            destroySocket(socket);
        } 
        else {
            sockets.add(socket);
            socket.once('close', () => {
                // console.log(`event: socket.close`);
                sockets.delete(socket);
            });
        }
    };
    env.server.on('connection', addConnection);
    env.server.on('secureConnection', addConnection);

    // Don't enable this: it'll make every other request real slow
    // env.app.use((req, res, next) => {
    //     res.setHeader('Connection', 'close');
    //     next();
    // });

    const terminate = () => {
        terminating = true;
        console.warn(`Terminating ${sockets.size} open connections`);
        sockets.forEach(socket => {
            try { destroySocket(socket); }
            catch (err) { console.error(`Cannot destroy socket: ${err.message}`); }
        });
    };
    return terminate;
};

export default addMiddleware;