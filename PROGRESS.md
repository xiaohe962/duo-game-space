# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上站点**：`https://nimble-horse-be2b07.netlify.app`（Netlify）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支，公开仓库)。
- **本地工具链**：Node v24.18 / Next 15.5.29；`git` 需显式加入 PATH `C:\Program Files\Git\cmd`，且**必须加 `-c http.sslBackend=openssl`**（schannel 握手失败）。系统代理 `http://127.0.0.1:7897`。

## 2. 核心优化 10 项状态 (代码层面 100% Complete)
- [x] **项 1：你画我猜 UI 屏幕大小深度适配（Pad 端优化）**：画板独占 8~9 列（`md:col-span-8 lg:col-span-9`）并充满视口全高。
- [x] **项 2：你画我猜超低延迟画笔架构重构**：20ms 微批次聚合 + 4 笔缓冲发射 + 亚像素移动降噪。
- [x] **项 3：两端倒计时绝对同步与重进状态恢复**：挂钟基准校准（Wall-Clock Delta），重进动态换算 `120 - elapsed`。
- [x] **项 4：角色互换与选题死锁脱困机制（双保险）**：`initOrFetchSession` 自愈重置 + 等待页【换我来画 / 换我出题】【重置本局状态】。
- [x] **项 5：顶部导航常驻“重新开始”按钮**：各游戏顶部栏常驻 `RotateCcw`，一键重置为第 1 轮选题。
- [x] **项 6：动态空间发送消息实时秒级直达**：Supabase Broadcast `MOMENTS_NEW_POST` 通道，广播与数据库双写。
- [x] **项 7：动态空间小红花账本与余额实时更新**：乐观更新本地余额与流水，跨设备身份兼容匹配。
- [x] **项 8：全站返回/退出按钮灵敏度根治**：原生 `<button>` + `router.push('/lobby')`，剔除 `Link` 手势冲突。
- [x] **项 9：GuessWhat 20 问功能全量补全**：20 问限制与进度条、认输揭晓、线索提示、换一批、角色互换防卡死。
- [x] **项 10：动态空间底部输入框吸底与输入法防冲突**：`sticky bottom-0 z-20` + `env(safe-area-inset-bottom)` + `visualViewport` 监听。

## 3. 最近修改文件
- `src/app/draw/page.tsx`（`handleTakeOverPainter`、等待卡片接管画师与重置按钮、自愈重置）
- `src/app/guess/page.tsx`（`handleTakeOverMaster`、等待卡片接管出题人与重置按钮）
- `src/components/Navbar.tsx`（全站返回按钮原生 `<button>` 高灵敏重构）
- `src/app/moments/page.tsx`（输入框吸底、`MOMENTS_NEW_POST` Realtime 广播双写、`visualViewport`）
- `src/components/moments/BadgeLedgerModal.tsx`（小红花跨端 ID 兼容）
- `src/lib/types/index.ts`（补充 `round_start_time`）

## 4. 部署链路诊断结论（重要，务必保留）
> 2026-11-11 23:00~23:20 实测。**代码已全部推送，但线上站点严重滞后。**

- **仓库侧：正常**。`git ls-remote origin refs/heads/main` = `5abdad5`，与本地一致；仅 `main` 一条分支；工作树干净；`git ls-files` 仅 36 个文件，`.next/`、`node_modules/` 未入库。
- **构建侧：正常**。本地 `npm run build` 通过（Compiled successfully，8 个静态页全部生成），`npx tsc --noEmit` 零报错。
- **线上侧：滞后约 9 小时**。线上 `/draw` 引用 `page-fd82624064d72ee6.js`（旧哈希），而当前源码本地构建产出 `page-ef5bff9e4e44d59f.js`；加 `?cb=` 随机参数与 `Cache-Control: must-revalidate` 复核，排除 CDN 缓存。
  - 线上**有** `换一批题目`（引入于 `c6c749c` 07:43）；
  - 线上**无** `重新开始`、`MOMENTS_NEW_POST`、`visualViewport`（均引入于 `b512ac0` 14:03）；
  - 线上**无** `换我来画`、`重置本局状态`（引入于 `3f1900f` 22:26）；
  - 线上导航“返回主页”仍是 `<a href="/lobby">`（旧 `Link` 实现），新版为原生 `<button>`。
  - ⇒ 线上源码定格在 `c6c749c` ~ `b512ac0` 之间（约 07:43–14:03），**当前落后 11 个提交**。
- **触发侧：未打通**。GitHub 公开 API 查 `3f1900f` 的 commit status / check-runs 均为 **0 条**，说明 Netlify 的 GitHub App 未向该仓库回报任何部署检查；23:13 又推了一个空提交 `5abdad5` 并轮询线上 6 分钟，chunk 哈希始终不变。
- **结论**：GitHub → Netlify 的自动部署链路已断（集成被移除 / 站点仓库关联失效 / 站点 Auto publishing 被关闭）。**仅靠 `git push` 无法再触发部署。**
- **约束**：本机无 Netlify CLI、无 `~/.netlify/config.json`、无 `NETLIFY_*` 环境变量、仓库内也无 build hook 记录，`api.netlify.com` 未授权（401），故无法由本地程序化触发。

## 5. 下一步待办事项 (Next Steps)
- [ ] **人工破局（阻塞项）**：从以下三选一恢复部署：
  1. Netlify 后台 `Deploys` → **Trigger deploy → Clear cache and deploy site**（最快，无需交出密钥）；
  2. 提供 **Build hook URL** 或 **Personal Access Token**，由本地 `curl`/API 直接触发并轮询部署状态；
  3. Netlify 站点 `Site configuration → Build & deploy → 重新 Link repository`（恢复 push 自动部署，一劳永逸）。
- [ ] 部署恢复后，在线上逐项回归验证：顶部【重新开始】、等待页【换我来画/换我出题】【重置本局状态】、`MOMENTS_NEW_POST` 秒级直达、小红花账本同步、输入框吸底防键盘遮挡。
- [ ] 建议修复 `push_to_github.bat` 与历史提交信息异常：多次提交的 subject 仅为 `"`（如 `3f1900f`、`7dea6be`、`f1fcadd`、`b512ac0`），疑似 `set "MSG=%~1"` 传参转义问题，需改为 `git commit -m %MSG%` 或改用引号包裹传入方式。
