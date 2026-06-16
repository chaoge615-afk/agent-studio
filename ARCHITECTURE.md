# Bilibili 智能知识库 — 系统架构说明

> 最后更新：2026-06-15 | 项目版本：Phase 20

---

## 1. 项目总览

本系统是一套 **端到端的 Bilibili 视频知识库平台**，由三个独立项目协作组成：

| 项目 | 定位 | 技术栈 | 端口 |
|------|------|--------|------|
| **content-analysis-system** | 数据采集与处理引擎 | Docker Compose + Python + DuckDB + ChromaDB | 80, 8000, 8010, 8088, 8090, 9001-9003 |
| **agent-platform** | AI Agent 智能中枢 | LangGraph + FastAPI + MCP + ChromaDB | 8001 |
| **agent-studio** | 可视化管理控制台 | React + TypeScript + FastAPI | 5173, 8002 |

### 核心能力

```
视频采集 → ASR 转录 → 内容精炼 → 知识入库 → 智能问答 → 可视化管理
   ↓            ↓           ↓           ↓           ↓           ↓
Bilibili    Whisper/    LLM 精炼    DuckDB +    LangGraph    React
API 爬取    云端 ASR    + 分类标注   ChromaDB    + MCP + RAG   + ReactFlow
```

---

## 2. 系统拓扑

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          用户访问层                                          │
│                                                                             │
│   Agent Studio 前端 (:5173)          Content Frontend (:80)                 │
│   React + ReactFlow + Recharts       React + Nginx                          │
│   管理控制台                          数据查询界面                            │
└──────────────┬──────────────────────────────┬───────────────────────────────┘
               │ /api proxy                   │ /api, /query proxy
               ▼                              ▼
┌──────────────────────────────┐  ┌───────────────────────────────┐
│  Agent Studio 后端 (:8002)   │  │  Router Agent (:8000)         │
│  FastAPI BFF                 │  │  意图分类 → 调度 → 结果融合    │
│  ├─ 本地 SQLite (模板/工作流)│  │  ├─ UP 主管理                  │
│  └─ 代理 → agent-platform    │  │  ├─ 监控触发                   │
└──────────────┬───────────────┘  │  └─ 系统指标                   │
               │                  └──────────┬────────────────────┘
               ▼                             │
┌──────────────────────────────────┐         │
│  Agent Platform (:8001)          │         │
│  FastAPI + LangGraph             │         │
│  ├─ MCP Client ──────────────────┤───┐     │
│  ├─ 三层记忆 (短期/长期/反思)    │   │     │
│  ├─ 安全护栏 (输入/输出/SQL)     │   │     │
│  ├─ 审计日志 (SQLite)            │   │     │
│  └─ A2A 协议 (Agent-to-Agent)    │   │     │
└──────────────────────────────────┘   │     │
                                       │     │
         ┌─────────────────────────────┘     │
         ▼                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    MCP 服务层 (SSE)                           │
│                                                              │
│  Bilibili MCP (:9001)    RAG MCP (:9002)    SQL MCP (:9003)  │
│  视频监控状态             语义检索            结构化查询        │
└──────────┬───────────────────┬──────────────────┬────────────┘
           │                   │                  │
           ▼                   ▼                  ▼
┌──────────────┐  ┌────────────────────┐  ┌──────────────────┐
│ bilibili-    │  │ RAG 引擎 (:8090)   │  │ Text-to-SQL      │
│ monitor      │  │ BM25 + 向量混合检索│  │ (:8010)           │
│ 视频下载     │  │ ChromaDB 远程连接  │  │ 4-Agent Pipeline  │
│ ASR 转录     │  │ SiliconFlow 嵌入   │  │ DuckDB 执行       │
│ LLM 精炼     │  │ 元数据过滤         │  │                   │
└──────┬───────┘  └─────────┬──────────┘  └────────┬──────────┘
       │                    │                      │
       ▼                    ▼                      ▼
┌──────────────────────────────────────────────────────────────┐
│                       共享数据层                               │
│                                                              │
│  DuckDB (duckdb-data)          ChromaDB (:8088)              │
│  ├─ video_meta (视频元数据)    ├─ video_knowledge (视频知识) │
│  └─ up_info (UP 主信息)       └─ agent_memory (Agent 记忆)  │
│                                                              │
│  SQLite (各服务本地)                                         │
│  ├─ audit_logs (审计日志)                                    │
│  ├─ checkpoints (对话检查点)                                 │
│  ├─ agent_studio.db (模板/工作流/实例)                       │
│  └─ query_history (查询历史)                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. 数据流

