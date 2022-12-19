import { IOAuth2ProviderSettings, IOAuth2AuthCodeParams, OAuth2Provider, OAuth2ProviderInitInfo } from './oauth-provider';
import { fetch } from '../shared/simple-fetch';

/**
 * Details of your app to access the Legacy Instagram API.
 */
export interface IInstagramAuthSettings extends IOAuth2ProviderSettings {
    /** Only 'basic' is available since October 2017. See https://www.instagram.com/developer/authorization/ */
    scopes?: string[]
}

interface IInstagramAuthToken {
    access_token: string,
    user: IInstagramUser
}
interface IInstagramError { code: number, message: string, type: string }
interface IInstagramUser {
    id: string
    username: string
    full_name: string
    profile_picture: string
    bio: string
    website: string
    is_business: boolean
    counts: {
        media: number,
        follows: number,
        followed_by: number
    }
}
export class InstagramAuthProvider extends OAuth2Provider {

    constructor(settings: IInstagramAuthSettings) {
        super(settings);
        if (!settings.scopes) { settings.scopes = []; }
        if (!settings.scopes.includes('basic')) { settings.scopes.push('basic'); }

        // Instagram API is deprecated.
        // Moving to the Instagram Basic Display API is not feasible because user details are not sufficient to sign users in.
        console.error(`Instagram Legacy API is deprecated and will be disabled June 29, 2020`);
    }

    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url spotify will redirect to after authorizing, should be the url
     * @param info.state Optional state that will be passed to redirectUri by spotify
     */
    async init(info: OAuth2ProviderInitInfo) {
        // Return url to get authorization code with
        // See https://www.instagram.com/developer/authorization/
        const authUrl = `https://api.instagram.com/oauth/authorize/?response_type=code&client_id=${this.settings.client_id}&scope=${encodeURIComponent(this.settings.scopes.join(' '))}&redirect_uri=${encodeURIComponent(info.redirect_url)}&state=${encodeURIComponent(info.state)}`;
        return authUrl;
    }

    _userInfo: IInstagramUser;
    async getAccessToken(params: IOAuth2AuthCodeParams) {
        // Request access & refresh tokens with authorization code
        const response = await fetch(`https://api.instagram.com/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `client_id=${this.settings.client_id}&client_secret=${this.settings.client_secret}&code=${params.auth_code}&redirect_uri=${encodeURIComponent(params.redirect_url)}`,
        });
        const result = await response.json();
        if ((result as any).error) {
            throw new Error((result as any).error);
        }
        return result as IInstagramAuthToken;
    }

    async getUserInfo(access_token: string) {
        const response = await fetch(`https://api.instagram.com/v1/users/self/?access_token=${access_token}`);
        const result = await response.json();
        if (response.status !== 200) {
            const error = result as IInstagramError;
            throw new Error(`${error.code}: ${error.message}`);
        }

        const user = result as IInstagramUser;
        return {
            id: user.id,
            name: user.full_name,
            display_name: user.username,
            picture: [{ url: user.profile_picture }],
            email: null, //NO E-MAIL! user.email,
            email_verified: false,
            other: Object.keys(user)
                .filter(key => !['id','username','full_name','profile_picture'].includes(key))
                .reduce((obj, key) => { obj[key] = user[key]; return obj; }, {}),
        };
    }

}

export const AuthProvider = InstagramAuthProvider;
