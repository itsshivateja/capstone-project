import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FolderKanban,
  MessageSquareCode,
  Settings as SettingsIcon,
  LogOut,
  User as UserIcon,
  Code2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  meta: string;
}

const WORKFLOWS: NavItem[] = [
  {
    name: 'Code Mode',
    path: '/sandbox',
    icon: Code2,
    meta: 'Monaco buffer & actions',
  },
  {
    name: 'Project Mode',
    path: '/projects',
    icon: FolderKanban,
    meta: 'Repo intelligence & AST',
  },
  {
    name: 'AI Chat Mode',
    path: '/chat',
    icon: MessageSquareCode,
    meta: 'Conversational RAG',
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className={`relative h-screen shrink-0 select-none border-r border-white/[0.08] bg-graphite-deep text-xs transition-[width] duration-300 ease-in-out ${
        isCollapsed ? 'w-0' : 'w-64'
      }`}
    >
      <div
        className={`flex h-full w-64 flex-col transition-opacity duration-200 ${
          isCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
      {/* Brand Header */}
      <div
        onClick={() => navigate('/sandbox')}
        className="h-14 flex items-center px-4 border-b border-white/[0.08] gap-2.5 cursor-pointer hover:bg-graphite-raised/40 transition"
      >
        <div className="w-7 h-7 rounded-md bg-graphite-raised border border-white/[0.08] flex items-center justify-center text-graphite-text">
          <img src="/auron-logo.png" alt="" className="h-6 w-6 object-contain" />
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="font-medium text-graphite-text text-sm tracking-tight">AURON</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-graphite-raised text-graphite-muted border border-white/[0.06]">
            AI
          </span>
        </div>
      </div>

      {/* Workflows Navigation */}
      <div className="px-4 pt-4 pb-1 text-[11px] font-medium text-graphite-muted">
        Workflows
      </div>
      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        {WORKFLOWS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-2.5 py-2 rounded-md transition text-xs ${
                  isActive
                    ? 'bg-graphite-raised text-graphite-text font-medium border border-white/[0.08]'
                    : 'text-graphite-secondary hover:text-graphite-text hover:bg-graphite-raised/50 border border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0 text-graphite-muted" />
                <span className="truncate">{item.name}</span>
              </div>
            </NavLink>
          );
        })}

        <div className="pt-2 mt-2 border-t border-white/[0.08]">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-md transition text-xs ${
                isActive
                  ? 'bg-graphite-raised text-graphite-text font-medium border border-white/[0.08]'
                  : 'text-graphite-secondary hover:text-graphite-text hover:bg-graphite-raised/50 border border-transparent'
              }`
            }
          >
            <SettingsIcon className="w-4 h-4 shrink-0 text-graphite-muted" />
            <span>Settings & Models</span>
          </NavLink>
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-white/[0.08] bg-graphite-deep">
        <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-graphite-raised/50 transition">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-6 h-6 rounded-md bg-graphite-raised flex items-center justify-center text-graphite-secondary text-[11px] font-mono border border-white/[0.08]">
              {user?.username?.charAt(0).toUpperCase() || <UserIcon className="w-3 h-3" />}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-graphite-text truncate">{user?.full_name || user?.username}</p>
              <p className="text-[10px] text-graphite-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-graphite-muted hover:text-graphite-text p-1 rounded hover:bg-graphite-card transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      </div>
      <button
        onClick={onToggle}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/30 bg-graphite-card text-graphite-secondary shadow-lg transition hover:scale-110 hover:border-cyan-300/70 hover:text-graphite-text"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
};
