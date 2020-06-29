import { IOAuth2Provider, IOAuth2ProviderSettings, IOAuth2AuthCodeParams, IOAuth2RefreshTokenParams } from "./oauth-provider";
import { fetch } from './simple-fetch';

/**
 * Details of your app to access the Spotify API
 */
export interface ISpotifyAuthSettings extends IOAuth2ProviderSettings {
    /** 'user-read-email', 'user-read-private' and additional scopes you want to access. See https://developer.spotify.com/documentation/general/guides/scopes/ */
    scopes?: string[]
}

interface ISpotifyAuthToken { access_token: string, expires_in: number, expires: Date, refresh_token: string, scope: string, token_type: string }
interface ISpotifyExternalUrl {}
interface ISpotifyFollowers {}
interface ISpotifyImage { width: number, height: number, url: string }
interface ISpotifyError { status: number, message: string }
interface ISpotifyUser {
    country: string,
    display_name: string,
    email: string, // NOT VERIFIED! See https://developer.spotify.com/documentation/web-api/reference/users-profile/get-current-users-profile/
    external_urls: ISpotifyExternalUrl,
    followers: ISpotifyFollowers,
    href: string,
    id: string,
    images: Array<ISpotifyImage>,
    product: 'premium'|'free'|'open',
    type: 'user',
    uri: string
}
export class SpotifyAuthProvider implements IOAuth2Provider {

    constructor(private settings: ISpotifyAuthSettings) {
        if (!settings.scopes) { settings.scopes = []; }
        if (!settings.scopes.includes('user-read-email')) { settings.scopes.push('user-read-email'); }
        if (!settings.scopes.includes('user-read-private')) { settings.scopes.push('user-read-private'); }
    }

    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url spotify will redirect to after authorizing, should be the url 
     * @param info.state Optional state that will be passed to redirectUri by spotify
     */
    async init(info: { redirect_url: string, state?: string }) {
        // Return url to get authorization code with
        const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${this.settings.client_id}&scope=${encodeURIComponent(this.settings.scopes.join(' '))}&redirect_uri=${encodeURIComponent(info.redirect_url)}&state=${encodeURIComponent(info.state)}`;
        return authUrl;
    }

    getAccessToken(params: IOAuth2AuthCodeParams|IOAuth2RefreshTokenParams) {
        // Request access & refresh tokens with authorization code
        return fetch('https://accounts.spotify.com/api/token', { 
            method: 'POST', 
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `client_id=${this.settings.client_id}&client_secret=${this.settings.client_secret}` +
                (params.type === 'refresh'
                    ? `&grant_type=refresh_token&refresh_token=${params.refresh_token}`
                    : `&grant_type=authorization_code&code=${params.auth_code}&redirect_uri=${encodeURIComponent(params.redirect_url)}`)
        })
        .then(response => response.json())
        .then((result: ISpotifyAuthToken) => {
            if ((result as any).error) {
                throw new Error((result as any).error);
            }
            const secondsToExpiry = result.expires_in;
            result.expires = new Date(Date.now() + (secondsToExpiry * 1000));
            return result;
        });
    }

    getUserInfo(access_token: string) {
        return fetch('https://api.spotify.com/v1/me', { 
            method: 'GET', 
            headers: {
                "Authorization": `Bearer ${access_token}`
            },
        })
        .then(async response => {
            const result = await response.json();
            if (response.status !== 200) {
                const error = result as ISpotifyError;
                throw new Error(`${error.status}: ${error.message}`);
            }
            const user = result as ISpotifyUser;
            return {
                id: user.id,
                name: user.display_name,
                display_name: user.display_name,
                picture: user.images,
                email: user.email,
                email_verified: false,
                other: {
                    premium: user.product === 'premium',
                    followers: user.followers,
                    country: user.country,
                    external_urls: user.external_urls,
                    uri: user.uri
                }
            }
        });
    }

}

export const AuthProvider = SpotifyAuthProvider;