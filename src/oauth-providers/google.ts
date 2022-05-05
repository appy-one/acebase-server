import { IOAuth2Provider, IOAuth2ProviderSettings, IOpenIDToken, IOpenIDConfiguration, IOAuth2AuthCodeParams, IOAuth2RefreshTokenParams } from "./oauth-provider";
import { fetch } from '../shared/simple-fetch';

/**
 * Details of your app to access the Google API. See https://developers.google.com/identity/protocols/oauth2/scopes
 */
export interface IGoogleAuthSettings extends IOAuth2ProviderSettings {
    /** 'openid', 'email', 'profile' and additional scopes you want to access. */
    scopes?: string[]
}

interface IGoogleAuthToken { access_token: string, expires_in: number, expires: Date, id_token: IOpenIDToken, refresh_token: string, scope: string, token_type: string }
interface IGoogleError { error: string, error_description: string }
interface IGoogleUser {
    // See https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
    sub: string // "subject"
    name: string    // full name
    given_name: string  // first name
    family_name: string // last name
    middle_name: string
    nickname: string
    preferred_username: string
    profile: string // url
    picture: string // url
    website: string // url
    email: string
    email_verified: boolean
    gender: string
    birthdate: string // YYYY-MM-DD
    zoneinfo: string // timezone location (eg Europe/Paris)
    locale: string      // eg en-us, nl-be
    phone_number: string
    phone_number_verified: boolean
    address: {
        // See https://openid.net/specs/openid-connect-core-1_0.html#AddressClaim
        formatted?: string
        street_address: string
        locality: string // eg city
        region: string  // State, province, prefecture, or region component
        postal_code: string
        country: string
    }
    updated_at: number
}

export class GoogleAuthProvider implements IOAuth2Provider {

    _config: IOpenIDConfiguration

    constructor(private settings: IGoogleAuthSettings) {
        if (!settings.scopes) { settings.scopes = []; }
        if (!settings.scopes.includes('email')) { settings.scopes.push('email'); }
        if (!settings.scopes.includes('profile')) { settings.scopes.push('profile'); }
        if (!settings.scopes.includes('openid')) { settings.scopes.push('openid'); }
    }

    async getOpenIDConfig() {
        // Get Open ID config ("The Discovery document")
        if (this._config) { return this._config; }
        this._config = await fetch(`https://accounts.google.com/.well-known/openid-configuration`).then(res => res.json());
        return this._config;
    }

    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url spotify will redirect to after authorizing, should be the url 
     * @param info.state Optional state that will be passed to redirectUri by spotify
     */
    async init(info: { redirect_url: string, state?: string }) {
        // Return url to get authorization code with
        // See https://developers.google.com/identity/protocols/oauth2/web-server#httprest

        const config = await this.getOpenIDConfig();
        // https://accounts.google.com/o/oauth2/v2/auth
        const authUrl = `${config.authorization_endpoint}?response_type=code&access_type=offline&include_granted_scopes=true&client_id=${this.settings.client_id}&scope=${encodeURIComponent(this.settings.scopes.join(' '))}&redirect_uri=${encodeURIComponent(info.redirect_url)}&state=${encodeURIComponent(info.state)}`;
        // optional: login_hint=email@server.com
        // optional: prompt=none|consent|select_account
        return authUrl;
    }

    async getAccessToken(params: IOAuth2AuthCodeParams|IOAuth2RefreshTokenParams) : Promise<IGoogleAuthToken> {
        // Request access & refresh tokens with authorization code, or refresh token
        const config = await this.getOpenIDConfig();
        // 'https://oauth2.googleapis.com/token'
        return fetch(config.token_endpoint, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `client_id=${this.settings.client_id}&client_secret=${this.settings.client_secret}&code=` 
            + (params.type === 'refresh'
                ? `${params.refresh_token}&grant_type=refresh_token`
                : `${params.auth_code}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(params.redirect_url)}`)
        })
        .then(response => response.json())
        .then((result: IGoogleAuthToken) => {
            if ((result as any).error) {
                throw new Error((result as any).error);
            }
            const secondsToExpiry = result.expires_in;
            result.expires = new Date(Date.now() + (secondsToExpiry * 1000));
            return result;
        });
    }

    async revokeAccess(access_token: string) {
        const config = await this.getOpenIDConfig();
        // https://oauth2.googleapis.com/revoke
        return fetch(`${config.revocation_endpoint}?token=${access_token}`)
        .then(response => {
            if (response.status !== 200) {
                throw new Error(`Revoke failed, error ${response.status}`);
            }
        });
    }

    async getUserInfo(access_token: string) {
        const config = await this.getOpenIDConfig();
        // https://openidconnect.googleapis.com/v1/userinfo
        return fetch(config.userinfo_endpoint, { 
            method: 'GET' , 
            headers: { 'Authorization': `Bearer ${access_token}` }
        })
        .then(async response => {
            const result = await response.json();
            if (response.status !== 200) {
                const error = result as IGoogleError;
                throw new Error(`${error.error}: ${error.error_description}`);
            }

            const user = result as IGoogleUser;
            return {
                id: user.sub,
                name: user.name,
                display_name: user.nickname || user.given_name,
                picture: user.picture ? [{ url: user.picture }] : [],
                email: user.email,
                email_verified: user.email_verified,
                other: Object.keys(user)
                    .filter(key => !['sub','name','picture','email','email_verified'].includes(key))
                    .reduce((obj, key) => { obj[key] = user[key]; return obj; }, {})
            };
        });
    }

}

export const AuthProvider = GoogleAuthProvider;