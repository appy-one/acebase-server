import { IOAuth2Provider, IOAuth2ProviderSettings, IOAuth2AuthCodeParams } from "./oauth-provider";
/**
 * Details of your app to access the Legacy Instagram API.
 */
export interface IInstagramAuthSettings extends IOAuth2ProviderSettings {
    /** Only 'basic' is available since October 2017. See https://www.instagram.com/developer/authorization/ */
    scopes?: string[];
}
interface IInstagramAuthToken {
    access_token: string;
    user: IInstagramUser;
}
interface IInstagramUser {
    id: string;
    username: string;
    full_name: string;
    profile_picture: string;
    bio: string;
    website: string;
    is_business: boolean;
    counts: {
        media: number;
        follows: number;
        followed_by: number;
    };
}
export declare class InstagramAuthProvider implements IOAuth2Provider {
    private settings;
    constructor(settings: IInstagramAuthSettings);
    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url spotify will redirect to after authorizing, should be the url
     * @param info.state Optional state that will be passed to redirectUri by spotify
     */
    init(info: {
        redirect_url: string;
        state?: string;
    }): Promise<string>;
    _userInfo: IInstagramUser;
    getAccessToken(params: IOAuth2AuthCodeParams): Promise<IInstagramAuthToken>;
    getUserInfo(access_token: string): Promise<{
        id: string;
        name: string;
        display_name: string;
        picture: {
            url: string;
        }[];
        email: any;
        email_verified: boolean;
        other: {};
    }>;
}
export declare const AuthProvider: typeof InstagramAuthProvider;
export {};
