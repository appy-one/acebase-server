import { IOAuth2ProviderSettings, IOAuth2AuthCodeParams, IOAuth2RefreshTokenParams, OAuth2Provider, OAuth2ProviderInitInfo } from "./oauth-provider";
/**
 * Details of your app to access the Spotify API
 */
export interface ISpotifyAuthSettings extends IOAuth2ProviderSettings {
    /** 'user-read-email', 'user-read-private' and additional scopes you want to access. See https://developer.spotify.com/documentation/general/guides/scopes/ */
    scopes?: string[];
}
interface ISpotifyAuthToken {
    access_token: string;
    expires_in: number;
    expires: Date;
    refresh_token: string;
    scope: string;
    token_type: string;
}
interface ISpotifyClientAuthToken {
    access_token: string;
    token_type: string;
    expires_in: number;
}
interface ISpotifyImage {
    width: number;
    height: number;
    url: string;
}
export declare class SpotifyAuthProvider extends OAuth2Provider {
    constructor(settings: ISpotifyAuthSettings);
    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url spotify will redirect to after authorizing
     * @param info.state Optional state that will be passed to redirectUri by spotify
     */
    init(info: OAuth2ProviderInitInfo): Promise<string>;
    getAccessToken(params: IOAuth2AuthCodeParams | IOAuth2RefreshTokenParams): Promise<ISpotifyAuthToken>;
    getClientAccessToken(): Promise<ISpotifyClientAuthToken>;
    getUserInfo(access_token: string): Promise<{
        id: string;
        name: string;
        display_name: string;
        picture: ISpotifyImage[];
        email: string;
        email_verified: boolean;
        other: {
            premium: boolean;
            followers: number;
            country: string;
            uri: string;
        };
    }>;
}
export declare const AuthProvider: typeof SpotifyAuthProvider;
export {};
