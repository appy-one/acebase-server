import { IOAuth2ProviderSettings, IOpenIDToken, IOpenIDConfiguration, IOAuth2AuthCodeParams, IOAuth2RefreshTokenParams, OAuth2ProviderInitInfo, OAuth2Provider } from './oauth-provider';
/**
 * Details of your app to access the Google API. See https://developers.google.com/identity/protocols/oauth2/scopes
 */
export interface IGoogleAuthSettings extends IOAuth2ProviderSettings {
    /** 'openid', 'email', 'profile' and additional scopes you want to access. */
    scopes?: string[];
}
interface IGoogleAuthToken {
    access_token: string;
    expires_in: number;
    expires: Date;
    id_token: IOpenIDToken;
    refresh_token: string;
    scope: string;
    token_type: string;
}
export declare class GoogleAuthProvider extends OAuth2Provider {
    _config: IOpenIDConfiguration;
    constructor(settings: IGoogleAuthSettings);
    getOpenIDConfig(): Promise<IOpenIDConfiguration>;
    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url spotify will redirect to after authorizing, should be the url
     * @param info.state Optional state that will be passed to redirectUri by spotify
     */
    init(info: OAuth2ProviderInitInfo): Promise<string>;
    getAccessToken(params: IOAuth2AuthCodeParams | IOAuth2RefreshTokenParams): Promise<IGoogleAuthToken>;
    revokeAccess(access_token: string): Promise<void>;
    getUserInfo(access_token: string): Promise<{
        id: string;
        name: string;
        display_name: string;
        picture: {
            url: string;
        }[];
        email: string;
        email_verified: boolean;
        other: {};
    }>;
}
export declare const AuthProvider: typeof GoogleAuthProvider;
export {};
//# sourceMappingURL=google.d.ts.map