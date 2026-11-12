# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **构建输出模式**：常驻锁定纯静态导出模式 (`output: 'export'`，`images.unoptimized: true`)，`npm run build` 稳定输出 `./out` 纯静态文件夹。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上托管平台**：**Cloudflare Workers Static Assets**（自动拉取 GitHub `main` 分支部署 `./out`）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 固化的开发规范与架构铁律
- **100% 兼容 Next.js 静态导出**：所有业务逻辑与页面必须可在浏览器客户端直接运行。
- **严禁后端动态路由与 SSR**：严禁创建 `app/api`、`pages/api`，严禁使用任何服务端动态渲染特性或 Node.js 服务端专用依赖。
- **客户端直连 Supabase**：所有数据持久化、增删改查、Realtime Broadcast 实时广播双写均由客户端调用 `@supabase/supabase-js` 完成。
- **规约落盘位置**：已在 `.agents/rules/architecture.md` 与根目录 `AGENTS.md` 永久固化。

## 3. 核心功能完成度 (100% Complete)
- [x] **你画我猜 UI 屏幕适配（Pad 端优化）**：画板独占 8~9 列（`md:col-span-8 lg:col-span-9`）并充满视口全高。
- [x] **你画我猜超低延迟画笔架构重构**：20ms 微批次聚合 + 4 笔缓冲发射 + 亚像素移动降噪。
- [x] **两端倒计时绝对同步与重进状态恢复**：挂钟基准校准（Wall-Clock Delta），重进动态换算 `120 - elapsed`。
- [x] **角色互换与选题死锁脱困机制（双保险）**：`initOrFetchSession` 自愈重置 + 等待页【换我来画 / 换我出题】【重置本局状态】。
- [x] **顶部导航常驻“重新开始”按钮**：各游戏顶部栏常驻 `RotateCcw`，一键重置为第 1 轮选题。
- [x] **动态空间发送消息实时秒级直达**：Supabase Broadcast `MOMENTS_NEW_POST` 通道，广播与数据库双写。
- [x] **动态空间小红花账本与余额实时更新**：乐观更新本地余额与流水，跨设备身份兼容匹配。
- [x] **全站返回/退出按钮灵敏度根治**：原生 `<button>` + `router.push('/lobby')`，剔除 `Link` 手势冲突。
- [x] **GuessWhat 20 问功能全量补全**：20 问限制与进度条、认输揭晓、线索提示、换一批、角色互换防卡死。
- [x] **动态空间底部输入框吸底与输入法防冲突**：`sticky bottom-0 z-20` + `env(safe-area-inset-bottom)` + `visualViewport` 监听。

## 4. 下一步待办事项 (Next Steps)
- 用户提供具体的 Cloudflare 线上域名后，将其登记并用于后续全量 E2E 自动化测试。
