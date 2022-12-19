import { DropboxAuthProvider } from './dropbox.js';
import { FacebookAuthProvider } from './facebook.js';
import { GoogleAuthProvider } from './google.js';
import { InstagramAuthProvider } from './instagram.js';
import { SpotifyAuthProvider } from './spotify.js';
export { DropboxAuthProvider } from './dropbox.js';
export { FacebookAuthProvider } from './facebook.js';
export { GoogleAuthProvider } from './google.js';
export { InstagramAuthProvider } from './instagram.js';
export { SpotifyAuthProvider } from './spotify.js';
const oAuth2Providers = {
    dropbox: DropboxAuthProvider,
    facebook: FacebookAuthProvider,
    google: GoogleAuthProvider,
    instagram: InstagramAuthProvider,
    spotify: SpotifyAuthProvider,
};
export default oAuth2Providers;
//# sourceMappingURL=index.js.map