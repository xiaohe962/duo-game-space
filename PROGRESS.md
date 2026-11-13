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

## 3. 手机端竞猜成功弹窗慢与闪烁卡顿修复
- **根因定位（手机端与平板差异）**：
  1. 移动端软键盘弹出时占用近半屏，猜中后键盘收起动画触发连续数十次 `resize` 事件，无防抖的 `handleResize` 与 `useEffect` 循环调用 `calibrateCanvasResolution`，高频重设 `canvas.width` 导致 GPU 纹理反复清空与重绘，引发剧烈闪烁；
  2. 弹窗采用 `backdrop-blur-xs`，在移动端与全屏 120 帧高频粒子 `confetti` 叠加时，手机 GPU 频繁重算全屏高斯模糊，导致弹窗严重延迟掉帧与白屏闪屏；
  3. 输入框在猜中后未主动失焦（`blur`），导致虚拟键盘与浮层焦点抢占视口；
  4. `initOrFetchSession` 依赖了每 12 秒心跳更新的 `room` 对象，触发多余重拉对局与重渲染。
- **优化与修复方案**：
  1. **画板尺寸完全冻结**：在 `updateCanvasDimensions` 与 `calibrateCanvasResolution` 中加入 `session?.status === 'settled'` 熔断守卫，结算展示期间彻底冻结画布尺寸，杜绝任何重置与重绘；
  2. **Resize 防抖化 (150ms)**：防止移动端键盘升降或旋转屏幕过程中的超频渲染；
  3. **去除移动端 GPU 杀手 `backdrop-blur`**：结算弹窗与清空弹窗改用纯净硬件加速遮罩 `bg-[#1D2230]/75`，弹窗实现 0ms 瞬间弹出；
  4. **移动端轻量粒子**：`triggerVictoryConfetti` 在小屏下降低粒子数 (28) 并缩短生存周期 (65 ticks)，减轻复合图层压力；
  5. **主动键盘失焦**：猜对瞬间立即调用 `blur()`，使软键盘自然收起；
  6. **解绑 Heartbeat 依赖**：`initOrFetchSession` 仅在挂载时运行，不再随房间心跳反复刷新。

## 4. 验证结论
- 本地静态编译验证：执行 `npm run build` 成功完成，退出码为 0，成功导出所有静态路由至 `./out`。

## 5. 下一步待办事项 (Next Steps)
- 提交所有代码变动并推送至 GitHub `main` 分支触发 Cloudflare 线上部署。
