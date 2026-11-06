/**
 * UX audit pass 1: keyboard journey, focus management, skip link, touch targets.
 * Reports only problems.
 */
import { chromium } from 'playwright'

const BASE = process.env.APP_URL ?? 'http://localhost:3100'
const PAGES = [
  '/dashboard', '/insights', '/investments', '/pool', '/deal-flow', '/commitments', '/outreach',
  '/deal-triage', '/compare', '/funding', '/discover', '/messages', '/wishlist',
  '/events', '/signals', '/suggestions', '/settings', '/rounds/fc-1',
]

const browser = await chromium.launch()
const out = { skipLink: [], focusOnNav: [], noFocusRing: [], tabOrder: [], smallTargets: [], unnamed: [] }

// ---- desktop: keyboard journey -------------------------------------------------
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

for (const path of PAGES) {
  await page.goto(`${BASE}${path}?as=vc`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  // 1. Is there a skip-to-content link as the first tab stop?
  await page.keyboard.press('Tab')
  const first = await page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    return { tag: el.tagName, text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40) }
  })
  if (!first || !/skip/i.test(first.text)) out.skipLink.push({ path, firstStop: first })

  // 2. After a client-side route change, where does focus go? Body means the
  //    keyboard user is dumped back to the top of the document with no announcement.
  const focusAfterNav = await page.evaluate(() => {
    const el = document.activeElement
    return el === document.body ? 'body' : el.tagName
  })

  // 3. Walk the first 40 tab stops: focus ring visible? order matches DOM?
  await page.evaluate(() => { document.activeElement?.blur?.() })
  const stops = []
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      const ring =
        (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) ||
        s.boxShadow !== 'none'
      // A <label for> counts, and so does aria-labelledby. Without them this reported every
      // properly-labelled text input on Settings as nameless, because an input has no innerText.
      const labelledBy = (el.getAttribute('aria-labelledby') || '')
        .split(/\s+/).filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ')
      const forLabel = el.id
        ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent ?? ''
        : ''
      const name = (el.getAttribute('aria-label') || labelledBy || forLabel || el.innerText ||
        el.getAttribute('title') || el.getAttribute('placeholder') || '').trim()
      return {
        tag: el.tagName, ring, name: name.slice(0, 30),
        y: Math.round(r.top), x: Math.round(r.left),
        docIndex: Array.from(document.querySelectorAll('*')).indexOf(el),
      }
    })
    if (!info) break
    stops.push(info)
  }
  const noRing = stops.filter((s) => !s.ring)
  if (noRing.length) out.noFocusRing.push({ path, count: noRing.length, sample: noRing.slice(0, 3) })
  const unnamed = stops.filter((s) => !s.name)
  if (unnamed.length) out.unnamed.push({ path, count: unnamed.length, sample: unnamed.slice(0, 3) })
  // tab order should be non-decreasing in document order
  let inversions = 0
  for (let i = 1; i < stops.length; i++) if (stops[i].docIndex < stops[i - 1].docIndex) inversions++
  if (inversions > 0) out.tabOrder.push({ path, inversions, stops: stops.length })
  out.focusOnNav.push({ path, focusAfterNav })
}

// ---- route-change focus: navigate via a nav link, see where focus lands --------
await page.goto(`${BASE}/dashboard?as=vc`, { waitUntil: 'networkidle' })
const navResult = await (async () => {
  const link = page.locator('a[href="/pool"]').first()
  if (!(await link.count())) return 'no /pool nav link found'
  await link.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(700)
  return page.evaluate(() => {
    const el = document.activeElement
    return el === document.body
      ? 'focus dropped to <body>'
      : `${el.tagName} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`
  })
})()

// ---- modal: focus in, Escape, focus returned ----------------------------------
const modalResult = await (async () => {
  await page.goto(`${BASE}/investments?as=vc`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const trigger = page.locator('button', { hasText: /record|add|new/i }).first()
  if (!(await trigger.count())) return 'no modal trigger found on /investments'
  const triggerText = (await trigger.innerText()).trim()
  await trigger.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  const inside = await page.evaluate(() => {
    const el = document.activeElement
    const dlg = document.querySelector('[role="dialog"]')
    return {
      dialogPresent: !!dlg,
      focusInside: !!(dlg && el && dlg.contains(el)),
      focused: el ? `${el.tagName} ${(el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 25)}` : 'body',
      labelled: !!(dlg && (dlg.getAttribute('aria-label') || dlg.getAttribute('aria-labelledby'))),
      modalAttr: dlg?.getAttribute('aria-modal'),
    }
  })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  const after = await page.evaluate(() => ({
    closed: !document.querySelector('[role="dialog"]'),
    focused: document.activeElement === document.body
      ? 'body'
      : `${document.activeElement.tagName} "${(document.activeElement.innerText || '').trim().slice(0, 25)}"`,
  }))
  return { triggerText, ...inside, escapeClosed: after.closed, focusReturnedTo: after.focused }
})()

await ctx.close()

// ---- phone: touch targets ------------------------------------------------------
const mctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true })
const mp = await mctx.newPage()
for (const path of PAGES) {
  await mp.goto(`${BASE}${path}?as=vc`, { waitUntil: 'networkidle' })
  await mp.waitForTimeout(400)
  const small = await mp.evaluate(() => {
    const sel = 'a[href], button, input, select, textarea, [role="button"], [role="tab"], [role="switch"]'
    const bad = []
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden' || s.display === 'none') continue
      if (r.width < 44 || r.height < 44) {
        bad.push({
          tag: el.tagName,
          w: Math.round(r.width), h: Math.round(r.height),
          name: (el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 28),
          cls: el.className?.toString?.().slice(0, 40),
        })
      }
    }
    return bad
  })
  if (small.length) out.smallTargets.push({ path, count: small.length, sample: small.slice(0, 4) })
}
await mctx.close()
await browser.close()

const show = (k) => { console.log(`\n## ${k} (${out[k].length})`); out[k].forEach((r) => console.log(' ', JSON.stringify(r))) }
console.log('=== UX audit pass 1 ===')
show('skipLink'); show('noFocusRing'); show('unnamed'); show('tabOrder'); show('smallTargets')
console.log('\n## focus after client-side nav\n ', navResult)
console.log('\n## modal behaviour\n ', JSON.stringify(modalResult, null, 2))
