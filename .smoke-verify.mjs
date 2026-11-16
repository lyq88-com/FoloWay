import { chromium } from 'playwright-core'
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:8080'
const API = 'http://127.0.0.1:8000'
const OUT = 'c:\\Users\\小青\\Desktop\\新建文件夹\\.screenshots'

async function login() {
  const res = await fetch(`${API}/api/v1/auth/login-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'idea_test_a', password: 'test123456' })
  })
  const body = await res.json()
  const token = body && body.data && body.data.access_token
  return token ? { token, username: 'idea_test_a' } : null
}

const pages = [
  ['home', 'pages/index/index'],
  ['profile', 'pages/profile/profile'],
  ['postcard-gallery', 'pages/postcard-gallery/postcard-gallery'],
  ['records', 'pages/records/records'],
  ['postcard', 'pages/postcard/postcard'],
  ['discover', 'pages/discover/discover']
]

const auth = await login()
console.log('[login]', auth ? 'ok' : 'failed')

const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
if (auth) {
  await context.addInitScript(({ token, username }) => {
    const state = {
      token,
      username,
      userInfo: { nickname: username, avatar: '', phone: '', registerTime: '', signature: '' },
      quizCompleted: true
    }
    localStorage.setItem('ahp_user_state', JSON.stringify(state))
    localStorage.setItem('quiz_completed_' + username, 'true')
    localStorage.setItem('guide_onboarding_done_' + username, 'true')
    localStorage.setItem('guide_onboarding_done', 'true')
  }, auth)
}

for (const [name, path] of pages) {
  const page = await context.newPage()
  const errs = []
  page.on('pageerror', e => errs.push(String(e.message || e)))
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('response', r => {
    const u = r.url()
    if (/\.(png|jpe?g|webp|svg)(\?|$)/i.test(u) && r.status() >= 400) errs.push('IMG ' + r.status() + ' ' + u)
  })
  try {
    await page.goto(`${BASE}/#/${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2600)
    await page.screenshot({ path: `${OUT}\\verify_${name}.png`, fullPage: false })
    const badImgs = await page.evaluate(() => Array.from(document.querySelectorAll('img')).filter(i => i.complete && i.naturalWidth === 0).length)
    console.log(`[${name}] ok, broken-imgs=${badImgs}, errors=${errs.length}`)
    errs.slice(0, 3).forEach(e => console.log('   ', e.slice(0, 160)))
  } catch (e) {
    console.log(`[${name}] FAIL`, e.message)
  }
  await page.close()
}

await context.close()
await browser.close()
