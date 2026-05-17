#!/usr/bin/env node
// AccessScope environment switcher — run with: npm run env:ui
// Serves a browser UI at http://localhost:3001 to switch between env profiles.
// Profiles live in .envs/ (gitignored). No npm dependencies.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ENVS_DIR = path.join(ROOT, '.envs')
const ACTIVE_FILE = path.join(ROOT, '.env.local')
const PORT = 3001

const PROFILES = ['local', 'staging', 'production']

const PROFILE_LABELS = { local: 'Local Dev', staging: 'Staging', production: 'Production' }

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_SOLO',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_TEAM',
  'STRIPE_PRICE_PACK_5',
  'STRIPE_PRICE_PACK_15',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'NEXT_PUBLIC_APP_URL',
  'CRON_SECRET',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null
  const map = new Map()
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const raw = line.slice(eq + 1).trim()
    // Strip trailing inline comment (e.g. `=eyJ... # safe to expose`)
    map.set(key, raw.split(/\s+#/)[0].trim())
  }
  return map
}

function getActiveProfile() {
  const parsed = parseEnvFile(ACTIVE_FILE)
  return parsed?.get('ENV_PROFILE') ?? null
}

function isSet(val) {
  return val && val.length > 0 && !val.includes('<') && !val.endsWith('...')
}

