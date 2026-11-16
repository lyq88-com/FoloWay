import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// vite.config.js 必须位于项目根目录（即 UNI_INPUT_DIR），
// uni CLI 才会加载自定义配置；否则回退到插件内置默认配置。
export default defineConfig({
  plugins: [uni()],
  // 使用 modern sass API，消除 legacy-js-api 弃用警告
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern'
      }
    }
  },
  server: {
    port: 8080,
    host: '0.0.0.0',
    // H5 开发期代理：
    //  /api/v1/* /api/newfunc/*                → FastAPI 业务后端（端口 8000）
    // 【2026-11-15 统一账号 & AI 链路】
    //  - 已移除 /api/register、/api/login → Flask 5000 的代理（Flask 写独立 user 表，会造成双账号体系）；
    //  - 已移除 /ai → Flask 5001 的代理（AI 对话统一走 FastAPI /api/v1/chat/*）；
    //  - server-flask/ 已彻底移除（2026-11-16），仅保留 FastAPI 单后端。
    // 真机/小程序下不走此 proxy，需在 api/auth.js 中改用绝对地址
    // 注意：target 必须用 127.0.0.1 而不是 localhost。
    // Node 17+ 将 localhost 解析为 IPv6 (::1)，而后端只监听 IPv4 (0.0.0.0)，
    // 用 localhost 会导致代理连接失败返回 500。
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      // 【newfunc 增量功能】独立接口前缀，转发到同一 FastAPI 后端（追加规则，不影响上面任何一条）
      // 注意必须带尾部斜杠：否则会误匹配前端模块文件 /api/newfunc.js，
      // 把它代理到后端导致模块加载 500、页面白屏
      '/api/newfunc/': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      // 静态资源（头像/朋友圈/宝物图等）。后端 STATIC_BASE_URL 留空时返回相对路径
      // /uploads/xxx，H5 由本代理转发到 FastAPI，换 WiFi 也不会失效。
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})
