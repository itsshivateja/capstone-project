import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { ChevronDown, FolderKanban, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { projects, activeProject, setActiveProject } = useProject();
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b border-slate-800 bg-dark-900/60 backdrop-blur px-6 flex items-center justify-between z-10 shrink-0">
      {/* Left: Project Selector */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-dark-800/80 text-xs font-medium text-slate-200 hover:border-slate-600 transition"
          >
            <FolderKanban className="w-4 h-4 text-brand-400" />
            <span className="max-w-[200px] truncate">
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
          <div className="flex items-center gap-2 text-xs text-slate-400">
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

      {/* Right: Engine Status Pills */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RAG Engine Online</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
          <Zap className="w-3.5 h-3.5" />
          <span>Qdrant Vector DB</span>
        </div>
      </div>
    </header>
  );
};