function getProfileStatus(name) {
  const filePath = path.join(ENVS_DIR, `${name}.env`)
  const parsed = parseEnvFile(filePath)
  if (!parsed) return { exists: false }

  const vars = {}
  for (const key of REQUIRED_VARS) vars[key] = isSet(parsed.get(key) ?? '')

  const url = parsed.get('NEXT_PUBLIC_SUPABASE_URL') ?? ''
  const sk = parsed.get('STRIPE_SECRET_KEY') ?? ''
  const resendKey = parsed.get('RESEND_API_KEY') ?? ''
  const fromEmail = parsed.get('RESEND_FROM_EMAIL') ?? ''
  const appUrl = parsed.get('NEXT_PUBLIC_APP_URL') ?? ''

  return {
    exists: true,
    vars,
    supabaseMode: url.includes('localhost') ? 'local' : url ? 'cloud' : 'missing',
    stripeMode: sk.startsWith('sk_live_') ? 'live' : sk.startsWith('sk_test_') ? 'test' : 'missing',
    emailMode: (!resendKey || resendKey === 're_dev_placeholder' || fromEmail.includes('localhost')) ? 'console' : 'resend',
    appUrl: appUrl.replace(/^https?:\/\//, ''),
  }
}

// ── HTML ─────────────────────────────────────────────────────────────────────

const CSS = `
  :root {
    --green: #16a34a; --green-light: #dcfce7; --green-border: #86efac;
    --amber: #b45309; --amber-light: #fef3c7; --amber-border: #fcd34d;
    --red: #dc2626; --red-light: #fee2e2;
    --blue: #2563eb; --blue-hover: #1d4ed8;
    --gray-50: #f9fafb; --gray-100: #f3f4f6; --gray-200: #e5e7eb;
    --gray-300: #d1d5db; --gray-400: #9ca3af; --gray-600: #4b5563; --gray-900: #111827;
    --radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 15px; color: var(--gray-900);
  }
  *, *::before, *::after { box-sizing: border-box; }
  body { background: var(--gray-50); margin: 0; padding: 2rem; }
  .container { max-width: 860px; margin: 0 auto; }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
  header h1 { font-size: 1.2rem; font-weight: 700; margin: 0; }
  .active-env { font-size: 0.8rem; background: var(--green-light); color: var(--green);
    border: 1px solid var(--green-border); border-radius: 99px; padding: 3px 10px; font-weight: 600; }
  .no-env { font-size: 0.8rem; background: var(--gray-100); color: var(--gray-400);
    border: 1px solid var(--gray-200); border-radius: 99px; padding: 3px 10px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .card { background: white; border: 2px solid var(--gray-200); border-radius: var(--radius); padding: 1.25rem; display: flex; flex-direction: column; }
  .card.active { border-color: var(--green); }
  .card.missing { border-style: dashed; opacity: 0.6; }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.9rem; }
  .card-title { font-size: 0.95rem; font-weight: 700; margin: 0; }
  .badge { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    padding: 2px 7px; border-radius: 4px; white-space: nowrap; }
  .badge.active { background: var(--green-light); color: var(--green); }
  .badge.warn   { background: var(--amber-light); color: var(--amber); }
  .badge.danger { background: var(--red-light); color: var(--red); }
  .checklist { list-style: none; padding: 0; margin: 0 0 1rem; font-size: 0.82rem; color: var(--gray-600); flex: 1; }
  .checklist li { padding: 3px 0; display: flex; align-items: baseline; gap: 0.4rem; }
  .icon { font-style: normal; flex-shrink: 0; }
  .ok   { color: var(--green); }
  .warn { color: var(--amber); }
  .miss { color: var(--gray-300); }
  .val  { color: var(--gray-400); font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
  .missing-hint { font-size: 0.8rem; color: var(--gray-400); text-align: center; margin: 1rem 0; }
  button.switch { width: 100%; padding: 0.45rem; background: var(--blue); color: white;
    border: none; border-radius: var(--radius); cursor: pointer; font-size: 0.88rem; font-weight: 500; }
  button.switch:hover { background: var(--blue-hover); }
  button.switch:disabled { background: var(--gray-200); color: var(--gray-400); cursor: default; }
  .banner { position: fixed; bottom: 0; left: 0; right: 0; background: var(--amber-light);
    border-top: 2px solid var(--amber-border); padding: 0.7rem 2rem;
    text-align: center; font-size: 0.88rem; font-weight: 500; color: var(--amber); }
  .setup { background: white; border: 2px solid var(--gray-200); border-radius: var(--radius); padding: 2rem; }
  .setup h2 { margin: 0 0 1rem; font-size: 1rem; }
  .setup p  { font-size: 0.88rem; color: var(--gray-600); margin: 0 0 0.5rem; }
  .setup pre { background: var(--gray-100); border-radius: 6px; padding: 0.9rem 1.1rem;
    font-size: 0.82rem; overflow-x: auto; margin: 0.5rem 0 1rem; }
  .setup code { font-family: 'SFMono-Regular', Consolas, monospace; }
`

function checkIcon(ok, warnMode) {
  if (ok === 'missing') return `<i class="icon miss">○</i>`
  if (warnMode) return `<i class="icon warn">⚠</i>`
  return `<i class="icon ok">✓</i>`
}

function buildCard(name, status, isActive) {
  const label = PROFILE_LABELS[name]

  if (!status.exists) {
    return `
    <div class="card missing">
      <div class="card-header">
        <h2 class="card-title">${label}</h2>
      </div>
      <p class="missing-hint">No profile found</p>
      <p class="missing-hint" style="font-size:0.75rem">Create <code>.envs/${name}.env</code></p>
    </div>`
  }

  const { supabaseMode, stripeMode, emailMode, appUrl } = status
  const isProd = name === 'production'
  const isLive = stripeMode === 'live'

  const supabaseOk = supabaseMode !== 'missing'
  const stripeOk = stripeMode !== 'missing'

  const badges = [
    isActive ? `<span class="badge active">● Active</span>` : '',
    isProd ? `<span class="badge warn">⚠ Prod</span>` : '',
    isLive && !isProd ? `<span class="badge danger">Live Keys</span>` : '',
  ].filter(Boolean).join(' ')

  const checklist = `
    <ul class="checklist">
      <li>${checkIcon(supabaseOk ? 'ok' : 'missing')} <span>Supabase</span>
        <span class="val">${supabaseMode === 'local' ? 'Local Docker' : supabaseMode === 'cloud' ? 'Cloud' : '—'}</span></li>
      <li>${checkIcon(stripeOk ? 'ok' : 'missing', isLive)} <span>Stripe</span>
        <span class="val ${isLive ? 'warn' : ''}">${stripeMode === 'live' ? 'LIVE ⚠' : stripeMode === 'test' ? 'test mode' : '—'}</span></li>
      <li>${checkIcon('ok')} <span>Email</span>
        <span class="val">${emailMode === 'console' ? 'console (dev)' : 'Resend'}</span></li>
      <li>${checkIcon(appUrl ? 'ok' : 'missing')} <span>App URL</span>
        <span class="val">${appUrl || '—'}</span></li>
    </ul>`

  const confirmMsg = `Switch to PRODUCTION?\\n\\nThis uses ${isLive ? 'LIVE Stripe keys' : 'Stripe test keys'} and real email sending.\\n\\nMake sure you intend to work against production data.`

  const switchBtn = isActive
    ? `<button class="switch" disabled>Current environment</button>`
    : `<form method="POST" action="/switch" ${isProd ? `onsubmit="return confirm('${confirmMsg}')"` : ''}>
        <input type="hidden" name="name" value="${name}">
        <button class="switch" type="submit">Switch to ${label} →</button>
      </form>`

  return `
  <div class="card${isActive ? ' active' : ''}">
    <div class="card-header">
      <h2 class="card-title">${label}</h2>
      <div style="display:flex;gap:4px">${badges}</div>
    </div>
    ${checklist}
    ${switchBtn}
  </div>`
}

function buildSetupScreen() {
  return `
  <div class="setup">
    <h2>Setup required — no profiles found</h2>
    <p>Create the <code>.envs/</code> directory and add at least one profile file:</p>
    <pre><code>mkdir .envs
cp .env.local.example .envs/local.env</code></pre>
    <p>Then open <code>.envs/local.env</code> in your editor and:</p>
    <pre><code># 1. Add this as the very first line:
ENV_PROFILE=local

# 2. Fill in your local Supabase values (from \`npm run supabase:start\`):
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=&lt;from supabase status&gt;
SUPABASE_SERVICE_ROLE_KEY=&lt;from supabase status&gt;

# 3. Fill in remaining vars (Stripe test keys, etc.)</code></pre>
    <p>Repeat for <code>.envs/production.env</code> with <code>ENV_PROFILE=production</code> and live values.</p>
    <p style="margin-top:1rem"><strong>Refresh this page when done.</strong></p>
  </div>`
}

function buildHTML(profileData, active, justSwitched) {
  const anyExists = PROFILES.some(n => profileData[n].exists)

  const activeLabel = active ? PROFILE_LABELS[active] ?? active : null
  const activePill = activeLabel
    ? `<span class="active-env">Active: ${activeLabel}</span>`
    : `<span class="no-env">No active env</span>`

  const body = anyExists
    ? `<div class="grid">${PROFILES.map(n => buildCard(n, profileData[n], active === n)).join('')}</div>`
    : buildSetupScreen()

  const banner = justSwitched
    ? `<div class="banner">⚠ &nbsp;Restart your dev server (<code>npm run dev</code>) for changes to take effect</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AccessScope Env Manager</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>AccessScope Env Manager</h1>
      ${activePill}
    </header>
    ${body}
  </div>
  ${banner}
</body>
</html>`
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  if (req.method === 'GET' && url.pathname === '/') {
    const profileData = Object.fromEntries(PROFILES.map(n => [n, getProfileStatus(n)]))
    const active = getActiveProfile()
    const justSwitched = url.searchParams.get('switched') === '1'
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(buildHTML(profileData, active, justSwitched))
    return
  }

  if (req.method === 'POST' && url.pathname === '/switch') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      const params = new URLSearchParams(body)
      const name = params.get('name')
      if (!PROFILES.includes(name)) {
        res.writeHead(400, { 'Content-Type': 'text/plain' })
        res.end('Invalid profile name')
        return
      }
      const src = path.join(ENVS_DIR, `${name}.env`)
      if (!fs.existsSync(src)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end(`Profile file not found: .envs/${name}.env`)
        return
      }
      fs.copyFileSync(src, ACTIVE_FILE)
      // PRG pattern — redirect to GET so browser refresh doesn't re-POST
      res.writeHead(302, { Location: '/?switched=1' })
      res.end()
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found')
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\nAccessScope Env Manager`)
  console.log(`Open: http://localhost:${PORT}\n`)
  console.log('Press Ctrl+C to stop.')
})
