import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Workflow,
  Wrench,
  Brain,
  ScrollText,
  Shield,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/agents', icon: Bot, label: 'Agent 市场' },
  { path: '/workflows', icon: Workflow, label: '工作流编辑器' },
  { path: '/tools', icon: Wrench, label: '工具管理' },
  { path: '/memory', icon: Brain, label: '记忆系统' },
  { path: '/audit', icon: ScrollText, label: '审计日志' },
  { path: '/security', icon: Shield, label: '安全治理' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight">Agent Studio</h1>
            <p className="text-[11px] text-sidebar-text">Agent 开发平台</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={{ animationDelay: `${index * 40}ms` }}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
               transition-all duration-200 animate-slide-in-left opacity-0 ${
                isActive
                  ? 'bg-white/12 text-white'
                  : 'text-sidebar-text hover:bg-white/8 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-400 rounded-r-full" />
                )}
                <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-indigo-400' : 'group-hover:text-indigo-300'} transition-colors`} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4">
        <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent mb-4" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-xs text-sidebar-text">系统运行中</span>
        </div>
        <p className="text-[10px] text-gray-600 mt-2">v1.0.0 · LangGraph + MCP</p>
      </div>
    </aside>
  );
}
