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
        return <span className="status-error">高危</span>;
      case 'medium':
        return <span className="status-stopped">中危</span>;
      default:
        return <span className="badge badge-blue">低危</span>;
    }
  };

  const policyCards = [
    {
      title: '输入过滤',
      gradient: 'from-emerald-500/10 to-teal-500/10',
      iconColor: 'text-emerald-600',
      items: ['敏感词检测', 'Prompt 注入防护', '长度限制检查'],
    },
    {
      title: '输出过滤',
      gradient: 'from-indigo-500/10 to-blue-500/10',
      iconColor: 'text-indigo-600',
      items: ['身份证号脱敏', '银行卡号脱敏', '手机号脱敏'],
    },
    {
      title: 'SQL 安全检查',
      gradient: 'from-amber-500/10 to-orange-500/10',
      iconColor: 'text-amber-600',
      icon: AlertTriangle,
      items: ['拦截 DELETE/UPDATE', '拦截 DROP/TRUNCATE', '拦截 INSERT/ALTER'],
    },
  ];

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
          <h1 className="page-title">安全治理</h1>
          <p className="page-subtitle">Guardrails 拦截记录和 SQL 安全检查</p>
        </div>
        <button onClick={loadGuardrailEvents} className="btn-secondary">
          刷新
        </button>
      </div>

      {/* 安全策略状态 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {policyCards.map((card) => {
          const Icon = card.icon || Shield;
          return (
            <div key={card.title} className="card-hover">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{card.title}</h3>
                  <span className="status-active text-[11px]">已启用</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {card.items.map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 拦截记录 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-rose-500 rounded-full" />
          <h2 className="text-base font-semibold text-gray-900">
            安全拦截记录 ({guardrailEvents.length})
          </h2>
        </div>

        {guardrailEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Shield className="w-7 h-7" />
            </div>
            <p className="empty-state-title">暂无拦截记录</p>
            <p className="empty-state-desc">所有请求均通过安全检查</p>
          </div>
        ) : (
          <div className="space-y-2">
            {guardrailEvents.map((event, i) => (
              <div key={i} className="list-item flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{event.action}</span>
                    {getSeverityBadge(event.severity)}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{event.reason}</p>
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