### 3.1 数据采集流（写入路径）

```
Bilibili API
    │
    ▼
bilibili-monitor (定时/手动触发)
    │
    ├─ 1. 获取 UP 主视频列表 (Bilibili REST API)
    ├─ 2. 筛选新视频
    ├─ 3. 下载音频 (m4a)
    ├─ 4. ASR 转录 (三级降级)
    │      ├─ GPU Whisper (CUDA)
    │      ├─ CPU Whisper (本地)
    │      └─ SiliconFlow 云端 ASR (SenseVoiceSmall)
    ├─ 5. LLM 内容精炼 + 31 类分类标注
    ├─ 6. 写入 DuckDB (video_meta, up_info)
    ├─ 7. 写入 ChromaDB (video_knowledge 集合)
    └─ 8. QQ Bot 通知
```

### 3.2 智能问答流（读取路径）

```
用户提问
    │
    ▼
Agent Studio (:5173) → 后端 (:8002) → Agent Platform (:8001)
                                            │
                                            ▼
                                    ┌─ 输入护栏检查 ─┐
                                    │  敏感词/注入/长度│
                                    └────────┬────────┘
                                             ▼
                                    ┌─ 记忆检索 ──────┐
                                    │  短期 + 长期 +   │
                                    │  反思记忆上下文   │
                                    └────────┬────────┘
                                             ▼
                                    ┌─ 意图分类 ──────┐
                                    │  LLM 判断路由：  │
                                    │  structured /    │
                                    │  semantic /      │
                                    │  hybrid          │
                                    └────────┬────────┘
                                             ▼
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                         SQL 查询       RAG 检索       混合查询
                         (MCP :9003)   (MCP :9002)   (SQL + RAG)
                              │              │              │
                              └──────────────┼──────────────┘
                                             ▼
                                    ┌─ 结果融合 ──────┐
                                    │  LLM 合并多路    │
                                    │  查询结果        │
                                    └────────┬────────┘
                                             ▼
                                    ┌─ 反思 ──────────┐
                                    │  质量评估 →      │
                                    │  存入 ChromaDB   │
                                    └────────┬────────┘
                                             ▼
                                    ┌─ 输出护栏 ──────┐
                                    │  PII 脱敏        │
                                    └────────┬────────┘
                                             ▼
                                    ┌─ 审计记录 ──────┐
                                    │  全链路日志      │
                                    └────────┬────────┘
                                             ▼
                                         返回用户
```

### 3.3 可视化管理流

```
Agent Studio 前端 (:5173)
    │
    ├─ Dashboard     → 聚合统计 (本地 + agent-platform)
    ├─ Agent 市场    → 模板/实例 CRUD (本地 SQLite)
    ├─ 工作流编辑器  → ReactFlow 拖拽 + 持久化 (本地 SQLite)
    ├─ 工具管理      → MCP Server 状态 (代理 → agent-platform)
    ├─ 记忆系统      → 对话/反思查看 (代理 → agent-platform)
    ├─ 审计日志      → 事件时间线 (代理 → agent-platform)
    └─ 安全治理      → 护栏策略 + 拦截记录 (代理 → agent-platform)
```

---

## 4. 项目详解

### 4.1 content-analysis-system（数据采集引擎）

以 Docker Compose 编排的多服务系统，通过 `dev` / `nas` profile 切换部署模式。

#### 服务清单

| 服务 | 端口 | 容器名 | 功能 |
|------|------|--------|------|
| **chromadb** | 8088→8000 | chromadb | 向量数据库，存储视频知识和 Agent 记忆 |
| **text-to-sql** | 8010 | text-to-sql | 多 Agent Text-to-SQL 管道 (MiniMax → DuckDB) |
| **rag** | 8090 | rag | RAG 引擎 (BM25 + 向量混合检索) |
| **router-agent** | 8000 | router-agent | 中心路由：意图分类 → 调度 → 融合 + UP 主管理 |
| **mcp-servers** | 9001-9003 | mcp-servers | MCP SSE 适配层，将 REST API 包装为 MCP 工具 |
| **frontend** | 80 | frontend | React SPA (Nginx)，数据查询界面 |
| **gpu-service** | 8011 | gpu-service | CUDA GPU 转录 (仅 dev profile) |
| **bilibili-monitor** | — | — | 视频采集 + ASR + 精炼 (按需触发) |
| **bilibili-cron** | — | — | 定时调度 (仅 nas profile, 每 6 小时) |

