import { RouteInitEnvironment } from '../shared/env';
export declare const addAuthenticionRoutes: (env: RouteInitEnvironment) => {
    verifyEmailAddress: (clientIp: string, code: string) => Promise<void>;
    resetPassword: (clientIp: string, code: string, newPassword: string) => Promise<import("../schema/user").DbUserAccountDetails>;
};
export default addAuthenticionRoutes;
//# sourceMappingURL=auth.d.ts.map