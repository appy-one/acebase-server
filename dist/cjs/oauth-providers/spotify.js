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
exports.AuthProvider = exports.SpotifyAuthProvider = void 0;
const oauth_provider_1 = require("./oauth-provider");
const simple_fetch_1 = require("../shared/simple-fetch");
class SpotifyAuthProvider extends oauth_provider_1.OAuth2Provider {
    constructor(settings) {
        super(settings);
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
     * @param info.redirectUrl Url spotify will redirect to after authorizing
     * @param info.state Optional state that will be passed to redirectUri by spotify
     */
    init(info) {
        return __awaiter(this, void 0, void 0, function* () {
            // Return url to get authorization code with
            const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${this.settings.client_id}&scope=${encodeURIComponent(this.settings.scopes.join(' '))}&redirect_uri=${encodeURIComponent(info.redirect_url)}&state=${encodeURIComponent(info.state)}`;
            return authUrl;
        });
    }
    getAccessToken(params) {
        return __awaiter(this, void 0, void 0, function* () {
            // Request access & refresh tokens with authorization code
            const response = yield (0, simple_fetch_1.fetch)('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `client_id=${this.settings.client_id}&client_secret=${this.settings.client_secret}` +
                    (params.type === 'refresh'
                        ? `&grant_type=refresh_token&refresh_token=${params.refresh_token}`
                        : `&grant_type=authorization_code&code=${params.auth_code}&redirect_uri=${encodeURIComponent(params.redirect_url)}`),
            });
            const result = yield response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            const secondsToExpiry = result.expires_in;
            result.expires = new Date(Date.now() + (secondsToExpiry * 1000));
            return result;
        });
    }
    getClientAccessToken() {
        return __awaiter(this, void 0, void 0, function* () {
            // Gets client only access to Spotify API, without signed in user
            const response = yield (0, simple_fetch_1.fetch)('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${this.settings.client_id}:${this.settings.client_secret}`).toString('base64')}`,
                },
                body: `grant_type=client_credentials`,
            });
            const result = yield response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        });
    }
    getUserInfo(access_token) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield (0, simple_fetch_1.fetch)('https://api.spotify.com/v1/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                },
            });
            const result = yield response.json();
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
                    followers: user.followers ? user.followers.total : null,
                    country: user.country,
                    // external_urls: user.external_urls,
                    uri: user.uri,
                },
            };
        });
    }
}
exports.SpotifyAuthProvider = SpotifyAuthProvider;
exports.AuthProvider = SpotifyAuthProvider;
//# sourceMappingURL=spotify.js.map