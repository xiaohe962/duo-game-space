# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上站点**：`https://nimble-horse-be2b07.netlify.app`（Netlify 持续部署）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 最近一次核心更新（动态空间QQ对话化与交互体验重构）
- [x] **动态空间全面改版为 QQ 式双人对话布局**：
  - 聊天记录居中占据视口主体（`h-[calc(100dvh-50px)]`），消息自动平滑吸底滚动；
  - 区分左右气泡：左侧白色气泡展示对方消息，右侧蓝色气泡展示自己消息；
  - 自动渲染 5 分钟时间间隔分割线，包含引用回复展示与多图/涂鸦缩略图。
- [x] **多图上传与手绘涂鸦组合混发**：
  - 支持多文件并发选中上传（`multiple`）与剪贴板快速粘贴；
  - 涂鸦板绘制完成后即时追加至待发送媒体列表，支持图文+多图+涂鸦一同发送；
  - 聊天气泡内自适应网格排版并支持全屏高清灯箱查看。
- [x] **心情（Mood）支持空选项**：
  - 默认不选中任何心情标签，增加「🚫 无心情」快捷选项。
- [x] **小红花账本操作精简**：
  - 惩罚/奖励理由修改为选填（非必填）；
  - 徽章调整按钮精简为 `+1 奖励` 与 `-1 扣除`，支持手动输入任意正整数增减数值（默认 1）。
- [x] **动态空间历史记录双层高可用持久化**：
  - 采用 `localStorage` 本地缓存结合 Supabase Realtime 双层机制，解决页面重新进入或刷新时历史消息丢失的问题；
  - 规范客户端与服务端 UUID 格式，规避 PostgreSQL 外键解析异常。

## 3. 部署与环境说明
- **SQL 执行说明**：若在 Supabase 手动执行脚本遇到 `ERROR: 42P01: relation "public.couple_rooms" does not exist`，需先完整执行 `supabase/schema.sql` 中的建表语句 1（创建 `couple_rooms` 表），再执行后续的子表语句。

## 4. 下一步待办事项 (Next Steps)
- 监控线上 Netlify 自动构建状态与双人联机数据流同步表现。
