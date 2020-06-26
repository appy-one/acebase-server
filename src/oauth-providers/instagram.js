"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = exports.InstagramAuthProvider = void 0;
const simple_fetch_1 = require("./simple-fetch");
class InstagramAuthProvider {
    constructor(settings) {
        this.settings = settings;
        if (!settings.scopes) {
            settings.scopes = [];
        }
        if (!settings.scopes.includes('basic')) {
            settings.scopes.push('basic');
        }
        // Instagram API is deprecated.
        // Moving to the Instagram Basic Display API is not feasible because user details are not sufficient to sign users in.
        console.error(`Instagram Legacy API is deprecated and will be disabled June 29, 2020`);
    }
    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url spotify will redirect to after authorizing, should be the url
     * @param info.state Optional state that will be passed to redirectUri by spotify
     */
    async init(info) {
        // Return url to get authorization code with
        // See https://www.instagram.com/developer/authorization/
        const authUrl = `https://api.instagram.com/oauth/authorize/?response_type=code&client_id=${this.settings.client_id}&scope=${encodeURIComponent(this.settings.scopes.join(' '))}&redirect_uri=${encodeURIComponent(info.redirect_url)}&state=${encodeURIComponent(info.state)}`;
        return authUrl;
    }
    getAccessToken(params) {
        // Request access & refresh tokens with authorization code
        return simple_fetch_1.fetch(`https://api.instagram.com/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `client_id=${this.settings.client_id}&client_secret=${this.settings.client_secret}&code=${params.auth_code}&redirect_uri=${encodeURIComponent(params.redirect_url)}`
        })
            .then(response => response.json())
            .then((result) => {
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        });
    }
    getUserInfo(access_token) {
        return simple_fetch_1.fetch(`https://api.instagram.com/v1/users/self/?access_token=${access_token}`)
            .then(async (response) => {
            const result = await response.json();
            if (response.status !== 200) {
                const error = result;
                throw new Error(`${error.code}: ${error.message}`);
            }
            const user = result;
            return {
                id: user.id,
                name: user.full_name,
                display_name: user.username,
                picture: [{ url: user.profile_picture }],
                email: null,
                email_verified: false,
                other: Object.keys(user)
                    .filter(key => !['id', 'username', 'full_name', 'profile_picture'].includes(key))
                    .reduce((obj, key) => { obj[key] = user[key]; return obj; }, {})
            };
        });
    }
}
exports.InstagramAuthProvider = InstagramAuthProvider;
exports.AuthProvider = InstagramAuthProvider;
