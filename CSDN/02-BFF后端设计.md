## 系列文章目录

- [01 - 项目总览：Agent Studio 是什么？](https://blog.csdn.net/xxx/article/details/001)
- **02 - BFF 后端设计：一个后端，两套数据源**（本文）

### 文章目录

+ [一、BFF 架构总览](#一bff-架构总览)
+ [二、FastAPI 应用骨架](#二fastapi-应用骨架)
+ [三、SQLite 异步数据层](#三sqlite-异步数据层)
+ [四、本地 CRUD 路由：Agent 管理](#四本地-crud-路由agent-管理)
+ [五、代理透传路由：工具管理](#五代理透传路由工具管理)
+ [六、仪表盘聚合：两套数据源的融合](#六仪表盘聚合两套数据源的融合)
+ [七、工作流引擎：模板与节点类型](#七工作流引擎模板与节点类型)
+ [八、优雅降级策略](#八优雅降级策略)
+ [总结](#总结)

## 前言

上一篇我们介绍了 Agent Studio 的整体定位。今天聊它的后端——一个基于 FastAPI 的 BFF（Backend For Frontend）层。

BFF 的核心思想：**前端需要什么，后端就聚合什么**。我们的数据来自两个完全不同的源头——本地 SQLite 里的模板和工作流，以及远端 `agent-platform` 提供的 MCP 工具和审计日志。BFF 的职责就是把这两套数据源糅在一起，给前端统一的 API。

这篇文章从应用骨架讲起，穿过数据库设计、两种路由模式、代理透传、优雅降级，最后到工作流引擎。全部代码来自项目真实源码。

## 一、BFF 架构总览

先看请求是怎么流转的：

```
┌────────────┐       ┌──────────────────────────────────┐       ┌──────────────────┐
│  React     │ REST  │       Agent Studio BFF           │       │  agent-platform  │
│  前端      │──────▶│                                  │──────▶│  (FastAPI:8001)  │
│  :5173     │◀──────│  main.py (:8000)                 │◀──────│                  │
└────────────┘       │                                  │       └──────────────────┘
                     │  ┌──────────┐  ┌──────────────┐  │
                     │  │ agents   │  │ tools        │  │
                     │  │ workflows│  │ dashboard    │  │
                     │  │ (本地CRUD)│  │ (代理透传)   │  │
                     │  └────┬─────┘  └──────┬───────┘  │
                     │  ┌────▼─────┐  ┌──────▼───────┐  │
                     │  │ SQLite   │  │   httpx      │  │
                     │  │ (aiosql) │  │ (异步代理)   │  │
                     │  └──────────┘  └──────────────┘  │
                     └──────────────────────────────────┘
```

两套数据源的对比：

| 特征 | 本地数据源 | 远端数据源 |
|------|-----------|-----------|
| 存储 | SQLite（aiosqlite） | agent-platform 进程内 |
| 数据 | 模板、工作流、实例 | MCP 工具、审计日志 |
| 访问方式 | 直接 SQL | httpx 代理转发 |
| 故障影响 | 服务不可用 | 优雅降级，返回默认值 |

## 二、FastAPI 应用骨架

`main.py` 是服务入口：

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import init_db, close_db
from app.routers import agents, workflows, tools, memory, dashboard, audit

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("[OK] Agent Studio 后端启动完成")
    yield
    await close_db()
    print("[BYE] Agent Studio 后端已关闭")

app = FastAPI(title="Agent Studio", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# 六个路由模块
app.include_router(agents.router, prefix="/api/agents", tags=["Agent 管理"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["工作流管理"])
app.include_router(tools.router, prefix="/api/tools", tags=["工具管理"])
app.include_router(memory.router, prefix="/api/memory", tags=["记忆系统"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["仪表盘"])
app.include_router(audit.router, prefix="/api/audit", tags=["审计日志"])
```

几个要点：**lifespan** 用 `@asynccontextmanager` 管理生命周期，启动时 `init_db()`，关闭时 `close_db()`；**六个路由模块**各挂一个 `/api/` 前缀；**CORS 全开**是开发阶段的便利，生产再收窄。

## 三、SQLite 异步数据层

Agent Studio 本质是个管理面板，数据量小，SQLite 够用。但必须**异步**——同步 `sqlite3` 会阻塞事件循环，所以我选了 `aiosqlite`：

```python
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "agent_studio.db")
_db: aiosqlite.Connection = None

async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        _db = await aiosqlite.connect(DB_PATH)
        _db.row_factory = aiosqlite.Row  # 支持 row["name"] 访问
    return _db
```

### 3.1 三张表的设计

三张核心表的 `CREATE TABLE` 语句（省略 `created_at`/`updated_at` 等通用时间字段）：

```sql
-- agent_templates: Agent 模板定义
CREATE TABLE agent_templates (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
    description TEXT, icon TEXT DEFAULT '🤖', config TEXT DEFAULT '{}', workflow_id TEXT
);

-- workflows: 可视化工作流（DAG 存为 JSON）
CREATE TABLE workflows (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT DEFAULT 'draft',
    description TEXT, nodes TEXT DEFAULT '[]', edges TEXT DEFAULT '[]', config TEXT DEFAULT '{}'
);

-- agent_instances: 运行中的实例（外键关联模板）
CREATE TABLE agent_instances (
    id TEXT PRIMARY KEY, template_id TEXT, name TEXT NOT NULL,
    config TEXT DEFAULT '{}', workflow_id TEXT, status TEXT DEFAULT 'active',
    FOREIGN KEY (template_id) REFERENCES agent_templates(id)
);
```

```
agent_templates ──1:N──▶ agent_instances
      │                        │
      └──── workflows ◀────────┘
          (workflow_id)
```

| 表名 | 职责 | JSON 字段 |
|------|------|----------|
| `agent_templates` | Agent 模板定义 | config |
| `workflows` | 可视化工作流 | nodes, edges, config |
| `agent_instances` | 运行中的实例 | config |

`config`、`nodes`、`edges` 都是 `TEXT` 存 JSON，在 Python 层用 `json.loads()` / `json.dumps()` 做序列化。

### 3.2 四个预置 Agent 模板

`init_db()` 首次启动时会插入四个种子模板：

| 模板 | type | 定位 |
|------|------|------|
| 🧠 知识库助手 | hybrid | 全功能，SQL + RAG 混合查询 |
| 📊 数据分析师 | structured | 专注 Text-to-SQL |
| 💡 内容顾问 | semantic | 专注语义检索 |
| 🎯 多 Agent 协调器 | orchestrator | A2A 多 Agent 协作 |

以知识库助手为例：

```python
{
    "id": "knowledge-assistant",
    "name": "知识库助手",
    "type": "hybrid",
    "icon": "🧠",
    "config": {
        "route_types": ["structured", "semantic", "hybrid"],
        "mcp_servers": ["sql", "rag"],
        "features": ["意图分类", "SQL 查询", "RAG 检索", "结果融合", "反思"],
    },
}
```

## 四、本地 CRUD 路由：Agent 管理

`agents.py` 是最标准的本地 CRUD——直接读写 SQLite，不涉及远程调用。这是**第一种路由模式**。先看实例列表查询，用 `LEFT JOIN` 关联模板信息：

```python
@router.get("/instances/list")
async def list_instances():
    db = await get_db()
    cursor = await db.execute(
        """SELECT i.*, t.name as template_name, t.icon as template_icon
           FROM agent_instances i
           LEFT JOIN agent_templates t ON i.template_id = t.id
           ORDER BY i.created_at DESC"""
    )
    instances = [
        {"id": r["id"], "name": r["name"],
         "template_name": r["template_name"] or "自定义",
         "template_icon": r["template_icon"] or "🤖",
         "config": json.loads(r["config"]), "status": r["status"]}
        for r in await cursor.fetchall()
    ]
    return {"count": len(instances), "instances": instances}
```

创建实例时做了**配置合并**——模板默认值 + 用户自定义：

```python
@router.post("/instances")
async def create_instance(data: AgentInstanceCreate):
    template = await (await db.execute(
        "SELECT * FROM agent_templates WHERE id = ?", (data.template_id,))
    ).fetchone()
    if not template:
        raise HTTPException(status_code=404, detail="Agent 模板不存在")

    merged_config = json.loads(template["config"])
    merged_config.update(data.config)  # 用户配置覆盖模板默认值

    instance_id = f"inst-{uuid.uuid4().hex[:8]}"
    await db.execute(
        "INSERT INTO agent_instances (id,template_id,name,config,workflow_id,status) VALUES (?,?,?,?,?,'active')",
        (instance_id, data.template_id, data.name, json.dumps(merged_config), data.workflow_id),
    )
    await db.commit()
    return {"id": instance_id, "name": data.name, "config": merged_config, "status": "active"}
```

更新实例用的是**动态 SQL 拼接**——只更新传入的字段：

```python
updates = {}
if data.name is not None:
    updates["name"] = data.name
if data.config is not None:
    updates["config"] = json.dumps(data.config, ensure_ascii=False)
if data.status is not None:
    updates["status"] = data.status

if not updates:
    raise HTTPException(status_code=400, detail="没有要更新的字段")

set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
values = list(updates.values()) + [instance_id]
await db.execute(f"UPDATE agent_instances SET {set_clause} WHERE id = ?", values)
await db.commit()
```

## 五、代理透传路由：工具管理

`tools.py` 展示**第二种路由模式**——BFF 不存数据，只是代理转发给 `agent-platform`。

核心是通用代理函数——拼接 URL、发请求、**捕获异常返回降级数据**：

```python
AGENT_PLATFORM_URL = os.getenv("AGENT_PLATFORM_URL", "http://localhost:8001")


async def _proxy_get(path: str) -> dict:
    """代理 GET 请求到 agent-platform"""
    url = f"{AGENT_PLATFORM_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()
    except httpx.ConnectError:
        return {"error": "agent-platform 未连接", "tools": {}, "connected": False}
    except Exception as e:
        return {"error": str(e), "tools": {}, "connected": False}
```

工具列表端点在此基础上做了数据整形：

```python
@router.get("")
async def list_tools():
    result = await _proxy_get("/api/mcp/tools")
    if "error" in result:
        return {"connected": False, "servers": [], "total_tools": 0, "error": result["error"]}

    tools_map = result.get("tools", {})
    servers = [
        {"name": name, "tool_count": len(tools), "tools": tools}
        for name, tools in tools_map.items()
    ]
    return {"connected": True, "servers": servers, "total_tools": sum(s["tool_count"] for s in servers)}
```

`connected` 字段让前端可以直接决定展示列表还是"未连接"提示——**不只是转发，还在转发中做数据适配**。

## 六、仪表盘聚合：两套数据源的融合

仪表盘是 BFF 最典型的应用场景——一个接口同时返回本地统计和远端状态：

```python
@router.get("/stats")
async def dashboard_stats():
    db = await get_db()

    # ① 本地统计
    template_count = (await (await db.execute("SELECT COUNT(*) FROM agent_templates")).fetchone())[0]
    instance_count = (await (await db.execute("SELECT COUNT(*) FROM agent_instances")).fetchone())[0]
    workflow_count = (await (await db.execute("SELECT COUNT(*) FROM workflows")).fetchone())[0]

    # ② 远端数据
    audit_stats = await _proxy_get("/api/audit/stats")
    health = await _proxy_get("/health")

    # ③ 最近创建的实例
    cursor = await db.execute(
        "SELECT id, name, type, icon, created_at "
        "FROM agent_instances ORDER BY created_at DESC LIMIT 5"
    )
    recent_agents = [
        {"id": r["id"], "name": r["name"], "icon": r["icon"], "created_at": r["created_at"]}
        for r in await cursor.fetchall()
    ]

    # ④ 融合返回 — 远端数据带降级
    return {
        "templates": template_count, "instances": instance_count,
        "workflows": workflow_count, "recent_agents": recent_agents,
        "audit": audit_stats if "error" not in audit_stats
                 else {"total_events": 0, "event_types": {}},
        "health": health if "error" not in health
                  else {"status": "disconnected"},
    }
```

一个请求，五次数据获取（三次 SQL + 两次远端代理），融合成一个 JSON。前端只调一次接口，不用操心数据来自哪里。

## 七、工作流引擎：模板与节点类型

工作流模块解决一个问题：**怎么在 SQLite 里存一个 DAG（有向无环图）？**

答案是 JSON 序列化。`nodes` 和 `edges` 字段存的是节点数组和连线数组：

```python
class WorkflowNode(BaseModel):
    id: str
    type: str  # classify, query_sql, query_rag, query_both, merge, reflect, custom
    label: str
    config: dict = {}
    position: dict = {"x": 0, "y": 0}  # ReactFlow 坐标


class WorkflowEdge(BaseModel):
    id: str
    source: str   # 源节点 id
    target: str   # 目标节点 id
    label: Optional[str] = None
    condition: Optional[str] = None  # 条件路由表达式
```

### 7.1 三个预置工作流模板

代码里定义了三个开箱即用的模板。以"标准混合查询流程"为例：

```python
DEFAULT_WORKFLOWS = {
    "standard-hybrid": {
        "name": "标准混合查询流程",
        "nodes": [
            {"id": "classify",   "type": "classify",   "label": "意图分类"},
            {"id": "route",      "type": "route",       "label": "条件路由"},
            {"id": "query_sql",  "type": "query_sql",   "label": "SQL 查询"},
            {"id": "query_rag",  "type": "query_rag",   "label": "RAG 检索"},
            {"id": "query_both", "type": "query_both",  "label": "混合查询"},
            {"id": "merge",      "type": "merge",       "label": "结果融合"},
            {"id": "reflect",    "type": "reflect",     "label": "反思"},
        ],
        "edges": [
            {"id": "e1", "source": "classify", "target": "route"},
            {"id": "e2", "source": "route", "target": "query_sql",  "label": "structured"},
            {"id": "e3", "source": "route", "target": "query_rag",  "label": "semantic"},
            {"id": "e4", "source": "route", "target": "query_both", "label": "hybrid"},
            # e5~e7: 三路查询汇聚到 merge, e8: merge → reflect
        ],
    },
    "simple-rag": { ... },     # 简单 RAG 检索
    "data-pipeline": { ... },  # 数据分析流程
}
```

对应的 DAG 结构：

```
         ┌──────────┐
         │ 意图分类  │
         └────┬─────┘
              │
         ┌────▼─────┐
         │ 条件路由  │
         └─┬──┬──┬──┘
     ┌─────┘  │  └─────┐
     ▼        ▼        ▼
┌────────┐ ┌──────┐ ┌────────┐
│SQL 查询│ │混合  │ │RAG 检索│
└───┬────┘ └──┬───┘ └───┬────┘
    └────┬────┘────┬────┘
         ▼
    ┌──────────┐
    │ 结果融合  │
    └────┬─────┘
         ▼
    ┌──────────┐
    │   反思    │
    └──────────┘
```

从模板一键创建工作流：

```python
@router.post("/from-template/{template_id}")
async def create_from_template(template_id: str):
    if template_id not in DEFAULT_WORKFLOWS:
        raise HTTPException(status_code=404, detail=f"模板 '{template_id}' 不存在")

    template = DEFAULT_WORKFLOWS[template_id]
    workflow_id = f"wf-{uuid.uuid4().hex[:8]}"
    db = await get_db()
    await db.execute(
        """INSERT INTO workflows (id, name, description, nodes, edges, config, status)
           VALUES (?, ?, ?, ?, ?, ?, 'draft')""",
        (workflow_id, template["name"], template["description"],
         json.dumps(template["nodes"], ensure_ascii=False),
         json.dumps(template["edges"], ensure_ascii=False), json.dumps({})),
    )
    await db.commit()
    return {"id": workflow_id, "name": template["name"], "status": "draft", ...}
```

### 7.2 节点类型 API

前端编辑器需要知道"有哪些节点可以拖进来"，`/node-types` 端点提供了七种节点类型：

| 类型 | 名称 | 分类 | 输入 → 输出 |
|------|------|------|-------------|
| `classify` | 🧭 意图分类 | routing | question → route_type, filters |
| `route` | 🔀 条件路由 | routing | route_type → go_sql/go_rag/go_both |
| `query_sql` | 🗃️ SQL 查询 | query | question, filters → sql_result |
| `query_rag` | 🔍 RAG 检索 | query | question, filters → rag_result |
| `query_both` | ⚡ 混合查询 | query | question, filters → sql_result + rag_result |
| `merge` | 🔗 结果融合 | output | sql_result + rag_result → final_answer |
| `reflect` | 💭 反思 | output | question + final_answer → (写入记忆) |

每个类型都带有 `inputs`、`outputs` 和可选的 `config_fields`，前端据此动态渲染配置表单。

## 八、优雅降级策略

BFF 依赖远端 `agent-platform`，但后者不一定随时可用。如果 BFF 遇到连接错误就 500，体验会很差。

`_proxy_get` 的设计原则：**永远返回合法 JSON，哪怕数据是空的**。

```python
# dashboard.py 中的降级版 _proxy_get
async def _proxy_get(path: str, params: dict = None) -> dict:
    url = f"{AGENT_PLATFORM_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return {"error": "agent-platform 未连接"}
```

调用方用默认值替代：

```python
"audit": audit_stats if "error" not in audit_stats else {"total_events": 0, "event_types": {}},
"health": health if "error" not in health else {"status": "disconnected"},
```

效果对比：

```
在线: Templates:4 Instances:2 Audit:157 Platform:healthy ✓
离线: Templates:4 Instances:2 Audit:0   Platform:disconnected ✗
```

本地数据照常显示，远端数据降级为零值。前端不需要做特殊处理。

## 总结

这篇我们把 Agent Studio 的 BFF 后端拆解了一遍：

- **FastAPI + lifespan** 管理应用生命周期
- **aiosqlite** 异步访问 SQLite，三张表覆盖模板、工作流、实例
- **两种路由模式**：本地 CRUD（agents、workflows）和代理透传（tools、dashboard）
- **`_proxy_get` + httpx** 做远端代理，配合降级策略保证可用性
- **仪表盘聚合** 将本地统计和远端状态融合成一个接口
- **工作流模板** 以 JSON 存储 DAG，节点类型 API 驱动前端编辑器

一句话总结：**BFF 是前端的"数据管家"，脏活累活它来干，前端只管渲染**。

下一篇我们进入前端部分，看 React + ReactFlow 怎么把这些 API 变成可视化界面。下篇见！
