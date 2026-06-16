"""记忆系统 API — 代理到 agent-platform 的记忆端点"""
import os
from typing import Optional

import httpx
from fastapi import APIRouter

router = APIRouter()

AGENT_PLATFORM_URL = os.getenv("AGENT_PLATFORM_URL", "http://localhost:8001")


async def _proxy(method: str, path: str, params: dict = None, json_data: dict = None) -> dict:
    """代理请求到 agent-platform"""
    url = f"{AGENT_PLATFORM_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if method == "GET":
                resp = await client.get(url, params=params)
            else:
                resp = await client.post(url, json=json_data)
            resp.raise_for_status()
            return resp.json()
    except httpx.ConnectError:
        return {"error": "agent-platform 未连接", "connected": False}
    except Exception as e:
        return {"error": str(e), "connected": False}


@router.get("/stats")
async def memory_stats():
    """记忆系统统计"""
    return await _proxy("GET", "/api/memory/stats")


@router.get("/conversations")
async def list_conversations():
    """获取对话线程列表（从审计日志中提取 thread_id）"""
    result = await _proxy("GET", "/api/audit/stats")
    if "error" in result:
        return {"conversations": [], "error": result["error"]}

    # 从审计统计中提取线程信息
    threads = result.get("threads", result.get("by_thread", {}))
    conversations = []
    if isinstance(threads, dict):
        for thread_id, count in threads.items():
            conversations.append({
                "thread_id": thread_id,
                "message_count": count,
            })
    return {"conversations": conversations}


@router.get("/conversations/{thread_id}")
async def get_conversation(thread_id: str, limit: int = 50):
    """获取某个对话的审计日志（包含问答记录）"""
    return await _proxy("GET", f"/api/audit/logs/{thread_id}", {"limit": limit})


@router.post("/search")
async def search_memory(query: str, top_k: int = 5):
    """语义搜索记忆"""
    return await _proxy("POST", "/api/memory/search", json_data={"query": query, "top_k": top_k})
