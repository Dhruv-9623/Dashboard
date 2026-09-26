/**
 * Loads every page at desktop and phone width and reports only the problems:
 * console errors, horizontal overflow, a missing page heading.
 *
 *   npm run dev:mock -- --port 3100
 *   node e2e/sweep.mjs                 # or APP_URL=http://localhost:3002 node e2e/sweep.mjs
 *
 * Cheap enough to run after any change to the design system, which is the point:
 * a token edit can break a page nobody thought to open.
 */
import { chromium } from 'playwright'

const BASE = process.env.APP_URL ?? 'http://localhost:3100'
const pages = [
  '/dashboard', '/insights', '/deal-flow', '/deal-triage', '/pool', '/outreach',
  '/investments', '/conflict-sentinel', '/pulse', '/discover', '/messages',
  '/wishlist', '/events', '/signals', '/suggestions', '/settings', '/compare',
]

const browser = await chromium.launch()
const results = []

for (const width of [1440, 375]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 120)))

  for (const path of pages) {
    errors.length = 0
    await page.goto(`${BASE}${path}?as=vc`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    const heading = await page.locator('h1').first().innerText().catch(() => '')
    results.push({ width, path, heading: heading.slice(0, 32), overflow, errors: [...errors] })
  }
  await context.close()
}

await browser.close()
const bad = results.filter((r) => r.overflow || r.errors.length > 0 || !r.heading)
console.log(`${results.length} page loads, ${bad.length} with problems`)
for (const row of bad) console.log(JSON.stringify(row))
