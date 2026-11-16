/**
 * 「小想法 · 共鸣匹配」接口封装（独立模块）
 * 路径前缀: /idea（BASE_URL = /api/v1 已在 request.js 内拼接）
 * 后端: server/app/modules/idea/router.py
 *
 * 注意：本模块的所有页面/接口都是新增，不触碰原有 打卡 / AI 伙伴 / 支付 / 登录。
 */
import http from '@/common/request'

export default {
  // ---------- 发布 ----------
  /** 发布想法，返回 { idea, resonance: [...] } */
  publish(data) {
    // data: { content, image, is_anonymous }
    return http.post('/idea/publish', data)
  },

  /** 上传单张配图，返回 { url, path } */
  uploadImage(filePath) {
    return http.uploadFile(filePath, '/idea/upload', 'file')
  },

  // ---------- 共鸣 ----------
  /** 获取推送给我的共鸣列表 */
  getMyResonance() {
    return http.get('/idea/my-resonance')
  },

  /** 点亮一条共鸣（resonanceId = 共鸣记录 id） */
  light(resonanceId) {
    return http.post('/idea/light', { resonance_id: resonanceId })
  },

  /** 轻互动：good/agree/highfive/pat */
  react(ideaId, actionType) {
    return http.post('/idea/react', { idea_id: ideaId, action_type: actionType })
  },

  // ---------- 我的想法 ----------
  getMyIdeas() {
    return http.get('/idea/my-ideas')
  },

  deleteIdea(ideaId) {
    return http.del(`/idea/my-ideas/${ideaId}`)
  },

  // ---------- 总开关 ----------
  getSetting() {
    return http.get('/idea/setting')
  },

  setSetting(acceptResonance) {
    return http.post('/idea/setting', { accept_resonance: !!acceptResonance })
  },

  // ---------- 真人私聊 ----------
  getConversations() {
    return http.get('/idea/conversations')
  },

  getConversation(conversationId) {
    return http.get(`/idea/conversation/${conversationId}`)
  },

  sendMessage(conversationId, content) {
    return http.post(`/idea/conversation/${conversationId}`, { content, msg_type: 'text' })
  },

  // ---------- 拉黑 ----------
  /** 拉黑对方（会话从列表隐藏，双方无法继续发消息） */
  blockUser(uid) {
    return http.post(`/idea/block/${uid}`)
  },

  unblockUser(uid) {
    return http.del(`/idea/block/${uid}`)
  },

  // ---------- 通知 / 小红点 ----------
  getNotifications() {
    return http.get('/idea/notifications')
  },

  readNotifications(notificationId = 0) {
    return http.post('/idea/notifications/read', { notification_id: notificationId })
  },

  getBadge() {
    return http.get('/idea/badge')
  }
}
