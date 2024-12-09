import { DbUserAccountDetails } from '../schema/user.js';

export function isAdmin(user?: Pick<DbUserAccountDetails, 'uid' | 'roles'>) {
    return user?.uid === 'admin' || (user?.roles || []).includes('admin');
}
