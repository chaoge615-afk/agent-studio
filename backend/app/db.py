"""SQLite 异步数据库管理"""
import aiosqlite
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "agent_studio.db")

_db: aiosqlite.Connection = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        _db = await aiosqlite.connect(DB_PATH)
        _db.row_factory = aiosqlite.Row
    return _db


async def init_db():
    """初始化数据库表 + 预置 Agent 模板"""
    db = await get_db()

    await db.executescript("""
        CREATE TABLE IF NOT EXISTS agent_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL,
            icon TEXT DEFAULT '🤖',
            config TEXT DEFAULT '{}',
            workflow_id TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS workflows (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            nodes TEXT DEFAULT '[]',
            edges TEXT DEFAULT '[]',
            config TEXT DEFAULT '{}',
            status TEXT DEFAULT 'draft',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS agent_instances (
            id TEXT PRIMARY KEY,
            template_id TEXT,
            name TEXT NOT NULL,
            config TEXT DEFAULT '{}',
            workflow_id TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (template_id) REFERENCES agent_templates(id)
        );
    """)

    # 预置 Agent 模板（仅首次运行时插入）
    cursor = await db.execute("SELECT COUNT(*) FROM agent_templates")
    count = (await cursor.fetchone())[0]

    if count == 0:
        templates = [
            {
                "id": "knowledge-assistant",
                "name": "知识库助手",
                "description": "综合型知识库问答助手，支持结构化数据查询和语义检索，自动路由到最佳查询方式。适合 B 站视频知识库、企业文档库等场景。",
                "type": "hybrid",
                "icon": "🧠",
                "config": json.dumps({
                    "route_types": ["structured", "semantic", "hybrid"],
                    "mcp_servers": ["sql", "rag"],
                    "features": ["意图分类", "SQL 查询", "RAG 检索", "结果融合", "反思"],
                }),
            },
            {
                "id": "data-analyst",
                "name": "数据分析师",
                "description": "专注结构化数据分析，支持统计查询、排名、趋势分析。通过 Text-to-SQL 将自然语言转为精确的 SQL 查询。",
                "type": "structured",
                "icon": "📊",
                "config": json.dumps({
                    "route_types": ["structured"],
                    "mcp_servers": ["sql"],
                    "features": ["Text-to-SQL", "统计分析", "数据可视化"],
                }),
            },
            {
                "id": "content-advisor",
                "name": "内容顾问",
                "description": "语义检索专家，擅长从知识库中提取观点、经验和见解。适合情感咨询、内容推荐、知识探索等场景。",
                "type": "semantic",
                "icon": "💡",
                "config": json.dumps({
                    "route_types": ["semantic"],
                    "mcp_servers": ["rag"],
                    "features": ["语义检索", "观点提取", "话题推荐"],
                }),
            },
            {
                "id": "multi-agent-orchestrator",
                "name": "多 Agent 协调器",
                "description": "通过 A2A 协议协调多个 Agent 协作完成复杂任务。支持任务分解、并行执行、结果融合。",
                "type": "orchestrator",
                "icon": "🎯",
                "config": json.dumps({
                    "route_types": ["structured", "semantic", "hybrid"],
                    "mcp_servers": ["sql", "rag", "bilibili"],
                    "features": ["A2A 协作", "任务分解", "并行执行", "结果融合"],
                }),
            },
        ]

        for t in templates:
            await db.execute(
                "INSERT INTO agent_templates (id, name, description, type, icon, config) VALUES (?, ?, ?, ?, ?, ?)",
                (t["id"], t["name"], t["description"], t["type"], t["icon"], t["config"]),
            )

        await db.commit()

    await db.commit()


async def close_db():
    global _db
    if _db:
        await _db.close()
        _db = None
