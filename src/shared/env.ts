import type { HttpApp, Request } from './http';
import type { AceBase, DataReference } from 'acebase';
import type { AceBaseServerConfig } from '../settings';
import type { DbUserAccountDetails } from '../schema/user';
import type { ConnectedClient } from './clients';
import type { DebugLogger, SimpleCache, Api } from 'acebase-core';
import type { OAuth2Provider } from '../oauth-providers/oauth-provider';
import type { Server as HttpServer } from 'http';
import type { Server as SecureHttpServer } from 'https';
import type { PathBasedRules } from '../rules';
import { DatabaseLog } from '../logger';

export interface RouteInitEnvironment {
    server: HttpServer | SecureHttpServer;
    app: HttpApp;
    config: AceBaseServerConfig;
    db: AceBase & { api: Api };
    authDb: AceBase;
    debug: DebugLogger;
    securityRef: DataReference;
    authRef: DataReference;
    log: DatabaseLog; // logRef: DataReference;
    tokenSalt: string;
    clients: Map<string, ConnectedClient>;
    authCache: SimpleCache<string, DbUserAccountDetails>;
    authProviders: { [providerName: string]: OAuth2Provider };
    rules: PathBasedRules
};

export interface RouteRequestEnvironment {
    /** If the request has an Authentication: bearer token, the user will be bound to the incoming request */
    user?: DbUserAccountDetails;

    /** If context is sent through AceBase-Context header, it will be bound to the incoming request */
    context: { [key: string]: any };
};

export type RouteRequest<ReqQuery = any, ReqBody = any, ResBody = any> = Request<any, ResBody, ReqBody, ReqQuery> & RouteRequestEnvironment;