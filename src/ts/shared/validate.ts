import { DataReference } from "acebase-core";

export const isValidEmail = (email: string): boolean => {
    return /[a-z0-9_.+]+@([a-z0-9\-]+\.)+[a-z]{2,}/i.test(email);
};

export const isValidNewEmailAddress = async (authRef: DataReference, email: string): Promise<boolean> => {
    const exists = await authRef.query().filter('email', '==', email).exists();
    return !exists;
};

export const isValidNewUsername = async (authRef: DataReference, username): Promise<boolean> => {
    const exists = await authRef.query().filter('username', '==', username).exists();
    return !exists;
};

export const isValidUsername = (username: string): boolean => {
    return username !== 'admin' && typeof username === 'string' && username.length >= 5 && /^[a-z0-9]+$/.test(username);
};

export const isValidDisplayName = (displayName: string): boolean => {
    return typeof displayName === 'string' && displayName.length >= 5;
};

export const isValidPassword = (password: string): boolean  => {
    // return typeof password === 'string' && password.length >= 8 && password.indexOf(' ') < 0 && /[0-9]/.test(password) && /[a-z]/.test(password) && /[A-Z]/.test(password);
    return typeof password === 'string' && password.length >= 8 && password.indexOf(' ') < 0; // Let client application set their own password rules. Keep minimum length of 8 and no spaces requirement.
};

export const isValidPicture = (picture: any): boolean => {
    return picture === null || (typeof picture === 'object' && typeof picture.url === 'string' && typeof picture.width === 'number' && typeof picture.height === 'number');
};

export const isValidSettings = (settings: any): boolean => {
    return typeof settings === 'undefined'
         || (
             typeof settings === 'object' 
            && Object.keys(settings).length <= 100 // max 100 settings
            && Object.keys(settings).map(key => typeof settings[key]).every(t => ['string','number','boolean'].indexOf(t) >= 0) // only string, number, boolean values
            && Object.keys(settings).filter(key => typeof settings[key] === 'string').every(key => settings[key].length <= 250) // strings values <= 250 chars
        );
};

export type ValidationError<Code> = { code: Code, message: string };
export const invalidEmailError: ValidationError<'invalid_email'> = { code: 'invalid_email', message: 'Invalid email address' };
export const invalidUsernameError: ValidationError<'invalid_username'> = { code: 'invalid_username', message: 'Invalid username, must be at least 5 characters and can only contain lowercase characters a-z and 0-9' };
export const emailExistsError: ValidationError<'email_conflict'> = { code: 'email_conflict', message: 'Account with email address exists already' };
export const usernameExistsError: ValidationError<'username_conflict'> = { code: 'username_conflict', message: 'Account with username exists already' };
export const emailOrUsernameExistsError: ValidationError<'conflict'> = { code: 'conflict', message: `Account with username and/or email already exists` };
export const invalidDisplayNameError: ValidationError<'invalid_display_name'> = { code: 'invalid_display_name', message: 'Invalid display_name, must be at least 5 characters' };
export const invalidPasswordError: ValidationError<'invalid_password'> = { code: 'invalid_password', message: 'Invalid password, must be at least 8 characters and cannot contain spaces' };
export const invalidPictureError: ValidationError<'invalid_picture'> = { code: 'invalid_picture', message: 'Invalid picture, must be an object with url, width and height properties'};
export const invalidSettingsError: ValidationError<'invalid_settings'> = { code: 'invalid_settings', message: 'Invalid settings, must be an object and contain only string, number and/or boolean values. Additionaly, string values can have a maximum length of 250, and a maximum of 100 settings can be added' };
