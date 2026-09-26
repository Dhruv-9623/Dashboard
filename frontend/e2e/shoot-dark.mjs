/**
 * As shoot.mjs, but with the dark theme stored before the page loads — the token
 * system is a variable swap, so this is the whole of what dark mode needs to be
 * checked against.
 */
import { chromium } from 'playwright'

const [url, out, w = 1440, h = 980] = process.argv.slice(2)
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 })
await context.addInitScript(() => localStorage.setItem('dashboard-theme', 'dark'))
const page = await context.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.screenshot({ path: out })
console.log(JSON.stringify({ dark: await page.evaluate(() => document.documentElement.classList.contains('dark')), errors }))
await browser.close()
