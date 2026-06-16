import { useEffect, useState } from 'react';
import { Brain, MessageSquare, Search } from 'lucide-react';
import { api } from '../../api/client';

interface Conversation {
  thread_id: string;
  message_count: number;
}

interface AuditEntry {
  id: number;
  timestamp: string;
  thread_id: string;
  event_type: string;
  event_data: any;
  duration_ms: number | null;
}

export default function Memory() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadLogs, setThreadLogs] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [convRes, statsRes] = await Promise.all([
        api.get<{ conversations: Conversation[] }>('/memory/conversations'),
        api.get<any>('/memory/stats'),
      ]);
      setConversations(convRes.conversations || []);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to load memory:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadThreadLogs = async (threadId: string) => {
    setSelectedThread(threadId);
    try {
      const res = await api.get<{ logs: AuditEntry[] }>(`/memory/conversations/${threadId}`);
      setThreadLogs(res.logs || []);
    } catch (error) {
      console.error('Failed to load thread logs:', error);
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
      <div>
        <h1 className="text-2xl font-bold">记忆系统</h1>
        <p className="text-gray-500 mt-1">对话历史和记忆统计</p>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="stat-value">{conversations.length}</div>
              <div className="stat-label">对话线程</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="stat-value">
                {conversations.reduce((sum, c) => sum + c.message_count, 0)}
              </div>
              <div className="stat-label">总消息数</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Search className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="stat-value">{stats?.reflections ?? 0}</div>
              <div className="stat-label">反思记录</div>
            </div>
          </div>
        </div>
      </div>

      {/* 对话列表 + 详情 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 对话列表 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">对话线程</h2>
          {conversations.length === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无对话记录</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.thread_id}
                  onClick={() => loadThreadLogs(conv.thread_id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedThread === conv.thread_id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium text-sm truncate">{conv.thread_id}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {conv.message_count} 条事件
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 对话详情 */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold mb-4">
            {selectedThread ? `对话详情: ${selectedThread}` : '选择对话查看详情'}
          </h2>
          {!selectedThread ? (
            <p className="text-gray-400 text-center py-8">点击左侧对话查看详情</p>
          ) : threadLogs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无事件记录</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {threadLogs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="badge badge-blue">{log.event_type}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  {log.event_data?.question && (
                    <p className="text-sm mt-2 text-gray-700">
                      <strong>问:</strong> {log.event_data.question}
                    </p>
                  )}
                  {log.event_data?.answer_preview && (
                    <p className="text-sm mt-1 text-gray-700">
                      <strong>答:</strong> {log.event_data.answer_preview}
                    </p>
                  )}
                  {log.event_data?.route_type && (
                    <p className="text-xs mt-1 text-gray-500">
                      路由: {log.event_data.route_type}
                    </p>
                  )}
                  {log.duration_ms != null && (
                    <p className="text-xs mt-1 text-gray-400">
                      耗时: {log.duration_ms.toFixed(0)}ms
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
