"""审计日志 API — 代理到 agent-platform 的审计端点"""
import os
from typing import Optional

import httpx
from fastapi import APIRouter

router = APIRouter()

AGENT_PLATFORM_URL = os.getenv("AGENT_PLATFORM_URL", "http://localhost:8001")


async def _proxy(method: str, path: str, params: dict = None) -> dict:
    """代理请求到 agent-platform"""
    url = f"{AGENT_PLATFORM_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if method == "GET":
                resp = await client.get(url, params=params)
            else:
                resp = await client.post(url, json=params)
            resp.raise_for_status()
            return resp.json()
    except httpx.ConnectError:
        return {"error": "agent-platform 未连接", "connected": False}
    except httpx.HTTPStatusError as e:
        return {"error": f"请求失败: {e.response.status_code}", "connected": True}
    except Exception as e:
        return {"error": str(e), "connected": False}


@router.get("/stats")
async def audit_stats():
    """审计日志统计"""
    return await _proxy("GET", "/api/audit/stats")


@router.get("/logs")
async def audit_logs(
    thread_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
):
    """查询审计日志"""
    params = {"limit": limit}
    if thread_id:
        params["thread_id"] = thread_id
    if event_type:
        params["event_type"] = event_type

    # 如果有 thread_id，使用 thread-specific 端点
    if thread_id:
        return await _proxy("GET", f"/api/audit/logs/{thread_id}", {"limit": limit})

    return await _proxy("GET", "/api/audit/logs", params)


@router.get("/logs/{thread_id}")
async def audit_logs_by_thread(thread_id: str, limit: int = 100):
    """按线程查询审计日志"""
    return await _proxy("GET", f"/api/audit/logs/{thread_id}", {"limit": limit})


@router.get("/event-types")
async def event_types():
    """列出审计事件类型"""
    return {
        "event_types": [
            {"type": "chat_request", "label": "问答请求", "icon": "💬", "color": "#3B82F6"},
            {"type": "routing", "label": "路由决策", "icon": "🔀", "color": "#8B5CF6"},
            {"type": "llm_call", "label": "LLM 调用", "icon": "🧠", "color": "#10B981"},
            {"type": "mcp_call", "label": "MCP 调用", "icon": "🔧", "color": "#F59E0B"},
            {"type": "answer", "label": "回答生成", "icon": "✅", "color": "#06B6D4"},
            {"type": "guardrail", "label": "安全拦截", "icon": "🛡️", "color": "#EF4444"},
            {"type": "error", "label": "错误", "icon": "❌", "color": "#DC2626"},
        ]
    }
