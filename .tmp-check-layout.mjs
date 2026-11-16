import { chromium } from 'playwright-core'

const BASE = 'http://127.0.0.1:8080'
const OUT = 'c:\\Users\\小青\\Desktop\\新建文件夹\\.screenshots'
const sizes = {
  phone: { width: 390, height: 844 }
}
const pages = [
  ['role-select', 'pages/role-select/role-select'],
  ['profile', 'pages/profile/profile'],
  ['home', 'pages/index/index']
]

const browser = await chromium.launch({ channel: 'msedge' })
for (const [sizeName, viewport] of Object.entries(sizes)) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await context.addInitScript(() => {
    const state = {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyOTciLCJleHAiOjE3OTU0NDE0NDksImlhdCI6MTc5NDgzNjY0OSwidHlwZSI6ImFjY2VzcyJ9.PsMr2mXfAi02XE6pFPmw2nCqZh6sdEo9nRirF3CCL4A',
      username: 'layoutdemo',
      userInfo: { id: 297, username: 'layoutdemo', nickname: '小青', avatar: '', phone: '', registerTime: '', signature: '' },
      quizCompleted: true
    }
    localStorage.setItem('ahp_user_state', JSON.stringify(state))
    localStorage.setItem('ai_partner_id', 'linxi')
    localStorage.setItem('quiz_completed_layoutdemo', 'true')
    localStorage.setItem('quiz_completed_demo', 'true')
    localStorage.setItem('guide_onboarding_done_layoutdemo', 'true')
  })
  for (const [name, path] of pages) {
    const page = await context.newPage()
    const errs = []
    page.on('pageerror', e => errs.push(String(e.message || e)))
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await page.goto(`${BASE}/#/${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await page.waitForTimeout(3000)
        await page.screenshot({ path: `${OUT}\\chk_${sizeName}_${name}.png`, animations: 'disabled', timeout: 60000 })
        console.log(sizeName, name, 'ok', errs.length ? ('ERR:' + errs.slice(0, 2).join(' | ')) : '')
        break
      } catch (e) {
        if (attempt === 2) console.log(sizeName, name, 'FAIL', String(e.message || e))
        else await page.waitForTimeout(3000)
      }
    }
    await page.close()
  }
  await context.close()
}
await browser.close()
