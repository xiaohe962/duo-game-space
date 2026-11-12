# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 核心架构与部署状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **构建输出模式**：常驻锁定纯静态导出 (`output: 'export'`，`images.unoptimized: true`)，`npm run build` 稳定输出 `./out` 纯静态文件夹。
- **三大核心板块**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上生产地址**：`https://duo-game-space.a8425w.workers.dev/`（Cloudflare Workers Static Assets）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 最近关键优化与 Bug 修复
1. **你画我猜 Pad 与平板端上下布局（释放全屏利用率）**：
   - 将主面板从中大屏左右分栏（`md:grid md:grid-cols-12`）重构为统一上下垂直布局：上部画板占据 `flex-1` 满宽黄金 4:3 比例，作画面积提升逾 110%；下部竞猜聊天区全宽置底（高度锁定 130px~160px 紧凑不遮挡）。
2. **所有界面手机端顶栏自适应（超出一行自动折行成两行）**：
   - 包含【你画我猜】与【GuessWhat】在内，顶栏容器统一适配 `flex-wrap items-center justify-between gap-y-1.5`：第一行展示局数/角色与功能操作，题目/秘密词胶囊在手机端自动折行至第二行居中展开，彻底消除拥挤与文字溢出截断。
3. **你画我猜画笔延迟彻底根除（网络传输与渲染双重优化）**：
   - 弃用容易引发并发风暴的 4 点计数器，改用 35ms 定频微批次聚合（~28fps），彻底避免超限挤压 Supabase WebSocket 队列；
   - 增加微小抖动距离过滤阈值（$\Delta x^2 + \Delta y^2 < 8\text{px}^2$）；
   - 笔迹坐标标准化为 4 位小数（`Math.round(v * 10000) / 10000`），将单包 Payload 缩减 60%；
   - 抬笔/取消时 0ms 瞬时发射剩余缓冲；远端收到 batch 时使用单循环直接上屏。
4. **动态空间快捷表情独立化修复**：
   - 在 `ReactionCapsules.tsx` 中补全 `if (r.post_id !== postId) return;` 过滤，消除同一房间内表情污染所有消息气泡的 Bug，实现单条消息表情各自独立。
5. **动态空间引用图片/涂鸦显示缩略图 + 点击自动跳转定位原消息**：
   - 将原本仅显示 `[图片]` 占位符的引用预览替换为微缩图像（缩略图），并在气泡添加目标定位锚点 `id="post-{id}"`；
   - 点击引用区域自动触发 `scrollIntoView({ behavior: 'smooth' })` 平滑滚动并附带蓝光高亮动画提示。

## 3. 最近修改文件清单
- `src/app/draw/page.tsx`（Pad/全端上下布局、画板面积倍增、定频 35ms 批次发射防延迟、顶栏小屏两行折行）
- `src/app/guess/page.tsx`（顶栏小屏两行折行、秘密词居中自适应）
- `src/app/moments/page.tsx`（顶栏两行折行、引用缩略图直显、点击平滑滚动跳转高亮）
- `src/components/moments/ReactionCapsules.tsx`（表情严格按 postId 隔离独立）
- `PROGRESS.md`（状态快照，严格保持 150 行以内）

## 4. 下一步待办事项 (Next Steps)
- 提交代码并推送到 GitHub `main` 分支；
- Cloudflare Workers 自动同步最新产物部署上线并交付用户测试。
