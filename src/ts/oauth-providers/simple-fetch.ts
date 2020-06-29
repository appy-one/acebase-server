import * as https from 'https';
export interface SimpleFetchResponse {
    readonly status: number;
    readonly headers: { get(name: string): string }
    text(): Promise<string>
    json(): Promise<any>
    arrayBuffer(): Promise<ArrayBuffer>
}
/**
 * Very lightweight custom fetch implementation to avoid additional dependencies
 * @param url 
 * @param options 
 */
export function fetch(url: string, options?: { method?: 'GET'|'POST'|'PUT'|'DELETE', headers?: { [name: string]: string }, body?: string }): Promise<SimpleFetchResponse> {
    return new Promise((resolve, reject) => {
        const method = options?.method || 'GET';
        const headers = options?.headers;
        const req = https.request(url, { method, headers }, res => {
            
            // res.setEncoding('binary'); // will result in strings!!!! 
            const ready = new Promise<Buffer>((resolve, reject) => {
                let chunks = [];
                res.on('data', data => {
                    chunks.push(data);
                });
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(buffer);
                });
                res.on('error', (err) => {
                    reject(err);
                })             
            });

            const response: SimpleFetchResponse = {
                get status() { return res.statusCode },
                get headers() { return {
                    get(name: string) { 
                        let val = res.headers[name.toLowerCase()];
                        if (val instanceof Array) { return val.join(', '); } 
                        return val;
                    }
                } },
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
                }
            };

            resolve(response);
        });
        options?.body && req.write(options.body, 'utf8');
        req.end();
    })
}