# Agent Studio

Agent 开发平台 — 可视化管理界面，用于创建、配置和监控 AI Agent。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + ReactFlow
- **后端**: FastAPI + SQLite (aiosqlite)
- **代理目标**: agent-platform (http://localhost:8001)

## 项目结构

```
agent-studio/
├── backend/                # FastAPI 管理后端 (端口 8002)
│   ├── app/
│   │   ├── main.py        # 入口
│   │   ├── db.py          # SQLite 数据库
│   │   └── routers/       # API 路由
│   │       ├── agents.py      # Agent 模板管理
│   │       ├── workflows.py   # 工作流管理 + ReactFlow
│   │       ├── tools.py       # MCP 工具代理
│   │       ├── memory.py      # 记忆系统代理
│   │       ├── dashboard.py   # 仪表盘聚合
│   │       └── audit.py       # 审计日志代理
│   └── requirements.txt
├── frontend/               # React 前端 (端口 5173)
│   └── src/
│       ├── api/           # API 客户端
│       ├── components/    # 共享组件（Layout, Sidebar, CustomNode）
│       └── pages/         # 7 个页面
│           ├── Dashboard/     # 仪表盘（统计 + 图表）
│           ├── Agents/        # Agent 市场（模板 + 实例）
│           ├── Workflows/     # 工作流编辑器（ReactFlow 拖拽）
│           ├── Tools/         # MCP 工具管理
│           ├── Memory/        # 记忆系统
│           ├── Audit/         # 审计日志
│           └── Security/      # 安全治理（Guardrails）
└── README.md
```

## 快速启动

### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
uvicorn app.main:app --reload --port 8002
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

## 页面说明

| 页面 | 路由 | 功能 |
|------|------|------|
| 仪表盘 | `/` | 查询统计、路由分布图、响应时间、最近查询 |
| Agent 市场 | `/agents` | 预置模板列表、一键创建实例、管理运行中的 Agent |
| 工作流编辑器 | `/workflows` | 从模板创建 / 自定义拖拽、ReactFlow 画布、节点类型面板 |
| 工具管理 | `/tools` | MCP Server 状态、工具列表、工具测试 Playground |
| 记忆系统 | `/memory` | 系统统计、对话历史浏览、反思记录语义搜索 |
| 审计日志 | `/audit` | 按事件类型筛选、时间线展示、决策链路追溯 |
| 安全治理 | `/security` | Guardrails 策略状态、拦截记录、SQL 安全检查 |

## 依赖服务

- **agent-platform** (http://localhost:8001) — Agent 执行引擎
- **content-analysis-system** (Docker) — MCP Server 提供方
