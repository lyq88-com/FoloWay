/**
 * AI 伙伴统一解析
 *
 * 解决以下实际问题：
 *   1) 各页面各自写死默认伙伴（'linxi'）与默认 emoji，切换伙伴后形象对不上；
 *   2) 性格测评结束用「推荐角色」直接覆盖用户已经选中的伙伴；
 *   3) 自定义伙伴 / 扭蛋角色没有立绘映射，只能显示 emoji 或被回退成林夕照片；
 *   4) 删除自定义伙伴后，store.aiConfig 仍指向旧 id（缓存残留），全站都查不到。
 *
 * 约定：
 *   - aiConfig.avatarType 只存「角色 id」（预设 id 或 custom_xxx / 云端 roleKey）
 *   - 用户显式选择过的伙伴额外落一份到本地存储，测评/重登后可恢复
 *   - 所有页面取头像统一走 getPartnerPhoto()，不再自己拼 ROLE_PHOTOS
 */
import store from '@/store'
import { CHARACTERS, getCharacterById } from '@/common/ai-characters'
import { getRolePhoto, getRoleAvatar, getRoleHero } from '@/common/role-photos'
import { toStaticUrl } from '@/common/request'

export const DEFAULT_PARTNER_ID = 'linxi'
export const PARTNER_STORAGE_KEY = 'ai_partner_id'
export const PARTNER_SNAPSHOT_KEY = 'ai_partner_snapshot'

const DEFAULT_COLORS = {
  primary: '#7BA08B',
  secondary: '#C8E6C9',
  accent: '#A5D6A7',
  light: '#F1F8E9',
  dark: '#3E5D4A'
}

function state() {
  return (store && store.state) || {}
}

function customList() {
  const list = state().customCharacters
  return Array.isArray(list) ? list : []
}

function isImageValue(v) {
  return typeof v === 'string' && v.length > 0 && (
    /^(https?:\/\/|blob:|data:image|\/|wxfile:|file:)/.test(v) ||
    /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(v)
  )
}

function normalizeImage(value) {
  if (!isImageValue(value)) return ''
  if (/^(blob:|data:)/.test(value)) return value
  // 本地 static 资源已是可直接访问的根路径，再拼 STATIC_BASE 会变成 /uploads/static/... 而 404
  if (value.startsWith('/static/') || value.startsWith('static/')) return value
  try {
    return toStaticUrl(value) || value
  } catch (e) {
    return value
  }
}

/**
 * 按 id 查角色（自定义优先，其次 20 个预设角色，最后是保存过的后端角色快照）
 * 自定义角色直接从 store 查，避免运行时注册表尚未恢复时查不到
 */
export function findPartner(id) {
  if (!id) return null
  const key = String(id)
  const custom = customList().find(c => c && String(c.id) === key)
  const raw = custom || getCharacterById(key) || getSnapshotPartner(key)
  if (!raw) return null
  return decorate(raw)
}

function getSnapshotPartner(id) {
  try {
    const raw = uni.getStorageSync(PARTNER_SNAPSHOT_KEY)
    if (!raw) return null
    const snapshot = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (snapshot && String(snapshot.id) === String(id)) return snapshot
  } catch (e) { /* 静默 */ }
  return null
}

function saveSnapshot(partner) {
  if (!partner || !partner.id) return
  try {
    uni.setStorageSync(PARTNER_SNAPSHOT_KEY, JSON.stringify({
      id: String(partner.id),
      name: partner.name || '',
      avatar: partner.avatar || '',
      colors: partner.colors || null,
      photo: partner.photo || '',
      portrait: partner.portrait || '',
      description: partner.description || '',
      personality: partner.personality || '',
      style: partner.style || '',
      catchphrase: partner.catchphrase || '',
      isCustom: !!partner.isCustom
    }))
  } catch (e) { /* 静默 */ }
}

function decorate(character) {
  const photo = getPartnerPhoto(character)
  return {
    ...character,
    photo,
    portrait: photo || character.portrait || '',
    avatar: character.avatar || '🌿',
    colors: { ...DEFAULT_COLORS, ...(character.colors || {}) },
    isCustom: !!character.isCustom || String(character.id || '').indexOf('custom_') === 0
  }
}

