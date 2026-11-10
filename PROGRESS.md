# 双人专属小游戏合集与互动空间 (PROGRESS.md)

## 1. 当前核心架构与代码库状态
- **全栈架构**：Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3.4 + Supabase Realtime/Postgres。
- **三大板块规范命名**：**GuessWhat**、**你画我猜**、**动态空间**。
- **线上站点**：`https://nimble-horse-be2b07.netlify.app`（Netlify 官方 Next.js 插件持续部署）。
- **远程仓库**：`https://github.com/xiaohe962/duo-game-space.git` (`main` 分支)。

## 2. 自动化同步与持续发布流水线已锁定
- [x] **一键同步脚本**：根目录 [`push_to_github.bat`](file:///d:/antigravity/202611/push_to_github.bat)（自动挂载 Git 环境变量、增量安全暂存、支持自定义或自动 Commit 说明、推送到 `origin main`）。
- [x] **快捷命令支持**：`package.json` 集成 `"deploy": "push_to_github.bat"`，终端运行 `npm run deploy` 即可一键同步上线。
- [x] **Agent 自动化执行准则**：已固化 `.gemini/rules/auto_deploy.md` 规则。今后任何“增加功能”、“调整样式”、“修改文案”在验证通过后均**自主自动执行 Git Push**。

## 3. 最新功能与优化（已推送到线上）
- [x] **你画我猜题目稳定与手动换一批**：
  - 修复候选词频繁重新随机跳变的问题，每局锁定只出现固定 4 个词语；
  - 候选词列表下方新增交互按钮【换一批题目】（带音效与防抖）。
- [x] **E2E 自动化双端联机闭环验证**：
  - 房间创建配对（10.9s）、实时画板毫秒级广播渲染（4.7s）、动态空间实时推送与持久化（6.4s）全部 100% PASS。

## 4. 后续日常开发规范 (Next Steps)
- 本地进行任何功能新增或调整后，直接在终端执行 `npm run deploy` 或双击 `push_to_github.bat` 即可几秒内完成推送并触发 Netlify 线上部署。
