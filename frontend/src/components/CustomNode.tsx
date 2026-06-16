import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

// 节点类型对应的图标和颜色
const nodeStyles: Record<string, { icon: string; color: string; bgColor: string }> = {
  classify: { icon: '🧭', color: 'border-purple-400', bgColor: 'bg-purple-50' },
  route: { icon: '🔀', color: 'border-violet-400', bgColor: 'bg-violet-50' },
  query_sql: { icon: '🗃️', color: 'border-blue-400', bgColor: 'bg-blue-50' },
  query_rag: { icon: '🔍', color: 'border-cyan-400', bgColor: 'bg-cyan-50' },
  query_both: { icon: '⚡', color: 'border-indigo-400', bgColor: 'bg-indigo-50' },
  merge: { icon: '🔗', color: 'border-green-400', bgColor: 'bg-green-50' },
  reflect: { icon: '💭', color: 'border-amber-400', bgColor: 'bg-amber-50' },
  custom: { icon: '⚙️', color: 'border-gray-400', bgColor: 'bg-gray-50' },
};

function CustomNode({ data, selected }: NodeProps) {
  const style = nodeStyles[data.nodeType as string] || nodeStyles.custom;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-sm ${style.color} ${style.bgColor} ${
        selected ? 'ring-2 ring-primary-500 shadow-lg' : ''
      } min-w-[140px]`}
    >
      {/* 输入连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />

      {/* 节点内容 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">{style.icon}</span>
        <div>
          <div className="font-medium text-sm text-gray-900">{data.label as string}</div>
          {data.description ? (
            <div className="text-xs text-gray-500 mt-0.5">{String(data.description)}</div>
          ) : null}
        </div>
      </div>

      {/* 输出连接点 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(CustomNode);