#### Text-to-SQL 四阶段管道

```
用户问题 → IntentAgent → SchemaAgent → SQLGenAgent → ReviewAgent → DuckDB 执行
              意图理解      表结构注入     SQL 生成       安全校验      结果格式化
                                         (支持重试)
```

**DuckDB 表结构：**
- `video_meta` — bvid, up_name, up_uid, title, publish_date, category, duration, summary, tags, domain
- `up_info` — uid, name, total_videos, last_update, config_file

#### RAG 混合检索

```
查询 → BM25 关键词检索 ──┐
     → 向量语义检索 ─────┤── Reciprocal Rank Fusion → LLM 生成回答
                         │
     元数据过滤 ──────────┘
     (up_name, category, bvid, domain)
```

- **嵌入模型**：SiliconFlow `BAAI/bge-large-zh-v1.5`
- **向量库**：ChromaDB 远程客户端 → chromadb 容器
- **集合**：`video_knowledge`（精炼后的视频文本分块）

#### MCP 工具映射

| MCP Server | 端口 | 工具 | 后端服务 |
|------------|------|------|----------|
| bilibili | 9001 | `get_monitor_info` | bilibili-monitor 状态 |
| rag | 9002 | `semantic_search`, `get_stats` | RAG REST API |
| sql | 9003 | `text_to_sql`, `get_tables` | Text-to-SQL REST API |

#### UP 主监控配置 (YAML per UP)

```yaml
name: UP主名称
uid: Bilibili UID
domain: 领域 (如 "情感", "职场")
whisper_model: whisper模型 (medium/large-v3)
download_root: 下载路径
notify_target: QQ通知群号
```

当前监控 5 位 UP 主，覆盖情感、职场等知识领域。

---

### 4.2 agent-platform（AI Agent 智能中枢）

基于 **LangGraph** 构建的有状态 Agent 系统，通过 **MCP 协议** 调用外部工具，具备三层记忆和安全护栏。

#### LangGraph 工作流

```
classify_intent → [条件路由]
    ├─ go_sql   → query_sql   → merge_results → reflect → END
    ├─ go_rag   → query_rag   → merge_results → reflect → END
    └─ go_both  → query_both  → merge_results → reflect → END
```

**节点说明：**

| 节点 | 功能 | LLM 调用 |
|------|------|----------|
| `classify_intent` | 分析问题，判断路由类型 + 提取过滤条件 | ✅ |
| `route_query` | 条件边：根据分类结果选择查询路径 | — |
| `query_sql` | 通过 MCP 调用 Text-to-SQL | — (MCP) |
| `query_rag` | 通过 MCP 调用 RAG 语义检索 | — (MCP) |
| `query_both` | 并行执行 SQL + RAG | — (MCP) |
| `merge_results` | LLM 融合多路结果为最终回答 | ✅ |
| `reflect` | 质量评估 + 改进洞察存入长期记忆 | ✅ |

**状态定义 (`AgentState`)**：question, conversation_id, messages, memory_context, route_type, filters, sql_result, rag_result, final_answer, sources, error, processing_time

#### 三层记忆系统

| 层级 | 存储 | 容量 | 用途 |
|------|------|------|------|
| **短期记忆** | 内存 dict | 每会话 50 条 | 当前对话上下文 |
| **长期记忆** | ChromaDB `agent_memory` | 无限 | 用户偏好、事实知识 |
| **反思记忆** | ChromaDB `agent_reflections` | 无限 | 自我改进洞察 |

记忆检索结果注入 `classify_intent` 的 prompt，实现 **越用越懂** 的效果。

#### 安全护栏

| 护栏 | 阶段 | 检查内容 |
|------|------|----------|
| **输入护栏** | 请求进入前 | 敏感词过滤、Prompt 注入检测、长度限制 |
| **输出护栏** | 响应返回前 | PII 脱敏（手机号/身份证/邮箱） |
| **SQL 护栏** | SQL 执行前 | 危险操作拦截 (DROP/DELETE/UPDATE/INSERT) |

