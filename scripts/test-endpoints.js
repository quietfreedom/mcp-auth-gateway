// Node script to test demo endpoints sequentially
(async function(){
  const { generateKeyPair, exportJWK, SignJWT } = require('jose');
  const callbackBase = 'http://localhost:4002';
  const gatewayBase = 'http://localhost:4001';
  const log = (tag, v) => console.log('\n===', tag, '===\n', typeof v === 'string' ? v : JSON.stringify(v, null, 2));

  try{
    // /auth/start
    const startUrl = `${callbackBase}/auth/start?issuer=https://issuer.example/&client_id=client&redirect_uri=${encodeURIComponent(callbackBase + '/auth/callback')}&server_id=demo-srv&scopes=openid%20profile`;
    const r1 = await fetch(startUrl, { method: 'GET' });
    const t1 = await r1.text();
    let startJson;
    try{ startJson = JSON.parse(t1) }catch(e){ startJson = t1 }
    log('/auth/start response', startJson);

    const state = (startJson && startJson.state) ? startJson.state : 'demo-state';

    // /auth/callback
    const cbUrl = `${callbackBase}/auth/callback?state=${encodeURIComponent(state)}&code=demo-code`;
    const r2 = await fetch(cbUrl, { method: 'GET' });
    const t2 = await r2.text();
    let cbJson;
    try{ cbJson = JSON.parse(t2) }catch(e){ cbJson = t2 }
    log('/auth/callback response', cbJson);

    // /admin/sessions
    const r3 = await fetch(gatewayBase + '/admin/sessions');
    const j3 = await r3.json();
    log('/admin/sessions', j3);

    // /invoke (build a minimal signed manifest + jwks so verifier accepts it)
    try{
      // generate RSA keypair
      const { publicKey, privateKey } = await generateKeyPair('RS256');
      const pubJwk = await exportJWK(publicKey);
      pubJwk.kid = 'demo-key-1';

      const now = Math.floor(Date.now()/1000);
      const manifestPayload = {
        iss: 'demo-registry',
        iat: now,
        exp: now + 60*60,
        manifest: {
          toolId: 'demo.tool',
          // use same serverId as demo callback saved token (demo-srv)
          serverId: 'demo-srv',
          title: 'Demo Tool',
          capabilities: ['call'],
          oauthScopes: ['openid'],
          serverPublicKeyJwk: pubJwk
        }
      };

      const jws = await new SignJWT(manifestPayload)
        .setProtectedHeader({ alg: 'RS256', kid: pubJwk.kid })
        .sign(privateKey);

      const invokeBody = {
        signedManifest: jws,
        manifestVerifyOptions: { jwks: { keys: [pubJwk] } },
        toolPath: '/',
        body: {}
      };

      const r4 = await fetch(gatewayBase + '/invoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(invokeBody) });
      const text = await r4.text();
      try{ log('/invoke', JSON.parse(text)); } catch(e){ log('/invoke raw', text) }
    }catch(e){ log('/invoke error', e.message || e) }

    // try revoke if sessions present
    if (j3 && j3.sessions && j3.sessions.length>0){
      const sid = j3.sessions[0].sessionId;
      const r5 = await fetch(gatewayBase + '/admin/revoke', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ sessionId: sid }) });
      const j5 = await r5.json();
      log('/admin/revoke', j5);
    } else {
      log('revoke', 'no sessions');
    }

  }catch(err){
    console.error('TEST ERROR', err);
    process.exitCode = 2;
  }
})();
