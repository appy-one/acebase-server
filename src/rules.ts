import { AceBase } from 'acebase';
import { DebugLogger, PathInfo } from 'acebase-core';
import * as fs from 'fs';
import { executeSandboxed } from './sandbox';
import { DbUserAccountDetails } from './schema/user';
import { AUTH_ACCESS_DEFAULT, AuthAccessDefault } from './settings';

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
}
export type PathRuleReturnValue = boolean | undefined | 'allow' | 'deny' | 'cascade';
export type PathRuleFunction = (env: PathRuleFunctionEnvironment) => PathRuleReturnValue | Promise<PathRuleReturnValue>; //((env: any) => boolean) & { getText(): string };
type PathRule = boolean | string | PathRuleFunction;
type PathRules = object & {
    // schema definitions
    '.schema'?: string | object;

    // general read/write rules for all nested data
    '.read'?: PathRule;
    '.write'?: PathRule;

    // special read rules for all nested data
    '.query'?: PathRule;
    '.export'?: PathRule;
    '.reflect'?: PathRule;
    '.exists'?: PathRule;

    // special write rules for all nested data
    '.transact'?: PathRule;
    '.update'?: PathRule;
    '.set'?: PathRule;
    '.delete'?: PathRule;
    '.import'?: PathRule;

    // custom validation code on data being written to the target path
    '.validate'?: string | PathRuleFunction;
}
type RulesData = {
    rules: PathRules;
}
export type RuleValidationFailCode = 'rule' | 'no_rule' | 'private' | 'exception';
export type HasAccessResult = { allow: boolean; code?: RuleValidationFailCode; message?: string; rule?: PathRule; rulePath?: string; details?: Error } & ({ allow: true } | { allow: false; code: RuleValidationFailCode; message: string; rule?: PathRule; rulePath?: string; details?: Error });
export class AccessRuleValidationError extends Error {
    constructor(public result: HasAccessResult) {
        super(result.message);
    }
}

export type AccessCheckOperation = 'transact' | 'get' | 'update' | 'set' | 'delete' | 'reflect' | 'exists' | 'query' | 'import' | 'export';
export type PathRuleType = 'read' | 'write' | 'validate' | AccessCheckOperation;
export class PathBasedRules {

    private authEnabled: boolean;
    private accessRules: RulesData;
    private db: AceBase;
    private debug: DebugLogger;
    private codeRules = [] as Array<{ path: string; type: PathRuleType; callback: PathRuleFunction }>;
    stop(): void { throw new Error('not started yet'); }

