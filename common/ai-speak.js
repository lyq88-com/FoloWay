/**
 * 后端 TTS 播报（edge-tts）
 *
 * 解决的问题：
 * 1. App / 部分 H5 环境没有 speechSynthesis，原来的 Web Speech 会静默失败；
 * 2. 聊天/通话统一走后端音色后，语音包选择才能真正生效；
 * 3. TTS 音频接口需要登录态，InnerAudioContext 不能带 Authorization 头，
 *    所以这里先带 token 下载音频，再用 blob / 临时文件播放。
 *
 * 用法：
 *   await aiSpeak.speak('你好', { voiceId: '', botId: 0 })
 *   aiSpeak.stop()
 */
import api from '@/api/newfunc'
import tts from '@/common/tts'
import store from '@/store'
import { API_BASE } from '@/common/env'
import { splitSentences } from '@/common/voice-prosody'

// H5: '/api/v1' -> ''（同源相对路径走 devServer 代理）
// App: 'http://ip:8000/api/v1' -> 'http://ip:8000'
const API_ROOT = /\/api\/v1\/?$/.test(API_BASE) ? API_BASE.replace(/\/api\/v1\/?$/, '') : ''
const MAX_CHUNK = 200

let currentCtx = null
let session = 0
const urlCache = new Map()

function supported() {
  return typeof uni !== 'undefined' && typeof uni.createInnerAudioContext === 'function'
}

function resolveAudioUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return API_ROOT + path
}

function authHeader() {
  const header = {}
  const token = store && store.state && store.state.token
  if (token) header.Authorization = 'Bearer ' + token
  return header
}

/** 句末切分，并把短句合并到不超过 MAX_CHUNK，减少请求次数 */
function chunkText(text) {
  if (text.length <= MAX_CHUNK) return [text]
  const parts = splitSentences(text)
  const out = []
  let buf = ''
  parts.forEach((part) => {
    if (buf && (buf + part).length > MAX_CHUNK) {
      out.push(buf)
      buf = ''
    }
    buf += part
  })
  if (buf) out.push(buf)
  return out.length ? out : [text]
}

/** 合成（同一段文本走内存缓存 + 服务端缓存） */
async function getAudioUrl(text, opts) {
  const voiceId = opts.voiceId || ''
  const botId = opts.botId || 0
  const key = voiceId + '|' + botId + '|' + text
  if (urlCache.has(key)) return urlCache.get(key)

  const res = await api.ttsSynthesize(text, voiceId, botId)
  const data = res && res.data
  if (!res || res.code !== 200 || !data || !data.audio_url) {
    throw new Error((res && res.message) || 'TTS 合成失败')
  }
  const url = resolveAudioUrl(data.audio_url)
  urlCache.set(key, url)
  return url
}

/** 带登录态下载音频，返回可直接播放的本地地址 */
function loadAudio(url) {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    uni.request({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      header: authHeader(),
      timeout: 30000,
      success(res) {
        if (res.statusCode >= 400 || !res.data) {
          reject(new Error('音频下载失败(' + res.statusCode + ')'))
          return
        }
        const blob = new Blob([res.data], { type: 'audio/mpeg' })
        resolve({ src: URL.createObjectURL(blob), revoke: true })
      },
      fail(err) {
        reject(err || new Error('音频下载失败'))
      }
    })
    // #endif

    // #ifndef H5
    uni.downloadFile({
      url,
      header: authHeader(),
      timeout: 30000,
      success(res) {
        if (res.statusCode === 200 && res.tempFilePath) {
          resolve({ src: res.tempFilePath, revoke: false })
        } else {
          reject(new Error('音频下载失败(' + res.statusCode + ')'))
        }
      },
      fail(err) {
        reject(err || new Error('音频下载失败'))
      }
    })
    // #endif
  })
}

function releaseAudio(loaded) {
  if (!loaded) return
  // #ifdef H5
  if (loaded.revoke && loaded.src) {
    try { URL.revokeObjectURL(loaded.src) } catch (e) { /* 忽略 */ }
  }
  // #endif
}

function playSrc(src, mySession) {
  return new Promise((resolve, reject) => {
    const ctx = uni.createInnerAudioContext()
    let settled = false
    const finish = (err) => {
      if (settled) return
      settled = true
      try { ctx.stop() } catch (e) { /* 忽略 */ }
      try { ctx.destroy() } catch (e) { /* 忽略 */ }
      if (currentCtx === ctx) currentCtx = null
      if (err) reject(err)
      else resolve()
    }
    ctx.src = src
    ctx.onEnded(() => finish())
    ctx.onError((e) => finish(e || new Error('音频播放失败')))
    ctx.play()
    if (mySession !== session) finish(new Error('已停止'))
    else currentCtx = ctx
  })
}

function fallbackToWebSpeech(text, opts) {
  try {
    return tts.speak(text, {
      lang: opts.lang || 'zh-CN',
      rate: opts.rate,
      pitch: opts.pitch
    })
  } catch (e) {
    return false
  }
}

/**
 * 播报文本
 * @param {string} text
 * @param {object} opts { voiceId, botId, lang, rate, pitch, fallback }
 * @returns {Promise<boolean>} true=后端音频播放成功（或已播完）；false=用了回退/未播
 */
async function speak(text, opts = {}) {
  const raw = String(text == null ? '' : text).trim()
  if (!raw) return false
  if (!supported()) return fallbackToWebSpeech(raw, opts)

  stop()
  const mySession = ++session
  const chunks = chunkText(raw)
  let played = false

  try {
    let pending = getAudioUrl(chunks[0], opts)
    for (let i = 0; i < chunks.length; i++) {
      const url = await pending
      if (mySession !== session) return played
      if (i + 1 < chunks.length) pending = getAudioUrl(chunks[i + 1], opts)

      const loaded = await loadAudio(url)
      if (mySession !== session) {
        releaseAudio(loaded)
        return played
      }
      try {
        await playSrc(loaded.src, mySession)
      } finally {
        releaseAudio(loaded)
      }
      played = true
    }
    return true
  } catch (e) {
    console.warn('[ai-speak] 后端 TTS 播报失败：', e && e.message)
    if (!played && opts.fallback !== false) return fallbackToWebSpeech(raw, opts)
    return played
  }
}

/** 停止当前播报（含 Web Speech 回退） */
function stop() {
  session++
  if (currentCtx) {
    try { currentCtx.stop() } catch (e) { /* 忽略 */ }
    try { currentCtx.destroy() } catch (e) { /* 忽略 */ }
    currentCtx = null
  }
  try { tts.stop() } catch (e) { /* 忽略 */ }
}

export default { speak, stop, isSupported: supported }
