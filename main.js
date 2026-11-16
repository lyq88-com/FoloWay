import { createSSRApp } from 'vue'
import App from './App.vue'
import store from './store'
import { applyTheme, getCurrentTheme, checkAutoTheme } from '@/common/theme'

export function createApp() {
  const app = createSSRApp(App)
  app.use(store)
  // 页面级主题兜底：导航栏是页面级资源，App.vue 的 onShow 是应用级生命周期，
  // 无法覆盖"页面切换后新页面的导航栏颜色"。每个页面 onShow 时应用一次主题。
  // 注：全局 mixin 会让所有组件实例都收到 onShow，用页面栈顶层比对过滤出页面。
  app.mixin({
    onShow() {
      const pages = getCurrentPages()
      const cur = pages[pages.length - 1]
      if (cur && cur.$vm === this) {
        try {
          const autoTheme = checkAutoTheme()
          applyTheme(autoTheme || getCurrentTheme())
        } catch (e) { /* 主题应用失败不影响页面展示 */ }
      }
    }
  })
  return {
    app
  }
}
