import { useEffect, useState } from 'react';
import { Bot, Workflow, Wrench, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import StatCard from '../../components/StatCard';
import { api } from '../../api/client';

interface DashboardStats {
  templates: number;
  instances: number;
  workflows: number;
  audit: { total_events: number; event_types: Record<string, number> };
  health: { status: string };
  recent_agents: any[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.get<DashboardStats>('/dashboard/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
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

  const eventTypes = stats?.audit?.event_types || {};
  const pieData = Object.entries(eventTypes).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 page-enter">
      {/* 标题 */}
      <div>
        <h1 className="page-title">仪表盘</h1>
        <p className="page-subtitle">Agent 开发平台概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="opacity-0 animate-fade-in-up stagger-1">
          <StatCard icon={<Bot className="w-6 h-6" />} label="Agent 模板" value={stats?.templates ?? 0} color="blue" />
        </div>
        <div className="opacity-0 animate-fade-in-up stagger-2">
          <StatCard icon={<Activity className="w-6 h-6" />} label="运行中实例" value={stats?.instances ?? 0} color="green" />
        </div>
        <div className="opacity-0 animate-fade-in-up stagger-3">
          <StatCard icon={<Workflow className="w-6 h-6" />} label="工作流" value={stats?.workflows ?? 0} color="purple" />
        </div>
        <div className="opacity-0 animate-fade-in-up stagger-4">
          <StatCard icon={<Wrench className="w-6 h-6" />} label="审计事件" value={stats?.audit?.total_events ?? 0} color="yellow" />
        </div>
      </div>

      {/* 图表和平台状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 事件分布 */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
            <h2 className="text-base font-semibold text-gray-900">审计事件分布</h2>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state h-[260px]">
              <div className="empty-state-icon">
                <Activity className="w-7 h-7" />
              </div>
              <p className="empty-state-title">暂无审计数据</p>
              <p className="empty-state-desc">当 Agent 开始处理请求后，数据将在这里展示</p>
            </div>
          )}
        </div>

        {/* 平台状态 */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
            <h2 className="text-base font-semibold text-gray-900">平台状态</h2>
          </div>
          <div className="space-y-3">
            <div className="list-item flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">agent-platform</span>
              <span className={stats?.health?.status === 'healthy' ? 'status-active' : 'status-error'}>
                {stats?.health?.status === 'healthy' ? '运行中' : '未连接'}
              </span>
            </div>
            <div className="list-item flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Agent Studio 后端</span>
              <span className="status-active">运行中</span>
            </div>

            <div className="pt-3">
              <h3 className="text-sm font-medium text-gray-700 mb-3">最近创建的 Agent</h3>
              {stats?.recent_agents && stats.recent_agents.length > 0 ? (
                <div className="space-y-2">
                  {stats.recent_agents.map((agent) => (
                    <div key={agent.id} className="list-item flex items-center gap-2.5">
                      <span className="text-lg">{agent.icon}</span>
                      <span className="text-sm font-medium text-gray-800">{agent.name}</span>
                      <span className="badge badge-blue ml-auto">{agent.type}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">暂无 Agent 实例</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
