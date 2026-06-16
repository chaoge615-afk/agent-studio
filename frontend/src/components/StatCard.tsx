import { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  change?: string;
  color?: string;
}

export default function StatCard({ icon, label, value, change, color = 'blue' }: StatCardProps) {
  const gradientClasses: Record<string, string> = {
    blue: 'from-indigo-500/10 to-blue-500/10 text-indigo-600',
    green: 'from-emerald-500/10 to-teal-500/10 text-emerald-600',
    purple: 'from-purple-500/10 to-violet-500/10 text-purple-600',
    yellow: 'from-amber-500/10 to-orange-500/10 text-amber-600',
    red: 'from-red-500/10 to-rose-500/10 text-red-600',
    cyan: 'from-cyan-500/10 to-sky-500/10 text-cyan-600',
  };

  return (
    <div className="stat-card card-hover">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientClasses[color] || gradientClasses.blue}`}>
          {icon}
        </div>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
      {change && (
        <div className="mt-3 flex items-center gap-1 text-sm text-emerald-600 font-medium">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {change}
        </div>
      )}
    </div>
  );
}
