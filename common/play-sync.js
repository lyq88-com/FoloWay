/**
 * 循途 · 本地玩法云端同步（盲盒 / 碎片 / 明信片 / 时光胶囊 / 商城下单）
 * ------------------------------------------------------------
 * 目标：把原来只存在 localStorage 的 3 类玩法数据同步到云端，
 *      换设备 / 清缓存后不丢；同时不阻塞本地交互。
 *
 * 策略（与 common/economy.js 一致）：
 *   - 未登录：完全本地，行为与改动前一致，一个请求都不发；
 *   - 登录后：进入页面先本地渲染，再异步 pull（每个 key 每个会话只拉一次）；
 *   - 本地写入后：1.5s 防抖 push，带 version 乐观锁；
 *   - push 遇到 409：合并服务端快照 → 写回本地 → 用新 version 重试一次；
 *   - 任何网络失败都不影响本地功能。
 *
 * 事件：uni.$emit('play-sync-updated', { key })
 *      页面收到后自行重新读取本地数据刷新视图。
 */
import store from '@/store'
import { API_BASE } from './env'

export const PLAY_KEYS = ['box', 'fragment', 'postcard']
const PUSH_DELAY = 1500
const MAX_REWARD_HISTORY = 20
const MAX_WAREHOUSE = 200
const MAX_FRAGMENT_HISTORY = 100
const MAX_POSTCARD_HISTORY = 10

// 每个 key 的服务端版本号（模块内存，重启后从 GET 恢复）
const _versions = {}
// 每个 key 本会话是否已经拉过云端
const _pulled = {}
const _timers = {}
let _lastToken = ''

function _token() {
  const t = (store && store.state && store.state.token) || ''
  // 切换账号（token 变化）时清掉上一个账号的版本号与「已拉取」标记，
  // 避免拿别人的 version 去写自己的数据。
  if (t !== _lastToken) {
    _lastToken = t
    PLAY_KEYS.forEach(k => {
      _versions[k] = 0
      _pulled[k] = false
      if (_timers[k]) {
        clearTimeout(_timers[k])
        _timers[k] = null
      }
    })
  }
  return t
}

function _read(key, fallback) {
  try {
    const v = uni.getStorageSync(key)
    if (v === '' || v === null || v === undefined) return fallback
    return v
  } catch (e) {
    return fallback
  }
}

function _readArr(key) {
  const v = _read(key, [])
  return Array.isArray(v) ? v : []
}

function _request(method, path, data) {
  return new Promise((resolve) => {
    const token = _token()
    if (!token) {
      resolve({ ok: false, offline: true, status: 0, body: null })
      return
    }
    uni.request({
      url: API_BASE + path,
      method,
      data,
      timeout: 10000,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        const body = res.data || null
        resolve({
          ok: res.statusCode === 200 && !!body && body.code === 200,
          offline: false,
          status: res.statusCode,
          body
        })
      },
      fail: (err) => {
        console.warn('[play-sync] 请求失败', method, path, err && err.errMsg)
        resolve({ ok: false, offline: true, status: 0, body: null })
      }
    })
  })
}

function _emit(key) {
  try { uni.$emit('play-sync-updated', { key }) } catch (e) { /* 静默 */ }
}

// ============================================================
// 本地快照（读取 → 统一结构）
// ============================================================
function readBox() {
  return {
    dailyCount: Number(_read('box_daily_count', 0)) || 0,
    lastOpenDate: String(_read('box_last_open_date', '') || ''),
    rewardHistory: _readArr('box_reward_history').slice(0, MAX_REWARD_HISTORY),
    warehouse: _readArr('box_warehouse').slice(0, MAX_WAREHOUSE)
  }
}

function readFragment() {
  return {
    focusFragments: Number(_read('focus_fragments', 0)) || 0,
    collected: _readArr('collected_fragments'),
    history: _readArr('fragment_history').slice(0, MAX_FRAGMENT_HISTORY),
    extraBoxCount: Number(_read('extra_box_count', 0)) || 0
  }
}

function readPostcard() {
  return {
    history: _readArr('postcard_history').slice(0, MAX_POSTCARD_HISTORY)
  }
}

const READERS = { box: readBox, fragment: readFragment, postcard: readPostcard }

