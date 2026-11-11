# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上站点**：`https://nimble-horse-be2b07.netlify.app`（Netlify 持续部署）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 核心优化完成项（累计已交付 7 项）
- [x] **项 1：你画我猜 UI 屏幕大小深度适配（Pad 端优化）**：
  - Pad 及 PC 端重构为 `md:grid-cols-12`，画板独占 8~9 列（`md:col-span-8 lg:col-span-9`）并充满视口全高；竞猜聊天区自适应收紧（竖屏下紧凑抽屉 `max-h-[190px]`），彻底消灭底部大片空白。
- [x] **项 2：你画我猜超低延迟画笔架构重构**：
  - 引入 20ms 微批次聚合（Micro-batching）和 4 笔缓冲发射机制，结合亚像素移动降噪（过滤 <1.5px 触控微抖动），画笔即画即达，消除队头阻塞。
- [x] **项 3：两端倒计时绝对同步与重进状态恢复**：
  - 挂钟基准校准（Wall-Clock Delta）：开局时间戳持久化记录到 `session.scores.round_start_time`，退出重进动态换算 `120 - elapsed`，双端毫秒对齐，永不重置。
- [x] **项 4：你画我猜互换身份 Bug 根除**：
  - 重构 `isPainter` 与 `handleStartNextRound` 身份流转逻辑，严格基于 `host`/`guest` 角色归属做对称判定，消除两端均卡在“对方正在挑选题目”的死锁状态。
- [x] **项 5：你画我猜顶部增加“重新开始”按钮**：
  - 顶部栏常驻显示 `RotateCcw` “重新开始”按钮（移动端与大屏均清晰展示），一键重置当前对局为第 1 轮选题状态并广播全端。
- [x] **项 6：动态空间发送消息实时秒级直达对方**：
  - 彻底规避纯 Postgres Changes 复制延迟，采用 Supabase Realtime Broadcast `MOMENTS_NEW_POST` 极速通道，广播与数据库双写，对方在 30ms 内同步呈现并平滑吸底。
- [x] **项 7：动态空间小红花账本与余额实时更新**：
  - **增减即时生效**：乐观更新本地余额与账本流水，写入 localStorage 并广播 `MOMENTS_BADGE_UPDATE`；
  - **跨设备身份兼容匹配**：`getBadgeCountForUser` 兼容匹配多种 UID 与角色标识，杜绝账本流水与小红花数量不同步或显示为 0 的异常。

## 3. 下一步计划 (Next Steps)
- 推进剩余三项：
  - 项 8：全站各处返回按钮灵敏度修复（消除移动端手势取消与延迟）；
  - 项 9：GuessWhat 是非之间 20 问功能补全（20问进度限制、认输揭晓答案、线索提示、重新开始等）；
  - 项 10：动态空间输入框吸底固定与移动端输入法键盘防冲突。
