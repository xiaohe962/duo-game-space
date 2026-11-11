# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上站点**：`https://nimble-horse-be2b07.netlify.app`（Netlify 持续部署）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 最近一次核心更新（动态空间QQ对话化与图片发送稳定性修复）
- [x] **移除主页（大厅）跨设备实时同步注释**：
  - 彻底清理底部 `跨设备实时同步：任意设备输入房间码即刻秒级重连` 横幅，释放大厅板块视野。
- [x] **修复动态空间附带图片或涂鸦无法发送的严重缺陷**：
  - **前置轻量压缩**：引入 `compressImage` 纯原生自适应压缩算法，将手机大图、截屏或手绘 Canvas 统一优化为 25~40KB 的高质量轻量 JPEG，彻底消除 PostgREST 413 Payload Too Large 与 Realtime 256KB 消息截断；
  - **同步二进制转换**：以 `dataUrlToBlob` 替代脆弱的 `fetch(dataUrl)`，规避浏览器 CSP 与跨域限制；
  - **超时熔断与平滑降级**：Supabase Storage 上传设置 2 秒快速熔断（`Promise.race`），在未配置 Storage 存储桶或网络不佳时瞬间无感降级为极速轻量内联存储，100% 确保点击即发；
  - **正文非空约束守护**：当用户仅发图片/涂鸦未打字时，自动填补安全占位标识，防止 PostgreSQL `TEXT NOT NULL` 约束报错，并在渲染端智能隐藏纯占位文字；
  - **涂鸦导出优化**：手绘涂鸦采用独立离线 Canvas 导出标准比例轻量图（~20KB）。
- [x] **动态空间全面改版为 QQ 式双人对话布局**：
  - 聊天记录居中占据视口主体（`h-[calc(100dvh-50px)]`），消息平滑吸底滚动，左侧对方白色气泡、右侧自己蓝色气泡；
  - 支持多图并发选图、涂鸦混发、心情可选空、小红花账本操作精简及双层高可用持久化。

## 3. 部署与环境说明
- **SQL 执行说明**：若在 Supabase 手动执行脚本遇到 `ERROR: 42P01: relation "public.couple_rooms" does not exist`，需先完整执行 `supabase/schema.sql` 中的建表语句 1（创建 `couple_rooms` 表），再执行后续的子表语句。已在 `schema.sql` 末尾补齐 `chat-media` 存储桶建桶与策略脚本。

## 4. 下一步待办事项 (Next Steps)
- 监控线上 Netlify 自动构建状态与多图/涂鸦在真机上的流式收发表现。
