import { useEffect, useState } from 'react';
import { Bot, Plus, Trash2, Play, Square, X } from 'lucide-react';
import { api } from '../../api/client';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  config: any;
}

interface AgentInstance {
  id: string;
  template_id: string;
  name: string;
  template_name: string;
  template_icon: string;
  status: string;
  created_at: string;
}

export default function Agents() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [instances, setInstances] = useState<AgentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [newInstanceName, setNewInstanceName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [agentsRes, instancesRes] = await Promise.all([
        api.get<{ count: number; agents: AgentTemplate[] }>('/agents'),
        api.get<{ count: number; instances: AgentInstance[] }>('/agents/instances/list'),
      ]);
      setTemplates(agentsRes.agents);
      setInstances(instancesRes.instances);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async () => {
    if (!selectedTemplate || !newInstanceName) return;
    try {
      await api.post('/agents/instances', {
        template_id: selectedTemplate,
        name: newInstanceName,
      });
      setShowCreate(false);
      setNewInstanceName('');
      loadData();
    } catch (error) {
      console.error('Failed to create instance:', error);
    }
  };

  const deleteInstance = async (id: string) => {
    if (!confirm('确定要删除这个 Agent 实例吗？')) return;
    try {
      await api.delete(`/agents/instances/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete instance:', error);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      await api.put(`/agents/instances/${id}`, {
        status: currentStatus === 'active' ? 'stopped' : 'active',
      });
      loadData();
    } catch (error) {
      console.error('Failed to toggle status:', error);
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
          <h1 className="page-title">Agent 市场</h1>
          <p className="page-subtitle">预置 Agent 模板和运行中的实例</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          创建实例
        </button>
      </div>

      {/* 创建对话框 - 模态 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-elevated p-6 w-full max-w-md animate-fade-in-up mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">创建新 Agent 实例</h3>
              <button onClick={() => setShowCreate(false)} className="btn-ghost">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">选择模板</label>
                <select
                  className="input"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  <option value="">-- 选择模板 --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">实例名称</label>
                <input
                  className="input"
                  placeholder="我的 Agent"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createInstance()}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={createInstance} className="btn-primary flex-1">创建</button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Agent 模板 */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">预置模板 ({templates.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="card-hover">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">{template.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base text-gray-900">{template.name}</h3>
                    <span className="badge badge-blue">{template.type}</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{template.description}</p>
                  {template.config?.features && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {template.config.features.map((f: string) => (
                        <span key={f} className="badge badge-purple">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 运行中实例 */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">运行中实例 ({instances.length})</h2>
        {instances.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Bot className="w-7 h-7" />
              </div>
              <p className="empty-state-title">暂无运行中的 Agent 实例</p>
              <p className="empty-state-desc">点击上方「创建实例」开始使用</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {instances.map((inst) => (
              <div key={inst.id} className="card-hover flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{inst.template_icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{inst.name}</h3>
                    <p className="text-sm text-gray-500">
                      {inst.template_name} · {new Date(inst.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={inst.status === 'active' ? 'status-active' : 'status-stopped'}>
                    {inst.status === 'active' ? '运行中' : '已停止'}
                  </span>
                  <button
                    onClick={() => toggleStatus(inst.id, inst.status)}
                    className="btn-ghost"
                    title={inst.status === 'active' ? '停止' : '启动'}
                  >
                    {inst.status === 'active' ? (
                      <Square className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Play className="w-4 h-4 text-emerald-600" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteInstance(inst.id)}
                    className="btn-ghost hover:!bg-red-50 hover:!text-red-600"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
