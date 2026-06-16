import { useEffect, useState } from 'react';
import { Brain, MessageSquare, Search } from 'lucide-react';
import StatCard from '../../components/StatCard';
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
      <div className="spinner-container">
        <div className="spinner" />
      </div>
    );
  }

  const totalMessages = conversations.reduce((sum, c) => sum + c.message_count, 0);

  return (
    <div className="space-y-6 page-enter">
      {/* 标题 */}
      <div>
        <h1 className="page-title">记忆系统</h1>
        <p className="page-subtitle">对话历史和记忆统计</p>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard icon={<Brain className="w-6 h-6" />} label="对话线程" value={conversations.length} color="purple" />
        <StatCard icon={<MessageSquare className="w-6 h-6" />} label="总消息数" value={totalMessages} color="blue" />
        <StatCard icon={<Search className="w-6 h-6" />} label="反思记录" value={stats?.reflections ?? 0} color="green" />
      </div>

      {/* 对话列表 + 详情 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 对话列表 */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-violet-500 rounded-full" />
            <h2 className="text-base font-semibold text-gray-900">对话线程</h2>
          </div>
          {conversations.length === 0 ? (
            <div className="empty-state py-10">
              <div className="empty-state-icon">
                <MessageSquare className="w-7 h-7" />
              </div>
              <p className="empty-state-title">暂无对话记录</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.thread_id}
                  onClick={() => loadThreadLogs(conv.thread_id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-150 ${
                    selectedThread === conv.thread_id
                      ? 'list-item-active'
                      : 'list-item'
                  }`}
                >
                  <div className="font-medium text-sm truncate text-gray-900">{conv.thread_id}</div>
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
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full" />
            <h2 className="text-base font-semibold text-gray-900">
              {selectedThread ? `对话详情: ${selectedThread}` : '选择对话查看详情'}
            </h2>
          </div>
          {!selectedThread ? (
            <div className="empty-state py-10">
              <div className="empty-state-icon">
                <MessageSquare className="w-7 h-7" />
              </div>
              <p className="empty-state-title">点击左侧对话查看详情</p>
            </div>
          ) : threadLogs.length === 0 ? (
            <div className="empty-state py-10">
              <p className="empty-state-title">暂无事件记录</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {threadLogs.map((log) => (
                <div key={log.id} className="list-item">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="badge badge-blue">{log.event_type}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  {log.event_data?.question && (
                    <p className="text-sm mt-1.5 text-gray-700">
                      <span className="font-medium text-indigo-600">问:</span> {log.event_data.question}
                    </p>
                  )}
                  {log.event_data?.answer_preview && (
                    <p className="text-sm mt-1 text-gray-700">
                      <span className="font-medium text-emerald-600">答:</span> {log.event_data.answer_preview}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {log.event_data?.route_type && (
                      <span className="text-xs text-gray-500">路由: {log.event_data.route_type}</span>
                    )}
                    {log.duration_ms != null && (
                      <span className="text-xs text-gray-400">{log.duration_ms.toFixed(0)}ms</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
