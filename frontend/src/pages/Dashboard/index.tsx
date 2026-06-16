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

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const eventTypes = stats?.audit?.event_types || {};
  const pieData = Object.entries(eventTypes).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <p className="text-gray-500 mt-1">Agent 开发平台概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Bot className="w-6 h-6" />}
          label="Agent 模板"
          value={stats?.templates ?? 0}
          color="blue"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="运行中实例"
          value={stats?.instances ?? 0}
          color="green"
        />
        <StatCard
          icon={<Workflow className="w-6 h-6" />}
          label="工作流"
          value={stats?.workflows ?? 0}
          color="purple"
        />
        <StatCard
          icon={<Wrench className="w-6 h-6" />}
          label="审计事件"
          value={stats?.audit?.total_events ?? 0}
          color="yellow"
        />
      </div>

      {/* 图表和平台状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 事件分布 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">审计事件分布</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              暂无审计数据
            </div>
          )}
        </div>

        {/* 平台状态 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">平台状态</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">agent-platform</span>
              <span
                className={`badge ${
                  stats?.health?.status === 'healthy' ? 'badge-green' : 'badge-red'
                }`}
              >
                {stats?.health?.status === 'healthy' ? '运行中' : '未连接'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Agent Studio 后端</span>
              <span className="badge badge-green">运行中</span>
            </div>

            <h3 className="text-sm font-medium text-gray-700 mt-4">最近创建的 Agent</h3>
            {stats?.recent_agents && stats.recent_agents.length > 0 ? (
              <div className="space-y-2">
                {stats.recent_agents.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span>{agent.icon}</span>
                    <span className="text-sm">{agent.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{agent.type}</span>
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
  );
}
