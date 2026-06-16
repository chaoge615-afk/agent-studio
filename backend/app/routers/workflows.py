"""工作流管理 API — 可视化工作流的 CRUD"""
import json
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_db

router = APIRouter()


# ==================== 数据模型 ====================


class WorkflowNode(BaseModel):
    """工作流节点"""
    id: str
    type: str  # classify, query_sql, query_rag, query_both, merge, reflect, custom
    label: str
    config: dict = {}
    position: dict = {"x": 0, "y": 0}  # ReactFlow 位置


class WorkflowEdge(BaseModel):
    """工作流连线"""
    id: str
    source: str  # 源节点 id
    target: str  # 目标节点 id
    label: Optional[str] = None
    condition: Optional[str] = None  # 条件表达式（用于条件路由）


class WorkflowCreate(BaseModel):
    """创建工作流请求"""
    name: str
    description: str = ""
    nodes: list[WorkflowNode] = []
    edges: list[WorkflowEdge] = []
    config: dict = {}


class WorkflowUpdate(BaseModel):
    """更新工作流请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[list[WorkflowNode]] = None
    edges: Optional[list[WorkflowEdge]] = None
    config: Optional[dict] = None
    status: Optional[str] = None


# ==================== 预置工作流模板 ====================

DEFAULT_WORKFLOWS = {
    "standard-hybrid": {
        "name": "标准混合查询流程",
        "description": "意图分类 → 条件路由 → SQL/RAG/混合查询 → 结果融合 → 反思",
        "nodes": [
            {"id": "classify", "type": "classify", "label": "意图分类", "config": {"model": "default"}, "position": {"x": 250, "y": 0}},
            {"id": "route", "type": "route", "label": "条件路由", "config": {}, "position": {"x": 250, "y": 120}},
            {"id": "query_sql", "type": "query_sql", "label": "SQL 查询", "config": {"server": "sql"}, "position": {"x": 50, "y": 240}},
            {"id": "query_rag", "type": "query_rag", "label": "RAG 检索", "config": {"server": "rag", "top_k": 5}, "position": {"x": 450, "y": 240}},
            {"id": "query_both", "type": "query_both", "label": "混合查询", "config": {}, "position": {"x": 250, "y": 240}},
            {"id": "merge", "type": "merge", "label": "结果融合", "config": {}, "position": {"x": 250, "y": 380}},
            {"id": "reflect", "type": "reflect", "label": "反思", "config": {}, "position": {"x": 250, "y": 500}},
        ],
        "edges": [
            {"id": "e1", "source": "classify", "target": "route"},
            {"id": "e2", "source": "route", "target": "query_sql", "label": "structured"},
            {"id": "e3", "source": "route", "target": "query_rag", "label": "semantic"},
            {"id": "e4", "source": "route", "target": "query_both", "label": "hybrid"},
            {"id": "e5", "source": "query_sql", "target": "merge"},
            {"id": "e6", "source": "query_rag", "target": "merge"},
            {"id": "e7", "source": "query_both", "target": "merge"},
            {"id": "e8", "source": "merge", "target": "reflect"},
        ],
    },
    "simple-rag": {
        "name": "简单 RAG 检索流程",
        "description": "直接进行语义检索并返回结果，适合纯问答场景",
        "nodes": [
            {"id": "query_rag", "type": "query_rag", "label": "RAG 检索", "config": {"server": "rag", "top_k": 5}, "position": {"x": 250, "y": 0}},
            {"id": "respond", "type": "merge", "label": "生成回答", "config": {}, "position": {"x": 250, "y": 150}},
        ],
        "edges": [
            {"id": "e1", "source": "query_rag", "target": "respond"},
        ],
    },
    "data-pipeline": {
        "name": "数据分析流程",
        "description": "意图分类 → SQL 查询 → 数据格式化 → 返回结果",
        "nodes": [
            {"id": "classify", "type": "classify", "label": "意图分类", "config": {}, "position": {"x": 250, "y": 0}},
            {"id": "query_sql", "type": "query_sql", "label": "SQL 查询", "config": {"server": "sql"}, "position": {"x": 250, "y": 150}},
            {"id": "format", "type": "merge", "label": "格式化输出", "config": {}, "position": {"x": 250, "y": 300}},
        ],
        "edges": [
            {"id": "e1", "source": "classify", "target": "query_sql"},
            {"id": "e2", "source": "query_sql", "target": "format"},
        ],
    },
}


# ==================== API 端点 ====================


@router.get("")
async def list_workflows():
    """列出所有工作流"""
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM workflows ORDER BY updated_at DESC"
    )
    rows = await cursor.fetchall()

    workflows = []
    for row in rows:
        workflows.append({
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "nodes": json.loads(row["nodes"]),
            "edges": json.loads(row["edges"]),
            "config": json.loads(row["config"]),
            "status": row["status"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        })

    return {"count": len(workflows), "workflows": workflows}


@router.get("/templates")
async def list_templates():
    """列出预置工作流模板"""
    templates = []
    for tid, t in DEFAULT_WORKFLOWS.items():
        templates.append({
            "id": tid,
            "name": t["name"],
            "description": t["description"],
            "node_count": len(t["nodes"]),
            "edge_count": len(t["edges"]),
        })
    return {"templates": templates}


@router.post("/from-template/{template_id}")
async def create_from_template(template_id: str):
    """从模板创建工作流"""
    if template_id not in DEFAULT_WORKFLOWS:
        raise HTTPException(status_code=404, detail=f"模板 '{template_id}' 不存在")

    template = DEFAULT_WORKFLOWS[template_id]
    workflow_id = f"wf-{uuid.uuid4().hex[:8]}"

    db = await get_db()
    await db.execute(
        """INSERT INTO workflows (id, name, description, nodes, edges, config, status)
           VALUES (?, ?, ?, ?, ?, ?, 'draft')""",
        (
            workflow_id,
            template["name"],
            template["description"],
            json.dumps(template["nodes"], ensure_ascii=False),
            json.dumps(template["edges"], ensure_ascii=False),
            json.dumps({}),
        ),
    )
    await db.commit()

    return {
        "id": workflow_id,
        "name": template["name"],
        "nodes": template["nodes"],
        "edges": template["edges"],
        "status": "draft",
    }


@router.get("/node-types")
async def list_node_types():
    """列出可用的节点类型（用于工作流编辑器）"""
    return {
        "node_types": [
            {
                "type": "classify",
                "label": "意图分类",
                "description": "使用 LLM 分析用户问题，判断路由类型",
                "icon": "🧭",
                "category": "routing",
                "inputs": ["question", "messages", "memory_context"],
                "outputs": ["route_type", "filters"],
            },
            {
                "type": "route",
                "label": "条件路由",
                "description": "根据意图分类结果路由到对应处理节点",
                "icon": "🔀",
                "category": "routing",
                "inputs": ["route_type"],
                "outputs": ["go_sql", "go_rag", "go_both"],
            },
            {
                "type": "query_sql",
                "label": "SQL 查询",
                "description": "通过 MCP 调用 Text-to-SQL 服务执行结构化查询",
                "icon": "🗃️",
                "category": "query",
                "inputs": ["question", "filters"],
                "outputs": ["sql_result"],
                "config_fields": [
                    {"key": "server", "label": "MCP Server", "type": "select", "default": "sql", "options": ["sql"]},
                ],
            },
            {
                "type": "query_rag",
                "label": "RAG 检索",
                "description": "通过 MCP 调用 RAG 服务执行语义检索",
                "icon": "🔍",
                "category": "query",
                "inputs": ["question", "filters"],
                "outputs": ["rag_result"],
                "config_fields": [
                    {"key": "server", "label": "MCP Server", "type": "select", "default": "rag", "options": ["rag"]},
                    {"key": "top_k", "label": "返回条数", "type": "number", "default": 5},
                ],
            },
            {
                "type": "query_both",
                "label": "混合查询",
                "description": "并行执行 SQL + RAG 查询",
                "icon": "⚡",
                "category": "query",
                "inputs": ["question", "filters"],
                "outputs": ["sql_result", "rag_result"],
            },
            {
                "type": "merge",
                "label": "结果融合",
                "description": "将多路查询结果融合为最终回答",
                "icon": "🔗",
                "category": "output",
                "inputs": ["sql_result", "rag_result"],
                "outputs": ["final_answer", "sources"],
            },
            {
                "type": "reflect",
                "label": "反思",
                "description": "分析问答质量，提取改进洞察存入长期记忆",
                "icon": "💭",
                "category": "output",
                "inputs": ["question", "final_answer"],
                "outputs": [],
            },
        ]
    }


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """获取工作流详情"""
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM workflows WHERE id = ?", (workflow_id,)
    )
    row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="工作流不存在")

    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "nodes": json.loads(row["nodes"]),
        "edges": json.loads(row["edges"]),
        "config": json.loads(row["config"]),
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


@router.post("")
async def create_workflow(data: WorkflowCreate):
    """创建自定义工作流"""
    workflow_id = f"wf-{uuid.uuid4().hex[:8]}"

    db = await get_db()
    await db.execute(
        """INSERT INTO workflows (id, name, description, nodes, edges, config, status)
           VALUES (?, ?, ?, ?, ?, ?, 'draft')""",
        (
            workflow_id,
            data.name,
            data.description,
            json.dumps([n.model_dump() for n in data.nodes], ensure_ascii=False),
            json.dumps([e.model_dump() for e in data.edges], ensure_ascii=False),
            json.dumps(data.config, ensure_ascii=False),
        ),
    )
    await db.commit()

    return {
        "id": workflow_id,
        "name": data.name,
        "nodes": [n.model_dump() for n in data.nodes],
        "edges": [e.model_dump() for e in data.edges],
        "status": "draft",
    }


@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, data: WorkflowUpdate):
    """更新工作流"""
    db = await get_db()

    # 检查是否存在
    cursor = await db.execute(
        "SELECT * FROM workflows WHERE id = ?", (workflow_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="工作流不存在")

    # 构建更新
    updates = {}
    if data.name is not None:
        updates["name"] = data.name
    if data.description is not None:
        updates["description"] = data.description
    if data.nodes is not None:
        updates["nodes"] = json.dumps([n.model_dump() for n in data.nodes], ensure_ascii=False)
    if data.edges is not None:
        updates["edges"] = json.dumps([e.model_dump() for e in data.edges], ensure_ascii=False)
    if data.config is not None:
        updates["config"] = json.dumps(data.config, ensure_ascii=False)
    if data.status is not None:
        updates["status"] = data.status

    if not updates:
        raise HTTPException(status_code=400, detail="没有要更新的字段")

    updates["updated_at"] = datetime.now().isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [workflow_id]

    await db.execute(
        f"UPDATE workflows SET {set_clause} WHERE id = ?",
        values,
    )
    await db.commit()

    return {"success": True, "id": workflow_id}


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """删除工作流"""
    db = await get_db()
    await db.execute("DELETE FROM workflows WHERE id = ?", (workflow_id,))
    await db.commit()
    return {"success": True}

