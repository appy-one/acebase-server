import { AceBase } from 'acebase';
import { DebugLogger, PathInfo } from 'acebase-core';
import * as fs from 'fs';
import { DbUserAccountDetails } from './schema/user';
import { AUTH_ACCESS_DEFAULT, AuthAccessDefault } from './settings';

type PathRuleFunction = ((env: any) => boolean) & { getText(): string };
type PathRules = {} & {
    '.schema'?: string|Object;
    '.read'?: boolean|string|PathRuleFunction;
    '.write'?: boolean|string|PathRuleFunction;
    '.validate'?: string|PathRuleFunction;
}
type RulesData = {
    rules: PathRules;
}
export type RuleValidationFailCode = 'rule'|'no_rule'|'private'|'exception';
// type HasAccessResult = { allow: true } | { allow: false; code: RuleValidationFailCode; message: string; rule?: string|boolean; rulePath?: string; details?: any };
type HasAccessResult = { allow: boolean; code?: RuleValidationFailCode; message?: string; rule?: string|boolean; rulePath?: string; details?: Error } & ({ allow: true } | { allow: false; code: RuleValidationFailCode; message: string; rule?: string|boolean; rulePath?: string; details?: Error });

export class PathBasedRules {

    private authEnabled: boolean;
    private accessRules: RulesData;
    stop(): void { throw new Error('not started yet'); }

    constructor(rulesFilePath: string, defaultAccess: AuthAccessDefault, env: { debug: DebugLogger, db: AceBase, authEnabled: boolean } ) {
        // Reads rules from a file and monitors it
        // Check if there is a rules file, load it or generate default

        const readRules = () => {
            try {
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
        const defaultRules:RulesData = {
            rules: {
                ".read": defaultAccessRule,
                ".write": defaultAccessRule
            }
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
                let rule = parent[key];
                if (['.read', '.write', '.validate'].includes(key) && typeof rule === 'string') {
                    // Convert to function
                    const text = rule;
                    rule = eval(`(env => { const { now, root, newData, data, auth, ${variables.join(', ')} } = env; return ${text}; })`);
                    rule.getText = () => {
                        return text;
                    }
                    return parent[key] = rule;
                }
                else if (key === '.schema') {
                    // Add schema
                    return env.db.schema.set(path, rule)
                    .catch(err => {
                        env.debug.error(`Error parsing ${path}/.schema: ${err.message}`)
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

        // Watch file for changes
        const watchFileListener = () => {
            // Reload access rules
            const accessRules = readRules();
            processRules('', accessRules, []);
            this.accessRules = accessRules;
        };
        fs.watchFile(rulesFilePath, watchFileListener);
        this.stop = () => {
            fs.unwatchFile(rulesFilePath, watchFileListener);
        }
        process.on('SIGINT', this.stop);

        this.authEnabled = env.authEnabled;
        this.accessRules = accessRules;
    }

    /**
     * 
     * @param {DbUserAccountDetails} user 
     * @param {string} path 
     * @param {boolean} [write] 
     * @param {(details: { code: string, message: string, [key:string]: any }) => void} denyDetailsCallback 
     */
    userHasAccess (user: Pick<DbUserAccountDetails, 'uid'>, path: string, write: boolean = false): HasAccessResult {
        // Process rules, find out if signed in user is allowed to read/write
        // Defaults to false unless a rule is found that tells us otherwise

        const allow: HasAccessResult = { allow: true };
        if (!this.authEnabled) {
            // Authentication is disabled, anyone can do anything. Not really a smart thing to do!
            return allow;
        }
        else if (user && user.uid === 'admin') {
            // Always allow admin access
            // TODO: implement user.is_admin, so the default admin account can be disabled
            return allow;
        }
        else if (path.startsWith('__')) {
            // NEW: with the auth database now integrated into the main database, 
            // deny access to private resources starting with '__' for non-admins
            return { allow: false, code: 'private', message: `Access to private resource "${path}" not allowed` };
        }

        const env = { now: Date.now(), auth: user || null }; // IDEA: Add functions like "exists" and "value". These will be async (so that requires refactoring) and can be used like "await exists('./shared/' + auth.uid)" and "await value('./writable') === true" 
        const pathKeys = PathInfo.getPathKeys(path);
        let rule = this.accessRules.rules;
        let rulePath = [];
        while(true) {
            if (!rule) { 
                // TODO: check if this one is redundant with the pathKeys.length === 0 near the end
                return { allow: false, code: 'no_rule', message: `No rules set for requested path "${path}", defaulting to false` };
            }
            let checkRule = write ? rule['.write'] : rule['.read'];
            if (typeof checkRule === 'boolean') { 
                if (!checkRule) {
                    return { allow: false, code: 'rule', message: `Access denied to path "${path}" by set rule`, rule: checkRule, rulePath: rulePath.join('/') };
                }
                return allow;
            }
            if (typeof checkRule === 'function') {
                try {
                    // Execute rule function
                    if (!checkRule(env)) {
                        return { allow: false, code: 'rule', message: `Access denied to path "${path}" by set rule`, rule: checkRule.getText(), rulePath: rulePath.join('/') };
                    }
                    return allow;
                }
                catch (err) {
                    // If rule execution throws an exception, don't allow. Can happen when rule is "auth.uid === '...'", and auth is null because the user is not signed in
                    return { allow: false, code: 'exception', message: `Access denied to path "${path}" by set rule`, rule: checkRule.getText(), rulePath: rulePath.join('/'), details: err };
                }
            }
            if (pathKeys.length === 0) {
                return { allow: false, code: 'no_rule', message: `No rule found for path ${path}` };
            }
            let nextKey = pathKeys.shift();
            // if nextKey is '*' or '$something', rule[nextKey] will be undefined (or match a variable) so there is no 
            // need to change things here for usage of wildcard paths in subscriptions
            if (typeof rule[nextKey] === 'undefined') {
                // Check if current rule has a wildcard child
                const wildcardKey = Object.keys(rule).find(key => key ==='*' || key[0] === '$');
                if (wildcardKey) { env[wildcardKey] = nextKey; }
                nextKey = wildcardKey;
            }
            nextKey && rulePath.push(nextKey);
            rule = rule[nextKey];
        }
    }  
}