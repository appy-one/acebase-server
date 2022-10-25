import { AceBase } from 'acebase';
import { DebugLogger } from 'acebase-core';
import { DbUserAccountDetails } from './schema/user';
import { AuthAccessDefault } from './settings';
export declare type RuleValidationFailCode = 'rule' | 'no_rule' | 'private' | 'exception';
declare type HasAccessResult = {
    allow: boolean;
    code?: RuleValidationFailCode;
    message?: string;
    rule?: string | boolean;
    rulePath?: string;
    details?: Error;
} & ({
    allow: true;
} | {
    allow: false;
    code: RuleValidationFailCode;
    message: string;
    rule?: string | boolean;
    rulePath?: string;
    details?: Error;
});
export declare class PathBasedRules {
    private authEnabled;
    private accessRules;
    stop(): void;
    constructor(rulesFilePath: string, defaultAccess: AuthAccessDefault, env: {
        debug: DebugLogger;
        db: AceBase;
        authEnabled: boolean;
    });
    userHasAccess(user: Pick<DbUserAccountDetails, 'uid'>, path: string, write?: boolean): HasAccessResult;
}
export {};
//# sourceMappingURL=rules.d.ts.map