import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { auditApi, AuditEntry } from '../../api/audit';

interface GuardrailEvent {
  timestamp: string;
  action: string;
  reason: string;
  severity: string;
}

export default function SecurityPage() {
  const [guardrailEvents, setGuardrailEvents] = useState<GuardrailEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuardrailEvents();
  }, []);

  const loadGuardrailEvents = async () => {
    try {
      const result = await auditApi.getLogs({ event_type: 'guardrail', limit: 50 });
      const events: GuardrailEvent[] = result.logs.map((log: AuditEntry) => ({
        timestamp: log.timestamp,
        action: log.event_data?.action || 'unknown',
        reason: log.event_data?.reason || '',
        severity: log.event_data?.severity || 'info',
      }));
      setGuardrailEvents(events);
    } catch (error) {
      console.error('Failed to load guardrail events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <span className="badge badge-red">高危</span>;
      case 'medium':
        return <span className="badge badge-yellow">中危</span>;
      default:
        return <span className="badge badge-blue">低危</span>;
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
          <h1 className="text-2xl font-bold">安全治理</h1>
          <p className="text-gray-500 mt-1">Guardrails 拦截记录和 SQL 安全检查</p>
        </div>
        <button onClick={loadGuardrailEvents} className="btn-secondary">
          刷新
        </button>
      </div>

      {/* 安全策略状态 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">输入过滤</h3>
              <p className="text-sm text-green-600">已启用</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">敏感词检测</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Prompt 注入防护</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">长度限制检查</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">输出过滤</h3>
              <p className="text-sm text-green-600">已启用</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">身份证号脱敏</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">银行卡号脱敏</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">手机号脱敏</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-medium">SQL 安全检查</h3>
              <p className="text-sm text-green-600">已启用</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">拦截 DELETE/UPDATE</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">拦截 DROP/TRUNCATE</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">拦截 INSERT/ALTER</span>
            </div>
          </div>
        </div>
      </div>

      {/* 拦截记录 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">
          安全拦截记录 ({guardrailEvents.length})
        </h2>

        {guardrailEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无拦截记录</p>
            <p className="text-sm mt-2">所有请求均通过安全检查</p>
          </div>
        ) : (
          <div className="space-y-3">
            {guardrailEvents.map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{event.action}</span>
                    {getSeverityBadge(event.severity)}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">{event.reason}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
