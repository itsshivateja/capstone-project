import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../services/ai';
import { DashboardStats } from '../types';
import { useProject } from '../context/ProjectContext';
import {
  FolderKanban,
  Files,
  Code2,
  ShieldAlert,
  MessageSquareCode,
  ArrowUpRight,
  Sparkles,
  FileCheck2,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { setActiveProject, activeProject } = useProject();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await aiService.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading DevMind Analytics..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-brand-950/40 border border-slate-800 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-mono font-medium border border-brand-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DevMind Engineering Intelligence</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Repository Intelligence Dashboard</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Real-time telemetry, AST parsing metrics, vector indexing health, and automated vulnerability detection across your codebases.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-brand-500/20 transition flex items-center gap-2"
            >
              <FolderKanban className="w-4 h-4" />
              <span>Upload Repository</span>
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 bg-dark-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center gap-2"
            >
              <MessageSquareCode className="w-4 h-4 text-brand-400" />
              <span>Ask RAG Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Ways of Providing Code: Option 1 & Option 2 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: Upload Project */}
        <div className="bg-dark-900 border border-slate-800 hover:border-brand-500/50 rounded-2xl p-6 transition flex flex-col justify-between group shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-semibold">
                Option 1: Complete Project
              </span>
              <FolderKanban className="w-5 h-5 text-brand-400 group-hover:scale-110 transition-transform" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Upload Repository (ZIP)</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Upload an entire codebase archive. DevMind AI extracts files safely, parses AST syntax, extracts symbols, builds Qdrant vector embeddings, and enables full multi-file RAG chat.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 text-[11px] text-slate-400 font-mono">
              <span className="bg-dark-950 px-2 py-1 rounded border border-slate-800">ZIP File Scan</span>
              <span className="bg-dark-950 px-2 py-1 rounded border border-slate-800">Folder Tree</span>
              <span className="bg-dark-950 px-2 py-1 rounded border border-slate-800">Vector Embeddings</span>
              <span className="bg-dark-950 px-2 py-1 rounded border border-slate-800">RAG Chat</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="mt-5 w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-brand-500/20 transition flex items-center justify-center gap-2"
          >
            <span>Upload or Select Repository</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Option 2: Paste Code */}
        <div className="bg-dark-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition flex flex-col justify-between group shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Option 2: Instant Sandbox
              </span>
              <Code2 className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Paste & Analyze Code</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Paste or type code directly into Monaco Editor. Run 9 instant AI actions: Detect Bugs, Fix My Code (with side-by-side diff), Optimize, Explain, Review, Security, Tests, Docs, & Codegen.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 text-[11px] text-slate-400 font-mono">
              <span className="bg-dark-950 px-2 py-1 rounded border border-slate-800">Monaco Editor</span>
              <span className="bg-dark-950 px-2 py-1 rounded border border-slate-800">Side-by-Side Diff</span>
              <span className="bg-dark-950 px-2 py-1 rounded border border-slate-800">Auto Fix & Apply</span>
              <span className="bg-dark-950 px-2 py-1 rounded border border-slate-800">9 AI Actions</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/sandbox')}
            className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
          >
            <span>Open Code Sandbox (Paste Mode)</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Total Repositories</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{stats?.total_projects || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Indexed in local Qdrant collection</p>
        </div>

        <div className="bg-dark-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Source Files Parsed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Files className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{stats?.total_files.toLocaleString() || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {(stats?.total_lines || 0).toLocaleString()} lines of code
          </p>
        </div>

        <div className="bg-dark-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Vulnerabilities Detected</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{stats?.total_bugs || 0}</p>
          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono">
            <span className="text-rose-400">{stats?.bugs_by_severity?.Critical || 0} crit</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400">{stats?.bugs_by_severity?.High || 0} high</span>
            <span className="text-slate-600">•</span>
            <span className="text-yellow-400">{stats?.bugs_by_severity?.Medium || 0} med</span>
          </div>
        </div>

        <div className="bg-dark-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">AI Conversations</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <MessageSquareCode className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white font-mono">{stats?.total_conversations || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {stats?.total_messages || 0} context-aware queries answered
          </p>
        </div>
      </div>

      {/* Middle Section: Recent Projects & Language Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active / Recent Projects */}
        <div className="lg:col-span-2 bg-dark-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-semibold text-white">Active Projects Overview</h2>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 transition"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats?.projects_overview.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg">
              <FolderKanban className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No software repositories uploaded yet.</p>
              <button
                onClick={() => navigate('/projects')}
                className="mt-3 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs rounded-md transition"
              >
                Upload ZIP Archive
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats?.projects_overview.map((p) => {
                const isActive = activeProject?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActiveProject(p as any);
                      navigate('/explorer');
                    }}
                    className={`cursor-pointer p-3.5 rounded-lg border transition flex items-center justify-between ${
                      isActive
                        ? 'border-brand-500/40 bg-brand-500/5'
                        : 'border-slate-800 bg-dark-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-brand-400 shrink-0">
                        <Code2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-slate-200 truncate">{p.name}</p>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-400 font-mono">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {p.primary_language} • {p.total_files} files • {p.total_lines.toLocaleString()} lines
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Language Composition */}
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-semibold text-white">Language Breakdown</h2>
          </div>

          {Object.keys(stats?.languages || {}).length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No language telemetry available</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats?.languages || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([lang, lines]) => {
                  const pct = Math.round((lines / (stats?.total_lines || 1)) * 100);
                  return (
                    <div key={lang}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium">{lang}</span>
                        <span className="text-slate-500 font-mono">
                          {lines.toLocaleString()} lines ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Quick Actions Footer */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Automated AI Workflows
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => navigate('/bugs')}
                className="p-2 rounded bg-dark-950 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center gap-2 transition"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Audit Bugs</span>
              </button>
              <button
                onClick={() => navigate('/review')}
                className="p-2 rounded bg-dark-950 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center gap-2 transition"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Code Review</span>
              </button>
              <button
                onClick={() => navigate('/codegen')}
                className="p-2 rounded bg-dark-950 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center gap-2 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                <span>Generate Code</span>
              </button>
              <button
                onClick={() => navigate('/docs')}
                className="p-2 rounded bg-dark-950 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center gap-2 transition"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Generate Docs</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-white">Recent System Activities</h2>
        </div>

        {stats?.recent_activities.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No recent activity detected.</p>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {stats?.recent_activities.map((act, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      act.type === 'bug' ? 'bg-rose-500' : 'bg-brand-500'
                    }`}
                  />
                  <div>
                    <p className="text-slate-200 font-medium">{act.title}</p>
                    <p className="text-[10px] text-slate-500">{act.project_name}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
