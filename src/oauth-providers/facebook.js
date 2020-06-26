"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = exports.FacebookAuthProvider = void 0;
const simple_fetch_1 = require("./simple-fetch");
class FacebookAuthProvider {
    constructor(settings) {
        this.settings = settings;
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
    getAccessToken(params) {
        // Request access & refresh tokens with authorization code
        return simple_fetch_1.fetch(`https://graph.facebook.com/v7.0/oauth/access_token?client_id=${this.settings.client_id}&client_secret=${this.settings.client_secret}&code=${params.auth_code}&redirect_uri=${encodeURIComponent(params.redirect_url)}`)
            .then(response => response.json())
            .then((result) => {
            if (result.error) {
                throw new Error(result.error);
            }
            const secondsToExpiry = result.expires_in;
            result.expires = new Date(Date.now() + (secondsToExpiry * 1000));
            return result;
        });
    }
    getUserInfo(access_token) {
        // TODO: Check if any requested scopes have not been granted access
        // await fetch(`https://graph.facebook.com/v7.0/me/permissions`);
        return simple_fetch_1.fetch(`https://graph.facebook.com/v7.0/me?fields=email,name,short_name,picture&access_token=${access_token}`)
            .then(async (response) => {
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
                }
            };
        });
    }
}
exports.FacebookAuthProvider = FacebookAuthProvider;
exports.AuthProvider = FacebookAuthProvider;
