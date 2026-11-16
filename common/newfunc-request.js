/**
 * newfunc 增量模块专用请求封装（独立文件，零侵入：不修改 common/request.js）
 * 接口前缀 /api/newfunc/，地址从 common/env.js 的 API_BASE 推导（全项目 IP 唯一出处不变）
 *   H5:  /api/v1  → /api/newfunc（走 vite proxy 追加的转发规则）
 *   App: http://<LAN>:8000/api/v1 → http://<LAN>:8000/api/newfunc
 */
import store from '@/store'
import { API_BASE } from './env'

const NEWFUNC_BASE = /\/api\/v1\/?$/.test(API_BASE)
  ? API_BASE.replace(/\/api\/v1\/?$/, '/api/newfunc')
  : '/api/newfunc'

function buildUrl(url) {
  if (/^https?:\/\//.test(url)) return url
  return NEWFUNC_BASE + url
}

function handleFail(statusCode, data) {
  let msg = `请求失败(${statusCode})`
  if (data) msg = data.message || (data.detail && String(data.detail)) || msg
  if (statusCode === 401) {
    const pages = getCurrentPages()
    const route = pages.length ? '/' + pages[pages.length - 1].route : ''
    // 页面栈为空（启动/深链瞬间）时不做 401 弹回，避免刚打开的页面被误弹回登录页（与 request.js 同步修复）
    if (pages.length > 0 && route !== '/pages/login/login' && route !== '/pages/login/register') {
      store.commit('clearToken')
      uni.showToast({ title: '登录已过期', icon: 'none' })
      setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 1200)
    }
  } else {
    uni.showToast({ title: msg, icon: 'none' })
  }
  throw new Error(msg)
}

function request(options = {}) {
  const { url, method = 'GET', data = {}, needToken = true, timeout = 30000 } = options
  const header = { 'Content-Type': 'application/json' }
  if (needToken && store.state.token) header['Authorization'] = `Bearer ${store.state.token}`
  return new Promise((resolve, reject) => {
    uni.request({
      url: buildUrl(url), method, data, timeout, header,
      success: (res) => {
        if (res.statusCode >= 400) {
          handleFail(res.statusCode, res.data)
          reject(new Error('request failed'))
          return
        }
        resolve(res.data)
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        reject(err)
      }
    })
  })
}

export default {
  get: (url, data = {}) => request({ url, method: 'GET', data }),
  post: (url, data = {}) => request({ url, method: 'POST', data }),
  put: (url, data = {}) => request({ url, method: 'PUT', data }),
  del: (url, data = {}) => request({ url, method: 'DELETE', data }),
  NEWFUNC_BASE
}
