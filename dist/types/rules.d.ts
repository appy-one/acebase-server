import { AceBase } from 'acebase';
import { DebugLogger } from 'acebase-core';
import { DbUserAccountDetails } from './schema/user';
import { AuthAccessDefault } from './settings';
type PathRuleFunctionEnvironment = {
    now: number;
    auth: Pick<DbUserAccountDetails, 'uid'>;
    operation: string;
    context: any;
    vars: any;
    /**
     * Allows checking if a path exists
     * @example
     * await exists('./shared/' + auth.uid)
     */
    exists: (target: string) => Promise<boolean>;
    /**
     * Allows getting current values stored in the db
     * @example
     * await value('./writable') === true
     * @example
     * const current = await value('.');
     * return current.writable === true && current.owner === auth.uid;
     * @example
     * // Same as above, but only load `writable` and `owner` properties
     * const current = await value('.', ['writable', 'owner']);
     * return current.writable === true && current.owner === auth.uid;
     */
    value: (target: string, include?: string[]) => Promise<any>;
};
export type PathRuleReturnValue = boolean | undefined | 'allow' | 'deny' | 'cascade';
export type PathRuleFunction = (env: PathRuleFunctionEnvironment) => PathRuleReturnValue | Promise<PathRuleReturnValue>;
type PathRule = boolean | string | PathRuleFunction;
export type RuleValidationFailCode = 'rule' | 'no_rule' | 'private' | 'exception';
export type HasAccessResult = {
    allow: boolean;
    code?: RuleValidationFailCode;
    message?: string;
    rule?: PathRule;
    rulePath?: string;
    details?: Error;
} & ({
    allow: true;
} | {
    allow: false;
    code: RuleValidationFailCode;
    message: string;
    rule?: PathRule;
    rulePath?: string;
    details?: Error;
});
export declare class AccessRuleValidationError extends Error {
    result: HasAccessResult;
    constructor(result: HasAccessResult);
}
export type AccessCheckOperation = 'transact' | 'get' | 'update' | 'set' | 'delete' | 'reflect' | 'exists' | 'query' | 'import' | 'export';
export type PathRuleType = 'read' | 'write' | 'validate' | AccessCheckOperation;
export declare class PathBasedRules {
    private authEnabled;
    private accessRules;
    private db;
    private debug;
    private codeRules;
    stop(): void;
    constructor(rulesFilePath: string, defaultAccess: AuthAccessDefault, env: {
        debug: DebugLogger;
        db: AceBase;
        authEnabled: boolean;
    });
    isOperationAllowed(user: Pick<DbUserAccountDetails, 'uid'>, path: string, operation: AccessCheckOperation, data?: Record<string, any>): Promise<HasAccessResult>;
    add(rulePaths: string | string[], ruleTypes: PathRuleType | PathRuleType[], callback: PathRuleFunction): void;
}
export {};
//# sourceMappingURL=rules.d.ts.map