/**
 * 取伙伴的真实头像/立绘
 * 优先级：用户上传的自定义头像 > 后端返回的图片地址 > 预设立绘 > 空串（调用方回退 emoji）
 */
export function getPartnerPhoto(characterOrId) {
  if (!characterOrId) return ''
  if (typeof characterOrId === 'string') {
    const custom = customList().find(c => c && String(c.id) === String(characterOrId))
    if (custom) return getPartnerPhoto(custom)
    const snapshot = getSnapshotPartner(characterOrId)
    if (snapshot) return getPartnerPhoto(snapshot)
    return getRolePhoto(characterOrId) || ''
  }

  const c = characterOrId
  if (c.useCustomAvatar && c.customAvatarUrl) {
    return normalizeImage(c.customAvatarUrl)
  }
  const customAvatar = normalizeImage(c.customAvatarUrl)
  if (customAvatar) return customAvatar
  if (c.useCustomAvatar === false && c.avatar && isImageValue(c.avatar)) return normalizeImage(c.avatar)
  if (isImageValue(c.avatar)) return normalizeImage(c.avatar)
  if (c.photo) return c.photo
  if (c.portrait) return c.portrait
  return getRolePhoto(c.id) || ''
}

/** 取预设立绘对应的「头部特写头像」，用户自定义上传的头像原样返回 */
export function getPartnerAvatar(characterOrId) {
  const photo = getPartnerPhoto(characterOrId)
  if (!photo) return ''
  const m = /\/static\/images\/home\/([^/]+)\.jpg$/.exec(photo)
  return (m && getRoleAvatar(m[1])) || photo
}

/** 取预设立绘对应的「上半身主视觉」，用户自定义上传的图片原样返回 */
export function getPartnerHero(characterOrId) {
  const photo = getPartnerPhoto(characterOrId)
  if (!photo) return ''
  const m = /\/static\/images\/home\/([^/]+)\.jpg$/.exec(photo)
  return (m && getRoleHero(m[1])) || photo
}

/**
 * 用户「显式选中」的伙伴 id
 * 只认显式选择时落下的本地记录，不拿 aiConfig 兜底：
 * 旧版本测评会把推荐角色直接写进 aiConfig，若这里回读就会一直停留在同一个伙伴，
 * 也就是「测评结束总是固定一个 AI 伙伴」的根因之一。
 */
export function getPickedPartnerId() {
  try {
    const saved = uni.getStorageSync(PARTNER_STORAGE_KEY)
    if (saved && findPartner(saved)) return String(saved)
  } catch (e) { /* 静默 */ }
  return ''
}

/**
 * 当前生效的伙伴 id
 * @param {Object} options 路由参数（roleId / characterId / partnerId / roleKey / avatarType）
 */
export function getActivePartnerId(options = {}) {
  const routeId = options && (
    options.roleId || options.roleKey || options.characterId ||
    options.partnerId || options.avatarType
  )
  if (routeId && findPartner(routeId)) return String(routeId)

  const cfgId = state().aiConfig && state().aiConfig.avatarType
  if (cfgId && findPartner(cfgId)) return String(cfgId)

  const picked = getPickedPartnerId()
  if (picked) return picked

  return DEFAULT_PARTNER_ID
}

/** 当前生效的伙伴（完整数据），永远返回一个可用对象 */
export function getActivePartner(options = {}) {
  return findPartner(getActivePartnerId(options))
    || findPartner(DEFAULT_PARTNER_ID)
    || decorate(CHARACTERS[0])
}

/**
 * 保存选中伙伴（全局唯一入口）
 * 同时更新 store 与本地存储，保证测评/刷新/换页后读取一致
 * @param {String} id
 * @param {String} name 可省略，省略时用角色数据里的名字
 * @param {Object} options { explicit: 是否为用户主动选择, profile: 角色完整数据 }
 */
