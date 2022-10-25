import { IOAuth2ProviderSettings, IOAuth2AuthCodeParams, IOAuth2RefreshTokenParams, OAuth2Provider, OAuth2ProviderInitInfo } from "./oauth-provider";
/**
 * Details of your app to access the Dropbox API
 */
export interface IDropboxAuthSettings extends IOAuth2ProviderSettings {
    /** specify specific scopes, or leave empty to get all configured scopes for the app. 'account_info.read' will be added automatically if you provided other scopes. See permissions tab in your Dropbox app settings */
    scopes?: string[];
}
interface IDropboxAuthToken {
    access_token: string;
    expires_in: number;
    expires: Date;
    refresh_token: string;
    scope: string;
    token_type: string;
    account_id: string;
    uid: string;
}
export declare class DropboxAuthProvider extends OAuth2Provider {
    constructor(settings: IDropboxAuthSettings);
    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url dropbox will redirect to after authorizing
     * @param info.state Optional state that will be passed to redirectUri by dropbox
     * @param info.options Optional Dropbox specific authentication settings
     * @param info.options.require_role  If this parameter is specified, the user will be asked to authorize with a particular type of Dropbox account, either work for a team account or personal for a personal account. Your app should still verify the type of Dropbox account after authorization since the user could modify or remove the require_role parameter.
     * @param info.options.force_reapprove Whether or not to force the user to approve the app again if they've already done so. If false (default), a user who has already approved the application may be automatically redirected to the URI specified by redirect_uri. If true, the user will not be automatically redirected and will have to approve the app again.
     * @param info.options.disable_signup When true (default is false) users will not be able to sign up for a Dropbox account via the authorization page. Instead, the authorization page will show a link to the Dropbox iOS app in the App Store. This is only intended for use when necessary for compliance with App Store policies.
     * @param info.options.locale If the locale specified is a supported language, Dropbox will direct users to a translated version of the authorization website. Locale tags should be IETF language tags.
     * @param info.options.force_reauthentication When true (default is false) users will be signed out if they are currently signed in. This will make sure the user is brought to a page where they can create a new account or sign in to another account. This should only be used when there is a definite reason to believe that the user needs to sign in to a new or different account.
     */
    init(info: OAuth2ProviderInitInfo): Promise<string>;
    getAccessToken(params: IOAuth2AuthCodeParams | IOAuth2RefreshTokenParams): Promise<IDropboxAuthToken>;
    getUserInfo(access_token: string): Promise<{
        id: string;
        name: string;
        display_name: string;
        picture: {
            url: string;
        }[];
        email: string;
        email_verified: boolean;
        other: {
            account_type: "basic" | "pro" | "business";
            disabled: boolean;
            locale: string;
            country: string;
        };
    }>;
}
export declare const AuthProvider: typeof DropboxAuthProvider;
export {};
//# sourceMappingURL=dropbox.d.ts.map