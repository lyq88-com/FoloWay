/**
 * 循途 · 微信扫码登录 + VIP会员 前端接口层（新增模块，隔离）
 *
 * 【零副作用约定】
 *   1. 本文件是新增文件，不 import 任何原有页面/组件
 *   2. 未改动 common/request.js、store、任何已有 api 模块
 *   3. 所有 demo 数据写在文件内，不依赖后端
 *
 * 【如何使用】
 *   演示/开发阶段 USE_MOCK = true（默认），界面全部可点、可跑通完整闭环；
 *   后端接口（SpringBoot 版见 xuntu-wx-vip/ 交付包）就绪后，把 USE_MOCK 改成 false 即可，
 *   前端页面无需任何改动。
 */

import { LAN_HOST } from './env'

// =====================================================================
// 配置区
// =====================================================================
export const WX_VIP_CONFIG = {
  /** true = 演示数据（无需后端）；false = 走真实接口
   *  注意：这个开关同时控制「微信扫码登录」演示，微信开放平台未接入前保持 true。 */
  useMock: true,

  /** VIP 支付是否走演示数据
   *  【2026-11-15】已接入 FastAPI /api/v1/pay/*：订单、幂等、状态机、VIP 到期时间都落在服务端，
   *  收银台仍是「模拟支付」渠道（后端 mock provider），但不再是 localStorage 假数据。 */
  vipUseMock: false,

  /** 真实接口基地址（H5 走 vite proxy 的 /api/v1，App 端走局域网绝对地址） */
  // #ifdef H5
  baseUrl: '/api/v1',
  // #endif
  // #ifndef H5
  baseUrl: (import.meta.env.VITE_WX_VIP_ORIGIN || LAN_HOST) + '/api/v1',
  // #endif
}

/** 演示模式下的本地持久化 key（VIP 状态、模拟订单） */
const DEMO_KEY = 'xuntu_vip_demo_v1'

// =====================================================================
// 演示数据 & 演示状态存取
// =====================================================================
const MOCK_PACKAGES = [
  {
    id: 1,
    name: 'VIP月卡',
    subTitle: '先体验一个月',
    price: 19.9,
    originalPrice: 29.9,
    days: 30,
    benefits: ['专属身份标识', 'AI伙伴无限对话', '限定星球场景', '成长报告导出'],
    tag: '',
    recommended: false,
  },
  {
    id: 2,
    name: 'VIP季卡',
    subTitle: '最受欢迎，性价比之选',
    price: 52.9,
    originalPrice: 89.7,
    days: 90,
    benefits: ['专属身份标识', 'AI伙伴无限对话', '限定星球场景', '成长报告导出', '专属主题皮肤', '优先新功能体验'],
    tag: '推荐',
    recommended: true,
  },
  {
    id: 3,
    name: 'VIP年卡',
    subTitle: '一年长效陪伴，超值推荐',
    price: 178.0,
    originalPrice: 358.8,
    days: 365,
    benefits: ['专属身份标识', 'AI伙伴无限对话', '限定星球场景', '成长报告导出', '专属主题皮肤', '优先新功能体验', '一对一成长顾问'],
    tag: '超值',
    recommended: false,
  },
]

