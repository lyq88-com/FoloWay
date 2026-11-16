/**
 * 专注提醒调度器（独立工具，供专注模块页面调用）
 * ------------------------------------------------
 * 职责：拉取待触发提醒 → 用系统本地通知（App）/ 通知栏消息调度；
 * 小程序 / H5 无本地通知能力时降级为应用内 toast 提示。
 *
 * 设计：每次进入专注模块首页时调用 scheduleAll()，
 * 对「到达时间已到但未触发」的提醒立即弹提示并回报 is_triggered。
 * 复用现有通知/小红点体系思想，不改任何既有通知代码。
 */
import focusApi from '@/api/focus'

let _scheduled = [] // 已调度的 remind id，防重复

function isApp() {
  // #ifdef APP-PLUS
  return true
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
}

/** 解析 "YYYY-MM-DD HH:MM" 为时间戳 */
function parseAt(str) {
  if (!str) return 0
  const t = new Date(str.replace(/-/g, '/')).getTime()
  return isNaN(t) ? 0 : t
}

/** 本地通知（仅 App） */
function pushLocal(title, text, remindId) {
  // #ifdef APP-PLUS
  try {
    plus.push.createMessage(text, String(remindId), { title })
  } catch (e) { /* 部分机型不支持时静默 */ }
  // #endif
  // #ifndef APP-PLUS
  uni.showToast({ title: `${title}：${text}`, icon: 'none', duration: 3000 })
  // #endif
}

/**
 * 拉取并调度提醒。
 * - 已到期的：立即应用内提示 + 回报触发
 * - 未来 5 分钟内的：setTimeout 到点弹提醒
 */
export async function scheduleAll() {
  let rows = []
  try {
    const res = await focusApi.getReminds()
    if (res && res.code === 200) rows = (res.data && res.data.list) || []
  } catch (e) {
    return
  }
  const now = Date.now()
  for (const r of rows) {
    if (_scheduled.includes(r.id)) continue
    _scheduled.push(r.id)
    const at = parseAt(r.remind_at)
    if (!at) continue
    if (at <= now) {
      // 已到期未触发：立即提示
      pushLocal('专注提醒', r.text || '该专注啦', r.id)
      focusApi.triggerRemind(r.id).catch(() => {})
    } else if (at - now < 5 * 60 * 1000) {
      // 5 分钟内的安排到点提醒（短会话内有效）
      setTimeout(() => {
        pushLocal('专注提醒', r.text || '该专注啦', r.id)
        focusApi.triggerRemind(r.id).catch(() => {})
      }, at - now)
    }
    // 更远的提醒：由用户下次进入专注模块时刷新调度（轻量做法，见交付说明）
  }
}

export default { scheduleAll, isApp }
