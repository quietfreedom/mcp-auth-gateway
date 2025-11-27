const base = window.location.origin.replace(/:\d+$/, ':4002')
const out = document.getElementById('out')
function log(v){ out.textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2) }

async function startOauth(){
  const issuer = document.getElementById('issuer').value
  const clientId = document.getElementById('clientId').value
  const redirect = document.getElementById('redirect').value
  const serverId = document.getElementById('serverId').value
  const scopes = document.getElementById('scopes').value

  const params = new URLSearchParams({ issuer, clientId, redirect, serverId, scopes })
  try{
    const r = await fetch(base + '/auth/start?' + params.toString(), { method: 'GET' })
    const txt = await r.text()
    log({ status: r.status, body: txt })
    if (r.status === 302){
      log('Redirected to: ' + r.headers.get('location'))
    }
  }catch(e){ log('error: '+e.message) }
}

async function simulateCallback(){
  const serverId = document.getElementById('serverId').value
  // In demo mode we call /auth/callback directly to simulate a provider redirect
  const params = new URLSearchParams({ state: 'demo-state', code: 'demo-code', serverId })
  try{
    const r = await fetch(base + '/auth/callback?' + params.toString(), { method: 'GET' })
    const txt = await r.text()
    log({ status: r.status, body: txt })
  }catch(e){ log('error: '+e.message) }
}

async function listSessions(){
  try{
    const r = await fetch(base + '/admin/sessions')
    const j = await r.json()
    log(j)
  }catch(e){ log('error: '+e.message) }
}

async function getSession(){
  const id = document.getElementById('sessionFetchId').value
  if(!id) return log('请提供 session id')
  try{
    const r = await fetch(base + '/admin/session/' + encodeURIComponent(id))
    const j = await r.json()
    log(j)
  }catch(e){ log('error: '+e.message) }
}

async function revokeSession(){
  const id = document.getElementById('sessionFetchId').value
  if(!id) return log('请提供 session id')
  try{
    const r = await fetch(base + '/admin/revoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id })})
    const j = await r.json()
    log(j)
  }catch(e){ log('error: '+e.message) }
}

async function health(){
  try{
    const r = await fetch(base + '/health')
    const t = await r.text()
    log(t)
  }catch(e){ log('error: '+e.message) }
}
