# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **构建输出模式**：常驻锁定纯静态导出模式 (`output: 'export'`，`images.unoptimized: true`)，`npm run build` 稳定输出 `./out` 纯静态文件夹。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上正式生产地址**：`https://duo-game-space.a8425w.workers.dev/`（Cloudflare Workers Static Assets，实测全部功能已最新上线）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 线上各模块实测同步结论 (All Verified Online)
- **【GitHub 仓库同步】**：本地与远程 `origin/main` 严格一致（最新 Commit `1041b15`）。
- **【你画我猜】**：
  - [x] 顶部栏常驻【重新开始】按钮已生效；
  - [x] 等待选题卡片上的【换我来画 (切换画师)】与【重置本局状态】已实测存在并上线；
  - [x] 画板 Pad 屏幕自适应与 20ms 微批画笔代码已同步。
- **【GuessWhat 20 问】**：
  - [x] 等待选题卡片上的【换我出题 (切换出题人)】与【重置本局状态】已实测存在并上线；
  - [x] 猜词人【认输 / 揭晓答案】、出题人【提供线索提示】及 20 问限制代码已同步。
- **【动态空间】**：
  - [x] `MOMENTS_NEW_POST` Supabase Realtime 秒级广播通道已在线生效；
  - [x] 底部输入框 `sticky bottom-0` 吸底与 `visualViewport` 防软键盘遮挡代码已在线生效；
  - [x] 小红花跨端 ID 兼容与账本流水修复已同步。
- **【全站导航】**：
  - [x] 返回大厅按钮全面升级为原生 `<button>` + `touch-manipulation select-none`，触控延迟与点击失效问题彻底解决。

## 3. 下一步待办事项 (Next Steps)
- 线上全模块处于最新健康状态，可随时按需进行双人联调或 E2E 自动化测试。
