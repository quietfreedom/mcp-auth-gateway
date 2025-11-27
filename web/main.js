const callbackBase = window.location.origin.replace(/:\d+$/, ':4002')
const gatewayBase = window.location.origin.replace(/:\d+$/, ':4001')
const out = document.getElementById('out')
const sessionsArea = document.getElementById('sessionsArea')

function log(v){ out.textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2) }

async function startOauth(){
  const issuer = document.getElementById('issuer').value
  const clientId = document.getElementById('clientId').value
  const redirect = document.getElementById('redirect').value
  const serverId = document.getElementById('serverId').value
  const scopes = document.getElementById('scopes').value

  const params = new URLSearchParams({ issuer, clientId, redirect, serverId, scopes })
  try{
    const r = await fetch(callbackBase + '/auth/start?' + params.toString(), { method: 'GET', redirect: 'manual' })
    const txt = await r.text()
    try { const j = JSON.parse(txt); log(j); } catch (_) { log(txt) }
  }catch(e){ log('error: '+e.message) }
}

async function simulateCallback(){
  const serverId = document.getElementById('serverId').value
  const params = new URLSearchParams({ state: 'demo-state', code: 'demo-code', serverId })
  try{
    const r = await fetch(callbackBase + '/auth/callback?' + params.toString(), { method: 'GET' })
    const txt = await r.text()
    try { const j = JSON.parse(txt); log(j); } catch (_) { log(txt) }
  }catch(e){ log('error: '+e.message) }
}

function renderSessions(list){
  if(!Array.isArray(list) || list.length===0){ sessionsArea.textContent = 'No sessions'; return }
  const table = document.createElement('table')
  table.className = 'sessions-table'
  const thead = document.createElement('thead')
  thead.innerHTML = '<tr><th>id</th><th>serverId</th><th>created</th><th>expires</th><th>actions</th></tr>'
  table.appendChild(thead)
  const tbody = document.createElement('tbody')
  list.forEach(s=>{
    const tr = document.createElement('tr')
    tr.innerHTML = `<td class="small">${s.id}</td><td class="small">${s.serverId||''}</td><td class="small">${new Date(s.created).toLocaleString()}</td><td class="small">${s.expires?new Date(s.expires).toLocaleString():''}</td>`
    const act = document.createElement('td')
    const btn = document.createElement('button')
    btn.textContent = 'Revoke'
    btn.onclick = ()=>revokeSessionById(s.id)
    act.appendChild(btn)
    tr.appendChild(act)
    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  sessionsArea.innerHTML = ''
  sessionsArea.appendChild(table)
}

async function listSessions(){
  try{
    const r = await fetch(gatewayBase + '/admin/sessions')
    const j = await r.json()
    renderSessions(j)
    log({ sessions: j.length })
  }catch(e){ log('error: '+e.message) }
}

async function getSession(){
  const id = document.getElementById('sessionFetchId').value
  if(!id) return log('请提供 session id')
  try{
    const r = await fetch(gatewayBase + '/admin/session/' + encodeURIComponent(id))
    const j = await r.json()
    log(j)
  }catch(e){ log('error: '+e.message) }
}

async function revokeSession(){
  const id = document.getElementById('sessionFetchId').value
  if(!id) return log('请提供 session id')
  try{
    const r = await fetch(gatewayBase + '/admin/revoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id })})
    const j = await r.json()
    log(j)
    listSessions()
  }catch(e){ log('error: '+e.message) }
}

async function revokeSessionById(id){
  try{
    const r = await fetch(gatewayBase + '/admin/revoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id })})
    const j = await r.json()
    log(j)
    listSessions()
  }catch(e){ log('error: '+e.message) }
}

async function health(){
  try{
    // check both demo callback and gateway
    const r1 = await fetch(callbackBase + '/health')
    const r2 = await fetch(gatewayBase + '/health')
    const t1 = await r1.text(); const t2 = await r2.text()
    log({ callback: t1, gateway: t2 })
  }catch(e){ log('error: '+e.message) }
}

async function invokeDemo(){
  try{
    const body = { serverId: document.getElementById('serverId').value || 'demo-srv', path: '/', method: 'GET' }
    const r = await fetch(gatewayBase + '/invoke', { method: 'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify(body) })
    const j = await r.json()
    log({ invoke: j })
  }catch(e){ log('invoke error: '+e.message) }
}
