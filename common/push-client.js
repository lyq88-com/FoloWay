/**
 * newfunc 推送客户端（App 端离线推送 + 全端轮询兜底，零侵入：不修改 App.vue 既有逻辑）
 *
 * 职责：
 *  1. App 端监听通知点击 → 按 payload 跳转对应页面（个推/本地通知统一 payload=页面路径）
 *  2. 绑定个推 CID（配置了个推且拿到 cid 时上报，走厂商通道；否则走轮询兜底）
 *  3. 轮询未读推送记录 → 系统通知栏本地通知（App）或应用内提示（小程序/H5 降级）
 *
 * 用法：在 App.vue onLaunch 末尾调用 initPushClient()（仅追加一行）。
 */
import api from '@/api/newfunc'
import store from '@/store'

let _lastSeenId = 0
let _pollTimer = null

// 未登录/已退出时后端必然回 401（get_current_user 拿不到 token）。
// 轮询由 onLaunch 启动，登录页阶段也会被触发，所以这里先判断有没有 token，
// 避免每次启动都打一条无 token 的 401（也会连带触发「登录已过期」的踢出逻辑）。
function hasToken() {
  try {
    return !!(store && store.state && store.state.token)
  } catch (e) {
    return false
  }
}

function handlePushClick(payload) {
  // payload 约定为跳转页面路径，如 /pages/schedule/schedule
  let page = ''
  try {
    page = typeof payload === 'string' ? payload : (payload && payload.page) || ''
  } catch (e) { page = '' }
  if (!page) page = '/pages/newfunc/notification-center'
  uni.navigateTo({
    url: page,
    fail: () => uni.navigateTo({ url: '/pages/newfunc/notification-center' })
  })
}

function localNotify(title, content, jumpPage) {
  // #ifdef APP-PLUS
  try {
    plus.push.createMessage(content || title, jumpPage || '', {
      title: title || '循途',
      cover: false
    })
  } catch (e) {
    uni.showToast({ title: content || title, icon: 'none', duration: 3000 })
  }
  // #endif
  // #ifndef APP-PLUS
  uni.showToast({ title: `🔔 ${title}：${(content || '').slice(0, 30)}`, icon: 'none', duration: 3000 })
  // #endif
}

async function pollOnce() {
  if (!hasToken()) return
  try {
    const res = await api.pushRecords({ only_unread: true, page: 1, size: 10 })
    const list = (res.data && res.data.list) || []
    const fresh = list.filter(r => r.id > _lastSeenId)
    if (fresh.length) {
      _lastSeenId = Math.max(_lastSeenId, ...list.map(r => r.id))
      const r = fresh[0]
      localNotify(r.title, r.content, r.jump_page)
    }
  } catch (e) {
    // 静默：轮询失败不影响主流程
  }
}

export function initPushClient() {
  // #ifdef APP-PLUS
  try {
    plus.push.addEventListener('click', (msg) => {
      // 个推透传/通知 payload 均为页面路径字符串
      handlePushClick(msg && (msg.payload || msg.content))
    })
  } catch (e) { /* 忽略：非推送环境 */ }
  try {
    // 个推 CID 上报（配置了个推 SDK 才能拿到；拿不到则走轮询兜底通道）
    plus.push.getClientInfoAsync({}, (info) => {
      if (info && info.clientid) {
        // 同上：没登录时上报 CID 也会 401，等登录后再由下次启动/轮询补报
        if (hasToken()) api.bindCid(info.clientid).catch(() => {})
      }
    })
  } catch (e) { /* 忽略 */ }
  // #endif
  // 启动轮询（全端兜底：App 未配个推 / 小程序 / H5 均可收到应用内提醒）
  pollOnce()
  if (_pollTimer) clearInterval(_pollTimer)
  _pollTimer = setInterval(pollOnce, 60 * 1000)
}

export default { initPushClient }
