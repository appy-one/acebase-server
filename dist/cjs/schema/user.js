"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicAccountDetails = void 0;
const getPublicAccountDetails = (account) => {
    var _a, _b, _c, _d, _e;
    return {
        uid: account.uid,
        username: account.username,
        email: account.email,
        displayName: account.display_name,
        picture: account.picture,
        emailVerified: account.email_verified,
        created: (_a = account.created) === null || _a === void 0 ? void 0 : _a.toISOString(),
        prevSignin: (_b = account.prev_signin) === null || _b === void 0 ? void 0 : _b.toISOString(),
        prevSigninIp: account.prev_signin_ip,
        lastSignin: (_c = account.last_signin) === null || _c === void 0 ? void 0 : _c.toISOString(),
        lastSigninIp: account.last_signin_ip,
        changePassword: account.change_password,
        changePasswordRequested: (_d = account.change_password_requested) === null || _d === void 0 ? void 0 : _d.toISOString(),
        changePasswordBefore: (_e = account.change_password_before) === null || _e === void 0 ? void 0 : _e.toISOString(),
        settings: account.settings,
    };
};
exports.getPublicAccountDetails = getPublicAccountDetails;
//# sourceMappingURL=user.js.map