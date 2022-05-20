"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = exports.DropboxAuthProvider = void 0;
const oauth_provider_1 = require("./oauth-provider");
const simple_fetch_1 = require("../shared/simple-fetch");
class DropboxAuthProvider extends oauth_provider_1.OAuth2Provider {
    constructor(settings) {
        super(settings);
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
     * @param info.options Optional Dropbox specific authentication settings
     * @param info.options.require_role  If this parameter is specified, the user will be asked to authorize with a particular type of Dropbox account, either work for a team account or personal for a personal account. Your app should still verify the type of Dropbox account after authorization since the user could modify or remove the require_role parameter.
     * @param info.options.force_reapprove Whether or not to force the user to approve the app again if they've already done so. If false (default), a user who has already approved the application may be automatically redirected to the URI specified by redirect_uri. If true, the user will not be automatically redirected and will have to approve the app again.
     * @param info.options.disable_signup When true (default is false) users will not be able to sign up for a Dropbox account via the authorization page. Instead, the authorization page will show a link to the Dropbox iOS app in the App Store. This is only intended for use when necessary for compliance with App Store policies.
     * @param info.options.locale If the locale specified is a supported language, Dropbox will direct users to a translated version of the authorization website. Locale tags should be IETF language tags.
     * @param info.options.force_reauthentication When true (default is false) users will be signed out if they are currently signed in. This will make sure the user is brought to a page where they can create a new account or sign in to another account. This should only be used when there is a definite reason to believe that the user needs to sign in to a new or different account.
     */
    init(info) {
        return __awaiter(this, void 0, void 0, function* () {
            // Return url to get authorization code with
            const options = info.options || {};
            const authUrl = `https://www.dropbox.com/oauth2/authorize?response_type=code&token_access_type=offline&client_id=${this.settings.client_id}&scope=${encodeURIComponent(this.settings.scopes.join(' '))}&redirect_uri=${encodeURIComponent(info.redirect_url)}&locale=${options.locale || ''}&require_role=${options.require_role || ''}&force_reauthentication=${options.force_reauthentication === true}&force_reapprove=${options.force_reapprove === true}&disable_signup=${options.disable_signup === true}&state=${encodeURIComponent(info.state)}`;
            return authUrl;
        });
    }
    getAccessToken(params) {
        // Request access & refresh tokens with authorization code
        return (0, simple_fetch_1.fetch)('https://api.dropbox.com/oauth2/token', {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `client_id=${this.settings.client_id}&client_secret=${this.settings.client_secret}` +
                (params.type === 'refresh'
                    ? `&grant_type=refresh_token&refresh_token=${params.refresh_token}`
                    : `&grant_type=authorization_code&code=${params.auth_code}&redirect_uri=${encodeURIComponent(params.redirect_url)}`)
        })
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            if (response.status !== 200) {
                // Handle error
                const code = response.status;
                const hasJSON = response.headers.get('Content-Type') === 'application/json';
                const details = yield (hasJSON ? response.json() : response.text());
                throw new Error(`${code}: ${hasJSON ? details.error_description ? `${details.error}, ${details.error_description}` : details.error_summary : details}`);
            }
            const result = yield response.json();
            const secondsToExpiry = result.expires_in;
            result.expires = new Date(Date.now() + (secondsToExpiry * 1000));
            return result;
        }));
    }
    getUserInfo(access_token) {
        return (0, simple_fetch_1.fetch)(`https://api.dropboxapi.com/2/users/get_current_account`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
            .then((response) => __awaiter(this, void 0, void 0, function* () {
            if (response.status !== 200) {
                const code = response.status;
                const hasJSON = response.headers.get('Content-Type') === 'application/json';
                const details = yield (hasJSON ? response.json() : response.text());
                throw new Error(`${code}: ${hasJSON ? details.error_summary : details}`);
            }
            const result = yield response.json();
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
                    // include the following?
                    // referral_link: user.referral_link,
                    // team_id: user.team.id,
                    // team_name: user.team.name,
                    // team_member_id: user.team_member_id
                }
            };
        }));
    }
}
exports.DropboxAuthProvider = DropboxAuthProvider;
exports.AuthProvider = DropboxAuthProvider;
//# sourceMappingURL=dropbox.js.map