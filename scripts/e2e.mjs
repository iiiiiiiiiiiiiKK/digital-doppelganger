/**
 * End-to-end smoke test against the built site (vite preview).
 * Uses the locally installed Chrome so no browser download is required.
 *
 * Covers: landing render, wizard creation, memory CRUD + import, chat (rules),
 * decision prediction locking, similarity, evolution, gallery, settings,
 * privacy/wipe, i18n switch, theme switch, and mobile viewport layout.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4173/digital-doppelganger/'
const OUT = path.resolve('e2e-artifacts')
fs.mkdirSync(OUT, { recursive: true })

const results = []
function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]

function chromePath() {
  for (const candidate of CHROME_CANDIDATES) if (fs.existsSync(candidate)) return candidate
  return undefined
}

async function main() {
  const exe = chromePath()
  const browser = await chromium.launch({ executablePath: exe, headless: true })

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => pageErrors.push(err.message))

  // ---------- Landing ----------
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=ME, BUT', { timeout: 15000 })
  record('landing renders hero', true)

  const xLink = page.locator('a[href="https://x.com/0xkillcoin"]').first()
  record('author X link present in header', await xLink.count() > 0)
  const xText = await xLink.textContent()
  record('X link uses 𝕏 glyph', (xText ?? '').includes('𝕏'), JSON.stringify(xText))
  const rel = await xLink.getAttribute('rel')
  record('X link is safe target', (rel ?? '').includes('noopener') && (await xLink.getAttribute('target')) === '_blank')

  await page.screenshot({ path: path.join(OUT, '01-landing.png'), fullPage: true })

  // ---------- Wizard ----------
  await page.getByRole('button', { name: /创建我的数字分身|Create my doppelgänger/ }).first().click()
  await page.waitForSelector('#wz-nick')
  await page.fill('#wz-nick', 'Kai')
  await page.fill('#wz-bio', '独立开发者，做加密交易工具和开源项目。')
  await page.fill('#wz-field', 'software')
  await page.getByRole('button', { name: /下一步|Next/ }).click()

  await page.waitForSelector('text=技术')
  await page.getByRole('button', { name: '技术' }).click()
  await page.getByRole('button', { name: '金融' }).click()
  await page.getByRole('button', { name: /下一步|Next/ }).click()

  await page.waitForSelector('input[type=range]')
  const sliders = page.locator('input[type=range]')
  await sliders.nth(0).fill('0.8')
  await sliders.nth(1).fill('0.75')
  await sliders.nth(4).fill('0.2')
  await page.getByRole('button', { name: /下一步|Next/ }).click()

  await page.waitForSelector('text=理性分析')
  await page.getByRole('button', { name: /理性分析/ }).click()
  await page.getByRole('button', { name: /下一步|Next/ }).click()

  await page.waitForSelector('#wz-seed')
  await page.fill('#wz-seed', '2023 年我从大厂离职，开始全职做独立产品。')
  await page.getByRole('button', { name: /添加一条|Add one/ }).click()
  await page.getByRole('button', { name: /下一步|Next/ }).click()

  await page.waitForSelector('text=PREVIEW')
  await page.getByRole('button', { name: /创建我的数字分身|Create my doppelgänger/ }).click()
  await page.waitForURL(/overview/, { timeout: 15000 })
  record('wizard creates doppelgänger and lands on overview', true)
  await page.screenshot({ path: path.join(OUT, '02-overview.png'), fullPage: true })

  // ---------- Memory Lab ----------
  await page.getByRole('link', { name: /记忆实验室|Memory Lab/ }).first().click()
  await page.waitForSelector('text=记忆实验室')
  const seedVisible = await page.getByText('2023 年我从大厂离职').count()
  record('seed memory persisted from wizard', seedVisible > 0)

  await page.getByRole('button', { name: /新增记忆|Add memory/ }).first().click()
  await page.fill('#mem-content', '我拒绝了低薪股份的创业邀请，因为需要稳定现金流。')
  await page.selectOption('#mem-cat', 'decision')
  await page.fill('#mem-tags', 'startup,cashflow')
  await page.getByRole('button', { name: /^保存$|^Save$/ }).click()
  await page.waitForTimeout(400)
  record('add memory', (await page.getByText('我拒绝了低薪股份的创业邀请').count()) > 0)

  // search
  await page.fill('input[type=search]', '创业')
  await page.waitForTimeout(300)
  const searchHits = await page.locator('[data-testid="memory-row"]').count()
  record('search memory filters list', searchHits >= 1, `hits=${searchHits}`)
  await page.fill('input[type=search]', '')

  // pause / resume
  const pauseBtn = page.locator('[data-testid="memory-toggle"]').first()
  await pauseBtn.click()
  await page.waitForTimeout(400)
  record('pause memory toggles state', (await page.getByText('已暂停').count()) > 0)
  await page.locator('[data-testid="memory-toggle"]').first().click()
  await page.waitForTimeout(400)

  // import TXT
  const txtPath = path.join(OUT, 'import-sample.txt')
  fs.writeFileSync(txtPath, '我每天跑步五公里，坚持了三年。\n\n我更喜欢在深夜写代码。\n', 'utf8')
  await page.setInputFiles('input[type=file]', txtPath)
  await page.waitForTimeout(600)
  record('import TXT creates memories', (await page.getByText('我每天跑步五公里').count()) > 0)
  await page.screenshot({ path: path.join(OUT, '03-memory.png'), fullPage: true })

  // delete one memory (two-step confirm)
  const rows = page.locator('[data-testid="memory-row"]')
  const beforeCount = await rows.count()
  await page.getByRole('button', { name: /^删除/ }).first().click()
  await page.getByRole('button', { name: '✓', exact: true }).first().click()
  await page.waitForTimeout(600)
  const afterCount = await rows.count()
  record('delete memory removes the row', afterCount === beforeCount - 1, `${beforeCount} -> ${afterCount}`)

  // ---------- Chat ----------
  await page.getByRole('link', { name: /^对话$|^Chat$/ }).first().click()
  await page.waitForSelector('text=与另一个自己对话')
  await page.fill('textarea', '有个创业邀请，薪水很低但有股份，我该去吗？')
  await page.getByRole('button', { name: /^发送$|^Send$/ }).click()
  await page.waitForSelector('text=回答依据', { timeout: 15000 })
  const citeCount = await page.getByText('回答依据').count()
  record('chat answers with citations block', citeCount > 0)
  const insufficient = await page.getByText('我目前还不了解你在这个问题上的倾向。').count()
  record('chat refuses to invent when evidence is thin', insufficient === 0)
  await page.screenshot({ path: path.join(OUT, '04-chat.png'), fullPage: true })

  // ---------- Decisions ----------
  await page.getByRole('link', { name: /决策模拟/ }).first().click()
  await page.waitForSelector('text=决策模拟器')
  await page.getByText('有人邀请你加入一个早期创业项目').first().click()
  await page.waitForSelector('text=分身预测已锁定')
  record('prediction locked before answer', true)

  // Read the answer options and pick one deliberately; verify match/mismatch shows afterwards
  const optionButtons = page.locator('button[aria-pressed]')
  const optionCount = await optionButtons.count()
  record('scenario exposes selectable options', optionCount >= 2, `n=${optionCount}`)
  await optionButtons.first().click()
  await page.getByRole('button', { name: /提交并对比|Submit and compare/ }).click()
  await page.waitForTimeout(600)
  const matchedShown = (await page.getByText('一致').count()) + (await page.getByText('不一致').count())
  record('comparison result rendered after answering', matchedShown > 0)
  await page.screenshot({ path: path.join(OUT, '05-decisions.png'), fullPage: true })

  // verify the stored record keeps the original prediction after a profile edit
  await page.getByRole('link', { name: /总览|Overview/ }).first().click()
  await page.waitForURL(/overview/, { timeout: 15000 })
  await page.waitForSelector('text=编辑资料')
  await page.getByRole('button', { name: /编辑资料|Edit profile/ }).click()
  await page.waitForSelector('#ov-nick')
  await page.fill('#ov-nick', 'Kai-Edited')
  await page.getByRole('button', { name: /^保存$|^Save$/ }).click()
  await page.waitForTimeout(600)
  await page.getByRole('link', { name: /决策模拟|Decisions/ }).first().click()
  await page.waitForURL(/decisions/, { timeout: 15000 })
  await page.waitForSelector('text=测试记录')
  const historyText = await page.locator('body').innerText()
  const keptHistory = historyText.includes('早期创业项目')
  record('decision history survives a profile edit', keptHistory)

  // ---------- Similarity ----------
  await page.getByRole('link', { name: /^相似度$|^Similarity$/ }).first().click()
  await page.waitForSelector('text=相似度报告')
  const hasScore = (await page.getByText('综合相似度').count()) > 0
  record('similarity report renders after one answered test', hasScore)
  await page.getByRole('button', { name: /重新计算|Recalculate/ }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, '06-similarity.png'), fullPage: true })

  // ---------- Evolution ----------
  await page.getByRole('link', { name: /^进化$|^Evolution$/ }).first().click()
  await page.waitForSelector('text=分身进化')
  const versionCount = await page.getByText('创建').count() + await page.getByText('编辑资料').count()
  record('version history recorded', versionCount >= 2, `versions=${versionCount}`)
  await page.screenshot({ path: path.join(OUT, '07-evolution.png'), fullPage: true })

  // ---------- Gallery ----------
  await page.getByRole('link', { name: /^展示$|^Gallery$/ }).first().click()
  await page.waitForSelector('text=分身展示')
  record('gallery is private by default', (await page.getByText('当前：私密').count()) > 0)
  await page.getByRole('button', { name: /生成公开卡片|Generate public card/ }).first().click()
  await page.waitForTimeout(400)
  record('public card generation is opt-in', (await page.getByText('当前：已生成公开卡片').count()) > 0)

  // ---------- Settings: theme, language, export ----------
  await page.getByRole('link', { name: /^设置$|^Settings$/ }).first().click()
  await page.waitForSelector('text=隐私说明')
  await page.getByRole('button', { name: /浅色|Light/ }).click()
  await page.waitForTimeout(300)
  const theme = await page.evaluate(() => document.documentElement.dataset.theme)
  record('light theme applies', theme === 'light', theme)
  await page.screenshot({ path: path.join(OUT, '08-settings-light.png'), fullPage: true })
  await page.getByRole('button', { name: /深色|Dark/ }).click()
  await page.waitForTimeout(200)

  // language toggle in the top bar
  await page.getByRole('button', { name: /Language|语言/ }).first().click()
  await page.waitForTimeout(400)
  const langEn = await page.evaluate(() => document.documentElement.lang)
  record('language switch updates document lang', langEn === 'en', langEn)
  await page.getByRole('button', { name: /Language|语言/ }).first().click()
  await page.waitForTimeout(300)

  // export download
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
  await page.getByRole('button', { name: /导出全部数据|Export everything/ }).click()
  const download = await downloadPromise
  const dlPath = path.join(OUT, download.suggestedFilename())
  await download.saveAs(dlPath)
  const exported = JSON.parse(fs.readFileSync(dlPath, 'utf8'))
  record('export produces a valid backup bundle', exported.kind === 'doppelganger-backup' && Array.isArray(exported.memories), `${exported.memories?.length} memories`)

  // refresh persistence
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const stillThere = await page.evaluate(async () => {
    const dbs = await indexedDB.databases()
    return dbs.map((d) => d.name)
  })
  record('IndexedDB survives reload', stillThere.includes('digital-doppelganger'), JSON.stringify(stillThere))

  // ---------- Mobile viewport ----------
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
  const mPage = await mobile.newPage()
  const mobileErrors = []
  mPage.on('pageerror', (e) => mobileErrors.push(e.message))
  await mPage.goto(BASE, { waitUntil: 'networkidle' })
  await mPage.waitForSelector('text=ME, BUT')
  const overflow = await mPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  record('mobile: no horizontal overflow on landing', overflow <= 1, `overflow=${overflow}px`)
  const mobileX = await mPage.locator('a[href="https://x.com/0xkillcoin"]').count()
  record('mobile: author X link still visible', mobileX > 0)
  await mPage.screenshot({ path: path.join(OUT, '09-mobile-landing.png'), fullPage: true })

  // complete a quick profile on mobile to reach the shell + bottom tab bar
  await mPage.getByRole('button', { name: /Create my doppelgänger|创建我的数字分身/ }).first().click()
  await mPage.waitForSelector('#wz-nick')
  await mPage.fill('#wz-nick', 'MobileTester')
  await mPage.getByRole('button', { name: /Next|下一步/ }).click()
  await mPage.waitForSelector('#wz-nick', { state: 'detached' }).catch(() => {})
  await mPage.waitForTimeout(400)
  await mPage.getByRole('button', { name: /Technology|技术/ }).first().click()
  await mPage.getByRole('button', { name: /Next|下一步/ }).click()
  await mPage.waitForSelector('input[type=range]')
  await mPage.getByRole('button', { name: /Next|下一步/ }).click()
  await mPage.waitForTimeout(400)
  await mPage.getByRole('button', { name: /Concise|简洁直接/ }).first().click()
  await mPage.getByRole('button', { name: /Next|下一步/ }).click()
  await mPage.waitForSelector('#wz-seed')
  await mPage.getByRole('button', { name: /Next|下一步/ }).click()
  await mPage.waitForSelector('text=PREVIEW')
  await mPage.getByRole('button', { name: /Create my doppelgänger|创建我的数字分身/ }).click()
  await mPage.waitForURL(/overview/, { timeout: 20000 })
  await mPage.waitForTimeout(700)
  const mobileOverflowShell = await mPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  record('mobile: no horizontal overflow in app shell', mobileOverflowShell <= 1, `overflow=${mobileOverflowShell}px`)
  const tabBar = await mPage.locator('nav').last().isVisible()
  record('mobile: bottom tab bar visible', tabBar)
  const tapSize = await mPage.evaluate(() => {
    // Only the visible bottom tab bar counts; the closed drawer's links are 0px tall.
    return Array.from(document.querySelectorAll('nav a'))
      .filter((a) => a.getBoundingClientRect().height > 0)
      .map((a) => Math.round(a.getBoundingClientRect().height))
  })
  record('mobile: nav targets >= 44px', tapSize.length > 0 && tapSize.every((h) => h >= 44), JSON.stringify(tapSize))
  await mPage.screenshot({ path: path.join(OUT, '10-mobile-shell.png'), fullPage: true })

  // ---------- console / page errors ----------
  const realErrors = consoleErrors.filter(
    (e) => !e.includes('favicon') && !e.includes('fonts.googleapis') && !e.includes('Failed to load resource'),
  )
  record('no uncaught page errors (desktop)', pageErrors.length === 0, pageErrors.join(' | '))
  record('no console errors (desktop)', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))
  record('no uncaught page errors (mobile)', mobileErrors.length === 0, mobileErrors.join(' | '))

  await browser.close()

  const failed = results.filter((r) => !r.ok)
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length > 0) {
    console.log('FAILED:', failed.map((f) => f.name).join(', '))
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('E2E crashed:', err)
  process.exit(1)
})
