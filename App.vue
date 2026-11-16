<script>
import { applyTheme, getCurrentTheme, checkAutoTheme, getLightOpacity, getTimeBasedLightEffect, lightEffects } from '@/common/theme'
import { initCustomCharacters } from '@/common/custom-character-init.js'
import { ensureActivePartner } from '@/common/ai-partner.js'
import aiService from '@/common/ai-service.js'
// 【newfunc 增量】推送客户端：通知点击跳转 / CID 绑定 / 未读轮询兜底（独立文件，零侵入）
import { initPushClient } from '@/common/push-client.js'

export default {
  data() {
    return {
      eyeCareTimer: null,
      // ↓↓↓ 安全合规批次 ↓↓↓ 青少年模式使用时长提醒定时器
      teenTimer: null
      // ↑↑↑ 新增结束 ↑↑↑
    }
  },
  onLaunch() {
    console.log('循途 启动')
    try {
      this.$store.commit('initFromStorage')
      // 恢复自定义AI伙伴到运行时注册表（独立模块，不影响原有逻辑）
      initCustomCharacters(this.$store)
      // 校正可能失效的当前伙伴（删除自定义角色 / 旧缓存 / 换账号），避免全站形象不同步
      ensureActivePartner()
      // 初始化 AI 服务（必须传入 store，否则 onCheckinSuccess 等接口会失败）
      aiService.initAIService(this.$store)
      console.log('[App] AI Service 已初始化')
    } catch (e) {
      console.error('恢复登录状态失败', e)
    }
    try {
      this.applyCurrentTheme()
      this.initGlobalStyles()
      this.initEyeCare()
    } catch (e) {
      console.error('初始化失败', e)
    }
    // 【newfunc 增量】启动推送客户端（内部自带 try-catch，失败不影响主流程）
    try {
      initPushClient()
    } catch (e) {
      console.warn('[App] 推送客户端初始化失败(已忽略)', e)
    }
  },
  onShow() {
    console.log('App Show')
    try {
      this.applyCurrentTheme()
      this.initGlobalStyles()
      this.startEyeCareTimer()
      // ↓↓↓ 安全合规批次：青少年模式 30 分钟使用时长提醒 ↓↓↓
      this.startTeenTimer()
      // ↑↑↑ 新增结束 ↑↑↑
    } catch (e) {
      console.error('应用主题失败', e)
    }
  },
  onHide() {
    console.log('App Hide')
    this.stopEyeCareTimer()
    // ↓↓↓ 安全合规批次 ↓↓↓
    this.stopTeenTimer()
    // ↑↑↑ 新增结束 ↑↑↑
  },
  onUnload() {
    this.stopEyeCareTimer()
    this.stopTeenTimer()
  },
  methods: {
    applyCurrentTheme() {
      const autoTheme = checkAutoTheme()
      if (autoTheme) {
        applyTheme(autoTheme)
        return
      }
      const theme = getCurrentTheme()
      applyTheme(theme)
    },
    initGlobalStyles() {
      if (typeof document === 'undefined') return
      
      const root = document.documentElement
      const page = document.querySelector('page')
      
      const fontSize = uni.getStorageSync('font_size') || 16
      const lineHeight = uni.getStorageSync('line_height') || 1.5
      const filterType = uni.getStorageSync('bg_filter_type') || 'none'
      const filterOpacity = parseFloat(uni.getStorageSync('bg_filter_opacity')) || 0.3
      
      let filterStyle = ''
      switch (filterType) {
        case 'blur':
          filterStyle = `blur(${filterOpacity * 5}px)`
          break
        case 'warm':
          filterStyle = `sepia(${filterOpacity}) saturate(${1 + filterOpacity * 0.5})`
          break
        case 'mist':
          filterStyle = `brightness(${1 + filterOpacity * 0.2}) contrast(${1 - filterOpacity * 0.1})`
          break
        case 'paper':
          filterStyle = `sepia(${filterOpacity * 0.3}) contrast(${1 - filterOpacity * 0.05})`
          break
      }
      
      const lightEffect = getTimeBasedLightEffect()
      const effectConfig = lightEffects[lightEffect]
      const lightOpacity = getLightOpacity()
      
      if (root) {
        root.style.setProperty('--font-size', `${fontSize}px`)
        root.style.setProperty('--line-height', lineHeight)
        root.style.setProperty('--bg-filter', filterStyle)
        root.style.setProperty('--light-gradient', effectConfig?.gradient || '')
        root.style.setProperty('--light-opacity', lightOpacity)
      }
      if (page) {
        page.style.setProperty('--font-size', `${fontSize}px`)
        page.style.setProperty('--line-height', lineHeight)
        page.style.setProperty('--bg-filter', filterStyle)
        page.style.setProperty('--light-gradient', effectConfig?.gradient || '')
        page.style.setProperty('--light-opacity', lightOpacity)
      }
    },
    initEyeCare() {
      const enabled = uni.getStorageSync('eye_care_enabled') === 'true'
      if (enabled) {
        this.startEyeCareTimer()
      }
    },
    startEyeCareTimer() {
      this.stopEyeCareTimer()
      const interval = parseInt(uni.getStorageSync('eye_care_interval')) || 45
      this.eyeCareTimer = setInterval(() => {
        this.showEyeCareReminder()
      }, interval * 60 * 1000)
    },
    stopEyeCareTimer() {
      if (this.eyeCareTimer) {
        clearInterval(this.eyeCareTimer)
        this.eyeCareTimer = null
      }
    },
    showEyeCareReminder() {
      uni.showModal({
        title: '👁️ 护眼提醒',
        content: '已经学习很久了，休息一下眼睛吧！',
        confirmText: '好的，休息一下',
        confirmColor: '#2E5643',
        showCancel: false
      })
    },
    // ↓↓↓ 安全合规批次：青少年模式使用时长提醒（每30分钟一次） ↓↓↓
    startTeenTimer() {
      this.stopTeenTimer()
      let teenMode = false
      try {
        teenMode = uni.getStorageSync('pref_teen_mode') === 'true'
      } catch (e) { /* 静默 */ }
      if (!teenMode) return
      this.teenTimer = setInterval(() => {
        uni.showToast({
          title: '⏰ 已连续使用30分钟，休息一下吧',
          icon: 'none',
          duration: 3000
        })
      }, 30 * 60 * 1000)
    },
    stopTeenTimer() {
      if (this.teenTimer) {
        clearInterval(this.teenTimer)
        this.teenTimer = null
      }
    }
    // ↑↑↑ 新增结束 ↑↑↑
  }
}
</script>

