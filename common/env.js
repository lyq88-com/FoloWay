/**
 * 运行环境地址配置 —— 全项目「电脑 IP」的唯一出处
 *
 * 背景：
 *   后端地址原先硬编码在 common/request.js（H5 分支用相对路径，App 分支写死
 *   http://172.20.10.3:8000），同一个 IP 还散落在别处。换 WiFi / 换电脑后手机端
 *   全部连不上，且要人肉去好几个文件里找。
 *
 * 现在：
 *   - 只在这里写一次 LAN_HOST，request.js 等统一从这里取。
 *   - H5 一律用相对路径（走 vite devServer proxy，不经局域网，永远不会因为 IP 变而挂）。
 *   - App / 微信小程序 必须用局域网绝对地址，换网络时执行：
 *       node tools/sync-lan-host.js
 *     （或双击 tools/sync-lan-host.bat）自动把本机当前 IPv4 写回本文件。
 *
 * 注意：uni-app 的条件编译（#ifdef / #ifndef）在 .js 文件里同样生效，
 *       所以 H5 / 非 H5 两套值各自只会保留一份。
 */

// #ifdef H5
// H5：相对路径，由 vite devServer proxy 转发到 127.0.0.1:8000（见 vite.config.js / manifest.json）
export const API_BASE = '/api/v1'
export const STATIC_BASE = '/uploads'
export const LAN_HOST = ''
// #endif

// #ifndef H5
// 真机 / App / 小程序需要绝对地址：
//   优先读构建环境变量 VITE_API_ORIGIN（上线时设为 https://your-domain.com）；
//   未配置时退回局域网调试地址，换 WiFi 后改这一行即可。
const LAN_HOST_VALUE = import.meta.env.VITE_API_ORIGIN || 'http://10.225.47.219:8000'
export const LAN_HOST = LAN_HOST_VALUE
export const API_BASE = LAN_HOST_VALUE + '/api/v1'
export const STATIC_BASE = LAN_HOST_VALUE + '/uploads'
// #endif

export default { API_BASE, STATIC_BASE, LAN_HOST }
