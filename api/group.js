// -*- coding: utf-8 -*-
/**
 * 群聊 API 封装 —— 全部调用后端 /api/v1/group/*
 * 新文件，不碰任何原有 API 文件
 */
import http from '@/common/request.js'

// 【修复】request 层已自动拼接 API_BASE（/api/v1），这里只能写相对路径，
// 否则会请求成 /api/v1/api/v1/group/* 直接 404
const BASE = '/group'

export default {
  /** 创建群聊 */
  create(group_name, role_types) {
    return http.post(`${BASE}/create`, { group_name, role_types })
  },
  /** 我所在的群列表 */
  list() {
    return http.get(`${BASE}/list`)
  },
  /** 群详情（含成员） */
  detail(group_id) {
    return http.get(`${BASE}/${group_id}`)
  },
  /** 改群名 */
  rename(group_id, group_name) {
    return http.put(`${BASE}/${group_id}`, { group_name })
  },
  /** 解散群 */
  dissolve(group_id) {
    return http.delete(`${BASE}/${group_id}`)
  },
  /** 加 AI 成员 */
  addMember(group_id, role_type) {
    return http.post(`${BASE}/${group_id}/join`, { role_type })
  },
  /** 拉群消息历史 */
  messages(group_id, page = 1, size = 50) {
    return http.get(`${BASE}/${group_id}/messages`, { page, size })
  },
  /** 发群消息（后端异步调度 AI 回复） */
  async send(group_id, content) {
    return http.post(`${BASE}/${group_id}/send`, { content })
  },
  /** 喊停 */
  stop(group_id) {
    return http.post(`${BASE}/${group_id}/stop`)
  },
  /** 继续聊天（解除喊停） */
  resume(group_id) {
    return http.post(`${BASE}/${group_id}/resume`)
  },
}
