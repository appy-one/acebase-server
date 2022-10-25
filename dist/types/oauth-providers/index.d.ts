import { OAuth2Provider } from './oauth-provider';
export { DropboxAuthProvider, IDropboxAuthSettings } from './dropbox';
export { FacebookAuthProvider, IFacebookAuthSettings } from './facebook';
export { GoogleAuthProvider, IGoogleAuthSettings } from './google';
export { InstagramAuthProvider, IInstagramAuthSettings } from './instagram';
export { SpotifyAuthProvider, ISpotifyAuthSettings } from './spotify';
declare const oAuth2Providers: {
    [key: string]: typeof OAuth2Provider;
};
export default oAuth2Providers;
//# sourceMappingURL=index.d.ts.map