function readDemo() {
  try {
    const raw = uni.getStorageSync(DEMO_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* ignore */
  }
  return { orders: {}, vipExpireAt: null, wxBound: false }
}

function writeDemo(data) {
  try {
    uni.setStorageSync(DEMO_KEY, JSON.stringify(data))
  } catch (e) {
    /* ignore */
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// 演示模式：扫码状态机
// scene -> 'WAITING' | 'SCANNED'
const mockScenes = {}

const fail = (msg, code = 500) => Promise.reject({ code, msg, message: msg })

// =====================================================================
// 环境判断
// =====================================================================
/** 是否在微信内置浏览器中（JSAPI 支付的前置条件） */
export function isWechatBrowser() {
  // #ifdef H5
  const ua = (navigator.userAgent || '').toLowerCase()
  return ua.indexOf('micromessenger') !== -1
  // #endif
  // #ifndef H5
  return false
  // #endif
}

// =====================================================================
// 一、微信登录
// =====================================================================

/** 1. 获取登录二维码 */
export async function getWxQrcode() {
  if (WX_VIP_CONFIG.useMock) {
    await delay(300)
    const scene = 'demo' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    mockScenes[scene] = 'WAITING'
    return {
      scene,
      // 真实场景是微信开放平台授权地址；演示模式下给一个占位地址用于渲染二维码图形
      authorizeUrl: 'https://open.weixin.qq.com/connect/qrconnect?appid=DEMO_MODE&scope=snsapi_login&state=' + scene,
      expireSeconds: 300,
      demo: true,
    }
  }
  return request({ url: '/wx/qrcode', method: 'GET' })
}

/** 2. 轮询扫码结果 */
export async function pollWxLogin(scene) {
  if (WX_VIP_CONFIG.useMock) {
    await delay(120)
    const state = mockScenes[scene]
    if (!state) return { status: 'EXPIRED', msg: '二维码已过期，请刷新' }
    if (state === 'WAITING') return { status: 'PENDING', msg: '等待扫码' }
    // 已被"模拟扫码"
    delete mockScenes[scene]
    const demo = readDemo()
    const firstTime = !demo.wxBound
    demo.wxBound = true
    writeDemo(demo)
    return {
      status: 'SUCCESS',
      msg: '登录成功',
      token: 'demo_token_' + Date.now(),
      newUser: firstTime,
      user: {
        id: 10001,
        username: 'wx_demo_8891',
        nickname: '微信用户',
        avatar: '',
        isVip: !!demo.vipExpireAt,
        vipExpireAt: demo.vipExpireAt,
      },
      demo: true,
    }
  }
  return request({ url: '/wx/poll', method: 'GET', data: { scene } })
}

/**
 * 3. 演示专用：模拟用户扫码成功
 *    真实环境不会调用这个方法（由后端 /wx/callback 驱动状态变化）
 */
export async function simulateScan(scene) {
  if (!scene) return
  mockScenes[scene] = 'SCANNED'
}

/** 4. 新用户决策 CREATE / BIND */
export async function decideWxUser({ scene, action }) {
  if (WX_VIP_CONFIG.useMock) {
    await delay(300)
    delete mockScenes[scene]
    return {
      status: 'SUCCESS',
      token: 'demo_token_' + Date.now(),
      newUser: action === 'CREATE',
      user: { id: 10001, username: 'wx_demo_8891', nickname: '微信用户', avatar: '', isVip: false },
      demo: true,
    }
  }
  return request({ url: '/wx/decide', method: 'POST', data: { scene, action } })
}

/** 5. 获取支付授权地址（补齐公众号 openid） */
export async function getMpAuthUrl() {
  if (WX_VIP_CONFIG.useMock) {
    await delay(200)
    return { scene: 'demoMp', authUrl: 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=DEMO', demo: true }
  }
  return request({ url: '/wx/mp-auth-url', method: 'GET' })
}

// =====================================================================
// 二、VIP 会员
// =====================================================================

/** 6. 套餐列表（展示口径；真实价格以服务端下单校验为准） */
export async function getVipPackages() {
  if (WX_VIP_CONFIG.vipUseMock) {
    await delay(300)
    return MOCK_PACKAGES
  }
  try {
    return await request({ url: '/pay/packages', method: 'GET' })
  } catch (e) {
    // 接口不可用时退回本地目录，保证页面可浏览（下单仍由服务端定价）
    return MOCK_PACKAGES
  }
}

/** 7. 创建支付订单 */
export async function createVipOrder(packageId) {
  if (WX_VIP_CONFIG.vipUseMock) {
    await delay(500)
    const pkg = MOCK_PACKAGES.find((p) => p.id === packageId)
    if (!pkg) return fail('套餐不存在')
    const orderNo = 'V' + new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14) + Math.random().toString(36).slice(2, 8).toUpperCase()
    const demo = readDemo()
    demo.orders[orderNo] = {
      orderNo,
      packageId: pkg.id,
      packageName: pkg.name,
      payAmount: Math.round(pkg.price * 100),
      days: pkg.days,
      paid: false,
      createTime: Date.now(),
    }
    writeDemo(demo)
    return { orderNo, payAmount: demo.orders[orderNo].payAmount, demo: true }
  }
  const res = await request({
    url: '/pay/orders',
    method: 'POST',
    data: { productType: 'vip', productId: String(packageId) },
  })
  // 服务端返回 {orderNo, payAmount, payParams, provider, demo...}
  return res
}

/**
 * 8. 模拟支付结果（成功 / 取消）
 *    真实渠道上线后由渠道 notify 回调驱动，这里只保留 mock 渠道的确认入口。
 */
export async function simulatePayResult(orderNo, success) {
  if (WX_VIP_CONFIG.vipUseMock) {
    await delay(600)
    const demo = readDemo()
    const order = demo.orders[orderNo]
    if (!order) return fail('订单不存在')
    if (!success) return { paid: false, orderNo }

    const now = new Date()
    const base = demo.vipExpireAt && new Date(demo.vipExpireAt) > now ? new Date(demo.vipExpireAt) : now
    const expire = new Date(base.getTime() + order.days * 86400000)
    demo.vipExpireAt = expire.toISOString()
    // 幂等演示：已支付订单再次标记也不会重复叠加
    if (!order.paid) {
      order.paid = true
      order.expireAt = demo.vipExpireAt
    }
    writeDemo(demo)
    return { paid: true, orderNo, expireAt: order.expireAt }
  }
  return request({
    url: '/pay/orders/' + encodeURIComponent(orderNo) + '/mock-pay',
    method: 'POST',
    data: { success: !!success },
  })
}

/** 9. 查询订单支付结果 */
export async function queryOrderResult(orderNo) {
  if (WX_VIP_CONFIG.vipUseMock) {
    await delay(200)
    const demo = readDemo()
    const order = demo.orders[orderNo]
    if (!order) return fail('订单不存在')
    return { orderNo, paid: !!order.paid, expireAt: order.expireAt || null }
  }
  const res = await request({ url: '/pay/orders/' + encodeURIComponent(orderNo), method: 'GET' })
  return {
    orderNo: res.orderNo,
    paid: !!res.paid,
    expireAt: res.expireAt || null,
    productName: res.productName || '',
    payAmount: res.payAmount || 0,
  }
}

/** 10. 当前用户 VIP 状态 */
export async function getVipStatus() {
  if (WX_VIP_CONFIG.vipUseMock) {
    await delay(200)
    const demo = readDemo()
    const expire = demo.vipExpireAt ? new Date(demo.vipExpireAt) : null
    const isVip = !!expire && expire > new Date()
    return {
      isVip,
      expireAt: expire ? formatDate(expire) : null,
      remainDays: isVip ? Math.ceil((expire - new Date()) / 86400000) : 0,
    }
  }
  // 未登录时静默返回非会员，避免 VIP 页在游客态弹 401
  if (!readAuthToken()) return { isVip: false, expireAt: null, remainDays: 0 }
  try {
    return await request({ url: '/pay/vip/status', method: 'GET' })
  } catch (e) {
    return { isVip: false, expireAt: null, remainDays: 0 }
  }
}

/** 11. 读取订单快照（成功页展示套餐名用；真实模式返回 null，由成功页用订单接口兜底） */
export function readDemoOrder(orderNo) {
  if (!WX_VIP_CONFIG.vipUseMock || !orderNo) return null
  const demo = readDemo()
  return demo.orders[orderNo] || null
}

/** 登录 token 存在 Vuex 持久化结构 ahp_user_state 里，单独取出来给请求头用 */
function readAuthToken() {
  try {
    const raw = uni.getStorageSync('ahp_user_state')
    if (!raw) return ''
    const state = typeof raw === 'string' ? JSON.parse(raw) : raw
    return (state && state.token) || ''
  } catch (e) {
    return ''
  }
}

// =====================================================================
// 内部：真实请求（USE_MOCK = false 时才会走到这里）
// =====================================================================
function request({ url, method = 'GET', data = {} }) {
  const token = readAuthToken()
  return new Promise((resolve, reject) => {
    uni.request({
      url: WX_VIP_CONFIG.baseUrl + url,
      method,
      data,
      timeout: 20000,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      success: (res) => {
        const body = res.data || {}
        // 后端统一格式 {code, msg, data}
        if (res.statusCode >= 200 && res.statusCode < 300 && (body.code === 200 || body.code === undefined)) {
          resolve(body.data !== undefined ? body.data : body)
          return
        }
        reject({ code: body.code || res.statusCode, msg: body.msg || body.message || '请求失败' })
      },
      fail: (err) => reject({ code: -1, msg: err.errMsg || '网络异常' }),
    })
  })
}

function formatDate(d) {
  const p = (n) => (n < 10 ? '0' + n : n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

export default {
  WX_VIP_CONFIG,
  isWechatBrowser,
  getWxQrcode,
  pollWxLogin,
  simulateScan,
  decideWxUser,
  getMpAuthUrl,
  getVipPackages,
  createVipOrder,
  simulatePayResult,
  queryOrderResult,
  getVipStatus,
  readDemoOrder,
}
