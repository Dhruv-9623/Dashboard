/**
 * Browser end-to-end run against a real backend and a real database.
 *
 * It signs up new accounts each run (timestamped emails), so it can be run repeatedly, but it
 * writes to whatever database the API is pointed at — use a scratch database, not dashboard_dev.
 *
 *   npm --prefix frontend exec playwright install chromium   # once
 *   APP_URL=http://localhost:3002 API_URL=http://localhost:8081 npm --prefix frontend run test:e2e
 *
 * Exits non-zero if any step fails, so CI can gate on it.
 */
import { chromium, request } from 'playwright'
const APP = process.env.APP_URL ?? 'http://localhost:3002'
const API = process.env.API_URL ?? 'http://localhost:8081'
const TS = Date.now()
const results = []
const step = (name, ok, detail = '') => { results.push(ok); console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  — ' + detail : '')) }

const b = await chromium.launch()
const errors = []
const openApp = async () => {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  const p = await ctx.newPage()
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)) })
  p.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 140)))
  return { ctx, p }
}
const signUp = async (p, email, type) => {
  await p.goto(APP + '/', { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: 'Test Login (dev only)' }).click()
  await p.getByRole('button', { name: /Register/ }).click()
  await p.getByLabel('Email').fill(email)
  await p.getByLabel('Password').fill('secret123')
  await p.getByRole('button', { name: 'Register', exact: true }).click()
  await p.waitForURL('**/account-type-selection', { timeout: 15000 })
  await p.getByRole('button', { name: type === 'VC' ? /Venture Capitalist/ : /Startup Founder/ }).click()
  await p.waitForTimeout(2500)
}

// ---------- Founder: create the startup profile through onboarding ----------
const founderEmail = `e2e-founder-${TS}@live.test`
const { ctx: fctx, p: f } = await openApp()
await signUp(f, founderEmail, 'STARTUP')
step('founder → startup onboarding', f.url().endsWith('/onboarding/startup'), f.url())

step('submit stays disabled until the required fields are filled',
  await f.getByRole('button', { name: 'Create profile' }).isDisabled())

await f.getByLabel(/Company name/).fill(`Lumen E2E ${TS}`)
await f.getByLabel('Sector').selectOption('Healthtech')
await f.getByLabel('Stage').selectOption('SEED')
await f.getByLabel('Website').fill('javascript:alert(1)')
await f.getByRole('button', { name: 'Create profile' }).click()
await f.waitForTimeout(1200)
step('javascript: website rejected with an inline message',
  (await f.locator('main').innerText()).includes('http://'),
  (await f.locator('main').innerText()).match(/Website[^\n]*/)?.[0] ?? '')

await f.getByLabel('Website').fill('https://lumen.e2e')
await f.getByRole('button', { name: 'Create profile' }).click()
await f.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {})
step('startup created → dashboard', f.url().endsWith('/dashboard'), f.url())
await f.waitForFunction((name) => document.querySelector('h1')?.textContent?.includes(name), `Lumen E2E ${TS}`, { timeout: 8000 }).catch(() => {})
step('dashboard names the startup', ((await f.locator('h1').first().textContent()) ?? '').includes('Lumen E2E'),
  (await f.locator('h1').first().textContent()) ?? '')

// co-founder invite (pre-register the account through the API)
const api = await request.newContext({ baseURL: API })
await api.get('/api/auth/me')
const tok = async () => (await api.storageState()).cookies.find(c => c.name === 'XSRF-TOKEN')?.value
const mateEmail = `e2e-cofounder-${TS}@live.test`
await api.post('/api/auth/register', { data: { email: mateEmail, password: 'secret123' }, headers: { 'X-XSRF-TOKEN': await tok() } })
await api.post('/api/auth/account-type', { data: { userType: 'STARTUP' }, headers: { 'X-XSRF-TOKEN': await tok() } })

await f.goto(APP + '/settings', { waitUntil: 'networkidle' })
await f.getByRole('tab', { name: 'Team' }).click(); await f.waitForTimeout(500)
await f.getByLabel(/^Email/).fill(mateEmail)
await f.getByLabel('Role').selectOption('CO_FOUNDER')
await f.getByRole('button', { name: 'Invite' }).click(); await f.waitForTimeout(1500)
const teamText = await f.locator('main').innerText()
step('co-founder appears in the team table', teamText.includes(mateEmail))
step('role label is readable', teamText.includes('Co-founder'), teamText.match(/Co-?founder/i)?.[0] ?? '')
await fctx.close()

// ---------- VC: firm, investment, pool ----------
const { ctx: vctx, p: v } = await openApp()
await signUp(v, `e2e-vc-${TS}@live.test`, 'VC')
step('VC → firm onboarding', v.url().endsWith('/onboarding/firm'), v.url())
await v.getByLabel(/Firm name/).fill(`Meridian E2E ${TS}`)
await v.getByRole('button', { name: 'Create firm' }).click()
await v.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {})
step('firm created → dashboard', v.url().endsWith('/dashboard'))

