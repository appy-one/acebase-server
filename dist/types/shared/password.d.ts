export declare const generatePassword: () => any;
/**
 * Generates a random salt and hashes the provided password with it. The resulting salt and hash should be stored in the database
 * @param password password to hash
 */
export declare const createPasswordHash: (password: string) => {
    salt: string;
    hash: string;
};
/**
 * For checking passwords: uses given password and salt to get the hash that can be compared to a stored version.
 * @param password A password prodived by the user trying to sign in
 * @param salt the salt used to generate the hash, must be stored with the hash in the database
 */
export declare const getPasswordHash: (password: string, salt: string) => string;
/**
 * Backward compatibility with old saltless md5 passwords. Becomes obsolete once all passwords have been updated (probably already so)
 */
export declare const getOldPasswordHash: (password: string) => string;
//# sourceMappingURL=password.d.ts.map