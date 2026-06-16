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
          <h1 className="page-title">审计日志</h1>
          <p className="page-subtitle">Agent 执行链路追踪 ({logs.length} 条记录)</p>
        </div>
        <button onClick={loadFiltered} className="btn-secondary flex items-center gap-2">
          <Filter className="w-4 h-4" />
          筛选
        </button>
      </div>

      {/* 筛选器 */}
      <div className="card py-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">事件类型</label>
            <select
              className="input"
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
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">线程 ID</label>
            <input
              className="input"
              placeholder="default"
              value={filterThread}
              onChange={(e) => setFilterThread(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 时间线 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
          <h2 className="text-base font-semibold text-gray-900">事件时间线</h2>
        </div>

        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <ScrollText className="w-7 h-7" />
            </div>
            <p className="empty-state-title">暂无审计日志</p>
            <p className="empty-state-desc">Agent 执行请求后将自动记录事件</p>
          </div>
        ) : (
          <div className="space-y-0">
            {logs.map((log) => (
              <div key={log.id} className="timeline-item">
                <div className="list-item">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getEventIcon(log.event_type)}</span>
                      <span className={`badge ${getEventBadge(log.event_type)}`}>
                        {log.event_type}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {log.thread_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {log.duration_ms != null && (
                        <span className="text-xs text-gray-400 font-mono">
                          {log.duration_ms.toFixed(0)}ms
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>

                  {/* 事件详情 */}
                  <div className="text-sm text-gray-600 space-y-0.5">
                    {log.event_data?.question && (
                      <p className="truncate">
                        <span className="font-medium text-indigo-600">问:</span> {log.event_data.question}
                      </p>
                    )}
                    {log.event_data?.answer_preview && (
                      <p className="truncate">
                        <span className="font-medium text-emerald-600">答:</span> {log.event_data.answer_preview}
                      </p>
                    )}
                    {log.event_data?.node && (
                      <p className="text-xs text-gray-500">
                        节点: {log.event_data.node} → {log.event_data.route_type || log.event_data.server || ''}
                      </p>
                    )}
                    {log.event_data?.action && (
                      <p className="text-sm text-red-600 font-medium">{log.event_data.action}: {log.event_data.reason}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
