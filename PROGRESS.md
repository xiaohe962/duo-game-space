# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上部署站点**：`https://nimble-horse-be2b07.netlify.app`（Netlify 官方 `@netlify/plugin-nextjs` 构建托管）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 核心功能与技术特性已锁定
- [x] **跨端账号与身份漫游**：基于“4 位房间码 + 角色（ROLE A / ROLE B）+ 独立密钥（PIN）”，多设备输入相同凭据秒级登录同一账号。
- [x] **页面直连安全守卫**：全页面（`/draw`, `/moments`, `/guess`）集成 `isLoading` 异步状态兜底占位，避免深链或硬刷新时误触发重定向。
- [x] **平板触控画板引擎**：全面基于 Pointer Events + Mouse Events 双轨输入，防误触 + `setPointerCapture` 容错；动态绑定 DOM 宽高；中点二次贝塞尔平滑滤波。
- [x] **Realtime 广播链路加固**：使用持久化 `channelRef` 订阅通道，杜绝重复创建临时信道，实现低延迟高吞吐笔迹投递。
- [x] **全端自适应响应式**：`min-h-dvh` 消除地址栏遮挡；PC（双列）、平板（横竖屏自适应）、手机（`pb-safe` 紧凑底栏）。

## 3. 最新线上 E2E 自动化联机测试结论（全部 PASS）
- [x] **用例 1：房间创建与双端配对**（10969ms）
  - 实例 A 创建房间生成 4 位房间码（如 `1698`），实例 B 输入该码与昵称完成绑定，双端成功握手进入大厅（2/2）。
- [x] **用例 2：你画我猜 / 实时画板同步**（4754ms）
  - 画师选择词条开始作画，笔迹经 Supabase Realtime Broadcast 广播到竞猜端，竞猜端在毫秒级内完成 Canvas 真实物理像素着色渲染。
- [x] **用例 3：动态空间 / 留言持久化**（6424ms）
  - 实例 A 发送动态，实例 B 无需刷新页面即时收到 Postgres Changes 推送；实例 B 页面硬刷新后，数据成功从 Supabase 数据库持久化重载展现。

## 4. 后续维护指引 (Next Steps)
- 生产环境各模块与双端联机功能已 100% 验证闭环，可随时放心分享给真实情侣或好友双人游玩。
- 如需同步后续功能改动，运行 `.\push_to_github.bat` 即可一键推送更新。
