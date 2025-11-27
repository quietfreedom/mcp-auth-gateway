// oauthClient.ts
// 基于 `openid-client` 的 OAuth/OIDC 简化封装

import { Issuer, generators, type Issuer as IssuerType, type Client } from 'openid-client';

export interface OauthClientConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

export class OauthClient {
  private issuer!: IssuerType;
  private client!: Client;
  private config: OauthClientConfig;

  constructor(config: OauthClientConfig) {
    this.config = config;
  }

  async init() {
    this.issuer = await Issuer.discover(this.config.issuerUrl);
    this.client = new this.issuer.Client({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uris: [this.config.redirectUri],
      response_types: ['code']
    });
  }

  /**
   * 生成用于引导用户授权的 URL 与 state
   */
  generateAuthorizationUrl(scopes: string[] = ['openid'], state?: string) {
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const theState = state ?? generators.state();

    const url = this.client.authorizationUrl({
      scope: scopes.join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: theState
    });

    return { url, codeVerifier, state: theState };
  }

  /**
   * 处理授权回调（使用 code + code_verifier）
   */
  async handleCallback(params: Record<string, any>, codeVerifier: string) {
    const tokenSet = await this.client.callback(this.config.redirectUri, params, {
      code_verifier: codeVerifier
    });
    return tokenSet; // 包含 access_token / refresh_token / id_token
  }

  async refresh(tokenSet: { refresh_token?: string }) {
    if (!tokenSet.refresh_token) throw new Error('no refresh token');
    return this.client.refresh(tokenSet.refresh_token);
  }
}
