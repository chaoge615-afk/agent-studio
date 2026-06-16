import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Wrench } from 'lucide-react';
import { api } from '../../api/client';

interface ToolInfo {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface ServerInfo {
  name: string;
  tool_count: number;
  tools: ToolInfo[];
}

export default function Tools() {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const data = await api.get<{ connected: boolean; servers: ServerInfo[]; total_tools: number }>(
        '/tools'
      );
      setServers(data.servers || []);
      setConnected(data.connected);
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* 标题 */}
      <div className="page-header">
        <div>
          <h1 className="page-title">工具管理</h1>
          <p className="page-subtitle">MCP Server 连接状态和可用工具</p>
        </div>
        <button onClick={loadTools} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* 连接状态 */}
      <div className="card">
        <div className="flex items-center gap-3">
          {connected ? (
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )}
          <span className="font-medium text-gray-900">agent-platform</span>
          <span className={connected ? 'status-active' : 'status-error'}>
            {connected ? '已连接' : '未连接'}
          </span>
        </div>
      </div>

      {/* Server 列表 */}
      {servers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Wrench className="w-7 h-7" />
            </div>
            <p className="empty-state-title">暂无 MCP Server</p>
            <p className="empty-state-desc">请确保 agent-platform 已启动并连接 MCP Server</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {servers.map((server) => (
            <div key={server.name} className="card">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
                    <span className="text-xl">🔧</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-gray-900">{server.name}</h3>
                    <p className="text-sm text-gray-500">{server.tool_count} 个工具</p>
                  </div>
                </div>
                <span className="status-active">已连接</span>
              </div>

              {/* 工具列表 */}
              <div className="space-y-2">
                {server.tools.map((tool) => (
                  <div key={tool.name} className="list-item">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">{tool.name}</span>
                      <span className="badge badge-blue">MCP</span>
                    </div>
                    {tool.description && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tool.description}</p>
                    )}
                    {tool.inputSchema?.properties && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.keys(tool.inputSchema.properties).map((param) => (
                          <span key={param} className="badge badge-purple">{param}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
