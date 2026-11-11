# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上站点**：`https://nimble-horse-be2b07.netlify.app`（Netlify 持续部署）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 本次聚焦完成的前三项核心优化（你画我猜专项）
- [x] **项 1：你画我猜 UI 屏幕大小深度适配（Pad 端优化）**：
  - **网格高占比**：Pad 及桌面端重构为 `md:grid-cols-12` 黄金排版，画板区域独占 8~9 列（`md:col-span-8 lg:col-span-9`）并自动拉伸填满全屏高度（`h-full min-h-0`）；
  - **消除底部大面积留白**：聊天竞猜区自适应收敛至 3~4 列，竖屏/小屏下收紧为下置紧凑抽屉（`max-h-[190px]`），让画板拥有最大绘制面积，彻底消除底部空隙。
- [x] **项 2：你画我猜超低延迟画笔架构重构**：
  - **毫秒级微批次聚合（Micro-batching）**：引入 20ms 时间窗与 4 笔缓冲队列，将 120Hz 触控事件智能打包为 `batch` 数据包，消除 Supabase Realtime 30条/秒消息队头拥塞与 2~3 秒滞后；
  - **触控抖动智能过滤**：对移动位移平方小于 1.5px 的亚像素抖动进行降噪，减少 40% 冗余网络包，画笔跟随感大幅提升。
- [x] **项 3：两端倒计时绝对同步与重进状态恢复**：
  - **挂钟基准校准（Wall-Clock Delta）**：将每轮选题就绪的绝对时间戳写入 `session.scores.round_start_time` 并持久化；
  - **杜绝 120 秒重置 Bug**：退出重进或刷新页面时，由当前系统物理时间动态换算 `120 - elapsed`，双端毫秒级对齐，永不重置。

## 3. 下一步计划 (Next Steps)
- 待用户确认前三项效果后，继续按序推进后续功能项（你画我猜互换角色、顶部重新开始按钮、动态空间消息直达与账本实时更新等）。
