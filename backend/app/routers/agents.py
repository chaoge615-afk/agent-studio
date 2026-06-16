"""Agent 模板和实例管理 API"""
import json
import uuid
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_db

router = APIRouter()


class AgentInstanceCreate(BaseModel):
    template_id: str
    name: str
    config: dict = {}
    workflow_id: Optional[str] = None


class AgentInstanceUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[dict] = None
    status: Optional[str] = None


@router.get("")
async def list_agents():
    """列出所有 Agent 模板"""
    db = await get_db()
    cursor = await db.execute("SELECT * FROM agent_templates ORDER BY created_at ASC")
    rows = await cursor.fetchall()

    agents = []
    for row in rows:
        agents.append({
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "type": row["type"],
            "icon": row["icon"],
            "config": json.loads(row["config"]),
            "created_at": row["created_at"],
        })

    return {"count": len(agents), "agents": agents}


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    """获取 Agent 模板详情"""
    db = await get_db()
    cursor = await db.execute("SELECT * FROM agent_templates WHERE id = ?", (agent_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Agent 模板不存在")

    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "type": row["type"],
        "icon": row["icon"],
        "config": json.loads(row["config"]),
        "created_at": row["created_at"],
    }


@router.post("")
async def create_agent_template(data: dict):
    """创建自定义 Agent 模板"""
    agent_id = f"custom-{uuid.uuid4().hex[:8]}"
    db = await get_db()
    await db.execute(
        """INSERT INTO agent_templates (id, name, description, type, icon, config)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (agent_id, data.get("name", "自定义 Agent"), data.get("description", ""),
         data.get("type", "custom"), data.get("icon", "🤖"),
         json.dumps(data.get("config", {}), ensure_ascii=False)),
    )
    await db.commit()
    return {"id": agent_id, "name": data.get("name")}


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    """删除 Agent 模板"""
    db = await get_db()
    await db.execute("DELETE FROM agent_templates WHERE id = ?", (agent_id,))
    await db.commit()
    return {"success": True}


@router.get("/instances/list")
async def list_instances():
    """列出所有运行中的 Agent 实例"""
    db = await get_db()
    cursor = await db.execute(
        """SELECT i.*, t.name as template_name, t.icon as template_icon
           FROM agent_instances i
           LEFT JOIN agent_templates t ON i.template_id = t.id
           ORDER BY i.created_at DESC"""
    )
    rows = await cursor.fetchall()

    instances = []
    for row in rows:
        instances.append({
            "id": row["id"],
            "template_id": row["template_id"],
            "name": row["name"],
            "template_name": row["template_name"] if row["template_name"] else "自定义",
            "template_icon": row["template_icon"] if row["template_icon"] else "🤖",
            "config": json.loads(row["config"]),
            "workflow_id": row["workflow_id"],
            "status": row["status"],
            "created_at": row["created_at"],
        })

    return {"count": len(instances), "instances": instances}


@router.post("/instances")
async def create_instance(data: AgentInstanceCreate):
    """从模板创建 Agent 实例"""
    db = await get_db()

    cursor = await db.execute("SELECT * FROM agent_templates WHERE id = ?", (data.template_id,))
    template = await cursor.fetchone()
    if not template:
        raise HTTPException(status_code=404, detail="Agent 模板不存在")

    instance_id = f"inst-{uuid.uuid4().hex[:8]}"

    merged_config = json.loads(template["config"])
    merged_config.update(data.config)

    await db.execute(
        """INSERT INTO agent_instances (id, template_id, name, config, workflow_id, status)
           VALUES (?, ?, ?, ?, ?, 'active')""",
        (instance_id, data.template_id, data.name,
         json.dumps(merged_config, ensure_ascii=False), data.workflow_id),
    )
    await db.commit()

    return {
        "id": instance_id,
        "template_id": data.template_id,
        "name": data.name,
        "config": merged_config,
        "status": "active",
    }


@router.put("/instances/{instance_id}")
async def update_instance(instance_id: str, data: AgentInstanceUpdate):
    """更新 Agent 实例"""
    db = await get_db()
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
    return {"success": True}


@router.delete("/instances/{instance_id}")
async def delete_instance(instance_id: str):
    """删除 Agent 实例"""
    db = await get_db()
    await db.execute("DELETE FROM agent_instances WHERE id = ?", (instance_id,))
    await db.commit()
    return {"success": True}
