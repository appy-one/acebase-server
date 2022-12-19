export const getPublicAccountDetails = (account) => {
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
    };
};
//# sourceMappingURL=user.js.map