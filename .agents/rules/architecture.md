---
trigger: always_on
---
# 工作区架构与部署规范 (Cloudflare Workers Static Assets)

## 1. 托管平台与构建模式
- 本项目现已托管至 **Cloudflare Workers Static Assets**，自动化拉取 GitHub `main` 分支执行构建，部署产物为纯静态 `./out` 目录。
- 构建配置已锁定于 `next.config.mjs`：
  - `output: 'export'`
  - `images: { unoptimized: true }`

## 2. 核心架构铁律（严禁违反）
- **100% 兼容 Next.js 纯静态导出**：
  - 今后所有新增功能（如新小游戏、动态空间迭代等），必须在客户端运行。
  - **严禁创建 `app/api` 服务端路由**或使用 Node.js 服务端 API。
  - **严禁使用服务端动态渲染 (SSR / Server-Side Rendering)** 或仅能在 Node.js 运行时执行的库。
  - 所有数据读写、实时通信、身份认证统一通过客户端直连 Supabase SDK（PostgreSQL / Realtime Broadcast）实现。
- **构建与推送验证**：
  - 每次代码提交前，必须先在本地运行 `npm run build` 验证确保 exit code 为 0，且成功输出 `./out` 目录。

## 3. 线上测试基准
- 线上 E2E 自动化测试统一使用最新的 Cloudflare 线上地址，不再以旧 Netlify 为准。
