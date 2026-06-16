"""仪表盘 API — 聚合 agent-platform 数据 + 本地统计"""
import os
import json
from typing import Optional

import httpx
from fastapi import APIRouter

from app.db import get_db

router = APIRouter()

AGENT_PLATFORM_URL = os.getenv("AGENT_PLATFORM_URL", "http://localhost:8001")


async def _proxy_get(path: str, params: dict = None) -> dict:
    """代理 GET 请求到 agent-platform"""
    url = f"{AGENT_PLATFORM_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return {"error": "agent-platform 未连接"}


@router.get("/stats")
async def dashboard_stats():
    """仪表盘综合统计"""
    db = await get_db()

    # 本地统计
    cursor = await db.execute("SELECT COUNT(*) FROM agent_templates")
    template_count = (await cursor.fetchone())[0]

    cursor = await db.execute("SELECT COUNT(*) FROM agent_instances")
    instance_count = (await cursor.fetchone())[0]

    cursor = await db.execute("SELECT COUNT(*) FROM workflows")
    workflow_count = (await cursor.fetchone())[0]

    # 从 agent-platform 获取审计统计
    audit_stats = await _proxy_get("/api/audit/stats")
    health = await _proxy_get("/health")

    # 查询最近的活动
    cursor = await db.execute(
        "SELECT id, name, type, icon, created_at FROM agent_instances ORDER BY created_at DESC LIMIT 5"
    )
    rows = await cursor.fetchall()
    recent_agents = [
        {
            "id": row["id"],
            "name": row["name"],
            "type": row["type"],
            "icon": row["icon"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]

    return {
        "templates": template_count,
        "instances": instance_count,
        "workflows": workflow_count,
        "audit": audit_stats if "error" not in audit_stats else {"total_events": 0, "event_types": {}},
        "health": health if "error" not in health else {"status": "disconnected"},
        "recent_agents": recent_agents,
    }


@router.get("/recent-queries")
async def recent_queries(limit: int = 10):
    """最近的查询记录（从审计日志获取）"""
    result = await _proxy_get("/api/audit/logs", {"event_type": "answer", "limit": limit})
    return result


@router.get("/health")
async def platform_health():
    """agent-platform 健康状态"""
    return await _proxy_get("/health")