// 本地是否有值得上传的数据（用于「首次上云」：云端没有记录时把本地存量推上去）
function _hasLocalData(key, s) {
  if (!s) return false
  if (key === 'box') {
    return !!(s.dailyCount || s.lastOpenDate || (s.rewardHistory || []).length || (s.warehouse || []).length)
  }
  if (key === 'fragment') {
    return !!(s.focusFragments || s.extraBoxCount || (s.collected || []).length || (s.history || []).length)
  }
  if (key === 'postcard') {
    return (s.history || []).length > 0
  }
  return false
}

// ============================================================
// 合并（本地 + 云端 → 合并结果）
// ============================================================
function _uniq(listA, listB, keyFn, limit, sortFn) {
  const seen = new Set()
  const out = []
  ;[...(listA || []), ...(listB || [])].forEach(item => {
    if (!item) return
    const k = keyFn(item)
    if (seen.has(k)) return
    seen.add(k)
    out.push(item)
  })
  if (sortFn) out.sort(sortFn)
  return out.slice(0, limit)
}

function mergeBox(local, cloud) {
  const l = local || {}
  const c = cloud || {}
  // dailyCount 是「今天是否已开」标记，必须跟 lastOpenDate 成对取，
  // 不能简单取 max，否则跨天会误判成已开箱。
  const localDate = String(l.lastOpenDate || '')
  const cloudDate = String(c.lastOpenDate || '')
  let lastOpenDate = localDate
  let dailyCount = Number(l.dailyCount) || 0
  if (cloudDate > localDate) {
    lastOpenDate = cloudDate
    dailyCount = Number(c.dailyCount) || 0
  } else if (cloudDate === localDate) {
    dailyCount = Math.max(dailyCount, Number(c.dailyCount) || 0)
  }
  return {
    dailyCount,
    lastOpenDate,
    rewardHistory: _uniq(
      l.rewardHistory, c.rewardHistory,
      x => `${x.id || ''}|${x.type || ''}|${x.value || ''}|${x.date || ''}`,
      MAX_REWARD_HISTORY,
      (a, b) => (Number(b.date) || 0) - (Number(a.date) || 0)
    ),
    warehouse: _uniq(
      l.warehouse, c.warehouse,
      x => `${x.type || ''}|${x.value || ''}`,
      MAX_WAREHOUSE,
      (a, b) => (Number(b.date) || 0) - (Number(a.date) || 0)
    )
  }
}

function mergeFragment(local, cloud) {
  const l = local || {}
  const c = cloud || {}
  return {
    focusFragments: Math.max(Number(l.focusFragments) || 0, Number(c.focusFragments) || 0),
    collected: _uniq(l.collected, c.collected, x => String(x), 200),
    history: _uniq(
      l.history, c.history,
      x => `${x.type || ''}|${x.date || ''}`,
      MAX_FRAGMENT_HISTORY,
      (a, b) => (Number(b.date) || 0) - (Number(a.date) || 0)
    ),
    extraBoxCount: Math.max(Number(l.extraBoxCount) || 0, Number(c.extraBoxCount) || 0)
  }
}

function mergePostcard(local, cloud) {
  const l = local || {}
  const c = cloud || {}
  return {
    history: _uniq(
      l.history, c.history,
      x => String(x.id || x.timestamp || `${x.date || ''}|${x.image || ''}`),
      MAX_POSTCARD_HISTORY,
      (a, b) => (Number(b.id || b.timestamp) || 0) - (Number(a.id || a.timestamp) || 0)
    )
  }
}

const MERGERS = { box: mergeBox, fragment: mergeFragment, postcard: mergePostcard }

// ============================================================
// 合并结果 → 本地存储
// ============================================================
function writeBox(s) {
  uni.setStorageSync('box_daily_count', Number(s.dailyCount) || 0)
  if (s.lastOpenDate) uni.setStorageSync('box_last_open_date', s.lastOpenDate)
  uni.setStorageSync('box_reward_history', s.rewardHistory || [])
  uni.setStorageSync('box_warehouse', s.warehouse || [])
}

function writeFragment(s) {
  uni.setStorageSync('focus_fragments', Number(s.focusFragments) || 0)
  uni.setStorageSync('collected_fragments', s.collected || [])
  uni.setStorageSync('fragment_history', s.history || [])
  uni.setStorageSync('extra_box_count', Number(s.extraBoxCount) || 0)
}

