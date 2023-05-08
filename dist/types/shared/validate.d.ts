import { DataReference } from 'acebase-core';
export declare const isValidEmail: (email: string) => boolean;
export declare const isValidNewEmailAddress: (authRef: DataReference, email: string) => Promise<boolean>;
export declare const isValidNewUsername: (authRef: DataReference, username: any) => Promise<boolean>;
export declare const isValidUsername: (username: string) => boolean;
export declare const isValidDisplayName: (displayName: string) => boolean;
export declare const isValidPassword: (password: string) => boolean;
export declare const isValidPicture: (picture: any) => boolean;
export declare const isValidSettings: (settings: any) => boolean;
export type ValidationError<Code> = {
    code: Code;
    message: string;
};
export declare const invalidEmailError: ValidationError<'invalid_email'>;
export declare const invalidUsernameError: ValidationError<'invalid_username'>;
export declare const emailExistsError: ValidationError<'email_conflict'>;
export declare const usernameExistsError: ValidationError<'username_conflict'>;
export declare const emailOrUsernameExistsError: ValidationError<'conflict'>;
export declare const invalidDisplayNameError: ValidationError<'invalid_display_name'>;
export declare const invalidPasswordError: ValidationError<'invalid_password'>;
export declare const invalidPictureError: ValidationError<'invalid_picture'>;
export declare const invalidSettingsError: ValidationError<'invalid_settings'>;
//# sourceMappingURL=validate.d.ts.map