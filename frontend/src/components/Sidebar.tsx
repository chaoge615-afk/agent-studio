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
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Agent Studio</h1>
        <p className="text-xs text-gray-500 mt-1">Agent 开发平台</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          <p>v1.0.0</p>
          <p className="mt-1">Powered by LangGraph + MCP</p>
        </div>
      </div>
    </aside>
  );
}
