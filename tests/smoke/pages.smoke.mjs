/**
 * 页面级冒烟回归（Playwright + 本机 Edge/Chrome，无需下载浏览器）
 * ------------------------------------------------------------
 * 目的：用一条命令快速确认「核心页面还能打开、关键文案还在」，
 *      防止改公共模块（store / request / 同步层）时把页面整体打挂。
 *
 * 前置：
 *   1) 前端 dev server 已启动：cd frontend && npm run dev:h5  (8080)
 *   2) 后端已启动：http://127.0.0.1:8000
 *
 * 运行：
 *   npm run test:smoke
 *
 * 可选环境变量：
 *   SMOKE_BASE   前端地址，默认 http://127.0.0.1:8080
 *   SMOKE_API    后端地址，默认 http://127.0.0.1:8000
 *   SMOKE_USER   测试账号，默认 idea_test_a
 *   SMOKE_PASS   测试密码，默认 test123456
 *
 * 说明：
 *   - 只读：不点购买、不发帖、不改设置，不会污染测试账号数据；
 *   - 页面控制台错误只统计不判失败（uni-app 开发模式噪音较多），
 *     真正的失败条件是：页面没渲染出内容 / 关键文案缺失 / 导航异常。
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ARTIFACT_DIR = path.join(__dirname, '.artifacts')

const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:8080'
const API = process.env.SMOKE_API || 'http://127.0.0.1:8000'
const USER = process.env.SMOKE_USER || 'idea_test_a'
const PASS = process.env.SMOKE_PASS || 'test123456'

// 页面清单：path 对应 pages.json 里的路径；expect 为必须出现的文案
const PAGES = [
  { name: '首页', path: 'pages/index/index', expect: [] },
  { name: '每日盲盒', path: 'pages/box/box', expect: ['每日盲盒'] },
  { name: '碎片图鉴', path: 'pages/fragment/fragment', expect: ['碎片图鉴'] },
  { name: '往期明信片', path: 'pages/postcard/postcard', expect: ['往期明信片'] },
  { name: '时光胶囊', path: 'pages/capsule/capsule', expect: ['时光胶囊'] },
  { name: '商城', path: 'pages/mall/mall', expect: ['MY COINS'] },
  { name: '数据统计', path: 'pages/stats/stats', expect: ['数据统计'] },
  { name: '情绪树洞', path: 'pages/emotion/emotion', expect: ['情绪树洞'] },
  { name: '一起专注', path: 'pages/focus/focus-home', expect: ['一起专注'] },
  { name: '心流天地', path: 'pages/activity/activity', expect: ['心流天地'] },
  { name: '通知中心', path: 'pages/newfunc/notification-center', expect: [] },
]

function log(msg) {
  console.log(msg)
}

async function checkUp(name, url) {
  try {
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    log(`[前置] ${name} 可用：${url}`)
    return true
  } catch (e) {
    log(`[前置] ${name} 不可用：${url}（${e.message}）`)
    return false
  }
}

async function login() {
  try {
    const res = await fetch(`${API}/api/v1/auth/login-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USER, password: PASS }),
    })
    const body = await res.json()
    const token = body && body.data && body.data.access_token
    if (res.ok && body.code === 200 && token) {
      log(`[登录] 成功：${USER}`)
      return { token, username: USER }
    }
    log(`[登录] 失败：HTTP ${res.status} / ${body && body.message}`)
  } catch (e) {
    log(`[登录] 异常：${e.message}`)
  }
  return null
}

async function launchBrowser() {
  const candidates = [
    { channel: 'msedge' },
    { executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' },
    { channel: 'chrome' },
    { executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
  ]
  for (const opt of candidates) {
    try {
      const browser = await chromium.launch({ headless: true, ...opt })
      log(`[浏览器] 启动成功：${opt.channel || opt.executablePath}`)
      return browser
    } catch (e) {
      // 继续尝试下一个
    }
  }
  throw new Error('未找到可用的本机 Edge / Chrome，请安装其中之一')
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function main() {
  log(`[冒烟] 前端 ${BASE} / 后端 ${API}`)

  const frontendUp = await checkUp('前端 dev server', BASE)
  if (!frontendUp) {
    log('请先运行：cd frontend && npm run dev:h5')
    process.exit(1)
  }
  const apiUp = await checkUp('后端', `${API}/health`)
  if (!apiUp) {
    log('请先启动后端：cd server && python -m uvicorn app.main:app --port 8000')
    process.exit(1)
  }

  const auth = await login()
  const browser = await launchBrowser()
  const context = await browser.newContext({ viewport: { width: 430, height: 900 } })

  if (auth) {
    // uni-app H5 的 setStorageSync 对字符串是原样写入 localStorage，
    // 因此这里直接写入 Vuex 的持久化 key，页面启动时会从 storage 恢复登录态。
    await context.addInitScript(({ token, username }) => {
      const state = {
        token,
        username,
        userInfo: { nickname: username, avatar: '', phone: '', registerTime: '', signature: '' },
        quizCompleted: true,
      }
      localStorage.setItem('ahp_user_state', JSON.stringify(state))
      localStorage.setItem('quiz_completed_' + username, 'true')
      localStorage.setItem('guide_onboarding_done_' + username, 'true')
      localStorage.setItem('guide_onboarding_done', 'true')
    }, auth)
  } else {
    log('[登录] 跳过注入，按游客态检查页面（部分页面可能是登录引导）')
  }

  const results = []
  const consoleErrorSamples = []

  for (const item of PAGES) {
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e && e.message || e)))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    const url = `${BASE}/#/${item.path}`
    let ok = true
    let reason = ''
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForFunction(() => {
        const body = document.body
        return body && body.innerText && body.innerText.trim().length > 20
      }, { timeout: 15000 })
      // 等异步接口渲染（页面 onShow 会拉数据）
      await page.waitForTimeout(1200)

      const text = await page.locator('body').innerText()
      for (const expect of item.expect) {
        if (!new RegExp(escapeReg(expect)).test(text)) {
          ok = false
          reason = `缺少文案「${expect}」`
          break
        }
      }
      if (ok && text.trim().length < 20) {
        ok = false
        reason = '页面内容为空'
      }
    } catch (e) {
      ok = false
      reason = `渲染/导航失败：${e.message}`
    }

    if (!ok) {
      try {
        fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
        await page.screenshot({ path: path.join(ARTIFACT_DIR, `${item.name}.png`), fullPage: false })
      } catch (e) { /* 截图失败忽略 */ }
    }

    if (errors.length) {
      consoleErrorSamples.push(`[${item.name}] ${errors.slice(0, 2).join(' | ')}`)
    }

    results.push({ name: item.name, path: item.path, ok, reason, errors: errors.length })
    log(`${ok ? 'PASS' : 'FAIL'}  ${item.name.padEnd(6, ' ')} (${item.path})${reason ? ' -> ' + reason : ''}`)
    await page.close()
  }

  await context.close()
  await browser.close()

  const failed = results.filter((r) => !r.ok)
  log('')
  log(`[结果] 通过 ${results.length - failed.length}/${results.length}`)
  if (consoleErrorSamples.length) {
    log(`[控制台错误] ${consoleErrorSamples.length} 个页面有 error 日志（仅记录，不判失败）：`)
    consoleErrorSamples.slice(0, 8).forEach((s) => log('  - ' + s))
  }
  if (failed.length) {
    log(`[截图] 失败页面截图目录：${ARTIFACT_DIR}`)
    process.exit(1)
  }
  process.exit(0)
}

main().catch((e) => {
  console.error('[冒烟] 未捕获异常：', e)
  process.exit(1)
})
