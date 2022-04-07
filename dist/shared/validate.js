"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidSettingsError = exports.invalidPictureError = exports.invalidPasswordError = exports.invalidDisplayNameError = exports.emailOrUsernameExistsError = exports.usernameExistsError = exports.emailExistsError = exports.invalidUsernameError = exports.invalidEmailError = exports.isValidSettings = exports.isValidPicture = exports.isValidPassword = exports.isValidDisplayName = exports.isValidUsername = exports.isValidNewUsername = exports.isValidNewEmailAddress = exports.isValidEmail = void 0;
const isValidEmail = (email) => {
    return /[a-z0-9_.+]+@([a-z0-9\-]+\.)+[a-z]{2,}/i.test(email);
};
exports.isValidEmail = isValidEmail;
const isValidNewEmailAddress = async (authRef, email) => {
    const exists = await authRef.query().filter('email', '==', email).exists();
    return !exists;
};
exports.isValidNewEmailAddress = isValidNewEmailAddress;
const isValidNewUsername = async (authRef, username) => {
    const exists = await authRef.query().filter('username', '==', username).exists();
    return !exists;
};
exports.isValidNewUsername = isValidNewUsername;
const isValidUsername = (username) => {
    return username !== 'admin' && typeof username === 'string' && username.length >= 5 && /^[a-z0-9]+$/.test(username);
};
exports.isValidUsername = isValidUsername;
const isValidDisplayName = (displayName) => {
    return typeof displayName === 'string' && displayName.length >= 5;
};
exports.isValidDisplayName = isValidDisplayName;
const isValidPassword = (password) => {
    // return typeof password === 'string' && password.length >= 8 && password.indexOf(' ') < 0 && /[0-9]/.test(password) && /[a-z]/.test(password) && /[A-Z]/.test(password);
    return typeof password === 'string' && password.length >= 8 && password.indexOf(' ') < 0; // Let client application set their own password rules. Keep minimum length of 8 and no spaces requirement.
};
exports.isValidPassword = isValidPassword;
const isValidPicture = (picture) => {
    return picture === null || (typeof picture === 'object' && typeof picture.url === 'string' && typeof picture.width === 'number' && typeof picture.height === 'number');
};
exports.isValidPicture = isValidPicture;
const isValidSettings = (settings) => {
    return typeof settings === 'undefined'
        || (typeof settings === 'object'
            && Object.keys(settings).length <= 100 // max 100 settings
            && Object.keys(settings).map(key => typeof settings[key]).every(t => ['string', 'number', 'boolean'].indexOf(t) >= 0) // only string, number, boolean values
            && Object.keys(settings).filter(key => typeof settings[key] === 'string').every(key => settings[key].length <= 250) // strings values <= 250 chars
        );
};
exports.isValidSettings = isValidSettings;
exports.invalidEmailError = { code: 'invalid_email', message: 'Invalid email address' };
exports.invalidUsernameError = { code: 'invalid_username', message: 'Invalid username, must be at least 5 characters and can only contain lowercase characters a-z and 0-9' };
exports.emailExistsError = { code: 'email_conflict', message: 'Account with email address exists already' };
exports.usernameExistsError = { code: 'username_conflict', message: 'Account with username exists already' };
exports.emailOrUsernameExistsError = { code: 'conflict', message: `Account with username and/or email already exists` };
exports.invalidDisplayNameError = { code: 'invalid_display_name', message: 'Invalid display_name, must be at least 5 characters' };
exports.invalidPasswordError = { code: 'invalid_password', message: 'Invalid password, must be at least 8 characters and cannot contain spaces' };
exports.invalidPictureError = { code: 'invalid_picture', message: 'Invalid picture, must be an object with url, width and height properties' };
exports.invalidSettingsError = { code: 'invalid_settings', message: 'Invalid settings, must be an object and contain only string, number and/or boolean values. Additionaly, string values can have a maximum length of 250, and a maximum of 100 settings can be added' };
//# sourceMappingURL=validate.js.map