function writePostcard(s) {
  uni.setStorageSync('postcard_history', s.history || [])
}

const WRITERS = { box: writeBox, fragment: writeFragment, postcard: writePostcard }

function readLocal(key) {
  return (READERS[key] || (() => ({})))()
}

/**
 * 本地写入后调用：1.5s 防抖上传
 */
export function schedulePush(key) {
  if (!_token()) return
  if (PLAY_KEYS.indexOf(key) === -1) return
  if (_timers[key]) clearTimeout(_timers[key])
  _timers[key] = setTimeout(() => {
    _timers[key] = null
    pushKey(key)
  }, PUSH_DELAY)
}

/**
 * 立即上传单个玩法
 */
export async function pushKey(key, _retry) {
  if (!_token() || PLAY_KEYS.indexOf(key) === -1) return false

  const payload = readLocal(key)
  const res = await _request('PUT', '/play/state', {
    items: [{ key, version: _versions[key] || 0, payload }]
  })

  if (res.offline) return false

  const body = res.body || {}
  if (body.code === 409) {
    if (_retry) return false
    const conflict = ((body.data || {}).conflicts || []).find(c => c.key === key)
    if (!conflict) return false
    const merged = MERGERS[key](readLocal(key), conflict.payload || {})
    WRITERS[key](merged)
    _versions[key] = conflict.version || 0
    _emit(key)
    return pushKey(key, true)
  }

  if (body.code === 200) {
    const st = body.data && body.data.states && body.data.states[key]
    if (st && typeof st.version === 'number') _versions[key] = st.version
    return true
  }
  return false
}

/**
 * 拉取并合并单个玩法（每个会话只拉一次，除非 force）
 * @returns {Promise<boolean>} 是否从云端拿到了数据并写回本地
 */
export async function pullKey(key, force) {
  if (!_token() || PLAY_KEYS.indexOf(key) === -1) return false
  if (_pulled[key] && !force) return false

  const res = await _request('GET', `/play/state?keys=${encodeURIComponent(key)}`)
  if (res.offline) return false
  _pulled[key] = true

  const states = (res.body && res.body.data && res.body.data.states) || {}
  const st = states[key]
  if (!st) {
    // 云端还没有这条记录：如果本地有存量数据，首次登录时补传一次
    if (_hasLocalData(key, readLocal(key))) schedulePush(key)
    return false
  }

  _versions[key] = typeof st.version === 'number' ? st.version : 0
  const merged = MERGERS[key](readLocal(key), st.payload || {})
  WRITERS[key](merged)
  _emit(key)

  // 本地有云端缺失的数据（比如离线期间新开出的碎片）→ 回推一次
  try {
    if (JSON.stringify(merged) !== JSON.stringify(st.payload || {})) {
      schedulePush(key)
    }
  } catch (e) { /* 忽略比较失败 */ }
  return true
}

/** 三个玩法一起拉（并行，失败互不影响） */
export function pullAll(force) {
  return Promise.all(PLAY_KEYS.map(k => pullKey(k, force)))
}

/** 登录/切换账号后重置会话缓存，避免用上一个账号的版本号写入 */
export function resetSession() {
  PLAY_KEYS.forEach(k => {
    _versions[k] = 0
    _pulled[k] = false
    if (_timers[k]) {
      clearTimeout(_timers[k])
      _timers[k] = null
    }
  })
}

// ============================================================
// 时光胶囊
// ============================================================
export function fetchCapsules() {
  return _request('GET', '/play/capsules')
}

export function createCapsule(payload) {
  return _request('POST', '/play/capsule', payload)
}

export function openCapsule(id) {
  return _request('POST', `/play/capsule/${id}/open`)
}

// ============================================================
// 商城下单（服务端定价 + 扣币）
// ============================================================
export function createShopOrder(goodsId, qty) {
  return _request('POST', '/play/shop/order', { goodsId, qty: qty || 1 })
}

export function fetchShopOrders() {
  return _request('GET', '/play/shop/orders')
}

export default {
  PLAY_KEYS,
  pullKey,
  pullAll,
  pushKey,
  schedulePush,
  resetSession,
  fetchCapsules,
  createCapsule,
  openCapsule,
  createShopOrder,
  fetchShopOrders
}
