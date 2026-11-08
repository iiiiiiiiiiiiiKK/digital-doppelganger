/**
 * Production verification against the LIVE GitHub Pages deployment.
 * Run after deploy-pages.yml succeeds:
 *   E2E_LIVE=https://<user>.github.io/<repo>/ node scripts/e2e-live.mjs
 *
 * Verifies the real deployed bundle (not a local preview): assets resolve,
 * the app boots, the 𝕏 author link is present in production HTML, a profile
 * can be created, memory + chat + decision flows work, mobile layout is clean,
 * and no console/page errors occur.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.E2E_LIVE
if (!BASE) {
  console.error('E2E_LIVE is required, e.g. https://user.github.io/repo/')
  process.exit(1)
}

const OUT = path.resolve('e2e-artifacts-live')
fs.mkdirSync(OUT, { recursive: true })

const PROXY = process.env.E2E_LIVE_PROXY
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p))

const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  ...(PROXY ? { proxy: { server: PROXY } } : {}),
})

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const consoleErrors = []
const pageErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => pageErrors.push(e.message))

// ---- production asset verification ----
const response = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
record('live site returns HTTP 200', response?.status() === 200, `status=${response?.status()}`)

const title = await page.title()
record('live title is the product title', title.includes('Digital Doppelgänger'), title)

const basePath = new URL(BASE).pathname
const assetStatuses = await page.evaluate(async () => {
  const out = []
  for (const el of document.querySelectorAll('script[src], link[rel=stylesheet]')) {
    const raw = el.getAttribute('src') || el.getAttribute('href')
    if (!raw) continue
    const url = new URL(raw, location.href)
    if (url.origin !== location.origin) continue
    const res = await fetch(url.href, { method: 'GET' })
    out.push({ url: url.pathname, status: res.status })
  }
  return out
})
record(
  'live CSS/JS assets resolve under the Pages base path',
  assetStatuses.length >= 2 && assetStatuses.every((a) => a.status === 200 && a.url.startsWith(basePath)),
  JSON.stringify(assetStatuses),
)

// ---- boot ----
await page.waitForSelector('text=ME, BUT', { timeout: 30000 })
record('app boots on the live deployment', true)

const xLink = page.locator('a[href="https://x.com/0xkillcoin"]').first()
record('live: author 𝕏 link present', (await xLink.count()) > 0)
record('live: X link renders 𝕏 glyph', ((await xLink.textContent()) ?? '').includes('𝕏'))
record(
  'live: X link opens in a new tab with noopener',
  ((await xLink.getAttribute('rel')) ?? '').includes('noopener') && (await xLink.getAttribute('target')) === '_blank',
)
await page.screenshot({ path: path.join(OUT, 'live-01-landing.png'), fullPage: true })

// ---- create a profile end to end on production ----
await page.getByRole('button', { name: /创建我的数字分身|Create my doppelgänger/ }).first().click()
await page.waitForSelector('#wz-nick')
await page.fill('#wz-nick', 'LiveCheck')
await page.fill('#wz-bio', '生产环境验证：独立开发者，做交易工具。')
await page.fill('#wz-field', 'software')
await page.getByRole('button', { name: /下一步|Next/ }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /技术|Technology/ }).first().click()
await page.getByRole('button', { name: /下一步|Next/ }).click()
await page.waitForSelector('input[type=range]')
await page.getByRole('button', { name: /下一步|Next/ }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /理性分析|Rational/ }).first().click()
await page.getByRole('button', { name: /下一步|Next/ }).click()
await page.waitForSelector('#wz-seed')
await page.fill('#wz-seed', '我在 2023 年辞职，全职做独立产品。')
await page.getByRole('button', { name: /添加一条|Add one/ }).click()
await page.getByRole('button', { name: /下一步|Next/ }).click()
await page.waitForSelector('text=PREVIEW')
await page.getByRole('button', { name: /创建我的数字分身|Create my doppelgänger/ }).click()
await page.waitForURL(/overview/, { timeout: 30000 })
record('live: wizard creates a doppelgänger', true)
await page.screenshot({ path: path.join(OUT, 'live-02-overview.png'), fullPage: true })

// ---- memory ----
await page.getByRole('link', { name: /记忆实验室|Memory Lab/ }).first().click()
await page.waitForTimeout(500)
record('live: seed memory persisted', (await page.getByText('2023 年辞职').count()) > 0)
await page.getByRole('button', { name: /新增记忆|Add memory/ }).first().click()
await page.fill('#mem-content', '我拒绝了低薪高股权的创业邀请。')
await page.getByRole('button', { name: /^保存$|^Save$/ }).click()
await page.waitForTimeout(600)
record('live: memory creation works', (await page.getByText('我拒绝了低薪高股权的创业邀请').count()) > 0)

// ---- chat ----
await page.getByRole('link', { name: /^对话$|^Chat$/ }).first().click()
await page.waitForTimeout(500)
await page.fill('textarea', '有个创业邀请薪水很低但有股份，我该去吗？')
await page.getByRole('button', { name: /^发送$|^Send$/ }).click()
await page.waitForSelector('text=回答依据', { timeout: 30000 })
record('live: chat answers with citation block', true)
await page.screenshot({ path: path.join(OUT, 'live-03-chat.png'), fullPage: true })

// ---- decision ----
await page.getByRole('link', { name: /决策模拟/ }).first().click()
await page.waitForTimeout(500)
await page.getByText('有人邀请你加入一个早期创业项目').first().click()
await page.waitForSelector('text=分身预测已锁定')
record('live: prediction locked before answer', true)
await page.locator('button[aria-pressed]').first().click()
await page.getByRole('button', { name: /提交并对比|Submit and compare/ }).click()
await page.waitForTimeout(700)
record(
  'live: comparison rendered',
  (await page.getByText('一致').count()) + (await page.getByText('不一致').count()) > 0,
)
await page.screenshot({ path: path.join(OUT, 'live-04-decisions.png'), fullPage: true })

// ---- persistence across reload on production ----
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(900)
const persisted = await page.evaluate(async () => {
  const dbs = await indexedDB.databases()
  return dbs.map((d) => d.name)
})
record('live: IndexedDB persists across reload', persisted.includes('digital-doppelganger'), JSON.stringify(persisted))
const appHash = await page.evaluate(() => window.location.hash)
const inApp = ['#/overview', '#/memory', '#/chat', '#/decisions', '#/similarity', '#/evolution', '#/gallery', '#/settings', '#/ask'].includes(
  appHash.split('?')[0],
)
record('live: reload keeps the user inside the app', inApp, appHash)

// ---- mobile viewport on production ----
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const mPage = await mobile.newPage()
const mErrors = []
mPage.on('pageerror', (e) => mErrors.push(e.message))
await mPage.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
await mPage.waitForSelector('text=ME, BUT', { timeout: 30000 })
const mOverflow = await mPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
record('live mobile: no horizontal overflow', mOverflow <= 1, `overflow=${mOverflow}px`)
record('live mobile: author 𝕏 link visible', (await mPage.locator('a[href="https://x.com/0xkillcoin"]').count()) > 0)
await mPage.screenshot({ path: path.join(OUT, 'live-05-mobile.png'), fullPage: true })
record('live mobile: no uncaught page errors', mErrors.length === 0, mErrors.join(' | '))

// ---- error hygiene ----
const realErrors = consoleErrors.filter(
  (e) => !e.includes('favicon') && !e.includes('fonts.g') && !e.includes('Failed to load resource'),
)
record('live: no uncaught page errors (desktop)', pageErrors.length === 0, pageErrors.join(' | '))
record('live: no console errors (desktop)', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))

await browser.close()

const failed = results.filter((r) => !r.ok)
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
console.log(`\n${results.length - failed.length}/${results.length} live checks passed`)
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join(', '))
  process.exit(1)
}
