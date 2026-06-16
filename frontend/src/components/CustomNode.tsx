import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

const nodeStyles: Record<string, { icon: string; borderColor: string; bgGradient: string }> = {
  classify:  { icon: '🧭', borderColor: 'border-purple-300',   bgGradient: 'bg-gradient-to-br from-purple-50 to-violet-50' },
  route:     { icon: '🔀', borderColor: 'border-violet-300',   bgGradient: 'bg-gradient-to-br from-violet-50 to-fuchsia-50' },
  query_sql: { icon: '🗃️', borderColor: 'border-indigo-300',   bgGradient: 'bg-gradient-to-br from-indigo-50 to-blue-50' },
  query_rag: { icon: '🔍', borderColor: 'border-cyan-300',     bgGradient: 'bg-gradient-to-br from-cyan-50 to-sky-50' },
  query_both:{ icon: '⚡', borderColor: 'border-blue-300',     bgGradient: 'bg-gradient-to-br from-blue-50 to-indigo-50' },
  merge:     { icon: '🔗', borderColor: 'border-emerald-300',  bgGradient: 'bg-gradient-to-br from-emerald-50 to-teal-50' },
  reflect:   { icon: '💭', borderColor: 'border-amber-300',    bgGradient: 'bg-gradient-to-br from-amber-50 to-orange-50' },
  custom:    { icon: '⚙️', borderColor: 'border-gray-300',     bgGradient: 'bg-gradient-to-br from-gray-50 to-slate-50' },
};

function CustomNode({ data, selected }: NodeProps) {
  const style = nodeStyles[data.nodeType as string] || nodeStyles.custom;

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 ${style.borderColor} ${style.bgGradient} ${
        selected ? 'ring-2 ring-indigo-500/50 shadow-lg' : 'shadow-md'
      } min-w-[150px] transition-all duration-200`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white !shadow-sm"
      />

      <div className="flex items-center gap-2.5">
        <span className="text-xl">{style.icon}</span>
        <div>
          <div className="font-semibold text-sm text-gray-900">{data.label as string}</div>
          {data.description ? (
            <div className="text-xs text-gray-500 mt-0.5">{String(data.description)}</div>
          ) : null}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white !shadow-sm"
      />
    </div>
  );
}

export default memo(CustomNode);
