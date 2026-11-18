import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  History,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  FolderKanban,
  ShieldAlert,
  MessageSquareCode,
  Sparkles,
  TestTubes,
  FileCheck,
  Search,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  category: string;
  title: string;
  project_name: string;
  project_id: string;
  status: string;
  timestamp: string;
}

export const ActivityHistory: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get<ActivityItem[]>('/dashboard/history');
        setActivities(res.data);
      } catch (err) {
        console.error('Failed to load activity history', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filtered = activities.filter((act) => {
    const matchesCat = filterCategory === 'all' || act.category.toLowerCase().includes(filterCategory.toLowerCase());
    const matchesSearch =
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.action.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activities, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `auron_ai_audit_log_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('security') || c.includes('quality')) return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    if (c.includes('chat')) return <MessageSquareCode className="w-4 h-4 text-brand-400" />;
    if (c.includes('test')) return <TestTubes className="w-4 h-4 text-teal-400" />;
    if (c.includes('refactor')) return <Sparkles className="w-4 h-4 text-indigo-400" />;
    return <FolderKanban className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-brand-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Audit Trail & Activity History</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete telemetry of repository ingestions, automated security audits, unit test runs, and AI conversations.
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          disabled={activities.length === 0}
          className="px-3.5 py-2 bg-dark-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-2 shadow-sm self-start"
        >
          <Download className="w-4 h-4 text-brand-400" />
          <span>Export Audit Log (JSON)</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'project', 'security', 'chat'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition whitespace-nowrap ${
                filterCategory === cat
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-white bg-dark-950 border border-slate-800'
              }`}
            >
              {cat === 'all' ? 'All Activities' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity records..."
            className="w-full pl-9 pr-3 py-1.5 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Activities Timeline */}
      {isLoading ? (
        <div className="py-16 text-center">
          <LoadingSpinner size="lg" label="Loading Audit Records..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dark-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Activity Records Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No activity matches your search query.'
              : 'As you ingest repositories, run bug scans, and consult the AI, events will appear here in chronological order.'}
          </p>
        </div>
      ) : (
        <div className="bg-dark-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800/80">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-800/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-dark-950 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{item.action}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-950 border border-slate-800 text-slate-400">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      Project: <span className="text-slate-400">{item.project_name}</span>
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 font-mono text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      item.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : item.status === 'critical'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : item.status === 'high'
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

