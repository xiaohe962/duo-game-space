# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上站点**：`https://nimble-horse-be2b07.netlify.app`（Netlify 持续部署）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 动态空间 (Moments v3.0) 深度重构已完成
- [x] **小红花与徽章账本系统**：
  - 顶部徽章统计胶囊（🌸小红花、🌟星星、☕咖啡、🤗抱抱），点击弹出「徽章账本」Modal；
  - 双方资产对比看板、按时间排序的 `badge_logs` 明细流水、快捷调分奖惩入口与动态底部“打赏”直通车；
  - 增减徽章触发全屏粒子撒花动效（`canvas-confetti`）与微震动反馈（`navigator.vibrate`）。
- [x] **多媒体与即兴手绘涂鸦**：
  - 原生支持图片文件选择与剪贴板 `onPaste` 截图直传；
  - 弹窗式 Canvas 即兴手绘便签板（多色、粗细调节、撤销、清空、生成 PNG 并插入动态）。
- [x] **楼中楼与引用回复**：
  - 支持 `parent_id` 引用回复，动态卡片高亮渲染被引用原消息摘要，折叠展开全部楼中楼子评论。
- [x] **行内贴纸表态 (Reactions)**：
  - 动态卡片底部展示聚合表态胶囊（点赞即刻高亮并计数切换），支持横向快捷 Emoji 选择器（❤️, 🌸, 👏, 🥺, ⚡, 🎉）。
- [x] **专属快捷状态打卡条**：
  - 常驻预设状态胶囊（📍在路上、🔋没电了、☕学习中、🌙晚安打卡等），一键同步 `user_status` 并自动生成状态说说流。
- [x] **全量 Realtime 统一监听**：
  - `couple_posts`、`badge_balances`、`badge_logs`、`post_reactions`、`user_status` 五表统一广播订阅。

## 3. 数据库与迁移交付
- [x] 完整建表与扩展脚本已就绪：[`supabase/migration_v3_moments.sql`](file:///d:/antigravity/202611/supabase/migration_v3_moments.sql) 与 [`supabase/schema.sql`](file:///d:/antigravity/202611/supabase/schema.sql)。

## 4. 后续日常指引 (Next Steps)
- 请在 Supabase 控制台的 SQL Editor 中执行 `supabase/migration_v3_moments.sql` 即可完成远端数据库字段升级。
