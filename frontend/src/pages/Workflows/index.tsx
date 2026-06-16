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
import { Plus, Save, Trash2, Download, Upload } from 'lucide-react';
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

      // 转换后端数据为 ReactFlow 格式
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
        style: { stroke: '#6366f1' },
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
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1' } }, eds)),
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
    <div className="h-[calc(100vh-3rem)] flex gap-4">
      {/* 左侧面板 - 工作流列表 + 节点类型 */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        {/* 工作流列表 */}
        <div className="card">
          <h3 className="font-semibold mb-3">工作流</h3>
          {workflows.length === 0 ? (
            <p className="text-sm text-gray-400">从模板创建</p>
          ) : (
            <div className="space-y-2">
              {workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => loadWorkflow(wf.id)}
                  className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                    selectedId === wf.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium truncate">{wf.name}</div>
                  <span className={`badge text-xs ${wf.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>
                    {wf.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 从模板创建 */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-gray-500">从模板创建:</p>
            <button
              onClick={() => createFromTemplate('standard-hybrid')}
              className="w-full text-left p-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-xs transition-colors"
            >
              🔄 标准混合查询流程
            </button>
            <button
              onClick={() => createFromTemplate('simple-rag')}
              className="w-full text-left p-2 bg-cyan-50 hover:bg-cyan-100 rounded-lg text-xs transition-colors"
            >
              🔍 简单 RAG 检索
            </button>
            <button
              onClick={() => createFromTemplate('data-pipeline')}
              className="w-full text-left p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs transition-colors"
            >
              📊 数据分析流程
            </button>
          </div>
        </div>

        {/* 节点类型 */}
        <div className="card">
          <h3 className="font-semibold mb-3">节点类型</h3>
          <div className="space-y-2">
            {nodeTypes_.map((nt) => (
              <button
                key={nt.type}
                onClick={() => addNode(nt)}
                className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="text-lg">{nt.icon}</span>
                <div>
                  <div className="text-sm font-medium">{nt.label}</div>
                  <div className="text-xs text-gray-400">{nt.category}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 中间 - ReactFlow 画布 */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
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
              <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border p-2">
                <input
                  className="input w-48 text-sm"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="工作流名称"
                />
                <button onClick={saveWorkflow} disabled={saving} className="btn-primary text-sm py-1.5">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={exportJSON} className="btn-secondary text-sm py-1.5">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={deleteWorkflow} className="btn-danger text-sm py-1.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Panel>
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">选择或创建工作流</p>
              <p className="text-sm">从左侧模板创建，或点击节点类型开始搭建</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
