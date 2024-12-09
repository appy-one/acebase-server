export interface UserProfilePicture {
    width?: number;
    height?: number;
    url: string;
}

export interface UserSettings {
    [key: string]: string|number|boolean;
}

export type AceBaseUser = ({ username: string } | { email: string }) & {
    uid: string;
    displayName?: string;
    picture?: UserProfilePicture;
    emailVerified: boolean;
    /** ISO date string */
    created: string;
    /** ISO date string */
    prevSignin: string;
    prevSigninIp:string;
    /** ISO date string */
    lastSignin: string;
    lastSigninIp: string;
    changePassword: boolean;
    /** ISO date string */
    changePasswordRequested: string;
    /** ISO date string */
    changePasswordBefore: string;
    settings: UserSettings;
    /** Roles the user has */
    roles: string[];
};

export type DbUserAccountDetails = ({ username: string } | { email: string }) & {
    /** uid, not stored in database object (uid is the node's key) */
    uid: string;
    username?: string;
    email?: string;
    /** if the supplied e-mail address has been verified */
    email_verified?: boolean;
    /** if the account has been disabled */
    is_disabled?: boolean;
    /** user's (public) display name */
    display_name?: string;
    /** optional profile picture */
    picture?: UserProfilePicture;
    /** password hash */
    password: string;
    /** random password salt (base64 encoded) used to generate password hash */
    password_salt: string;
    /** Code that allows a user to reset their password with */
    password_reset_code?: string;
    /** TODO: whether the user has to change their password */
    change_password?: boolean;
    /** TODO: date/time the password change was requested */
    change_password_requested?: Date;
    /** TODO: date/time the user must have changed their password */
    change_password_before?: Date;
    /** date/time the account was created */
    created: Date;
    /** creation ip address */
    created_ip?: string;
    /** date/time of last sign in */
    last_signin?: Date;
    /** ip address of last sign in */
    last_signin_ip?: string;
    /** date/time of previous sign in */
    prev_signin?: Date;
    /** ip address of previous sign in */
    prev_signin_ip?: string;
    /** date/time user last signed out */
    last_signout?: Date;
    /** ip address of last sign out */
    last_signout_ip?: string
    /** access token that allows access after signing in */
    access_token?: string;
    /** date/time access token was generateddate/time access token was generated */
    access_token_created?: Date;
    /** additional settings for this user */
    settings: UserSettings;
    /** roles this user has */
    roles?: string[];
};

export const getPublicAccountDetails = (account: DbUserAccountDetails): AceBaseUser => {
    return {
        uid: account.uid,
        username: account.username,
        email: account.email,
        displayName: account.display_name,
        picture: account.picture,
        emailVerified: account.email_verified,
        created: account.created?.toISOString(),
        prevSignin: account.prev_signin?.toISOString(),
        prevSigninIp: account.prev_signin_ip,
        lastSignin: account.last_signin?.toISOString(),
        lastSigninIp: account.last_signin_ip,
        changePassword: account.change_password,
        changePasswordRequested: account.change_password_requested?.toISOString(),
        changePasswordBefore: account.change_password_before?.toISOString(),
        settings: account.settings,
        roles: account.roles ?? [],
    };
};
