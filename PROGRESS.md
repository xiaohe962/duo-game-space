# DUOSPACE · 双人极简互动空间 状态快照 (PROGRESS.md)

## 1. 核心架构与部署配置
- **托管平台**：Cloudflare Workers Static Assets（自动化拉取 GitHub `main` 分支构建 `./out` 纯静态产物）。
- **线上生产地址**：`https://duo-game-space.a8425w.workers.dev/`
- **架构铁律**：100% Next.js 纯静态导出（`output: 'export'`，`images: { unoptimized: true }`），零服务端 API 路由与 SSR，客户端直连 Supabase SDK 与大模型 REST 接口。
- **自动推送机制**：本地 `npm run build` 预检通过后，自动提交并 push 到 GitHub `main` 分支。

## 2. 全站主题配色规范（已锁定）
- **烟青煤灰 (Deep Slate Indigo)**：`#545E79` —— 主操作按钮、行动点、发言气泡、深色卡片主体；
- **丁香青蓝 (Muted Lavender Blue)**：`#83949C` / `#BDC6E3` —— 次级交互元素、通用卡片与输入框浅边框；
- **清霜淡水蓝 (Soft Periwinkle Ice)**：`#D9E2EC` / `#EEF2F6` —— 高亮气泡胶囊、选中卡片浅底、徽章背景；
- **精致冷暗灰 (Dark Accent)**：`#2C3345` / `#33405C` —— 顶部导航栏 Header、深色弹窗底色与主文字；
- **全局护眼底色 (Base Page Fill)**：`#EEF2F6` —— 沉浸温润双人空间底色。

## 3. 你画我猜与全站核心功能闭环
1. **你画我猜词库大幅扩充与 AI 生成接入**：
   - **预置词库扩充 (`wordBank.ts`)**：词量扩增至 80+ 个高频适画词（涵盖水果、动物、食物、日常物品、交通建筑、自然天体、运动娱乐、经典动漫），均配备精准的 `drawHint`；
   - **AI 动态灵感题库 (`generateDrawWordCandidates`)**：画师选题时可一键调用接入的大模型（DeepSeek / Gemini），动态生成 4 个富有画面感、易于简单线条绘制的新词条；
   - **双层防重复排重机制**：
     - 本地队列记忆已出词汇，大模型生成时在提示词中强制 `excludeWords` 严格避让；
     - 本地“换一批题目”算法升级，优先从排除历史已出词的池中抽取，杜绝短期重复；
   - **共享 AI 密钥管理**：顶部操作栏接入 `AISettingsModal`，与 GuessWhat 共享 `localStorage` 密钥，一次配置双处可用。
2. **GuessWhat 板块原版放弃按钮与 5 大 AI 能力**：
   - 原版放弃按钮复原（带 `window.confirm` 防误触确认，全端广播结算与揭晓）；
   - 包含推荐下一问（一键填入输入框）、阶段提示、思路偏航分析、出题人灵感题库与 AI 百科查证。
3. **动态空间快捷打卡与小红花数量体验优化**：
   - 快捷打卡改用自适应两行换行折行（`flex-wrap`），消除任何横向撑大页面的可能性，一行放不下自动优雅折成两行；
   - 底部固定输入区与打卡抽屉外层均添加 `w-full min-w-0 max-w-full overflow-hidden` 绝对宽度约束；
   - 小红花自拟数量支持退格完全清空与失焦自动归一兜底。
4. **全站彻底清洗 AI 包装痕迹**：
   - 清除各模块汇报式冗长副标题与交互解释文本，保持极简高级质感。

## 4. 验证与构建结论
- **本地静态编译**：执行 `npm run build` 成功完成（Exit code 0），零错误零警告，全部 6 个静态页面成功导出至 `./out`。
- **自动同步流水线**：已通过自动化脚本完成 Git 提交并推送到 GitHub `main` 分支。