<style>
/* === 设计稿 1:1 还原样式（仅作用于 .xt-page 内，不影响原有页面） === */
@import './common/xt-design.css';
/* === V7 纸感手帐全局基座：统一全站纸感色板（页面 scoped 样式优先级更高） === */
@import './common/v7-paper.css';

/* === 全局 CSS 变量(深色模式增强) === */
page {
  min-height: 100vh;
  background-color: var(--bg-color, #FFFCF6);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: var(--font-size, 16px);
  line-height: var(--line-height, 1.5);
  filter: var(--bg-filter, none);
  --primary-color: #2E5643;
  --primary-light: #9CBFAA;
  --bg-color: #FFFCF6;
  --bg-card: #FFFFFF;
  --bg-secondary: #F6F1E7;
  --bg-mask: rgba(34, 48, 42, 0.5);
  --text-primary: #22302A;
  --text-secondary: #6A776E;
  --text-light: #AEB6AE;
  --border-color: #E7E1D4;
  --nav-bg: #FFFCF6;
  --nav-text: #22302A;
  --tab-bar-bg: #FFFCF6;
  --success-color: #44705A;
  --warning-color: #C08A56;
  --danger-color: #E0574F;
  --shadow-sm: 0 2rpx 8rpx rgba(34, 48, 42, 0.04);
  --shadow-md: 0 8rpx 24rpx rgba(34, 48, 42, 0.07);
  --shadow-lg: 0 20rpx 48rpx rgba(34, 48, 42, 0.12);
  --radius-sm: 12rpx;
  --radius-md: 24rpx;
  --radius-lg: 32rpx;
  --font-size: 16px;
  --line-height: 1.5;
  --bg-filter: none;
  --light-gradient: none;
  --light-opacity: 0.5;
  --anim-fast: 200ms;
  --anim-normal: 300ms;
  --anim-slow: 500ms;
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
:root {
  --primary-color: #2E5643;
  --primary-light: #9CBFAA;
  --bg-color: #FFFCF6;
  --bg-card: #FFFFFF;
  --bg-secondary: #F6F1E7;
  --bg-mask: rgba(34, 48, 42, 0.5);
  --text-primary: #22302A;
  --text-secondary: #6A776E;
  --text-light: #AEB6AE;
  --border-color: #E7E1D4;
  --nav-bg: #FFFCF6;
  --nav-text: #22302A;
  --tab-bar-bg: #FFFCF6;
  --success-color: #44705A;
  --warning-color: #C08A56;
  --danger-color: #E0574F;
  --shadow-sm: 0 2rpx 8rpx rgba(34, 48, 42, 0.04);
  --shadow-md: 0 8rpx 24rpx rgba(34, 48, 42, 0.07);
  --shadow-lg: 0 20rpx 48rpx rgba(34, 48, 42, 0.12);
  --radius-sm: 12rpx;
  --radius-md: 24rpx;
  --radius-lg: 32rpx;
  --font-size: 16px;
  --line-height: 1.5;
  --bg-filter: none;
  --light-gradient: none;
  --light-opacity: 0.5;
  --anim-fast: 200ms;
  --anim-normal: 300ms;
  --anim-slow: 500ms;
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* === 全局动画工具类 === */
/* === 全局按钮统一工具类（配合 uni.scss 中 $btn-* 变量） === */
/* 主按钮：主题绿实底 */
.xt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--btn-height, 88rpx);
  border-radius: var(--btn-radius, 44rpx);
  font-size: var(--btn-font-size, 30rpx);
  font-weight: 600;
  color: #FFFFFF;
  background: var(--primary-color, #2E5643);
  transition: opacity var(--anim-fast, 200ms) var(--ease-smooth), transform var(--anim-fast, 200ms) var(--ease-smooth);
}
.xt-btn:active {
  opacity: 0.85;
  transform: scale(0.97);
}
.xt-btn.xt-btn-disabled,
.xt-btn[disabled] {
  opacity: 0.5;
  pointer-events: none;
}
/* 描边按钮：绿色描边次级操作 */
.xt-btn-outline {
  color: var(--primary-color, #2E5643);
  background: transparent;
  border: 2rpx solid var(--primary-color, #2E5643);
}
/* 危险按钮：红色实底（删除等不可逆操作） */
.xt-btn-danger {
  background: var(--danger-color, #FF6B6B);
}
/* 小尺寸按钮 */
.xt-btn-sm {
  height: var(--btn-height-sm, 64rpx);
  font-size: var(--btn-font-size-sm, 24rpx);
  padding: 0 28rpx;
}

/* === 全局输入框统一工具类（配合 uni.scss 中 $input-* 变量） === */
.xt-input {
  height: var(--input-height, 88rpx);
  border-radius: var(--input-radius, 20rpx);
  background: var(--bg-secondary, #F5F6F7);
  border: 2rpx solid var(--border-color, #E0E0E0);
  font-size: var(--input-font-size, 28rpx);
  color: var(--text-primary, #333333);
  padding: 0 24rpx;
  transition: border-color var(--anim-fast, 200ms) var(--ease-smooth);
}
.xt-input:focus {
  border-color: var(--primary-color, #2E5643);
}
.xt-input::placeholder {
  color: var(--input-placeholder, #B0B0B5);
}

/* === 循途 v2.4 设计语言工具类（纸白 · 墨绿 · 苔绿 · 铜） === */
/* 卡片：白底 + 苔绿内描边 + 极轻暖阴影 */
.xt-card {
  background: var(--bg-card, #FFFFFF);
  border-radius: var(--radius-lg, 32rpx);
  box-shadow: var(--shadow-md), inset 0 0 0 1rpx rgba(140, 174, 154, 0.12);
}
/* 分类胶囊 */
.xt-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--text-secondary, #6A776E);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1rpx rgba(140, 174, 154, 0.16);
  transition: background var(--anim-fast, 200ms) var(--ease-smooth), color var(--anim-fast, 200ms) var(--ease-smooth);
}
.xt-chip-on {
  color: #F8F3E7;
  background: var(--primary-color, #2E5643);
  box-shadow: none;
}
/* 铜色小标 */
.xt-tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  color: #8A5D33;
  background: rgba(192, 138, 86, 0.14);
}
/* 分区标题 */
.xt-sec-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-primary, #22302A);
  letter-spacing: 0.4rpx;
}

.ahp-fade-in {
  animation: ahp-fade-in var(--anim-normal) var(--ease-smooth) both;
}
.ahp-fade-in-up {
  animation: ahp-fade-in-up var(--anim-normal) var(--ease-smooth) both;
}
.ahp-fade-in-down {
  animation: ahp-fade-in-down var(--anim-normal) var(--ease-smooth) both;
}
.ahp-fade-in-left {
  animation: ahp-fade-in-left var(--anim-normal) var(--ease-smooth) both;
}
.ahp-fade-in-right {
  animation: ahp-fade-in-right var(--anim-normal) var(--ease-smooth) both;
}
.ahp-slide-up {
  animation: ahp-slide-up var(--anim-normal) var(--ease-smooth) both;
}
.ahp-slide-down {
  animation: ahp-slide-down var(--anim-normal) var(--ease-smooth) both;
}
.ahp-scale-in {
  animation: ahp-scale-in var(--anim-normal) var(--ease-spring) both;
}
.ahp-bounce-in {
  animation: ahp-bounce-in var(--anim-normal) var(--ease-spring) both;
}
.ahp-pulse {
  animation: ahp-pulse 2s ease-in-out infinite;
}
.ahp-breathe {
  animation: ahp-breathe 3s ease-in-out infinite;
}
.ahp-shake {
  animation: ahp-shake 400ms ease-in-out;
}
.ahp-rotate {
  animation: ahp-rotate 1s linear infinite;
}
.ahp-glow {
  animation: ahp-glow 2s ease-in-out infinite;
}
.ahp-shimmer {
  animation: ahp-shimmer 2s linear infinite;
}
.ahp-float {
  animation: ahp-float 3s ease-in-out infinite;
}

@keyframes ahp-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ahp-fade-in-up {
  from { opacity: 0; transform: translateY(30rpx); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ahp-fade-in-down {
  from { opacity: 0; transform: translateY(-30rpx); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ahp-fade-in-left {
  from { opacity: 0; transform: translateX(-30rpx); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes ahp-fade-in-right {
  from { opacity: 0; transform: translateX(30rpx); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes ahp-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes ahp-slide-down {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}
@keyframes ahp-scale-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes ahp-bounce-in {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
@keyframes ahp-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
}
@keyframes ahp-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes ahp-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10rpx); }
  75% { transform: translateX(10rpx); }
}
@keyframes ahp-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes ahp-glow {
  0%, 100% { box-shadow: 0 0 20rpx rgba(107, 142, 123, 0.3); }
  50% { box-shadow: 0 0 40rpx rgba(107, 142, 123, 0.6); }
}
@keyframes ahp-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes ahp-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12rpx); }
}

/* === 深色模式全局覆盖 === */
/* 当 data-theme="dark" 时, 覆盖页面中常见的硬编码浅色值 */
[data-theme="dark"] page,
page[data-theme="dark"] {
  background-color: #1A1A2E !important;
  color: #FFFFFF !important;
}

/* 白色卡片背景 -> 深色卡片 */
[data-theme="dark"] .card,
[data-theme="dark"] .card-bg,
[data-theme="dark"] .white-bg,
page[data-theme="dark"] .card,
page[data-theme="dark"] .card-bg,
page[data-theme="dark"] .white-bg {
  background-color: #16213E !important;
  color: #FFFFFF !important;
}

/* 常见浅色背景覆盖 */
[data-theme="dark"] .bg-white,
[data-theme="dark"] .bg-light,
[data-theme="dark"] .bg-gray,
[data-theme="dark"] .bg-grey,
page[data-theme="dark"] .bg-white,
page[data-theme="dark"] .bg-light,
page[data-theme="dark"] .bg-gray,
page[data-theme="dark"] .bg-grey {
  background-color: #16213E !important;
}

/* 深色文字 -> 浅色文字 */
[data-theme="dark"] .text-dark,
[data-theme="dark"] .text-black,
page[data-theme="dark"] .text-dark,
page[data-theme="dark"] .text-black {
  color: #FFFFFF !important;
}

/* 灰色文字调整 */
[data-theme="dark"] .text-gray,
[data-theme="dark"] .text-grey,
[data-theme="dark"] .text-secondary,
[data-theme="dark"] .text-light,
page[data-theme="dark"] .text-gray,
page[data-theme="dark"] .text-grey,
page[data-theme="dark"] .text-secondary,
page[data-theme="dark"] .text-light {
  color: #A0A0B0 !important;
}

/* 边框颜色 */
[data-theme="dark"] .border,
[data-theme="dark"] .border-top,
[data-theme="dark"] .border-bottom,
[data-theme="dark"] .border-light,
page[data-theme="dark"] .border,
page[data-theme="dark"] .border-top,
page[data-theme="dark"] .border-bottom,
page[data-theme="dark"] .border-light {
  border-color: #2A2A4A !important;
}

/* 弹窗/遮罩层 */
[data-theme="dark"] .modal,
[data-theme="dark"] .popup,
[data-theme="dark"] .dialog,
[data-theme="dark"] .sheet,
page[data-theme="dark"] .modal,
page[data-theme="dark"] .popup,
page[data-theme="dark"] .dialog,
page[data-theme="dark"] .sheet {
  background-color: #16213E !important;
  color: #FFFFFF !important;
}

/* 输入框 */
[data-theme="dark"] input,
[data-theme="dark"] textarea,
[data-theme="dark"] .input,
[data-theme="dark"] .input-box,
page[data-theme="dark"] input,
page[data-theme="dark"] textarea,
page[data-theme="dark"] .input,
page[data-theme="dark"] .input-box {
  background-color: #0F1626 !important;
  color: #FFFFFF !important;
  border-color: #2A2A4A !important;
}

/* 阴影调整 - 深色模式下减弱 */
[data-theme="dark"] .shadow,
[data-theme="dark"] .shadow-sm,
[data-theme="dark"] .shadow-md,
[data-theme="dark"] .shadow-lg,
page[data-theme="dark"] .shadow,
page[data-theme="dark"] .shadow-sm,
page[data-theme="dark"] .shadow-md,
page[data-theme="dark"] .shadow-lg {
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.4) !important;
}
</style>