export function saveActivePartner(id, name, options = {}) {
  let partner = findPartner(id)
  if (!partner && options.profile && options.profile.id) {
    // 后端角色（扭蛋/云端自定义）不在本地角色表里：用传入的数据 + 快照兜底
    partner = decorate({
      ...options.profile,
      id: String(options.profile.id),
      name: options.profile.name || name || 'AI伙伴'
    })
  }
  if (!partner) return null

  const explicit = options.explicit !== false
  const finalName = name || partner.name || ''
  store.commit('setAiConfig', { avatarType: partner.id, name: finalName })
  // 非本地角色表内的伙伴（扭蛋/云端角色）额外存一份形象快照，
  // 刷新后仍能按 id 还原头像，而不是回落成林夕
  if (options.profile || !getCharacterById(partner.id)) {
    saveSnapshot({ ...partner, name: finalName })
  }
  if (explicit) {
    try {
      uni.setStorageSync(PARTNER_STORAGE_KEY, String(partner.id))
    } catch (e) { /* 静默 */ }
  }
  return partner
}

/**
 * 校正 store 里可能残留的失效伙伴（删除自定义角色 / 切换账号 / 旧缓存）
 * App 启动时调用一次即可
 */
export function ensureActivePartner() {
  const cfg = state().aiConfig || {}
  const current = findPartner(cfg.avatarType)

  if (current) {
    // 名称与角色数据不一致时顺手修掉，避免"头像换了名字没换"
    if (!cfg.name || cfg.name !== current.name) {
      store.commit('setAiConfig', { avatarType: current.id, name: current.name })
    }
    return current
  }

  // 后端角色（扭蛋/云端角色）不在本地角色表里：保留选择，用快照维持基本形象，
  // 不能当成"已删除的自定义伙伴"直接重置。
  if (cfg.avatarType && String(cfg.avatarType).indexOf('custom_') !== 0) {
    const kept = decorate({
      id: String(cfg.avatarType),
      name: cfg.name || 'AI伙伴',
      avatar: '🌿'
    })
    saveSnapshot(kept)
    return kept
  }

  let saved = ''
  try { saved = uni.getStorageSync(PARTNER_STORAGE_KEY) || '' } catch (e) { /* 静默 */ }

  const fallback = findPartner(saved)
    || findPartner(DEFAULT_PARTNER_ID)
    || decorate(CHARACTERS[0])
  if (!fallback) return null

  store.commit('setAiConfig', { avatarType: fallback.id, name: fallback.name })
  try {
    uni.setStorageSync(PARTNER_STORAGE_KEY, String(fallback.id))
  } catch (e) { /* 静默 */ }
  return fallback
}

/** 清空选中伙伴的本地记录（退出登录时调用，避免串号） */
export function clearActivePartner() {
  try {
    uni.removeStorageSync(PARTNER_STORAGE_KEY)
    uni.removeStorageSync(PARTNER_SNAPSHOT_KEY)
  } catch (e) { /* 静默 */ }
}

/** 可切换的伙伴列表：当前 + 其余预设 + 自定义角色 */
export function getSwitchablePartners(limit = 4) {
  const current = getActivePartner()
  const presetOthers = CHARACTERS
    .filter(c => c.id !== current.id && getPartnerPhoto(c))
    .slice(0, limit)
  const customOthers = customList()
    .filter(c => c && c.id !== current.id)
    .slice(0, Math.max(0, limit - presetOthers.length))

  const list = [current, ...presetOthers, ...customOthers]
  return list.map(c => {
    const partner = findPartner(c.id) || decorate(c)
    return {
      id: partner.id,
      name: partner.name,
      avatar: partner.avatar,
      photo: partner.photo
    }
  })
}

export default {
  DEFAULT_PARTNER_ID,
  PARTNER_STORAGE_KEY,
  findPartner,
  getPartnerPhoto,
  getPartnerAvatar,
  getPartnerHero,
  getPickedPartnerId,
  getActivePartnerId,
  getActivePartner,
  saveActivePartner,
  ensureActivePartner,
  clearActivePartner,
  getSwitchablePartners
}
