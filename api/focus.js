/**
 * 「专注 · AI 陪伴监督」接口封装（独立模块）
 * 路径前缀: /focus（BASE_URL = /api/v1 已在 request.js 内拼接）
 * 后端: server/app/modules/focus/router.py
 *
 * 注意：本模块的所有页面/接口都是新增，不触碰原有
 * 打卡 / 悬浮伙伴 / 聊天 / 支付 / 登录 / 小想法模块。
 */
import http from '@/common/request'

export default {
  // ---------- 计划 / 任务 ----------
  /** AI 备考计划生成（自动落任务 + 提醒） */
  generatePlan(data) {
    // data: { exam_type, exam_date, weakness, daily_minutes, remind_time }
    return http.post('/focus/plan/generate', data)
  },

  /** 大任务拆解为极小单步（分步引导入口，同时落引导记录） */
  splitTask(prompt, mode = 'simple') {
    return http.post('/focus/task/split', { prompt, mode })
  },

  /** 手动创建任务 */
  createTask(data) {
    return http.post('/focus/task', data)
  },

  /** 今日待办看板（含子步骤与总进度） */
  getTasks(date = '') {
    return http.get('/focus/tasks', date ? { date } : {})
  },

  /** 更新任务状态：0待办 1进行中 2已完成 */
  setTaskStatus(taskId, status) {
    return http.post(`/focus/task/${taskId}/status`, { status })
  },

  deleteTask(taskId) {
    return http.del(`/focus/task/${taskId}`)
  },

  /** 「我做到了」→ 推进下一步，返回下一步 + 角色鼓励 */
  finishStep(stepId, roleId = 'companion') {
    return http.post('/focus/step/finish', { step_id: stepId, role_id: roleId })
  },

  // ---------- 专注会话 ----------
  /** 开启专注会话，返回角色台词轮播 */
  startSession(data) {
    // data: { task_id, role_id, mode, tag }
    return http.post('/focus/session/start', data)
  },

  /** 跳出/拦截回报（原生 App；小程序 H5 离开检测降级） */
  sessionInterrupt(sessionId, count = 1) {
    return http.post('/focus/session/interrupt', { session_id: sessionId, count })
  },

  /** 结束专注 */
  finishSession(sessionId, duration, interrupted = false) {
    return http.post('/focus/session/finish', {
      session_id: sessionId, duration, interrupted,
    })
  },

  /** 统计报表 period: day/week/month/custom */
  getStat(period = 'day', startDate = '', endDate = '') {
    return http.get('/focus/stat', { period, start_date: startDate, end_date: endDate })
  },

  // ---------- 提醒 ----------
  createRemind(taskId, remindAt, text = '') {
    return http.post('/focus/remind', { task_id: taskId, remind_at: remindAt, text })
  },

  getReminds() {
    return http.get('/focus/reminds')
  },

  triggerRemind(remindId) {
    return http.post(`/focus/remind/${remindId}/trigger`)
  },

  deleteRemind(remindId) {
    return http.del(`/focus/remind/${remindId}`)
  },

  // ---------- 引导记录 ----------
  /** 引导推进时回写计时 */
  saveRecord(recordId, currentIndex, durationSeconds) {
    return http.post('/focus/record', {
      record_id: recordId, current_index: currentIndex, duration_seconds: durationSeconds,
    })
  },

  /** 引导记录列表（可搜索） */
  getRecords(keyword = '') {
    return http.get('/focus/records', keyword ? { keyword } : {})
  },

  /** 回放详情（含 export_text 导出文本） */
  getRecordDetail(recordId) {
    return http.get(`/focus/record/${recordId}`)
  },

  deleteRecord(recordId) {
    return http.del(`/focus/record/${recordId}`)
  },

  // ---------- 专注动态 ----------
  /** 发布动态 visible_type: self仅自己 / follow互关好友 */
  publishDynamic(content, image = '', visibleType = 'self') {
    return http.post('/focus/dynamic', {
      content, image, visible_type: visibleType,
    })
  },

  /** 动态流：自己的 + 互关好友的，无公开广场 */
  getDynamics() {
    return http.get('/focus/dynamics')
  },

  /** 点赞/取消（幂等） */
  reactDynamic(dynamicId) {
    return http.post(`/focus/dynamic/${dynamicId}/react`)
  },

  deleteDynamic(dynamicId) {
    return http.del(`/focus/dynamic/${dynamicId}`)
  },

  // ---------- 互关好友 ----------
  follow(uid) {
    return http.post(`/focus/follow/${uid}`)
  },

  unfollow(uid) {
    return http.del(`/focus/follow/${uid}`)
  },

  getFollows() {
    return http.get('/focus/follows')
  },

  // ---------- 陪伴聊天 ----------
  /** 监督陪伴人设聊天；说「提醒我九点四十五收拾房间」自动建待办+提醒 */
  companionChat(text, history = []) {
    return http.post('/focus/companion-chat', { text, history })
  },

  // ---------- 上传 ----------
  uploadImage(filePath) {
    return http.uploadFile(filePath, '/focus/upload', 'file')
  },

  /** 语音转文字（录音文件上传 → ASR） */
  uploadAudio(filePath) {
    return http.uploadFile(filePath, '/focus/upload-audio', 'file')
  },

  // ---------- 设置 / 角色 / 推荐 ----------
  getSetting() {
    return http.get('/focus/setting')
  },

  setSetting(data) {
    // data: { allow_dynamic, allow_remind } 传需要修改的键即可
    return http.post('/focus/setting', data)
  },

  /** 角色列表（沿用现有角色体系） */
  getRoles() {
    return http.get('/focus/roles')
  },

  /** 空态推荐小任务 */
  getRecommend() {
    return http.get('/focus/recommend')
  }
}
