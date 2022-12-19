"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyAuthProvider = exports.InstagramAuthProvider = exports.GoogleAuthProvider = exports.FacebookAuthProvider = exports.DropboxAuthProvider = void 0;
const dropbox_1 = require("./dropbox");
const facebook_1 = require("./facebook");
const google_1 = require("./google");
const instagram_1 = require("./instagram");
const spotify_1 = require("./spotify");
var dropbox_2 = require("./dropbox");
Object.defineProperty(exports, "DropboxAuthProvider", { enumerable: true, get: function () { return dropbox_2.DropboxAuthProvider; } });
var facebook_2 = require("./facebook");
Object.defineProperty(exports, "FacebookAuthProvider", { enumerable: true, get: function () { return facebook_2.FacebookAuthProvider; } });
var google_2 = require("./google");
Object.defineProperty(exports, "GoogleAuthProvider", { enumerable: true, get: function () { return google_2.GoogleAuthProvider; } });
var instagram_2 = require("./instagram");
Object.defineProperty(exports, "InstagramAuthProvider", { enumerable: true, get: function () { return instagram_2.InstagramAuthProvider; } });
var spotify_2 = require("./spotify");
Object.defineProperty(exports, "SpotifyAuthProvider", { enumerable: true, get: function () { return spotify_2.SpotifyAuthProvider; } });
const oAuth2Providers = {
    dropbox: dropbox_1.DropboxAuthProvider,
    facebook: facebook_1.FacebookAuthProvider,
    google: google_1.GoogleAuthProvider,
    instagram: instagram_1.InstagramAuthProvider,
    spotify: spotify_1.SpotifyAuthProvider,
};
exports.default = oAuth2Providers;
//# sourceMappingURL=index.js.map