    constructor(rulesFilePath: string, defaultAccess: AuthAccessDefault, env: { debug: DebugLogger, db: AceBase, authEnabled: boolean } ) {
        // Reads rules from a file and monitors it
        // Check if there is a rules file, load it or generate default

        this.db = env.db;
        this.debug = env.debug;
        const readRules = () => {
            try {
                // TODO: store in db itself under __rules__ or in separate rules.db storage file
                const json = fs.readFileSync(rulesFilePath, 'utf-8');
                const obj = JSON.parse(json);
                if (typeof obj !== 'object' || typeof obj.rules !== 'object') {
                    throw new Error(`malformed rules object`);
                }
                return obj;
            }
            catch (err) {
                env.debug.error(`Failed to read rules from "${rulesFilePath}": ${err.message}`);
                return defaultRules;
            }
        };
        const defaultAccessRule = (def => {
            switch (def) {
                case AUTH_ACCESS_DEFAULT.ALLOW_AUTHENTICATED: {
                    return 'auth !== null';
                }
                case AUTH_ACCESS_DEFAULT.ALLOW_ALL: {
                    return true;
                }
                case AUTH_ACCESS_DEFAULT.DENY_ALL: {
                    return false;
                }
                default: {
                    env.debug.error(`Unknown defaultAccessRule "${def}"`);
                    return false;
                }
            }
        })(defaultAccess);
        const defaultRules: RulesData = {
            rules: {
                '.read': defaultAccessRule,
                '.write': defaultAccessRule,
            },
        };
        let accessRules = defaultRules;
        if (!fs.existsSync(rulesFilePath)) {
            // Write defaults
            fs.writeFileSync(rulesFilePath, JSON.stringify(defaultRules, null, 4));
        }
        else {
            accessRules = readRules();
        }

        // Convert string rules to functions that can be executed
        const processRules = (path: string, parent: any, variables: string[]) => {
            Object.keys(parent).forEach(key => {
                const rule = parent[key];
                if (['.read', '.write', '.validate'].includes(key) && typeof rule === 'string') {
                    let ruleCode = rule.includes('return ') ? rule : `return ${rule}`;
                    // Add `await`s to `value` and `exists` call expressions
                    ruleCode = ruleCode.replace(/(value|exists)\(/g, (m, fn) => `await ${fn}(`);
                    // Convert to function
                    // rule = eval(
                    //     `(async (env) => {` +
                    //     `  const { now, path, ${variables.join(', ')}, operation, data, auth, value, exists } = env;` +
                    //     `  ${ruleCode};` +
                    //     `})`);
                    // rule.getText = () => {
                    //     return ruleCode;
                    // };
                    ruleCode = `(async () => {\n${ruleCode}\n})();`;
                    return parent[key] = ruleCode;
                }
                else if (key === '.schema') {
                    // Add schema
                    return env.db.schema.set(path, rule)
                        .catch(err => {
                            env.debug.error(`Error parsing ${path}/.schema: ${err.message}`);
                        });
                }
                else if (key.startsWith('$')) {
                    variables.push(key);
                }
                if (typeof rule === 'object') {
                    processRules(`${path}/${key}`, rule, variables.slice());
                }
            });
        };
        processRules('', accessRules.rules, []);

        // Watch file for changes. watchFile will poll for changes every (default) 5007ms
        const watchFileListener = () => {
            // Reload access rules from file
            const accessRules = readRules();
            processRules('', accessRules.rules, []);
            this.accessRules = accessRules;

            // Re-add rules added by code
            const codeRules = this.codeRules.splice(0);
            for (const rule of codeRules) {
                this.add(rule.path, rule.type, rule.callback);
            }
        };
        fs.watchFile(rulesFilePath, watchFileListener);
        this.stop = () => {
            fs.unwatchFile(rulesFilePath, watchFileListener);
        };
        process.on('SIGINT', this.stop);

        this.authEnabled = env.authEnabled;
        this.accessRules = accessRules;
    }

    async isOperationAllowed(user: Pick<DbUserAccountDetails, 'uid'>, path: string, operation: AccessCheckOperation, data?: Record<string, any>): Promise<HasAccessResult> {
        // Process rules, find out if signed in user is allowed to read/write
        // Defaults to false unless a rule is found that tells us otherwise

        const isPreFlight = typeof data === 'undefined';
        const allow: HasAccessResult = { allow: true };
        if (!this.authEnabled) {
            // Authentication is disabled, anyone can do anything. Not really a smart thing to do!
            return allow;
        }
        else if (user?.uid === 'admin') {
            // Always allow admin access
            // TODO: implement user.is_admin, so the default admin account can be disabled
            return allow;
        }
        else if (path.startsWith('__')) {
            // NEW: with the auth database now integrated into the main database,
            // deny access to private resources starting with '__' for non-admins
            return { allow: false, code: 'private', message: `Access to private resource "${path}" not allowed` };
        }

        const getFullPath = (path: string, relativePath: string) => {
            if (relativePath.startsWith('/')) {
                // Absolute path
                return relativePath;
            }
            else if (!relativePath.startsWith('.')) {
                throw new Error('Path must be either absolute (/) or relative (./ or ../)');
            }
            let targetPathInfo = PathInfo.get(path);
            const trailKeys = PathInfo.getPathKeys(relativePath);
            trailKeys.forEach(key => {
                if (key === '.') { /* no op */ }
                else if (key === '..') { targetPathInfo = targetPathInfo.parent; }
                else { targetPathInfo = targetPathInfo.child(key); }
            });
            return targetPathInfo.path;
        };
        const env = {
            now: Date.now(),
            auth: user || null,
            operation,
            vars: {},
            context: typeof data?.context === 'object' && data.context !== null ? { ...data.context } : {},
        };
        const pathInfo = PathInfo.get(path);
        const pathKeys = pathInfo.keys.slice();
        let rule = this.accessRules.rules;
        const rulePathKeys = [] as typeof pathKeys;
        let currentPath = '';
        let isAllowed = false;
        while (rule) {
            // Check read/write access or validate operation
            const checkRules = [] as PathRule[];
            const applyRule = (rule: PathRule) => {
                if (rule && !checkRules.includes(rule)) {
                    checkRules.push(rule);
                }
            };
            if (['get','exists','query','reflect','export','transact'].includes(operation)) {
                // Operations that require 'read' access
                applyRule(rule['.read']);
            }
            if ('.write' in rule && ['update','set','delete','import','transact'].includes(operation)) {
                // Operations that require 'write' access
                applyRule(rule['.write']);
            }
            if (`.${operation}` in rule && !isPreFlight) {
                // If there is a dedicated rule (eg ".update" or ".reflect") for this operation, use it.
                applyRule(rule[`.${operation}`]);
            }
            const rulePath = PathInfo.get(rulePathKeys).path;
            for (const rule of checkRules) {
                if (typeof rule === 'boolean') {
                    if (!rule) {
                        return { allow: false, code: 'rule', message: `${operation} operation denied to path "${path}" by set rule`, rule, rulePath };
                    }
                    isAllowed = true; // return allow;
                }
                if (typeof rule === 'string' || typeof rule === 'function') {
                    try {
                        // Execute rule function
                        const ruleEnv: PathRuleFunctionEnvironment = {
                            ...env,
                            exists: async (target: string) => this.db.ref(getFullPath(currentPath, target)).exists(),
                            value: async (target: string, include?: string[]) => {
                                const snap = await this.db.ref(getFullPath(currentPath, target)).get({ include });
                                return snap.val();
                            },
                        };
                        const result = typeof rule === 'function'
                            ? await rule(ruleEnv)
                            : await executeSandboxed(rule, ruleEnv);
                        if (!['cascade', 'deny', 'allow', true, false].includes(result)) {
                            this.debug.warn(`rule for path ${rulePath} possibly returns an unintentional value (${JSON.stringify(result)}) which results in outcome "${result ? 'allow' : 'deny'}"`);
                        }
                        isAllowed = result === 'allow' || result === true;
                        if (!isAllowed && result !== 'cascade') {
                            return { allow: false, code: 'rule', message: `${operation} operation denied to path "${path}" by set rule`, rule, rulePath };
                        }
                    }
                    catch (err) {
                        // If rule execution throws an exception, consider it the same as 'cascade'.
                        // Can happen when rule is "auth.uid === '...'", and auth is null because the user is not signed in
                        continue;
                    }
                }
            }
            if (isAllowed) {
                break;
            }
            // Proceed with next key in trail
            if (pathKeys.length === 0) {
                break;
            }
            let nextKey = pathKeys.shift();
            currentPath = PathInfo.get(currentPath).childPath(nextKey);
            // if nextKey is '*' or '$something', rule[nextKey] will be undefined (or match a variable) so there is no
            // need to change things here for usage of wildcard paths in subscriptions
            if (typeof rule[nextKey] === 'undefined') {
                // Check if current rule has a wildcard child
                const wildcardKey = Object.keys(rule).find(key => key ==='*' || key[0] === '$');
                if (wildcardKey) {
                    env[wildcardKey] = nextKey;
                    env.vars[wildcardKey] = nextKey;
                }
                nextKey = wildcardKey;
            }
            nextKey && rulePathKeys.push(nextKey);
            rule = rule[nextKey];
        }

        // Now dig deeper to check nested .validate rules
        if (isAllowed && ['set', 'update'].includes(operation) && !isPreFlight) {
            // validate rules start at current path being written to
            const startRule = pathInfo.keys.reduce((rule, key) => {
                if (typeof rule !== 'object' || rule === null) { return null; }
                if (key in rule) { return rule[key]; }
                if ('*' in rule) { return rule['*']; }
                const variableKey = Object.keys(rule).find(key => typeof key === 'string' && key.startsWith('$'));
                if (variableKey) { return rule[variableKey]; }
                return null;
            }, this.accessRules.rules);

            const getNestedRules = (target: string[], rule: PathRules) => {
                if (!rule) { return []; }
                const nested = Object.keys(rule).reduce((arr, key) => {
                    if (key === '.validate' && ['string', 'function'].includes(typeof rule[key])) {
                        arr.push({ target, validate: rule[key] as string });
                    }
                    if (!key.startsWith('.')) {
                        const nested = getNestedRules([...target, key], rule[key]);
                        arr.push(...nested);
                    }
                    return arr;
                }, [] as { target: string[]; validate: PathRule }[]);
                return nested;
            };

            // Check all that apply for sent data (update requires a different strategy)
            const checkRules = getNestedRules([], startRule);
            for (const check of checkRules) {
                // Keep going as long as rules validate
                const targetData = check.target.reduce(
                    (data, key) => {
                        if (data !== null && typeof data === 'object' && key in data) {
                            return data[key];
                        }
                        return null;
                    },
                    data.value
                );
                if (typeof targetData === 'undefined' && operation === 'update' && check.target.length >= 1 && check.target[0] in data) {
                    // Ignore, data for direct child path is not being set by update operation
                    continue;
                }
                const validateData = typeof targetData === 'undefined' ? null : targetData;
                if (validateData === null) {
                    // Do not validate deletes, this should be done by ".write" or ".delete" rule
                    continue;
                }
                const validatePath = PathInfo.get(path).child(check.target).path;
                const validateEnv = {
                    ...env,
                    operation: operation === 'update' ? (check.target.length === 0 ? 'update' : 'set') : operation,
                    data: validateData,
                    exists: async (target: string) => this.db.ref(getFullPath(validatePath, target)).exists(),
                    value: async (target: string, include?: string[]) => {
                        const snap = await this.db.ref(getFullPath(validatePath, target)).get({ include });
                        return snap.val();
                    },
                };
                try {
                    const result = await (async () => {
                        let result: PathRuleReturnValue;
                        if (typeof check.validate === 'function') {
                            result = await check.validate(validateEnv);
                        }
                        else if (typeof check.validate === 'string') {
                            result = await executeSandboxed(check.validate, validateEnv);
                        }
                        else if (typeof check.validate === 'boolean') {
                            result = check.validate ? 'allow' : 'deny';
                        }
                        if (result === 'cascade') {
                            this.debug.warn(`Rule at path ${validatePath} returned "cascade", but ${validateEnv.operation} rules always cascade`);
                        }
                        else if (!['cascade', 'deny', 'allow', true, false].includes(result)) {
                            this.debug.warn(`${validateEnv.operation} rule for path ${validatePath} possibly returned an unintentional value (${JSON.stringify(result)}) which results in outcome "${result ? 'allow' : 'deny'}"`);
                        }
                        if (['cascade', 'deny', 'allow'].includes(result as string)) { return result as 'cascade' | 'deny' | 'allow'; }
                        return result ? 'allow' : 'deny';
                    })();
                    if (result === 'deny') {
                        return { allow: false, code: 'rule', message: `${operation} operation denied to path "${path}" by set rule`, rule: check.validate, rulePath: validatePath };
                    }
                }
                catch (err) {
                    // If rule execution throws an exception, don't allow. Can happen when rule is "auth.uid === '...'", and auth is null because the user is not signed in
                    return { allow: false, code: 'exception', message: `${operation} operation denied to path "${path}" by set rule`, rule: check.validate, rulePath: validatePath, details: err };
                }
            }
        }

        return isAllowed ? allow : { allow: false, code: 'no_rule', message: `No rules set for requested path "${path}", defaulting to false` };
    }

    add(rulePaths: string | string[], ruleTypes: PathRuleType | PathRuleType[], callback: PathRuleFunction) {
        const paths = Array.isArray(rulePaths) ? rulePaths : [rulePaths];
        const types = Array.isArray(ruleTypes) ? ruleTypes : [ruleTypes];
        for (const path of paths) {
            const keys = PathInfo.getPathKeys(path);
            let target = this.accessRules.rules;
            for (const key of keys) {
                if (!(key in target)) { target[key] = {}; }
                target = target[key];
                if (typeof target !== 'object' || target === null) { throw new Error(`Cannot add rule because value of key "${key}" is not an object`); }
            }
            for (const type of types) {
                target[`.${type}`] = callback;
                this.codeRules.push({ path, type, callback });
            }
        }
    }
}
