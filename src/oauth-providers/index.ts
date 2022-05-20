import { DropboxAuthProvider } from './dropbox';
import { FacebookAuthProvider } from './facebook';
import { GoogleAuthProvider } from './google';
import { InstagramAuthProvider } from './instagram';
import { OAuth2Provider } from './oauth-provider';
import { SpotifyAuthProvider } from './spotify';

export { DropboxAuthProvider, IDropboxAuthSettings } from './dropbox';
export { FacebookAuthProvider, IFacebookAuthSettings } from './facebook';
export { GoogleAuthProvider, IGoogleAuthSettings } from './google';
export { InstagramAuthProvider, IInstagramAuthSettings } from './instagram';
export { SpotifyAuthProvider, ISpotifyAuthSettings } from './spotify';

const oAuth2Providers: { [key: string]: typeof OAuth2Provider } = { 
    dropbox: DropboxAuthProvider,
    facebook: FacebookAuthProvider,
    google: GoogleAuthProvider,
    instagram: InstagramAuthProvider,
    spotify: SpotifyAuthProvider
}
export default oAuth2Providers;