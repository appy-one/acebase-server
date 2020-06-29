"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = exports.SpotifyAuthProvider = void 0;
const simple_fetch_1 = require("./simple-fetch");
class SpotifyAuthProvider {
    constructor(settings) {
        this.settings = settings;
        if (!settings.scopes) {
            settings.scopes = [];
        }
        if (!settings.scopes.includes('user-read-email')) {
            settings.scopes.push('user-read-email');
        }
        if (!settings.scopes.includes('user-read-private')) {
            settings.scopes.push('user-read-private');
        }
    }
    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url spotify will redirect to after authorizing, should be the url
     * @param info.state Optional state that will be passed to redirectUri by spotify
     */
    async init(info) {
        // Return url to get authorization code with
        const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${this.settings.client_id}&scope=${encodeURIComponent(this.settings.scopes.join(' '))}&redirect_uri=${encodeURIComponent(info.redirect_url)}&state=${encodeURIComponent(info.state)}`;
        return authUrl;
    }
    getAccessToken(params) {
        // Request access & refresh tokens with authorization code
        return simple_fetch_1.fetch('https://accounts.spotify.com/api/token', {
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
        return simple_fetch_1.fetch('https://api.spotify.com/v1/me', {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${access_token}`
            },
        })
            .then(async (response) => {
            const result = await response.json();
            if (response.status !== 200) {
                const error = result;
                throw new Error(`${error.status}: ${error.message}`);
            }
            const user = result;
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
            };
        });
    }
}
exports.SpotifyAuthProvider = SpotifyAuthProvider;
exports.AuthProvider = SpotifyAuthProvider;