#### A2A 协议 (Agent-to-Agent)

支持通过标准化接口与其他 Agent 系统互操作：

- `GET /a2a/agent-card` — Agent 能力声明
- `POST /a2a/tasks` — 创建任务
- `GET /a2a/tasks/{id}` — 查询任务状态
- 预定义 2 个 Agent Card：LangGraph Agent + Pipeline Agent

#### API 端点一览

| 方法 | 路径 | 功能 |
|------|------|------|
| `POST` | `/api/chat` | 同步问答 |
| `POST` | `/api/chat/stream` | SSE 流式问答 |
| `GET` | `/health` | 健康检查 |
| `GET` | `/api/mcp/tools` | MCP 工具列表 |
| `GET` | `/api/memory/stats` | 记忆统计 |
| `GET` | `/api/audit/stats` | 审计统计 |
| `GET` | `/api/audit/logs` | 审计日志查询 |

---

### 4.3 agent-studio（可视化管理控制台）

独立的全栈管理面板，前端 React SPA + 后端 FastAPI BFF（Backend For Frontend）。

#### 前端 7 大页面

| 页面 | 路由 | 核心功能 |
|------|------|----------|
| **仪表盘** | `/` | 统计卡片 + Recharts 饼图 + 平台健康状态 |
| **Agent 市场** | `/agents` | 4 个预置模板 + 创建实例 + 启停管理 |
| **工作流编辑器** | `/workflows` | ReactFlow 画布 + 7 种节点 + 拖拽连线 + 模板 |
| **工具管理** | `/tools` | MCP Server 状态 + 工具列表 + 参数展示 |
| **记忆系统** | `/memory` | 对话列表 + 详情 + 反思记录 |
| **审计日志** | `/audit` | 事件时间线 + 类型筛选 + 链路追溯 |
| **安全治理** | `/security` | 护栏策略展示 + 拦截事件记录 |

#### 预置 Agent 模板

| 模板 | 类型 | 路由策略 | 适用场景 |
|------|------|----------|----------|
| 🧠 知识库助手 | hybrid | SQL + RAG + 融合 + 反思 | 通用知识问答 |
| 📊 数据分析师 | structured | 仅 SQL | 数据查询统计 |
| 💡 内容顾问 | semantic | 仅 RAG | 语义内容检索 |
| 🎯 多 Agent 协调器 | orchestrator | A2A + 全部 MCP | 复杂任务编排 |

#### 预置工作流模板

| 模板 | 节点数 | 流程 |
|------|--------|------|
| 标准混合查询 | 7 | 分类 → 路由 → SQL/RAG/混合 → 融合 → 反思 |
| 简单 RAG | 2 | RAG 检索 → 生成回答 |
| 数据分析 | 3 | 分类 → SQL 查询 → 格式化输出 |

#### ReactFlow 节点类型

| 类型 | 图标 | 颜色 | 输入 | 输出 |
|------|------|------|------|------|
| classify 🧭 | 紫色 | 意图分类 | question, messages | route_type, filters |
| route 🔀 | 紫罗兰 | 条件路由 | route_type | go_sql, go_rag, go_both |
| query_sql 🗃️ | 蓝色 | SQL 查询 | question, filters | sql_result |
| query_rag 🔍 | 青色 | RAG 检索 | question, filters | rag_result |
| query_both ⚡ | 靛蓝 | 混合查询 | question, filters | sql_result, rag_result |
| merge 🔗 | 绿色 | 结果融合 | sql_result, rag_result | final_answer |
| reflect 💭 | 琥珀 | 反思 | question, final_answer | (无) |

#### 数据模型 (SQLite)

```sql
agent_templates  -- Agent 模板 (4 条预置)
  (id, name, description, type, icon, config, workflow_id, timestamps)

workflows        -- 工作流 (JSON 存储 nodes/edges)
  (id, name, description, nodes, edges, config, status, timestamps)

agent_instances  -- Agent 实例
  (id, template_id, name, config, workflow_id, status, timestamps)
```

#### 代理架构 (BFF 模式)

```
前端 (:5173) ─Vite proxy─→ 后端 (:8002)
                              ├─ 本地 CRUD → SQLite
                              └─ 代理转发 → agent-platform (:8001)
                                              ├─ MCP 工具
                                              ├─ 记忆统计
                                              ├─ 审计日志
                                              └─ 健康检查
```

