# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **构建输出模式**：已开启纯静态导出模式 (`output: 'export'`，`images.unoptimized: true`)，`npm run build` 生成 `out/` 静态文件夹。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上站点**：`https://nimble-horse-be2b07.netlify.app`（Netlify 静态托管，发布目录 `out`）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 静态导出配置与 API 路由检查结论
- **服务端 API 路由检查**：确认项目内无任何 `app/api`、`src/app/api` 或动态后端路由，所有网络通信均走客户端直接调用 Supabase 客户端 SDK。
- **`next.config.mjs` 配置**：成功配置 `output: 'export'` 与 `images: { unoptimized: true }`。
- **`netlify.toml` 适配**：将 `publish` 目录更新为 `out`，并移除不再适用的 SSR 插件 `@netlify/plugin-nextjs`。
- **打包验证**：`npm run build` 成功完成全量 8 个静态页面的预渲染并输出至 `out/`（含 `index.html`、`draw.html`、`guess.html`、`lobby.html`、`moments.html`、`404.html`）。

## 3. 核心优化 10 项状态 (代码层面 100% Complete)
- [x] **项 1：你画我猜 UI 屏幕适配（Pad 端优化）**：画板独占 8~9 列（`md:col-span-8 lg:col-span-9`）并充满视口全高。
- [x] **项 2：你画我猜超低延迟画笔架构重构**：20ms 微批次聚合 + 4 笔缓冲发射 + 亚像素移动降噪。
- [x] **项 3：两端倒计时绝对同步与重进状态恢复**：挂钟基准校准（Wall-Clock Delta），重进动态换算 `120 - elapsed`。
- [x] **项 4：角色互换与选题死锁脱困机制（双保险）**：`initOrFetchSession` 自愈重置 + 等待页【换我来画 / 换我出题】【重置本局状态】。
- [x] **项 5：顶部导航常驻“重新开始”按钮**：各游戏顶部栏常驻 `RotateCcw`，一键重置为第 1 轮选题。
- [x] **项 6：动态空间发送消息实时秒级直达**：Supabase Broadcast `MOMENTS_NEW_POST` 通道，广播与数据库双写。
- [x] **项 7：动态空间小红花账本与余额实时更新**：乐观更新本地余额与流水，跨设备身份兼容匹配。
- [x] **项 8：全站返回/退出按钮灵敏度根治**：原生 `<button>` + `router.push('/lobby')`，剔除 `Link` 手势冲突。
- [x] **项 9：GuessWhat 20 问功能全量补全**：20 问限制与进度条、认输揭晓、线索提示、换一批、角色互换防卡死。
- [x] **项 10：动态空间底部输入框吸底与输入法防冲突**：`sticky bottom-0 z-20` + `env(safe-area-inset-bottom)` + `visualViewport` 监听。

## 4. 最近修改文件
- `next.config.mjs`（添加 `output: 'export'` 与 `images.unoptimized: true`）
- `netlify.toml`（修改 `publish = "out"`，移除 SSR 插件）
- `PROGRESS.md`（同步状态快照）

## 5. 下一步待办事项 (Next Steps)
- 提交并推送最新静态导出配置至 GitHub `main` 分支。
