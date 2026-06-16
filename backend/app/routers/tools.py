"""工具管理 API — 代理到 agent-platform 的 MCP 工具端点"""
import os
from typing import Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

AGENT_PLATFORM_URL = os.getenv("AGENT_PLATFORM_URL", "http://localhost:8001")


class ToolTestRequest(BaseModel):
    server: str
    tool: str
    arguments: dict


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


@router.get("")
async def list_tools():
    """列出所有 MCP Server 及其工具"""
    result = await _proxy_get("/api/mcp/tools")

    if "error" in result:
        return {
            "connected": False,
            "servers": [],
            "total_tools": 0,
            "error": result["error"],
        }

    tools_map = result.get("tools", {})
    servers = []
    total = 0
    for name, tools in tools_map.items():
        tool_list = tools if isinstance(tools, list) else []
        servers.append({
            "name": name,
            "tool_count": len(tool_list),
            "tools": tool_list,
        })
        total += len(tool_list)

    return {
        "connected": True,
        "servers": servers,
        "total_tools": total,
    }


@router.get("/health")
async def mcp_health():
    """MCP Server 健康状态"""
    result = await _proxy_get("/health")
    return result


@router.post("/test")
async def test_tool(request: ToolTestRequest):
    """测试工具调用（通过发送聊天请求）"""
    url = f"{AGENT_PLATFORM_URL}/api/chat"
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                url,
                json={
                    "question": f"[Tool Test] {request.server}.{request.tool}: {request.arguments}",
                    "conversation_id": f"test-{request.server}",
                },
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.ConnectError:
        return {"error": "agent-platform 未连接"}
    except Exception as e:
        return {"error": str(e)}
