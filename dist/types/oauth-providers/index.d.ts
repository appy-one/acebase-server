import { DropboxAuthProvider } from './dropbox';
import { FacebookAuthProvider } from './facebook';
import { GoogleAuthProvider } from './google';
import { InstagramAuthProvider } from './instagram';
import { SpotifyAuthProvider } from './spotify';
export { DropboxAuthProvider, IDropboxAuthSettings } from './dropbox';
export { FacebookAuthProvider, IFacebookAuthSettings } from './facebook';
export { GoogleAuthProvider, IGoogleAuthSettings } from './google';
export { InstagramAuthProvider, IInstagramAuthSettings } from './instagram';
export { SpotifyAuthProvider, ISpotifyAuthSettings } from './spotify';
declare const oAuth2Providers: {
    dropbox: typeof DropboxAuthProvider;
    facebook: typeof FacebookAuthProvider;
    google: typeof GoogleAuthProvider;
    instagram: typeof InstagramAuthProvider;
    spotify: typeof SpotifyAuthProvider;
};
export default oAuth2Providers;
