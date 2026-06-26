"""Agent Studio — FastAPI 管理后端"""
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db, close_db
from app.routers import agents, workflows, tools, memory, dashboard, audit


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动/关闭时的资源管理"""
    await init_db()

    # PF-02：进程级共享 httpx.AsyncClient，keep-alive 连接复用，
    # 把 dashboard 的 ~2.3s（每次新建客户端 ~0.85s×2）降到 <0.1s。
    # lifespan 管理创建/关闭，避免模块级懒加载单例不释放资源。
    app.state.platform_client = httpx.AsyncClient(timeout=5.0)

    print("[OK] Agent Studio 后端启动完成")
    yield

    await app.state.platform_client.aclose()
    await close_db()
    print("[BYE] Agent Studio 后端已关闭")


app = FastAPI(
    title="Agent Studio",
    description="Agent 开发平台 — 可视化管理后端",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — 允许前端开发服务器访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(agents.router, prefix="/api/agents", tags=["Agent 管理"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["工作流管理"])
app.include_router(tools.router, prefix="/api/tools", tags=["工具管理"])
app.include_router(memory.router, prefix="/api/memory", tags=["记忆系统"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["仪表盘"])
app.include_router(audit.router, prefix="/api/audit", tags=["审计日志"])


@app.get("/")
async def root():
    return {
        "name": "Agent Studio",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "agent-studio"}
