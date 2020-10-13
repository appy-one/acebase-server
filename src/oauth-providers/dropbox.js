"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = exports.DropboxAuthProvider = void 0;
const simple_fetch_1 = require("./simple-fetch");
class DropboxAuthProvider {
    constructor(settings) {
        this.settings = settings;
        if (!settings.scopes) {
            settings.scopes = [];
        }
        if (settings.scopes.length > 0 && !settings.scopes.includes('account_info.read')) {
            settings.scopes.push('account_info.read');
        }
    }
    /**
     * Starts auth flow by getting the url the user should be redirected to
     * @param info.redirectUrl Url dropbox will redirect to after authorizing
     * @param info.state Optional state that will be passed to redirectUri by dropbox
     */
    async init(info) {
        // Return url to get authorization code with
        const authUrl = `https://www.dropbox.com/oauth2/authorize?response_type=code&token_access_type=offline&client_id=${this.settings.client_id}&scope=${encodeURIComponent(this.settings.scopes.join(' '))}&redirect_uri=${encodeURIComponent(info.redirect_url)}&state=${encodeURIComponent(info.state)}`;
        return authUrl;
    }
    getAccessToken(params) {
        // Request access & refresh tokens with authorization code
        return simple_fetch_1.fetch('https://api.dropbox.com/oauth2/token', {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `client_id=${this.settings.client_id}&client_secret=${this.settings.client_secret}` +
                (params.type === 'refresh'
                    ? `&grant_type=refresh_token&refresh_token=${params.refresh_token}`
                    : `&grant_type=authorization_code&code=${params.auth_code}&redirect_uri=${encodeURIComponent(params.redirect_url)}`)
        })
            .then(async (response) => {
            if (response.status !== 200) {
                // Handle error
                const code = response.status;
                const hasJSON = response.headers.get('Content-Type') === 'application/json';
                const details = await (hasJSON ? response.json() : response.text());
                throw new Error(`${code}: ${hasJSON ? details.error_description ? `${details.error}, ${details.error_description}` : details.error_summary : details}`);
            }
            const result = await response.json();
            const secondsToExpiry = result.expires_in;
            result.expires = new Date(Date.now() + (secondsToExpiry * 1000));
            return result;
        });
    }
    getUserInfo(access_token) {
        return simple_fetch_1.fetch(`https://api.dropboxapi.com/2/users/get_current_account`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
            .then(async (response) => {
            if (response.status !== 200) {
                const code = response.status;
                const hasJSON = response.headers.get('Content-Type') === 'application/json';
                const details = await (hasJSON ? response.json() : response.text());
                throw new Error(`${code}: ${hasJSON ? details.error_summary : details}`);
            }
            const result = await response.json();
            const user = result;
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
                }
            };
        });
    }
}
exports.DropboxAuthProvider = DropboxAuthProvider;
exports.AuthProvider = DropboxAuthProvider;
