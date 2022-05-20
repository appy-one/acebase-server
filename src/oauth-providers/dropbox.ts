import { IOAuth2ProviderSettings, IOAuth2AuthCodeParams, IOAuth2RefreshTokenParams, OAuth2Provider, OAuth2ProviderInitInfo } from "./oauth-provider";
import { fetch } from '../shared/simple-fetch';

/**
 * Details of your app to access the Dropbox API
 */
export interface IDropboxAuthSettings extends IOAuth2ProviderSettings {
    /** specify specific scopes, or leave empty to get all configured scopes for the app. 'account_info.read' will be added automatically if you provided other scopes. See permissions tab in your Dropbox app settings */
    scopes?: string[]
}

interface IDropboxAuthToken { access_token: string, expires_in: number, expires: Date, refresh_token: string, scope: string, token_type: string, account_id: string, uid: string }
interface IDropboxError { code: number, message?: string, error?: { ".tag": string }, error_summary?: string, user_message?: string }
interface IDropboxUser {
    account_id: string
    name: {
        given_name: string
        surname: string
        familiar_name: string
        display_name: string
        abbreviated_name: string
    }
    email: string
    email_verified: boolean
    disabled: boolean
    locale: string
    referral_link: string
    is_paired: boolean
    account_type: {
        ".tag": "basic"|"pro"|"business"
    }
    root_info: {
        ".tag": "user"
        root_namespace_id: string
        home_namespace_id: string
    }
    profile_photo_url?: string
    country: string
    team?: {
        id: string
        name: string
        sharing_policies: {
            shared_folder_member_policy: { ".tag": "team"|"anyone" }
            shared_folder_join_policy: { ".tag": "from_team_only"|"from_anyone" }
            shared_link_create_policy: { ".tag": "default_public"|"default_team_only"|"team_only" }
        }
        office_addin_policy: { ".tag": "enabled"|"disabled" }
    }
    team_member_id?: string
}
export class DropboxAuthProvider extends OAuth2Provider {

    constructor(settings: IDropboxAuthSettings) {
        super(settings);
        if (!settings.scopes) { settings.scopes = []; }
        if (settings.scopes.length > 0 && !settings.scopes.includes('account_info.read')) { settings.scopes.push('account_info.read'); }
    }

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
    async init(info: OAuth2ProviderInitInfo) {
        // Return url to get authorization code with
        const options = info.options || {};
        const authUrl = `https://www.dropbox.com/oauth2/authorize?response_type=code&token_access_type=offline&client_id=${this.settings.client_id}&scope=${encodeURIComponent(this.settings.scopes.join(' '))}&redirect_uri=${encodeURIComponent(info.redirect_url)}&locale=${options.locale || ''}&require_role=${options.require_role || ''}&force_reauthentication=${options.force_reauthentication === true}&force_reapprove=${options.force_reapprove === true}&disable_signup=${options.disable_signup === true}&state=${encodeURIComponent(info.state)}`;
        return authUrl;
    }

    getAccessToken(params: IOAuth2AuthCodeParams|IOAuth2RefreshTokenParams) {
        // Request access & refresh tokens with authorization code
        return fetch('https://api.dropbox.com/oauth2/token', { 
            method: 'POST', 
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `client_id=${this.settings.client_id}&client_secret=${this.settings.client_secret}` +
                (params.type === 'refresh'
                    ? `&grant_type=refresh_token&refresh_token=${params.refresh_token}`
                    : `&grant_type=authorization_code&code=${params.auth_code}&redirect_uri=${encodeURIComponent(params.redirect_url)}`)
        })
        .then(async response => {
            if (response.status !== 200) {
                // Handle error
                const code = response.status;
                const hasJSON = response.headers.get('Content-Type') === 'application/json';
                const details = await (hasJSON ? response.json() : response.text());
                throw new Error(`${code}: ${hasJSON ? details.error_description ? `${details.error}, ${details.error_description}` : (details as IDropboxError).error_summary : details}`);
            }
            const result:IDropboxAuthToken = await response.json();
            const secondsToExpiry = result.expires_in;
            result.expires = new Date(Date.now() + (secondsToExpiry * 1000));
            return result;
        });
    }

    getUserInfo(access_token: string) {
        return fetch(`https://api.dropboxapi.com/2/users/get_current_account`, { 
            method: 'POST', 
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        .then(async response => {
            if (response.status !== 200) {
                const code = response.status;
                const hasJSON = response.headers.get('Content-Type') === 'application/json';
                const details = await (hasJSON ? response.json() : response.text());
                throw new Error(`${code}: ${hasJSON ? (details as IDropboxError).error_summary : details}`);
            }
            const result = await response.json();
            const user = result as IDropboxUser;
            return {
                id: user.account_id,
                name: `${user.name.given_name} ${user.name.surname}`,
                display_name: user.name.display_name,
                picture: user.profile_photo_url ? [{ url: user.profile_photo_url }] : null,
                email: user.email,
                email_verified: user.email_verified,
                other: {
                    account_type: user.account_type['.tag'],
                    disabled: user.disabled,
                    locale: user.locale,
                    country: user.country,
                    // include the following?
                    // referral_link: user.referral_link,
                    // team_id: user.team.id,
                    // team_name: user.team.name,
                    // team_member_id: user.team_member_id
                }
            };
        });
    }

}

export const AuthProvider = DropboxAuthProvider;