"""仪表盘 API — 聚合 agent-platform 数据 + 本地统计"""
import os
import asyncio
import json
from typing import Optional

import httpx
from fastapi import APIRouter, Request

from app.db import get_db

router = APIRouter()

# PF-02 修复：默认改 127.0.0.1，避开 Windows localhost 双栈 happy-eyeballs 延迟（0.85→0.54s）。
# 走 .env 不硬编码。
AGENT_PLATFORM_URL = os.getenv("AGENT_PLATFORM_URL", "http://127.0.0.1:8001")


async def _proxy_get(request: Request, path: str, params: dict = None) -> dict:
    """代理 GET 请求到 agent-platform。

    PF-02：复用 lifespan 管理的共享 httpx.AsyncClient（keep-alive 连接复用），
    把每次新建客户端的 ~0.85s 建连税降到 <15ms。连接失效时重试一次（新连接）。
    """
    client: httpx.AsyncClient = request.app.state.platform_client
    url = f"{AGENT_PLATFORM_URL}{path}"
    # 重试一次：agent-platform 重启后 keep-alive 连接可能失效，RemoteProtocolError 穿透
    for attempt in range(2):
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
        except (httpx.ConnectError, httpx.RemoteProtocolError, httpx.ReadError) as e:
            if attempt == 0:
                # 连接层错误：可能是失效 keep-alive，重试一次（httpx 会建新连接）
                continue
            return {"error": f"agent-platform 连接失败: {e}"}
        except Exception:
            return {"error": "agent-platform 未连接"}
    return {"error": "agent-platform 未连接"}


@router.get("/stats")
async def dashboard_stats(request: Request):
    """仪表盘综合统计"""
    db = await get_db()

    # 本地统计（aiosqlite 内部队列序列化并发，gather 无收益，保持串行）
    cursor = await db.execute("SELECT COUNT(*) FROM agent_templates")
    template_count = (await cursor.fetchone())[0]

    cursor = await db.execute("SELECT COUNT(*) FROM agent_instances")
    instance_count = (await cursor.fetchone())[0]

    cursor = await db.execute("SELECT COUNT(*) FROM workflows")
    workflow_count = (await cursor.fetchone())[0]

    # 从 agent-platform 获取审计统计 + 健康（PF-02：共享 client + 并行）
    audit_stats, health = await asyncio.gather(
        _proxy_get(request, "/api/audit/stats"),
        _proxy_get(request, "/health"),
    )

    # 查询最近的活动（JOIN agent_templates 获取 type 和 icon）
    cursor = await db.execute(
        """SELECT i.id, i.name, t.type, t.icon, i.created_at
           FROM agent_instances i
           LEFT JOIN agent_templates t ON i.template_id = t.id
           ORDER BY i.created_at DESC LIMIT 5"""
    )
    rows = await cursor.fetchall()
    recent_agents = [
        {
            "id": row["id"],
            "name": row["name"],
            "type": row["type"] or "unknown",
            "icon": row["icon"] or "🤖",
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
async def recent_queries(request: Request, limit: int = 10):
    """最近的查询记录（从审计日志获取）"""
    result = await _proxy_get(request, "/api/audit/logs", {"event_type": "answer", "limit": limit})
    return result


@router.get("/health")
async def platform_health(request: Request):
    """agent-platform 健康状态"""
    return await _proxy_get(request, "/health")
