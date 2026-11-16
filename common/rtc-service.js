/**
 * 实时通话（RTC）接入层
 * =====================
 * 后端：/api/v1/rtc/status、/api/v1/rtc/token（声网 Agora AccessToken2）
 *
 * 约定：
 * - 未配置声网密钥时，后端返回 configured=false + reason，这里如实透出，
 *   调用方显示「演示模式 · 未接入实时通话」，不伪造「已接通」；
 * - 声网 Web SDK 不在项目依赖内，H5 需自行在页面注入 window.AgoraRTC；
 *   没有 SDK 时同样按演示模式处理，不抛异常打断通话页。
 */
import http from '@/common/request'

const STATUS_TTL = 60 * 1000
let statusCache = null
let statusAt = 0

const UNKNOWN_STATUS = {
  provider: 'none',
  configured: false,
  reason: '无法获取实时通话状态',
  features: { audio: false, video: false, data: false }
}

/** 查询后端 RTC 渠道状态（60s 内复用缓存，失败按未配置处理） */
export async function getRtcStatus(force = false) {
  const now = Date.now()
  if (!force && statusCache && now - statusAt < STATUS_TTL) return statusCache
  try {
    const res = await http.get('/rtc/status')
    if (res && res.code === 200 && res.data) {
      statusCache = res.data
      statusAt = now
      return statusCache
    }
  } catch (e) { /* 网络异常不打断通话页 */ }
  return UNKNOWN_STATUS
}

/** H5：声网 Web SDK 是否已引入（本项目不内置该依赖） */
export function getAgoraSdk() {
  // #ifdef H5
  if (typeof window !== 'undefined' && window.AgoraRTC) return window.AgoraRTC
  // #endif
  return null
}

/**
 * 准备一次实时通话
 * @returns {{ok:boolean, mode:'rtc'|'demo', reason?:string, sdk?:object, appId?:string, channel?:string, uid?:number, token?:string, expireAt?:number}}
 * ok=false 时调用方保持现有「AI 语音对话」逻辑，并展示 reason
 */
export async function prepareRtcCall(sessionId = 0) {
  const status = await getRtcStatus()
  if (!status.configured) {
    return { ok: false, mode: 'demo', reason: status.reason || '实时通话未配置' }
  }
  const sdk = getAgoraSdk()
  if (!sdk) {
    return { ok: false, mode: 'demo', reason: '未引入声网 Web SDK，当前为演示模式' }
  }
  try {
    const res = await http.post('/rtc/token', { session_id: sessionId || 0 })
    if (!res || res.code !== 200 || !res.data || !res.data.token) {
      return { ok: false, mode: 'demo', reason: (res && res.message) || '获取通话凭证失败' }
    }
    const d = res.data
    return {
      ok: true,
      mode: 'rtc',
      sdk,
      appId: d.app_id,
      channel: d.channel,
      uid: d.uid,
      token: d.token,
      expireAt: d.expire_at
    }
  } catch (e) {
    return { ok: false, mode: 'demo', reason: '获取通话凭证失败' }
  }
}

export default { getRtcStatus, prepareRtcCall, getAgoraSdk }
