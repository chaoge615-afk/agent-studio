import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Trash2, Download } from 'lucide-react';
import { api } from '../../api/client';
import CustomNode from '../../components/CustomNode';

interface WorkflowInfo {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface NodeType {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: string;
}

const nodeTypes = { custom: CustomNode };

export default function Workflows() {
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [nodeTypes_, setNodeTypes_] = useState<NodeType[]>([]);
  const [workflowName, setWorkflowName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWorkflows();
    loadNodeTypes();
  }, []);

  const loadWorkflows = async () => {
    try {
      const res = await api.get<{ count: number; workflows: WorkflowInfo[] }>('/workflows');
      setWorkflows(res.workflows || []);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadNodeTypes = async () => {
    try {
      const res = await api.get<{ node_types: NodeType[] }>('/workflows/node-types');
      setNodeTypes_(res.node_types || []);
    } catch (error) {
      console.error('Failed to load node types:', error);
    }
  };

  const loadWorkflow = async (id: string) => {
    setLoading(true);
    try {
      const wf = await api.get<any>(`/workflows/${id}`);
      setSelectedId(id);
      setWorkflowName(wf.name);

      const rfNodes: Node[] = (wf.nodes || []).map((n: any) => ({
        id: n.id,
        type: 'custom',
        position: n.position || { x: 0, y: 0 },
        data: {
          label: n.label,
          nodeType: n.type,
          description: n.description || '',
          config: n.config || {},
        },
      }));

      const rfEdges: Edge[] = (wf.edges || []).map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label || '',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (error) {
      console.error('Failed to load workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFromTemplate = async (templateId: string) => {
    try {
      const wf = await api.post<any>(`/workflows/from-template/${templateId}`, {});
      loadWorkflows();
      loadWorkflow(wf.id);
    } catch (error) {
      console.error('Failed to create from template:', error);
    }
  };

  const saveWorkflow = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const nodesData = nodes.map((n) => ({
        id: n.id,
        type: n.data?.nodeType || 'custom',
        label: n.data?.label || n.id,
        config: n.data?.config || {},
        position: n.position,
      }));
      const edgesData = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label?.toString() || '',
      }));
      await api.put(`/workflows/${selectedId}`, {
        name: workflowName,
        nodes: nodesData,
        edges: edgesData,
      });
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteWorkflow = async () => {
    if (!selectedId || !confirm('确定要删除这个工作流吗？')) return;
    try {
      await api.delete(`/workflows/${selectedId}`);
      setSelectedId(null);
      setNodes([]);
      setEdges([]);
      loadWorkflows();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const addNode = (nodeType: NodeType) => {
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'custom',
      position: { x: 250 + Math.random() * 100, y: 100 + nodes.length * 120 },
      data: {
        label: nodeType.label,
        nodeType: nodeType.type,
        description: nodeType.description,
        config: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const exportJSON = () => {
    const data = { nodes: nodes.map(n => ({...n})), edges: edges.map(e => ({...e})) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName || 'workflow'}.json`;
    a.click();
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex gap-4 page-enter">
      {/* 左侧面板 */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
        {/* 工作流列表 */}
        <div className="bg-gray-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">工作流</h3>
          {workflows.length === 0 ? (
            <p className="text-xs text-gray-500">从下方模板创建</p>
          ) : (
            <div className="space-y-1.5">
              {workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => loadWorkflow(wf.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-sm transition-all duration-150 ${
                    selectedId === wf.id
                      ? 'bg-white/12 text-white border border-indigo-400/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/8 hover:text-gray-200'
                  }`}
                >
                  <div className="font-medium truncate text-xs">{wf.name}</div>
                  <span className={`badge text-[10px] mt-1 ${wf.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>
                    {wf.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 从模板创建 */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">从模板创建</p>
            <div className="space-y-1.5">
              <button
                onClick={() => createFromTemplate('standard-hybrid')}
                className="w-full text-left px-3 py-2 bg-gradient-to-r from-purple-500/15 to-transparent hover:from-purple-500/25 rounded-lg text-xs text-gray-300 transition-all duration-150"
              >
                🔄 标准混合查询流程
              </button>
              <button
                onClick={() => createFromTemplate('simple-rag')}
                className="w-full text-left px-3 py-2 bg-gradient-to-r from-cyan-500/15 to-transparent hover:from-cyan-500/25 rounded-lg text-xs text-gray-300 transition-all duration-150"
              >
                🔍 简单 RAG 检索
              </button>
              <button
                onClick={() => createFromTemplate('data-pipeline')}
                className="w-full text-left px-3 py-2 bg-gradient-to-r from-indigo-500/15 to-transparent hover:from-indigo-500/25 rounded-lg text-xs text-gray-300 transition-all duration-150"
              >
                📊 数据分析流程
              </button>
            </div>
          </div>
        </div>

        {/* 节点类型 */}
        <div className="bg-gray-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">节点类型</h3>
          <div className="space-y-1.5">
            {nodeTypes_.map((nt) => (
              <button
                key={nt.type}
                onClick={() => addNode(nt)}
                className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-150 flex items-center gap-2.5"
              >
                <span className="text-base">{nt.icon}</span>
                <div>
                  <div className="text-xs font-medium text-gray-300">{nt.label}</div>
                  <div className="text-[10px] text-gray-500">{nt.category}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ReactFlow 画布 */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200/60 overflow-hidden shadow-card">
        {selectedId ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
            <Panel position="top-left">
              <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-card border border-gray-200/60 p-2">
                <input
                  className="input w-44 text-sm"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="工作流名称"
                />
                <button onClick={saveWorkflow} disabled={saving} className="btn-primary text-sm py-1.5 px-3">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={exportJSON} className="btn-ghost">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={deleteWorkflow} className="btn-ghost hover:!bg-red-50 hover:!text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Panel>
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <p className="empty-state-title">选择或创建工作流</p>
              <p className="empty-state-desc">从左侧模板创建，或点击节点类型开始搭建</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
