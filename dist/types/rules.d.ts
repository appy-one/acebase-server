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
    details?: any;
} & ({
    allow: true;
} | {
    allow: false;
    code: RuleValidationFailCode;
    message: string;
    rule?: string | boolean;
    rulePath?: string;
    details?: any;
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
    /**
     *
     * @param {DbUserAccountDetails} user
     * @param {string} path
     * @param {boolean} [write]
     * @param {(details: { code: string, message: string, [key:string]: any }) => void} denyDetailsCallback
     */
    userHasAccess(user: Pick<DbUserAccountDetails, 'uid'>, path: string, write?: boolean): HasAccessResult;
}
export {};
