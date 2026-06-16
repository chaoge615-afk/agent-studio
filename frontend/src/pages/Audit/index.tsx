import { useEffect, useState } from 'react';
import { ScrollText, Filter } from 'lucide-react';
import { auditApi, AuditEntry, EventType } from '../../api/audit';

export default function Audit() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [filterThread, setFilterThread] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logsRes, typesRes] = await Promise.all([
        auditApi.getLogs({ limit: 100 }),
        auditApi.getEventTypes(),
      ]);
      setLogs(logsRes.logs || []);
      setEventTypes(typesRes.event_types || []);
    } catch (error) {
      console.error('Failed to load audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFiltered = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filterType) params.event_type = filterType;
      if (filterThread) params.thread_id = filterThread;
      const res = await auditApi.getLogs(params);
      setLogs(res.logs || []);
    } catch (error) {
      console.error('Failed to load filtered logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    const found = eventTypes.find((t) => t.type === type);
    return found?.icon || '📋';
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'chat_request': return 'badge-blue';
      case 'routing': return 'badge-purple';
      case 'mcp_call': return 'badge-yellow';
      case 'answer': return 'badge-green';
      case 'guardrail': return 'badge-red';
      case 'error': return 'badge-red';
      default: return 'badge-blue';
    }
  };

  if (loading && logs.length === 0) {
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
          <h1 className="text-2xl font-bold">审计日志</h1>
          <p className="text-gray-500 mt-1">Agent 执行链路追踪 ({logs.length} 条记录)</p>
        </div>
        <button onClick={loadFiltered} className="btn-secondary flex items-center gap-2">
          <Filter className="w-4 h-4" />
          筛选
        </button>
      </div>

      {/* 筛选器 */}
      <div className="card flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">事件类型</label>
          <select
            className="input w-48"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">全部类型</option>
            {eventTypes.map((t) => (
              <option key={t.type} value={t.type}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">线程 ID</label>
          <input
            className="input w-48"
            placeholder="default"
            value={filterThread}
            onChange={(e) => setFilterThread(e.target.value)}
          />
        </div>
      </div>

      {/* 时间线 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold">事件时间线</h2>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无审计日志</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                {/* 时间 */}
                <div className="text-xs text-gray-400 whitespace-nowrap w-36 pt-0.5">
                  {new Date(log.timestamp).toLocaleString('zh-CN')}
                </div>

                {/* 图标 + 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getEventIcon(log.event_type)}</span>
                    <span className={`badge ${getEventBadge(log.event_type)}`}>
                      {log.event_type}
                    </span>
                    <span className="text-xs text-gray-400">
                      [{log.thread_id}]
                    </span>
                  </div>

                  {/* 事件详情 */}
                  <div className="mt-1 text-sm text-gray-600">
                    {log.event_data?.question && (
                      <p className="truncate">问: {log.event_data.question}</p>
                    )}
                    {log.event_data?.answer_preview && (
                      <p className="truncate">答: {log.event_data.answer_preview}</p>
                    )}
                    {log.event_data?.node && (
                      <p>节点: {log.event_data.node} → {log.event_data.route_type || log.event_data.server || ''}</p>
                    )}
                    {log.event_data?.action && (
                      <p className="text-red-600">{log.event_data.action}: {log.event_data.reason}</p>
                    )}
                  </div>
                </div>

                {/* 耗时 */}
                {log.duration_ms != null && (
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {log.duration_ms.toFixed(0)}ms
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
