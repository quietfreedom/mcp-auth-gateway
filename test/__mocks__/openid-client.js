// Jest mock for `openid-client` used in tests
const generators = {
  codeVerifier: () => 'codever',
  codeChallenge: () => 'challenge',
  state: () => 'mystate'
};

class Client {
  constructor(cfg) { this.cfg = cfg; }
  authorizationUrl(opts) { return `https://auth.example/authorize?state=${opts.state}`; }
  async callback() { return { access_token: 'at', refresh_token: 'rt', id_token: 'id', expires_in: 3600 }; }
  async refresh() { return { access_token: 'new-at' }; }
}

const Issuer = { discover: async () => ({ Client }) };

module.exports = { Issuer, generators };
