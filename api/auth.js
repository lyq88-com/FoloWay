/**
 * 认证 API - 对接 FastAPI 后端（统一走 /api/v1 前缀）
 * - POST /auth/login-username   { username, password }
 * - POST /auth/register-username { username, password, email }
 *   -> { access_token, token_type, user: {id, username, email, nickname} }
 *
 * getUserInfo / updateProfile 保留在 user.js 不动
 */
import http from '@/common/request'

export default {
  /** 用户名密码登录 */
  login(username, password) {
    return http.post('/auth/login-username', { username, password }, false)
  },

  /** 注册新用户 */
  register(userData) {
    return http.post('/auth/register-username', userData, false)
  },

  /** 发送短信验证码（scene: reset=找回密码） */
  sendSmsCode(phone, scene = 'reset') {
    return http.post('/auth/sms/send', { phone, scene }, false)
  },

  /** 短信验证码重置密码 */
  resetPassword(phone, code, newPassword) {
    return http.post('/auth/password/reset', {
      phone,
      code,
      new_password: newPassword
    }, false)
  },
}
