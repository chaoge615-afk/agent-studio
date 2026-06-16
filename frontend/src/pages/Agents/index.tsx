import { useEffect, useState } from 'react';
import { Bot, Plus, Trash2, Play, Square } from 'lucide-react';
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
          <h1 className="text-2xl font-bold">Agent 市场</h1>
          <p className="text-gray-500 mt-1">预置 Agent 模板和运行中的实例</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          创建实例
        </button>
      </div>

      {/* 创建对话框 */}
      {showCreate && (
        <div className="card border-primary-300 bg-primary-50">
          <h3 className="font-semibold mb-3">创建新 Agent 实例</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择模板</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">实例名称</label>
              <input
                className="input"
                placeholder="我的 Agent"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createInstance} className="btn-primary">创建</button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">取消</button>
          </div>
        </div>
      )}

      {/* Agent 模板 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">预置模板 ({templates.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <span className="text-4xl">{template.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  <span className="badge badge-blue">{template.type}</span>
                  <p className="text-sm text-gray-500 mt-2">{template.description}</p>
                  {template.config?.features && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.config.features.map((f: string) => (
                        <span key={f} className="badge badge-green">{f}</span>
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
        <h2 className="text-lg font-semibold mb-3">运行中实例 ({instances.length})</h2>
        {instances.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无运行中的 Agent 实例</p>
            <p className="text-sm mt-2">点击上方「创建实例」开始使用</p>
          </div>
        ) : (
          <div className="space-y-3">
            {instances.map((inst) => (
              <div key={inst.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{inst.template_icon}</span>
                  <div>
                    <h3 className="font-medium">{inst.name}</h3>
                    <p className="text-sm text-gray-500">
                      {inst.template_name} · {new Date(inst.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${
                      inst.status === 'active' ? 'badge-green' : 'badge-yellow'
                    }`}
                  >
                    {inst.status === 'active' ? '运行中' : '已停止'}
                  </span>
                  <button
                    onClick={() => toggleStatus(inst.id, inst.status)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title={inst.status === 'active' ? '停止' : '启动'}
                  >
                    {inst.status === 'active' ? (
                      <Square className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <Play className="w-4 h-4 text-green-600" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteInstance(inst.id)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
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
