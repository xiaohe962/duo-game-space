# DUOSPACE · 双人极简互动空间 状态快照 (PROGRESS.md)

## 1. 核心架构与部署配置
- **托管平台**：Cloudflare Workers Static Assets（自动化拉取 GitHub `main` 构建 `./out` 纯静态产物）。
- **线上生产地址**：`https://duo-game-space.a8425w.workers.dev/`
- **架构铁律**：100% Next.js 纯静态导出（`output: 'export'`，`images: { unoptimized: true }`），零服务端 API 路由与 SSR，客户端直连 Supabase SDK 与大模型 REST 接口。

## 2. 全站主题配色规范（已锁定）
- **烟青煤灰 (Deep Slate Indigo)**：`#545E79` —— 主操作按钮、行动点、发言气泡、深色卡片主体；
- **丁香青蓝 (Muted Lavender Blue)**：`#83949C` / `#BDC6E3` —— 次级交互元素、通用卡片与输入框浅边框；
- **清霜淡水蓝 (Soft Periwinkle Ice)**：`#D9E2EC` / `#EEF2F6` —— 高亮气泡胶囊、选中卡片浅底、徽章背景；
- **精致冷暗灰 (Dark Accent)**：`#2C3345` / `#33405C` —— 顶部导航栏 Header、深色弹窗底色与主文字；
- **全局护眼底色 (Base Page Fill)**：`#EEF2F6` —— 沉浸温润双人空间底色。

## 3. 本轮 4 项核心需求闭环落地
1. **GuessWhat 板块原版放弃按钮与 AI 功能全面复原**：
   - **原版放弃机制**：复原出题人与猜词人「放弃本局」按钮，触发带确认防误触弹窗（`window.confirm('确定要放弃本局并揭晓秘密词语吗？')`），自动将对局置为 `settled (surrendered)` 并全端广播揭晓秘密词；
   - **纯客户端大模型服务 (`src/lib/ai/guessAI.ts`)**：支持 Google Gemini 与 DeepSeek/OpenAI 双协议客户端直连，支持无网络/无 Key 启发式离线规则评估；
   - **5 项核心 AI 功能**：
     - 出题人：选题阶段「✨ AI 灵感题库」（生成 4 个高趣味词条）、问答阶段「✨ AI 查证」（实时给出是/否建议与客观依据）；
     - 猜词人：提问阶段「💡 推荐下一问」（一键填入输入框）、「🧭 阶段提示」（高维方向启发）、「📊 偏航评估」（推断策略与收窄分析）；
   - **API Key 输入与存储方案**：顶部右侧常驻「⚙️ AI 密钥」设置入口（弹出 `AISettingsModal`，密钥保存在浏览器 `localStorage`，刷新不丢失，零服务端泄露风险），同时向下兼容读取 `NEXT_PUBLIC_*` 环境变量。
2. **动态空间快捷打卡横向强行拉长修复**：
   - 彻底改造 `QuickStatusBar.tsx` 与 `moments/page.tsx` 打卡抽屉容器，注入 `w-full min-w-0 max-w-full overflow-hidden` 与 `no-scrollbar touch-pan-x overscroll-contain`，无论在手机还是平板上均杜绝外层页面横向拉伸变形。
3. **小红花账本数量输入 1 可退格删除与失焦自动归一**：
   - 重构 `BadgeLedgerModal.tsx` 中 `amount` 状态支持 `number | string`，允许通过退格键（Backspace）将首位数字 1 彻底清空或重输；
   - 增加 `onBlur` 失焦事件校验：当用户退出输入且输入框为空或小于 1 时，自动平滑恢复为默认值 `1`。
4. **全站彻底清洗 AI 打磨痕迹与多余交互提示**：
   - `guess/page.tsx`：清除“挑好后，TA将通过向你提问逐步推断目标！”、“如果两端同时卡在等待状态...”、“出题人模式：静待TA竞猜...”等冗余 AI 说明；
   - `draw/page.tsx`：清除“选定后将进入 120 秒作画时间，另一端将实时看到你的画作！”、“LIVE · 正在实时观摩 TA 作画...”等过度包装提示，还原为极简高质感控件；
   - `moments/page.tsx`：清除“支持同时上传多张”、“支持不选”、“支持 Ctrl+V 粘贴截图”等赘述文案；
   - `DoodleModal.tsx`：去除副标题中“支持 11 预设色、自选 HSV 色板与无级粗细调节”的 AI 报告式说明。

## 4. 验证与构建结论
- **静态导出验证**：执行 `npm run build` 成功完成（Exit code 0），零错误零警告，全部 6 个静态页面成功导出至 `./out` 纯静态目录。
