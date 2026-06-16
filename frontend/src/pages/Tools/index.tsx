import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">工具管理</h1>
          <p className="text-gray-500 mt-1">MCP Server 连接状态和可用工具</p>
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
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="font-medium">
            agent-platform: {connected ? '已连接' : '未连接'}
          </span>
        </div>
      </div>

      {/* Server 列表 */}
      {servers.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p>暂无 MCP Server</p>
          <p className="text-sm mt-2">请确保 agent-platform 已启动并连接 MCP Server</p>
        </div>
      ) : (
        <div className="space-y-4">
          {servers.map((server) => (
            <div key={server.name} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-lg">🔧</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{server.name}</h3>
                    <p className="text-sm text-gray-500">{server.tool_count} 个工具</p>
                  </div>
                </div>
                <span className="badge badge-green">已连接</span>
              </div>

              {/* 工具列表 */}
              <div className="space-y-2">
                {server.tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{tool.name}</span>
                      <span className="text-xs text-gray-400">MCP Tool</span>
                    </div>
                    {tool.description && (
                      <p className="text-xs text-gray-500 mt-1">{tool.description}</p>
                    )}
                    {tool.inputSchema?.properties && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.keys(tool.inputSchema.properties).map((param) => (
                          <span key={param} className="badge badge-blue">
                            {param}
                          </span>
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
