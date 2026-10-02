/**
 * One screenshot of one URL, so a change can be looked at instead of assumed.
 *
 *   node e2e/shoot.mjs "http://localhost:3100/dashboard?as=vc" /tmp/dash.png [width] [height]
 *
 * Prints the page title and any console errors alongside it.
 */
import { chromium } from 'playwright'

const [url, out, w = 1440, h = 980] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1600)
await page.screenshot({ path: out, fullPage: false })
console.log(JSON.stringify({ title: await page.title(), errors }, null, 1))
await browser.close()
