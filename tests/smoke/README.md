# 页面级冒烟回归

用 Playwright 驱动**本机已安装的 Edge / Chrome**（不下载浏览器内核），逐页检查核心页面是否还能正常渲染。

## 前置

- 前端 dev server：`cd frontend && npm run dev:h5`（http://127.0.0.1:8080）
- 后端：http://127.0.0.1:8000
- 测试账号：默认 `idea_test_a / test123456`

## 运行

```powershell
cd frontend
npm run test:smoke
```

可选环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SMOKE_BASE` | `http://127.0.0.1:8080` | 前端地址 |
| `SMOKE_API` | `http://127.0.0.1:8000` | 后端地址 |
| `SMOKE_USER` | `idea_test_a` | 登录用户名 |
| `SMOKE_PASS` | `test123456` | 登录密码 |

## 判定规则

- **失败**：页面白屏 / 渲染超时 / 关键文案缺失 / 导航异常
- **不判失败**：控制台 error 日志（仅汇总输出，uni-app 开发模式噪音较多）
- 失败页面截图保存在 `tests/smoke/.artifacts/`

## 维护

页面清单在 `pages.smoke.mjs` 的 `PAGES` 数组中，新增页面时补一行：

```js
{ name: '页面名', path: 'pages/xxx/xxx', expect: ['页面标题文案'] }
```

只做只读检查，不要加入购买、发布、删除等写操作，避免污染测试账号。
