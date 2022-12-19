"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuth2Provider = void 0;
// export interface IOAuth2Provider {
//     init(info: OAuth2ProviderInitInfo): Promise<string>;
//     getAccessToken(param: OAuth2ProviderGetAccessTokenParams): Promise<IOAuth2TokenResult>;
//     getUserInfo(access_token: string): Promise<OAuth2ProviderUserInfo>;
// }
class NotImplementedError extends Error {
    constructor() { super('Not implemented'); }
}
class OAuth2Provider {
    constructor(settings) {
        this.settings = settings;
    }
    init(info) { throw new NotImplementedError(); }
    getAccessToken(param) { throw new NotImplementedError(); }
    getUserInfo(access_token) { throw new NotImplementedError(); }
}
exports.OAuth2Provider = OAuth2Provider;
//# sourceMappingURL=oauth-provider.js.map