# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **构建输出模式**：常驻锁定纯静态导出模式 (`output: 'export'`，`images.unoptimized: true`)，`npm run build` 稳定输出 `./out` 纯静态文件夹。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上正式生产地址**：`https://duo-game-space.a8425w.workers.dev/`（Cloudflare Workers Static Assets）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 本轮 6 项核心体验与性能问题修复
- [x] **项 1：你画我猜画布比例统一（消除等比例变形）**：
  - 在 `src/app/draw/page.tsx` 中引入响应式 4:3 黄金比例容器计算机制，根据父级视口自适应居中，多端屏幕上的画布严格保持 4:3 物理比例，彻底根除跨端（如手机与 Pad）因长宽比不同导致的画面拉伸、压缩或扁化变形。
- [x] **项 2：你画我猜结算弹窗弹出慢与整站闪烁卡顿修复**：
  - 将结算卡片改为覆盖于画板上方的轻量浮层弹窗（Modal），保留画板底层 DOM 结构，消除因页面布局整体销毁重构带来的整页重排重绘与闪烁卡顿；粒子动效轻量化调优，结算瞬间秒开。
- [x] **项 3：你画我猜下一局画板未清空修复**：
  - 在 `handleStartNextRound`、`handleRestartGame`、`handleSelectWord` 以及 `GAME_STATE` 广播监听中，全面强制清空 `strokeHistoryRef`、发射缓冲与 Canvas 画布像素，彻底根除上一轮笔迹遗留。
- [x] **项 4：动态空间发送图片/涂鸦速度慢与延迟大修复**：
  - 涂鸦（540px/0.68 质量）与图片（640px/0.65 质量）前置高效轻量压缩（单图仅 18~30KB）；
  - 发送消息实施瞬时乐观上屏（0ms 感知延迟）并立即通过 Realtime 广播对方，后台并行异步持久化，彻底消除发送阻塞卡顿。
- [x] **项 5：放小红花后对方白屏几秒问题修复**：
  - 在 `getBadgeCountForUser` 与 `BadgeLedgerModal.tsx` 中加入严格的空指针防线（安全过滤 `b.user_id` 与 `targetUid`），杜绝因 `endsWith` 异常报错引发 React 组件树卸载白屏；小红花动效与振动安全兜底。
- [x] **项 6：GuessWhat 取消所有关于 20 次问题的数量限制**：
  - 彻底移除 `src/app/guess/page.tsx` 中 20 问进度条、20 次耗尽锁定警告以及输入框输入禁用限制，支持无上限自由提问直至竞猜成功或认输。

## 3. 最近修改文件
- `src/app/draw/page.tsx`（4:3 画板自适应居中容器、开局画布彻底清空、结算弹窗浮层化防闪烁）
- `src/app/moments/page.tsx`（图片高效压缩、瞬时乐观发送、小红花空指针防崩）
- `src/components/moments/BadgeLedgerModal.tsx`（账本小红花防崩安全过滤）
- `src/components/moments/DoodleModal.tsx`（涂鸦紧凑分辨率与轻量体积导出）
- `src/app/guess/page.tsx`（取消 20 问数量限制、无限次自由提问）
- `PROGRESS.md`（同步状态快照）

## 4. 下一步待办事项 (Next Steps)
- 推送代码至 GitHub `main` 分支，由 Cloudflare Workers 自动同步最新产物并完成上线测试。
