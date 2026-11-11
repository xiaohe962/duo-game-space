# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上站点**：`https://nimble-horse-be2b07.netlify.app`（Netlify 持续部署）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 核心优化 10 项状态 (100% Complete)
- [x] **项 1：你画我猜 UI 屏幕大小深度适配（Pad 端优化）**：画板独占 8~9 列（`md:col-span-8 lg:col-span-9`）并充满视口全高；竞猜聊天区自适应收紧，消灭底部空白。
- [x] **项 2：你画我猜超低延迟画笔架构重构**：20ms 微批次聚合（Micro-batching）和 4 笔缓冲发射机制，结合亚像素移动降噪，画笔即画即达。
- [x] **项 3：两端倒计时绝对同步与重进状态恢复**：挂钟基准校准（Wall-Clock Delta），退出重进动态换算 `120 - elapsed`，双端毫秒对齐。
- [x] **项 4：角色互换与选题死锁脱困机制（双保险）**：
  - **自愈重置**：`initOrFetchSession` 自动检测无效旧 ID 并自愈校正；
  - **等待页主动接管与重置**：在“对方正在挑选题目...”界面新增【换我来画 / 换我出题】与【重置本局状态】按钮，两端任何一方均可一键接管身份或重置会话，彻底打破死锁。
- [x] **项 5：顶部导航常驻“重新开始”按钮**：各游戏顶部栏常驻 `RotateCcw` 重新开始按钮，一键将当前对局重置为第 1 轮选题状态。
- [x] **项 6：动态空间发送消息实时秒级直达对方**：Supabase Realtime Broadcast `MOMENTS_NEW_POST` 极速通道，广播与数据库双写，30ms 极速呈现。
- [x] **项 7：动态空间小红花账本与余额实时更新**：乐观更新本地余额与账本流水，跨设备身份兼容匹配，杜绝账本流水与数量不同步。
- [x] **项 8：全站所有返回/退出按钮灵敏度根治**：升级为原生 `<button>`，剔除产生手势冲突与延迟的 `Link`，加入 `touch-manipulation select-none cursor-pointer` 与 `router.push('/lobby')`，点按秒开。
- [x] **项 9：GuessWhat 是非之间 20 问功能全量补全**：20 问限制与进度条、猜词人认输揭晓答案、出题人提供线索提示、重新开始与换一批、角色互换防卡死。
- [x] **项 10：动态空间底部输入框吸底固定与输入法防冲突**：容器设为 `sticky bottom-0 z-20` 并自适应 `env(safe-area-inset-bottom)`；输入框聚焦吸底平滑滚动，结合 `visualViewport` 动态监听防键盘遮挡。

## 3. 最近修改文件
- `src/app/draw/page.tsx`（新增 `handleTakeOverPainter`、等待卡片新增接管画师与重置按钮）
- `src/app/guess/page.tsx`（新增 `handleTakeOverMaster`、等待卡片新增接管出题人与重置按钮）
- `src/components/Navbar.tsx`（全站返回按钮高灵敏重构）
- `src/app/moments/page.tsx`（输入框吸底、Realtime 广播双写）
- `src/components/moments/BadgeLedgerModal.tsx`（小红花跨端 ID 兼容）
- `src/lib/types/index.ts`（补充 `round_start_time` 属性支持）

## 4. 下一步待办事项 (Next Steps)
- 推送代码至远程仓库，触发 Netlify 自动部署，并在生产环境中直接操作验证。
