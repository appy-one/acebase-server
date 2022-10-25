export interface SimpleFetchResponse {
    readonly status: number;
    readonly headers: {
        get(name: string): string;
    };
    text(): Promise<string>;
    json(): Promise<any>;
    arrayBuffer(): Promise<ArrayBuffer>;
}
/**
 * Very lightweight custom fetch implementation to avoid additional dependencies
 * @param url
 * @param options
 */
export declare function fetch(url: string, options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: {
        [name: string]: string;
    };
    body?: string;
}): Promise<SimpleFetchResponse>;
//# sourceMappingURL=simple-fetch.d.ts.map