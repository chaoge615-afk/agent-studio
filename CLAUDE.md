# Agent Studio - 项目约束

## 项目概述
Agent 开发平台 — 可视化管理界面，用于创建、配置和监控 AI Agent。整合 Phase 12-17 所有能力。

## 技术栈
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS 3 + ReactFlow + Recharts
- **后端**: FastAPI + aiosqlite (SQLite 异步)
- **代理目标**: agent-platform (http://localhost:8001)

## 项目结构
```
agent-studio/
├── backend/                # FastAPI 管理后端 (端口 8002)
│   ├── app/
│   │   ├── main.py        # 入口
│   │   ├── db.py          # SQLite 数据库 + 预置模板
│   │   └── routers/       # API 路由
│   └── requirements.txt
├── frontend/               # React 前端 (端口 5173)
│   ├── postcss.config.js  # PostCSS 配置 (Tailwind + Autoprefixer) — 必须存在
│   ├── tailwind.config.js # Tailwind 主题 (indigo 主色 + sidebar 深色色板)
│   └── src/
│       ├── index.css      # 设计系统: card, btn-*, input, badge, status-*, list-item, empty-state, spinner
│       ├── api/           # API 客户端
│       ├── components/    # Layout, Sidebar(深色), CustomNode, StatCard
│       └── pages/         # Dashboard, Agents, Workflows, Tools, Memory, Audit, Security
└── README.md
```

## 启动方式
```bash
# 后端 (需要系统 Python，非 hermes venv)
cd backend
python -m pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
python -m uvicorn app.main:app --reload --port 8002

# 前端
cd frontend
npm install
npm run dev
```

## 设计规范
- **主色**: indigo 色板 (`#6366f1` 系列)，非默认蓝色
- **侧边栏**: 深色背景 `bg-sidebar` (`#0f1117`)，白色文字，indigo 激活指示条
- **字体**: 系统字体栈 (PingFang SC / Microsoft YaHei / Segoe UI)，**禁止使用 Google Fonts**（国内被墙会阻塞渲染）
- **卡片**: `.card` + `.card-hover`（hover 上浮 + 阴影加深），边框 `border-gray-200/60`
- **按钮**: `.btn-primary`（indigo→purple 渐变）、`.btn-secondary`、`.btn-ghost`、`.btn-danger`，均带 `active:scale-[0.98]`
- **状态**: `.status-active`（脉冲绿点）、`.status-stopped`（黄点）、`.status-error`（红点）
- **空状态**: `.empty-state` + `.empty-state-icon` + `.empty-state-title` + `.empty-state-desc`
- **加载**: `.spinner-container` + `.spinner`（indigo 旋转圆环）
- **列表**: `.list-item` / `.list-item-active`
- **动画**: `.page-enter`（页面入场 fade-in-up）、`.stagger-1~4`（递增延迟）
- 前端使用 Tailwind CSS，不引入其他 CSS 框架
- **postcss.config.js 必须存在**，否则 Tailwind `@tailwind` / `@apply` 指令不会被编译
- 所有 API 通过 Vite proxy 代理到后端
- 后端代理到 agent-platform (http://localhost:8001)

## 开发规范
- Python 依赖使用国内镜像: `pip install -i https://pypi.tuna.tsinghua.edu.cn/simple`
- 环境变量走 `.env`，不硬编码
- 后端启动需用系统 Python (`python -m uvicorn`)，避免 venv 路径问题

## API 端点

### Agent 管理
- `GET /api/agents` — Agent 模板列表
- `POST /api/agents` — 创建模板
- `GET /api/agents/instances/list` — 实例列表
- `POST /api/agents/instances` — 创建实例
- `PUT /api/agents/instances/{id}` — 更新实例
- `DELETE /api/agents/instances/{id}` — 删除实例

### 工作流管理
- `GET /api/workflows` — 工作流列表
- `GET /api/workflows/templates` — 预置模板
- `POST /api/workflows/from-template/{id}` — 从模板创建
- `GET /api/workflows/node-types` — 节点类型
- `GET /api/workflows/{id}` — 工作流详情
- `PUT /api/workflows/{id}` — 更新工作流
- `DELETE /api/workflows/{id}` — 删除工作流

### 工具管理 (代理到 agent-platform)
- `GET /api/tools` — MCP Server + 工具列表
- `GET /api/tools/health` — MCP 健康状态

### 记忆系统 (代理到 agent-platform)
- `GET /api/memory/stats` — 记忆统计
- `GET /api/memory/conversations` — 对话列表
- `GET /api/memory/conversations/{id}` — 对话详情

### 仪表盘
- `GET /api/dashboard/stats` — 综合统计
- `GET /api/dashboard/recent-queries` — 最近查询
- `GET /api/dashboard/health` — 平台健康

### 审计日志 (代理到 agent-platform)
- `GET /api/audit/stats` — 审计统计
- `GET /api/audit/logs` — 日志列表
- `GET /api/audit/event-types` — 事件类型

## 依赖服务
- **agent-platform** (http://localhost:8001) — Agent 执行引擎
- **content-analysis-system** (Docker) — MCP Server 提供方
