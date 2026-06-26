# Agent Studio

Agent 开发平台 — 可视化管理界面，用于创建、配置和监控 AI Agent。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS 3 + ReactFlow + Recharts
- **后端**: FastAPI + SQLite (aiosqlite)
- **代理目标**: agent-platform (http://localhost:8001)

## 项目结构

```
agent-studio/
├── backend/                    # FastAPI 管理后端 (端口 8002)
│   ├── app/
│   │   ├── main.py            # 入口
│   │   ├── db.py              # SQLite 数据库 + 预置模板
│   │   └── routers/           # API 路由
│   │       ├── agents.py      # Agent 模板管理 (Pydantic AgentTemplateCreate；/{agent_id} 路由须在 /instances* 之后)
│   │       ├── workflows.py   # 工作流管理 + ReactFlow
│   │       ├── tools.py       # MCP 工具代理
│   │       ├── memory.py      # 记忆系统代理
│   │       ├── dashboard.py   # 仪表盘聚合 (共享 httpx client + gather 并行)
│   │       └── audit.py       # 审计日志代理
│   └── requirements.txt
├── frontend/                   # React 前端 (端口 5173)
│   ├── postcss.config.js      # PostCSS 配置 (Tailwind + Autoprefixer)
│   ├── tailwind.config.js     # Tailwind 主题配置
│   └── src/
│       ├── index.css          # 设计系统 (组件类 + 动画)
│       ├── api/               # API 客户端
│       ├── components/        # 共享组件
│       │   ├── Layout.tsx     # 页面布局 (侧边栏 + 内容区)
│       │   ├── Sidebar.tsx    # 深色侧边栏导航
│       │   ├── StatCard.tsx   # 统计卡片 (渐变图标 + hover 效果)
│       │   └── CustomNode.tsx # ReactFlow 工作流节点
│       └── pages/             # 7 个页面
│           ├── Dashboard/     # 仪表盘 (统计 + 图表 + 入场动画)
│           ├── Agents/        # Agent 市场 (模板 + 实例 + 模态创建)
│           ├── Workflows/     # 工作流编辑器 (ReactFlow 拖拽 + 深色面板)
│           ├── Tools/         # MCP 工具管理
│           ├── Memory/        # 记忆系统
│           ├── Audit/         # 审计日志 (时间线)
│           └── Security/      # 安全治理 (Guardrails)
├── CLAUDE.md                  # AI 开发约束
└── README.md
```

## 快速启动

### 1. 启动后端

```bash
cd backend
python -m venv venv
venv/Scripts/pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
python -m uvicorn app.main:app --reload --port 8002
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 3. 访问

- 前端: http://localhost:5173
- 后端 API: http://localhost:8002/docs
- 前提: agent-platform 运行在 http://localhost:8001

> **注意**: 后端使用独立的 venv。激活方式：`venv/Scripts/activate`（Windows）或 `source venv/bin/activate`（Linux/macOS）。使用 `python -m uvicorn` 确保使用当前 venv 的 Python。

## 设计风格

采用现代科技风设计，参考 Vercel / Linear 设计语言：

| 元素 | 设计 |
|------|------|
| 主色 | Indigo (`#6366f1`) 蓝紫色系 |
| 侧边栏 | 深色背景 (`#0f1117`) + 白色文字 + indigo 激活指示条 |
| 按钮 | 主按钮 indigo→purple 渐变 + 点击缩放微交互 |
| 卡片 | 精致阴影 + hover 上浮 + 60% 透明度边框 |
| 状态 | 脉冲圆点指示器 (绿=运行/黄=停止/红=错误) |
| 动画 | 页面入场 fade-in-up + 统计卡 stagger 延迟 + 侧边栏 slide-in |
| 字体 | 系统字体 (PingFang SC / Microsoft YaHei / Segoe UI)，无外部依赖 |

> **禁止使用 Google Fonts** — `fonts.googleapis.com` 在国内被墙，会阻塞 CSS 渲染导致页面样式完全失效。

## 页面说明

| 页面 | 路由 | 功能 |
|------|------|------|
| 仪表盘 | `/` | 查询统计、事件分布环形图、平台状态、最近 Agent |
| Agent 市场 | `/agents` | 预置模板网格、模态创建实例、脉冲状态管理 |
| 工作流编辑器 | `/workflows` | 深色面板 + ReactFlow 画布、模板创建、节点拖拽 |
| 工具管理 | `/tools` | MCP Server 连接状态、工具列表、参数标签 |
| 记忆系统 | `/memory` | 对话线程列表、事件详情、反思记录 |
| 审计日志 | `/audit` | 时间线可视化、事件类型筛选、链路追踪 |
| 安全治理 | `/security` | Guardrails 策略卡片、拦截记录、安全检查项 |

## 依赖服务

- **agent-platform** (http://localhost:8001) — Agent 执行引擎
- **content-analysis-system** (Docker) — MCP Server 提供方

## 修复记录（2026-06-26 第二轮·遗留问题）

> 基于 6 组诊断 + 6 组对抗审查（共 12 Agent）的修复方案，方案详见 [遗留问题修复方案.md](遗留问题修复方案.md)，全部经回归验证通过。

| 编号 | 模块 | 修复内容 | 回归验证 |
|------|------|----------|----------|
| E2E-08 | `routers/agents.py` | 实例列表/详情 GET 404/405：新增 `GET /api/agents/instances` 与 `GET /api/agents/instances/{id}`；**GET/DELETE `/{agent_id}` 下移到文件末尾**（避免单段 `{agent_id}` 拦截 `/instances`） | /instances→200（无「模板不存在」）；/instances/{不存在}→404「Agent 实例不存在」；/list 与 /{模板id} 仍 200 |
| PF-02 | `routers/dashboard.py` `main.py` | dashboard/stats 串行 2.3s：改用 `main.py` lifespan 管理的共享 `httpx.AsyncClient`（keep-alive 连接复用）+ `asyncio.gather` 并行 + 连接失效重试；`AGENT_PLATFORM_URL` 默认 `127.0.0.1` | 3 次 0.25/0.22/0.22s（原 2.3s），audit/health 字段非 error 兜底 |
