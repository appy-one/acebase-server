import { OAuth2Provider } from './oauth-provider.js';
import { fetch } from '../shared/simple-fetch.js';
export class FacebookAuthProvider extends OAuth2Provider {
    constructor(settings) {
        super(settings);
        if (!settings.scopes) {
            settings.scopes = [];
        }
        if (!settings.scopes.includes('email')) {
            settings.scopes.push('email');
        }
    }
    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url spotify will redirect to after authorizing, should be the url
     * @param info.state Optional state that will be passed to redirectUri by spotify
     */
    async init(info) {
        // Return url to get authorization code with
        const authUrl = `https://www.facebook.com/v7.0/dialog/oauth?response_type=code&client_id=${this.settings.client_id}&scope=${encodeURIComponent(this.settings.scopes.join(' '))}&redirect_uri=${encodeURIComponent(info.redirect_url)}&state=${encodeURIComponent(info.state)}`;
        return authUrl;
    }
    async getAccessToken(params) {
        // Request access token with authorization code, or previously granted (short or long-lived) access_token
        const url = `https://graph.facebook.com/v7.0/oauth/access_token?client_id=${this.settings.client_id}&client_secret=${this.settings.client_secret}` +
            (params.type === 'refresh'
                ? `&grant_type=fb_exchange_token&fb_exchange_token=${params.refresh_token}`
                : `&code=${params.auth_code}&redirect_uri=${encodeURIComponent(params.redirect_url)}`);
        const response = await fetch(url);
        const result = await response.json();
        if (result.error) {
            const error = result.error;
            throw new Error(`${error.type} ${error.code}: ${error.message}`);
        }
        const secondsToExpiry = result.expires_in;
        result.expires = new Date(Date.now() + (secondsToExpiry * 1000));
        // A short-lived access token can be exchanged for a long-lived (60 day) token.
        // Not sure if a long-lived token can be used to get a new long-lived token,
        // needs testing. See docs at: https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing/
        result.refresh_token = result.access_token;
        return result;
    }
    async getUserInfo(access_token) {
        // TODO: Check if any requested scopes have not been granted access
        // await fetch(`https://graph.facebook.com/v7.0/me/permissions`);
        const response = await fetch(`https://graph.facebook.com/v7.0/me?fields=email,name,short_name,picture&access_token=${access_token}`);
        const result = await response.json();
        if (response.status !== 200) {
            const error = result;
            throw new Error(`${error.code}: ${error.message}`);
        }
        const user = result;
        return {
            id: user.id,
            name: user.name,
            display_name: user.short_name,
            picture: user.picture.data.is_silhouette ? null : [{ width: user.picture.data.width, height: user.picture.data.height, url: user.picture.data.url }],
            email: user.email,
            email_verified: typeof user.email === 'string',
            other: {
            // We haven't requested more, so we didn't get more
            },
        };
    }
}
export const AuthProvider = FacebookAuthProvider;
//# sourceMappingURL=facebook.js.map