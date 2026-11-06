/**
 * UX audit pass 3: error recovery, loading states and async feedback.
 *
 * The mock build replaces window.fetch in-process, so there is no network for Playwright to
 * intercept. Instead this wraps whatever fetch the app installed, AFTER load, then navigates
 * client-side so React Query re-fetches through the wrapper. Same api-client -> query -> UI path.
 */
import { chromium } from 'playwright'

const BASE = process.env.APP_URL ?? 'http://localhost:3100'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 100)) })

const failAllGets = () => page.evaluate(() => {
  const real = window.fetch
  window.fetch = async (input, init) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    if (method === 'GET') return new Response('{"message":"boom"}', { status: 500, headers: { 'Content-Type': 'application/json' } })
    return real(input, init)
  }
})
const delayAll = (ms) => page.evaluate((d) => {
  const real = window.fetch
  window.fetch = async (input, init) => {
    await new Promise((r) => setTimeout(r, d))
    return real(input, init)
  }
}, ms)

const goClientSide = async (path) => {
  const link = page.locator(`a[href="${path}"]`).first()
  if (await link.count()) { await link.click(); return true }
  return false
}
const mainText = () => page.evaluate(() =>
  (document.querySelector('main')?.innerText ?? document.body.innerText).replace(/\s+/g, ' '))

// ================= 1. A GET fails: is the user told, and can they retry? ========
console.log('=== 1. Error recovery when a GET fails (500) ===')
for (const path of ['/investments', '/pool', '/messages', '/insights', '/events', '/signals']) {
  await page.goto(`${BASE}/dashboard?as=vc`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await failAllGets()
  if (!(await goClientSide(path))) { console.log(` ${path}: no nav link`); continue }
  await page.waitForTimeout(2500)
  const t = await mainText()
  const probe = await page.evaluate(() => ({
    retry: !!Array.from(document.querySelectorAll('button, a')).find((b) => /try again|retry|reload|refresh/i.test(b.innerText)),
    alert: !!document.querySelector('[role=alert]'),
  }))
  console.log(` ${path}:`)
  console.log(`   told=${/(couldn.t|could not|failed|error|wrong|try again|unable)/i.test(t)}` +
    ` retryControl=${probe.retry} role=alert=${probe.alert} leaks=${/(500|boom|Internal Server|TypeError|undefined|NaN)/.test(t)}` +
    ` mainChars=${t.trim().length}`)
  console.log(`   main: "${t.trim().slice(0, 150)}"`)
}

// ================= 2. Loading state while a GET is slow =========================
console.log('\n=== 2. Loading states (GET delayed 1800ms) ===')
for (const path of ['/investments', '/insights', '/pool', '/messages', '/events']) {
  await page.goto(`${BASE}/dashboard?as=vc`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await delayAll(1800)
  if (!(await goClientSide(path))) { console.log(` ${path}: no nav link`); continue }
  await page.waitForTimeout(500)
  const during = await page.evaluate(() => ({
    skeletons: document.querySelectorAll('[class*=animate-pulse],[class*=skeleton]').length,
    spinners: document.querySelectorAll('[class*=animate-spin]').length,
    live: document.querySelectorAll('[aria-busy=true],[role=status]').length,
    h: document.querySelector('main')?.scrollHeight ?? 0,
    text: (document.querySelector('main')?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 70),
  }))
  await page.waitForTimeout(2600)
  const after = await page.evaluate(() => document.querySelector('main')?.scrollHeight ?? 0)
  console.log(` ${path}: skeleton=${during.skeletons} spinner=${during.spinners} announced=${during.live}` +
    ` mainHeight ${during.h}->${after} (shift ${Math.abs(after - during.h)}px)`)
  console.log(`   during: "${during.text}"`)
}

// ================= 3. A mutation fails: told? rolled back? ======================
console.log('\n=== 3. Error recovery when a mutation fails (500) ===')
const mutationProbes = [
  { path: '/suggestions', btn: /dismiss/i, what: 'dismiss suggestion' },
  { path: '/events', btn: /going/i, what: 'RSVP' },
  { path: '/pool', btn: /remove|watching|interested/i, what: 'pool action' },
]
for (const p of mutationProbes) {
  await page.goto(`${BASE}${p.path}?as=vc`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    const real = window.fetch
    window.fetch = async (input, init) => {
      const m = (init?.method ?? 'GET').toUpperCase()
      if (m !== 'GET') return new Response('{"message":"boom"}', { status: 500, headers: { 'Content-Type': 'application/json' } })
      return real(input, init)
    }
  })
  const btn = page.locator('button', { hasText: p.btn }).first()
  if (!(await btn.count())) { console.log(` ${p.what}: no control matching ${p.btn}`); continue }
  const label = (await btn.innerText()).trim().replace(/\s+/g, ' ')
  const before = await mainText()
  await btn.click({ force: true }).catch(() => {})
  await page.waitForTimeout(2200)
  const after = await mainText()
  const told = await page.evaluate(() => {
    const t = document.body.innerText
    return {
      message: /(couldn.t|could not|failed|error|wrong|try again|unable)/i.test(t),
      toast: document.querySelector('[role=status],[role=alert],[class*=toast]')?.innerText?.replace(/\s+/g, ' ').slice(0, 70) ?? null,
    }
  })
  console.log(` ${p.what} ("${label}"): userTold=${told.message} toast=${JSON.stringify(told.toast)}` +
    ` contentChanged=${before !== after} (optimistic change left in place=${before !== after && !told.message})`)
}

// ================= 4. Does a successful mutation confirm anything? ==============
console.log('\n=== 4. Confirmation + undo on a successful mutation ===')
for (const p of mutationProbes) {
  await page.goto(`${BASE}${p.path}?as=vc`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const btn = page.locator('button', { hasText: p.btn }).first()
  if (!(await btn.count())) { console.log(` ${p.what}: no control`); continue }
  const label = (await btn.innerText()).trim().replace(/\s+/g, ' ')
  await btn.click({ force: true }).catch(() => {})
  await page.waitForTimeout(1200)
  const res = await page.evaluate(() => ({
    toast: document.querySelector('[role=status],[role=alert],[class*=toast]')?.innerText?.replace(/\s+/g, ' ').slice(0, 70) ?? null,
    undo: /undo/i.test(document.body.innerText),
    liveRegions: document.querySelectorAll('[aria-live]').length,
  }))
  console.log(` ${p.what} ("${label}"): toast=${JSON.stringify(res.toast)} undo=${res.undo} ariaLive=${res.liveRegions}`)
}

console.log(`\nconsole errors seen: ${consoleErrors.length}`)
;[...new Set(consoleErrors)].slice(0, 6).forEach((e) => console.log('  ', e))
await browser.close()
