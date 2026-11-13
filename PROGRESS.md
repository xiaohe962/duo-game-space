# DUOSPACE · 双人极简互动空间 状态快照 (PROGRESS.md)

## 1. 核心架构与部署配置
- **托管平台**：Cloudflare Workers Static Assets（拉取 GitHub `main` 分支自动构建纯静态 `./out` 目录）。
- **线上生产地址**：`https://duo-game-space.a8425w.workers.dev/`
- **构建规范约束**：
  - `next.config.mjs` 常驻锁定：`output: 'export'`, `images: { unoptimized: true }`；
  - 100% 客户端静态运行，严禁 `app/api` 服务端路由与 Node.js SSR；
  - 数据存储、实时广播（Realtime Broadcast）、在线状态检测全部直连 Supabase SDK。

## 2. 全站主题配色方案
- **烟青靛灰 (Deep Slate Indigo)**：`#545E79` —— 主操作按钮、主互动高亮、发言气泡、核心边框；
- **丁香暮蓝 (Muted Lavender Blue)**：`#BDC6E3` —— 次级交互元素、通用卡片与输入框浅边框；
- **清透淡冰蓝 (Soft Periwinkle Ice)**：`#D8E2FD` —— 高亮气泡胶囊、选中卡片浅底、徽章背景；
- **雅致黛黑 (Dark Accent)**：`#2C3345` / `#3D465C` —— 顶部导航栏 Header、深色弹窗底色与主文字；
- **全局护眼冰底 (Base Page Fill)**：`#EEF3FD` —— 沉浸温润双人空间底色。

## 3. 动态空间 (/moments) 4张表 404 与代码缺陷闭环修复
- **根因确认**：
  1. `badge_balances`, `badge_logs`, `post_reactions`, `user_status` 4 张增量表从未在云端 Supabase 执行建表，导致前端直连查询全部 404；
  2. 前端 `src/app/moments/page.tsx` 中 `handleAddBadge` 错误引用了表中不存在的 `id` 字段并尝试以此更新，存在致命代码语法缺陷；
  3. `storage.buckets` 中多媒体图片桶 `chat-media` 及 RLS 策略需一并初始化。
- **修复方案与落地**：
  1. **迁移脚本幂等重构**：`supabase/migration_v3_moments.sql` 完善表结构、复合主键约束，加入异常保护型 Realtime 发布与 RLS 策略，支持在 Supabase 控制台重复执行零报错；
  2. **前端代码重构**：`handleAddBadge` 废除 `id` 字段依赖，全面换用原子级 `upsert({ onConflict: 'pair_code,user_id,badge_type' })`；
  3. **独立容错隔离**：`fetchAllData` 各表异步调用独立隔离，捕获 `PGRST205` / `404` 友好提示并维持本地缓存兜底；
  4. **表态删除精准化**：`handleToggleReaction` 兼容 UUID 与复合特征匹配删除。

## 4. 验证与构建结论
- **本地静态编译**：执行 `npm run build` 成功完成，零报错，纯静态导出产物输出至 `./out`；
- **下一步操作**：推送到 GitHub `main` 分支，用户在 Supabase 控制台执行 SQL 脚本激活云端数据表。
