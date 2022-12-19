import { request } from 'https';
/**
 * Very lightweight custom fetch implementation to avoid additional dependencies
 * @param url
 * @param options
 */
export function fetch(url, options) {
    return new Promise((resolve, reject) => {
        const method = options?.method || 'GET';
        const headers = options?.headers;
        const req = request(url, { method, headers }, res => {
            // res.setEncoding('binary'); // will result in strings!!!!
            const ready = new Promise((resolve, reject) => {
                const chunks = [];
                res.on('data', data => {
                    chunks.push(data);
                });
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(buffer);
                });
                res.on('error', (err) => {
                    reject(err);
                });
            });
            const response = {
                get status() { return res.statusCode; },
                get headers() {
                    return {
                        get(name) {
                            const val = res.headers[name.toLowerCase()];
                            if (val instanceof Array) {
                                return val.join(', ');
                            }
                            return val;
                        },
                    };
                },
                async text() {
                    const buffer = await ready;
                    return buffer.toString('utf8');
                },
                json() {
                    // return Promise.resolve(JSON.parse(body));
                    return this.text().then(json => JSON.parse(json));
                },
                async arrayBuffer() {
                    const data = await ready;
                    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
                    return arrayBuffer;
                },
            };
            resolve(response);
        });
        req.on('error', reject);
        options?.body && req.write(options.body, 'utf8');
        req.end();
    });
}
//# sourceMappingURL=simple-fetch.js.map