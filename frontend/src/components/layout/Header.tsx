import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronDown,
  FolderKanban,
  ShieldCheck,
  Zap,
  Search,
  Bell,
  Settings,
  User,
  CheckCircle2,
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { projects, activeProject, setActiveProject } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const notifications = [
    { id: 1, title: 'Repository Ingestion Completed', desc: 'DevMind Core E-Commerce API indexed into Qdrant.', time: '10m ago', unread: true },
    { id: 2, title: 'Bug Scan Finished', desc: '3 logical vulnerabilities identified in security_audit_test.py.', time: '25m ago', unread: true },
    { id: 3, title: 'Groq LPU Acceleration Online', desc: 'Active model: openai/gpt-oss-120b (Ultra-fast).', time: '1h ago', unread: false },
  ];

  return (
    <header className="h-16 border-b border-slate-800 bg-dark-900/60 backdrop-blur px-6 flex items-center justify-between z-10 shrink-0">
      {/* Left: Project Selector & Quick Stats */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-dark-800/80 text-xs font-medium text-slate-200 hover:border-slate-600 transition"
          >
            <FolderKanban className="w-4 h-4 text-brand-400" />
            <span className="max-w-[180px] truncate">
              {activeProject ? activeProject.name : 'Select Repository'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-64 bg-dark-900 border border-slate-800 rounded-lg shadow-2xl py-1 z-50">
            <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-800">
              Repositories ({projects.length})
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 text-center">
                  No repositories yet
                </div>
              ) : (
                projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProject(p)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800/60 transition flex items-center justify-between ${
                      activeProject?.id === p.id ? 'text-brand-400 font-semibold bg-brand-500/10' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{p.primary_language}</span>
                  </button>
                ))
              )}
            </div>
            <div className="p-1 border-t border-slate-800">
              <button
                onClick={() => navigate('/projects')}
                className="w-full text-center px-3 py-1.5 text-xs text-brand-400 font-medium hover:bg-brand-500/10 rounded transition"
              >
                + Manage / Upload New
              </button>
            </div>
          </div>
        </div>

        {activeProject && (
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono border border-slate-700">
              {activeProject.primary_language}
            </span>
            <span>•</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {activeProject.total_lines.toLocaleString()} LOC
            </span>
          </div>
        )}
      </div>

      {/* Middle: Quick Search Input */}
      <div className="hidden lg:flex items-center relative w-80">
        <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search features, files, or actions..."
          className="w-full pl-9 pr-3 py-1.5 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition"
        />
      </div>

      {/* Right: Engine Status Pills, Notifications & User */}
      <div className="flex items-center gap-3">
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RAG Online</span>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg bg-dark-950 border border-slate-800 hover:bg-slate-800 text-slate-300 transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-dark-900" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-dark-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-bold text-white">Notifications</span>
                <span className="text-[10px] text-brand-400 font-mono">2 Unread</span>
              </div>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2 rounded-lg bg-dark-950 border border-slate-800 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{n.title}</span>
                      <span className="text-[10px] text-slate-500">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings Shortcut */}
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg bg-dark-950 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Profile Chip */}
        <div
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 pl-2 border-l border-slate-800 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.username?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
          </div>
          <span className="text-xs text-slate-200 font-medium hidden sm:inline group-hover:text-brand-400 transition">
            {user?.username || 'Demo User'}
          </span>
        </div>
      </div>
    </header>
  );
};
