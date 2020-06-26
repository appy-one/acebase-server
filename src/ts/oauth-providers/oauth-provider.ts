export interface IOAuth2ProviderSettings {
    client_id: string,
    client_secret: string,
    scopes?: string[]
}

export interface IOAuth2Provider {
    init(options: { redirect_url: string, state?: string }): Promise<string>
    getAccessToken(params: { auth_code: string, redirect_url: string }): Promise<{ access_token: string, id_token?: IOpenIDToken, expires_in?: number, refresh_token?: string }>
    getUserInfo(access_token: string): Promise<{ id: string, name: string, display_name: string, picture?: Array<{ width?: number, height?: number, url: string }>, email: string, email_verified: boolean, other: any }>
}
// For OAuth2.0 providers with id_token in getAccessToken, see https://auth0.com/docs/tokens/concepts/jwts
export interface IOpenIDToken {
    // Omitted properties aud, exp, ist, iss, sub, at_hash, azp, hd, nonce, 
    email: string
    email_verified: boolean
    family_name?: string // last name(s)
    given_name?: string // first name(s)
    locale: string
    name: string // full name
    picture?: string // url
    profile?: string // url
}

export interface IOpenIDConfiguration {
    issuer: string
    authorization_endpoint: string
    device_authorization_endpoint: string
    token_endpoint: string
    userinfo_endpoint: string
    revocation_endpoint: string
    jwks_uri: string
    response_types_supported: string[]
    subject_types_supported: string[]
    id_token_signing_alg_values_supported: string[]
    scopes_supported: string[]
    token_endpoint_auth_methods_supported: string[]
    claims_supported: string[]
    code_challenge_methods_supported: string[]
    grant_types_supported: string[]
}