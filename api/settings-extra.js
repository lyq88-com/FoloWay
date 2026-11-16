/**
 * 设置扩展 API —— 安全合规批次
 * 覆盖：AI主动消息开关 / 青少年模式 / 导出我的数据 / 账号注销 / 免责声明记录
 * 后端: /api/v1/user/prefs · /api/v1/user/export_my_data · /api/v1/user/deactivate_account
 */
import http from '@/common/request'

export default {
  /** 读取偏好设置（允许AI主动消息 / 青少年模式） */
  getPrefs() {
    return http.get('/user/prefs')
  },

  /** 保存偏好设置 { allow_proactive_msg?: 0|1, teen_mode?: 0|1 } */
  savePrefs(data) {
    return http.put('/user/prefs', {
      allow_proactive_msg: data.allow_proactive_msg,
      teen_mode: data.teen_mode
    })
  },

  /** 导出我的数据（后端会同时留档一份，返回完整 JSON） */
  exportMyData() {
    return http.post('/user/export_my_data', {})
  },

  /** 注销账号（先备份后逻辑清除，演示版不做物理删除） */
  deactivateAccount() {
    return http.post('/user/deactivate_account', {})
  }
}
