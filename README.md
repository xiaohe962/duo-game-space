#  DuoHub & Space（双人小游戏合集与专属空间）

一个专为双人互动打造的轻量级 Web 全栈应用。集成了实时联机画板对战、经典猜词与专属动态墙，采用全端自适应设计，深度适配电脑、平板及手机端触控体验。

---

##  核心模块

### 1.  GuessWhat
* 移植并重构自经典猜词逻辑；
* 支持房间内双人实时比拼与历史竞猜记录。

### 2.  你画我猜 (Draw & Guess)
* **毫秒级实时笔迹同步**：基于 Supabase Realtime 广播通道，告别传统长连接服务器；
* **平板与触控深度优化**：支持手写笔/触控防误触与 Retina 视网膜高清屏坐标校准；
* **丰富画笔与选色**：预设高频调色盘 + 支持自定义 Hex 拾色器与多档笔刷调节；
* **阶段状态机**：4 选 1 选题机制、120 秒倒计时、半程提示透出以及答题弹幕智能判题。

### 3.  情侣空间 (Couple Space)
* **动态生活墙**：支持随时随地发布随笔与日常，记录精准时间戳与相对时间流；
* **即时同步**：集成数据库级别变动监听，一人发布另一端无感知即时渲染；
* **跨设备登录**：基于 4 位专属配对码与身份绑定，换设备直接无缝登录。

---

##  技术栈

* **全栈框架**：[Next.js 14+](https://nextjs.org/) (App Router)
* **前端交互**：React / TypeScript / Canvas API (Pointer Events)
* **样式方案**：[Tailwind CSS](https://tailwindcss.com/) (全响应式 + 移动端视口动态适配)
* **后端与数据库**：[Supabase](https://supabase.com/) (PostgreSQL + Realtime Broadcast)
* **部署托管**：[Vercel](https://vercel.com/) (Serverless 零成本边缘分发)

---

##  本地开发指南

### 1. 克隆并安装依赖
```bash
git clone [https://github.com/xiaohe962/duo-game-space.git](https://github.com/xiaohe962/duo-game-space.git)
cd duo-game-space
npm install