// Record an investment in the founder's startup
await v.goto(APP + '/investments', { waitUntil: 'networkidle' }); await v.waitForTimeout(500)
step('investments empty state', (await v.locator('main').innerText()).includes('No investments recorded'))
await v.getByRole('button', { name: 'Record investment' }).first().click(); await v.waitForTimeout(400)
await v.getByPlaceholder('Search startups…').fill(`Lumen E2E ${TS}`); await v.waitForTimeout(900)
await v.getByRole('button', { name: new RegExp(`Lumen E2E ${TS}`) }).first().click(); await v.waitForTimeout(300)
await v.getByLabel(/Investment date/).fill('2025-07-11')
await v.getByLabel(/^Amount/).fill('60000000')
await v.getByLabel('Equity %').fill('9.5')
step('equity over 100 blocked by the field itself',
  !(await v.getByLabel('Equity %').evaluate((el) => { el.value = '140'; return el.checkValidity() })))
await v.getByLabel('Equity %').fill('9.5')
// A rule only the server knows: notes are capped at 5000 characters.
await v.getByLabel('Notes').fill('x'.repeat(5001))
await v.getByRole('button', { name: 'Add investment' }).click(); await v.waitForTimeout(1500)
step('server-side field error shown on the right field',
  (await v.getByRole('dialog').innerText()).includes('5000'),
  (await v.getByRole('dialog').innerText()).match(/[^\n]*5000[^\n]*/)?.[0] ?? '')
await v.getByLabel('Notes').fill('Led the seed round.')
await v.getByRole('button', { name: 'Add investment' }).click(); await v.waitForTimeout(1800)
const invText = await v.locator('main').innerText()
step('investment saved and listed', invText.includes(`Lumen E2E ${TS}`))
step('summary tiles from the server', invText.includes('₹6.00 Cr'), invText.match(/CAPITAL DEPLOYED\n[^\n]*/)?.[0] ?? '')
step('success toast shown', (await v.getByRole('status').first().innerText().catch(() => '')).includes('Recorded'))

// Pool: on-platform + off-platform, then confirm-to-remove
await v.goto(APP + '/pool', { waitUntil: 'networkidle' }); await v.waitForTimeout(400)
await v.getByRole('button', { name: 'Track company' }).first().click(); await v.waitForTimeout(400)
await v.getByRole('button', { name: 'On platform', exact: true }).click()
await v.getByPlaceholder('Search startups…').fill(`Lumen E2E ${TS}`); await v.waitForTimeout(900)
await v.getByRole('button', { name: new RegExp(`Lumen E2E ${TS}`) }).first().click(); await v.waitForTimeout(300)
await v.getByRole('button', { name: 'Add to pool' }).click(); await v.waitForTimeout(1500)
let poolText = await v.locator('main').innerText()
step('on-platform company added to pool', poolText.includes(`Lumen E2E ${TS}`))
step('stage comes from the startup profile', poolText.includes('Seed'), poolText.match(/Healthtech[^\n]*/)?.[0] ?? '')

await v.getByRole('button', { name: 'Track company' }).first().click(); await v.waitForTimeout(400)
await v.getByLabel(/Company name/).fill('Nimbus E2E')
await v.getByRole('button', { name: 'Add to pool' }).click(); await v.waitForTimeout(1500)
poolText = await v.locator('main').innerText()
step('off-platform company added', poolText.includes('Nimbus E2E'))

const rowsBefore = await v.locator('tbody tr').count()
await v.getByRole('button', { name: 'Remove' }).first().click(); await v.waitForTimeout(400)
step('remove asks for confirmation first',
  await v.getByRole('dialog').isVisible() && (await v.locator('tbody tr').count()) === rowsBefore)
await v.getByRole('dialog').getByRole('button', { name: 'Remove' }).click(); await v.waitForTimeout(1500)
step('removed after confirming', (await v.locator('tbody tr').count()) === rowsBefore - 1)

// Dashboard reads the server summary
await v.goto(APP + '/dashboard', { waitUntil: 'networkidle' }); await v.waitForTimeout(800)
const dash = await v.locator('main').innerText()
step('dashboard capital deployed from summary', dash.includes('₹6.00 Cr'), dash.match(/CAPITAL DEPLOYED\n[^\n]*/)?.[0] ?? '')
step('dashboard pool count from totalElements', /TRACKED IN POOL\s*\n\s*1\b/.test(dash), dash.match(/TRACKED IN POOL[\s\S]{0,12}/)?.[0]?.replace(/\s+/g,' ') ?? '')
await vctx.close()

step('no unexpected console errors', errors.filter(e => !/404|Failed to load resource/.test(e)).length === 0, errors.join(' | '))
console.log(`\nRESULT: ${results.filter(Boolean).length} passed, ${results.filter(x => !x).length} failed`)
await b.close()
await api.dispose()

const failed = results.filter((ok) => !ok).length
process.exit(failed === 0 ? 0 : 1)