---

## 5. 外部服务依赖

| 服务 | 使用者 | 协议 | 模型/工具 |
|------|--------|------|-----------|
| **MiniMax API** | router-agent, text-to-sql, rag | Anthropic 兼容 | MiniMax-M2.7 |
| **DeepSeek API** | router-agent (精炼), rag | OpenAI 兼容 | deepseek-v4-flash |
| **SiliconFlow** | bilibili-monitor, rag | OpenAI 兼容 | bge-large-zh-v1.5 (嵌入) |
| **SiliconFlow ASR** | bilibili-monitor | REST | SenseVoiceSmall (语音识别) |
| **Bilibili API** | bilibili-monitor | REST | 视频列表、音频下载 |
| **QQ Bot** | bilibili-monitor | HTTP | 新视频通知 |
| **LangSmith** | agent-platform | SDK | 可观测性追踪 (可选) |

---

## 6. 端口映射总表

| 端口 | 服务 | 项目 | 协议 |
|------|------|------|------|
| **80** | text-to-sql 前端 | content-analysis-system | HTTP (Nginx) |
| **5173** | Agent Studio 前端 | agent-studio | HTTP (Vite) |
| **8000** | Router Agent | content-analysis-system | HTTP (FastAPI) |
| **8001** | Agent Platform | agent-platform | HTTP (FastAPI) |
| **8002** | Agent Studio 后端 | agent-studio | HTTP (FastAPI) |
| **8010** | Text-to-SQL | content-analysis-system | HTTP (FastAPI) |
| **8011** | GPU Service | content-analysis-system | HTTP (仅 dev) |
| **8088** | ChromaDB | content-analysis-system | HTTP (容器内 8000) |
| **8090** | RAG 引擎 | content-analysis-system | HTTP (FastAPI) |
| **9001** | Bilibili MCP | content-analysis-system | SSE |
| **9002** | RAG MCP | content-analysis-system | SSE |
| **9003** | SQL MCP | content-analysis-system | SSE |

---

## 7. 启动顺序

服务间存在依赖关系，需按以下顺序启动：

```
1. content-analysis-system (Docker Compose)
   ├─ chromadb         必须先启动（其他服务依赖向量库）
   ├─ text-to-sql      依赖 chromadb
   ├─ rag              依赖 chromadb
   ├─ router-agent     依赖 text-to-sql + rag
   ├─ mcp-servers      依赖 text-to-sql + rag（包装为 MCP 协议）
   └─ frontend         依赖 router-agent

2. agent-platform (:8001)
   └─ 依赖 mcp-servers (9001-9003) + chromadb (8088)

3. agent-studio (:8002 + :5173)
   └─ 后端依赖 agent-platform (8001)
   └─ 前端依赖后端 (8002)
```

**快速启动命令：**

```bash
# 1. 启动数据采集引擎
cd content-analysis-system
docker compose --profile dev up -d

# 2. 启动 Agent 平台
cd agent-platform
venv/Scripts/python.exe -m src.main

# 3. 启动管理控制台
cd agent-studio/backend
python -m uvicorn app.main:app --reload --port 8002

cd agent-studio/frontend
npm run dev
```

---

## 8. 技术选型决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| Agent 框架 | LangGraph | 有状态图 + 条件路由 + 检查点，比纯 LangChain 更适合复杂流程 |
| 工具协议 | MCP (Model Context Protocol) | 标准化工具接口，Agent 无需关心后端是 REST/Docker/本地 |
| 向量数据库 | ChromaDB | 轻量、嵌入式、Python 原生支持，适合中小规模知识库 |
| 结构化存储 | DuckDB | 列式存储、零配置、SQL 兼容，比 SQLite 更适合分析查询 |
| 前端框架 | React + TypeScript | 生态成熟 + 类型安全 |
| 工作流编辑器 | ReactFlow | 成熟的 React 流程图库，拖拽 + 自定义节点 |
| 图表 | Recharts | React 原生，轻量级 |
| 后端代理 | httpx (async) | 异步 HTTP 客户端，支持 HTTP/2 |
| ASR 方案 | 三级降级 | GPU → CPU → 云端，兼顾速度、成本和可用性 |
| LLM 调用 | Anthropic SDK 兼容 | 统一接口，支持 MiniMax/DeepSeek/Qwen 等多家模型 |
