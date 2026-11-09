import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  FolderTree,
  MessageSquareCode,
  ShieldAlert,
  Sparkles,
  FileCheck2,
  TestTubes,
  FileText,
  Settings,
  LogOut,
  Cpu,
  User as UserIcon,
  Bot,
  Code2,
  Lock,
  History,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'My Projects', path: '/projects', icon: FolderKanban },
  { name: 'Code Editor', path: '/sandbox', icon: Code2 },
  { name: 'AI Code Chat', path: '/chat', icon: MessageSquareCode },
  { name: 'Project Analysis', path: '/explorer', icon: FolderTree },
  { name: 'Bug Detection', path: '/bugs', icon: ShieldAlert },
  { name: 'Code Generation', path: '/codegen', icon: Sparkles },
  { name: 'Code Review', path: '/review', icon: FileCheck2 },
  { name: 'Code Refactoring', path: '/refactor', icon: Wrench },
  { name: 'Test Generation', path: '/tests', icon: TestTubes },
  { name: 'Security Analysis', path: '/security', icon: Lock },
  { name: 'Documentation', path: '/docs', icon: FileText },
  { name: 'AI Agents', path: '/agents', icon: Bot },
  { name: 'Activity History', path: '/history', icon: History },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { activeProject } = useProject();
  const navigate = useNavigate();

  return (
    <aside className="w-64 bg-dark-900 border-r border-slate-800 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-tight">DevMind</span>
            <span className="text-xs px-1.5 py-0.2 bg-brand-500/20 text-brand-400 font-mono rounded border border-brand-500/30">AI</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Software Engineering AI</p>
        </div>
      </div>

      {/* Active Project Banner */}
      <div className="px-4 py-3 border-b border-slate-800/60 bg-dark-950/40">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="uppercase text-[10px] tracking-wider font-semibold">Active Repository</span>
          {activeProject && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </div>
        {activeProject ? (
          <div
            onClick={() => navigate('/explorer')}
            className="cursor-pointer group flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-800/60 transition"
          >
            <FolderTree className="w-4 h-4 text-brand-400 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-slate-200 truncate group-hover:text-brand-400 transition">
                {activeProject.name}
              </p>
              <p className="text-[10px] text-slate-500 font-mono truncate">
                {activeProject.primary_language} • {activeProject.total_files} files
              </p>
            </div>
          </div>
        ) : (
          <div
            onClick={() => navigate('/projects')}
            className="cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition py-1 flex items-center gap-1.5"
          >
            <span>No repository active</span>
            <span className="text-brand-400 font-medium">Select →</span>
          </div>
        )}
      </div>

      {/* Navigation List - All 15 Pages */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition group ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 font-semibold border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-4 h-4 transition group-hover:scale-105 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-dark-950/60">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/40 transition">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-medium border border-slate-700">
              {user?.username?.charAt(0).toUpperCase() || <UserIcon className="w-3.5 h-3.5" />}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.full_name || user?.username}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
