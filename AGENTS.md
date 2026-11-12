# 项目工作区开发与架构规范 (AGENTS.md)

## 1. 托管平台与构建模式
- 本项目现已托管至 **Cloudflare Workers Static Assets**，自动化拉取 GitHub `main` 分支执行构建，部署产物为纯静态 `./out` 目录。
- 构建配置常驻锁定于 `next.config.mjs`：
  - `output: 'export'`
  - `images: { unoptimized: true }`

## 2. 核心架构约束（铁律）
- **100% 兼容 Next.js 纯静态导出**：
  - 今后所有新增功能迭代（如新游戏、动态空间新特性等），必须保持客户端静态运行；
  - **严禁创建 `app/api` 服务端路由**；
  - **严禁使用服务端动态渲染 (SSR)** 或仅能在 Node.js 服务端运行的依赖；
  - 所有数据存储、读写、实时通信与身份认证统一通过客户端（Client Components）直连 Supabase SDK（Realtime Broadcast / Postgres）实现。
- **构建预检与推送流程**：
  - 每次代码提交前，必须在本地运行 `npm run build` 确保零编译报错且成功产出 `./out` 目录；
  - 验证通过后方可提交并推送到 GitHub `main` 分支。

## 3. 线上环境与 E2E 测试
- 线上 E2E 自动化测试统一使用最新的 Cloudflare 线上地址。
