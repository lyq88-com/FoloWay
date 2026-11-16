/**
 * newfunc 增量模块 API 封装（/api/newfunc/）
 * 覆盖：消息推送 / 情绪日记日历 / 多 AI 伙伴与隔离记忆
 */
import http from '@/common/newfunc-request'

export default {
  // ---- 模块一：推送 ----
  getPushSetting() {
    return http.get('/push/setting')
  },
  savePushSetting(data) {
    return http.post('/push/setting', data)
  },
  bindCid(clientId) {
    return http.post('/push/bind-cid', { client_id: clientId || '' })
  },
  pushRecords(params = {}) {
    const q = Object.keys(params)
      .filter(k => params[k] !== '' && params[k] !== undefined)
      .map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
    return http.get('/push/records' + (q ? '?' + q : ''))
  },
  pushRead(id) {
    return http.post(`/push/${id}/read`)
  },
  pushReadAll() {
    return http.post('/push/read-all')
  },
  pushTest() {
    return http.post('/push/test')
  },
  // ---- 模块二：情绪日记日历 ----
  diaryDay(date) {
    return http.get(`/diary/day?date=${encodeURIComponent(date)}`)
  },
  diarySave(data) {
    return http.post('/diary/save', data)
  },
  diarySaveSummary(date, summary) {
    return http.post('/diary/summary', { date, summary })
  },
  diaryAiSummary(date) {
    return http.post('/diary/ai-summary', { date })
  },
  diaryMonth(month) {
    return http.get(`/diary/month?month=${encodeURIComponent(month)}`)
  },
  diaryAuthorize(enabled) {
    return http.post('/diary/authorize', { enabled })
  },
  // ---- 模块三：AI 伙伴 ----
  botList() {
    return http.get('/bots')
  },
  botCreate(data) {
    return http.post('/bots', data)
  },
  botUpdate(id, data) {
    return http.put(`/bots/${id}`, data)
  },
  botDelete(id) {
    return http.del(`/bots/${id}`)
  },
  botChat(id, text, history = []) {
    return http.post(`/bots/${id}/chat`, { text, history })
  },
  botMemories(id, params = {}) {
    const q = Object.keys(params)
      .filter(k => params[k] !== '' && params[k] !== undefined)
      .map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
    return http.get(`/bots/${id}/memories` + (q ? '?' + q : ''))
  },
  botMemoryCreate(botId, data) {
    return http.post(`/bots/${botId}/memories`, data)
  },
  botMemoryDelete(botId, memId) {
    return http.del(`/bots/${botId}/memories/${memId}`)
  },
  botMemoryReset(botId) {
    return http.post(`/bots/${botId}/memory/reset`)
  },
  botProactive(botId) {
    return http.post(`/bots/${botId}/proactive`, { save_record: true })
  },
  // ---- 增量模块四：多语种/方言语音包（/api/newfunc/tts） ----
  ttsVoices() {
    return http.get('/tts/voices')
  },
  ttsGetSetting() {
    return http.get('/tts/setting')
  },
  ttsSetSetting(voiceId) {
    return http.post('/tts/setting', { voice_id: voiceId })
  },
  ttsSynthesize(text, voiceId = '', botId = 0) {
    return http.post('/tts/synthesize', { text, voice_id: voiceId, bot_id: botId })
  },
  ttsBindBotVoice(botId, voiceId) {
    return http.post(`/tts/bots/${botId}/voice`, { voice_id: voiceId })
  },
  ttsGetBotVoice(botId) {
    return http.get(`/tts/bots/${botId}/voice`)
  },
  ttsUnbindBotVoice(botId) {
    return http.del(`/tts/bots/${botId}/voice`)
  },
  ttsCacheStats() {
    return http.get('/tts/cache/stats')
  },
  ttsCacheClear() {
    return http.post('/tts/cache/clear')
  }
}
