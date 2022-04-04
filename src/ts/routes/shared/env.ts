import type { HttpApp, Request } from './http';
import type { AceBase, DataReference } from 'acebase';
import type { AceBaseServerSettings } from '../../../../src/index.d';
import { DbUserAccountDetails } from '../schema/user';
import { Client } from './clients';
import { DebugLogger, SimpleCache } from 'acebase-core';
import { IOAuth2Provider } from '../../oauth-providers/oauth-provider';

export interface RouteInitEnvironment {
    app: HttpApp;
    settings: AceBaseServerSettings;
    db: AceBase;
    debug: DebugLogger;
    authRef: DataReference;
    logRef: DataReference;
    tokenSalt: string;
    clients: Map<string, Client>;
    authCache: SimpleCache<string, DbUserAccountDetails>;
    authProviders: { [providerName: string]: IOAuth2Provider }
};

export interface RouteRequestEnvironment {
    user?: DbUserAccountDetails
};

export type RouteRequest<Params = any, ResBody = any, ReqBody = any, ReqQuery = any, Locals extends Record<string, any> = Record<string, any>> = Request<Params, ResBody, ReqBody, ReqQuery, Locals> & RouteRequestEnvironment;