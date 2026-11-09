import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { aiService } from '../services/ai';
import { BugReport } from '../types';
import {
  ShieldAlert,
  Play,
  Filter,
  CheckCircle,
  EyeOff,
  AlertTriangle,
  Code2,
  Layers,
  Check,
  Copy,
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

export const BugDetection: React.FC = () => {
  const { activeProject } = useProject();
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchBugs = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const sev = severityFilter === 'ALL' ? undefined : severityFilter;
      const st = statusFilter === 'ALL' ? undefined : statusFilter;
      const data = await aiService.getBugReports(activeProject.id, sev, st);
      setBugs(data);
    } catch (err) {
      console.error('Failed to load bug reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugs();
  }, [activeProject, severityFilter, statusFilter]);

  const handleRunScan = async () => {
    if (!activeProject || analyzing) return;
    setAnalyzing(true);
    try {
      await aiService.analyzeBugs(activeProject.id);
      await fetchBugs();
    } catch (err) {
      console.error('Bug scan failed', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdateStatus = async (bugId: string, newStatus: string) => {
    if (!activeProject) return;
    try {
      await aiService.updateBugStatus(activeProject.id, bugId, newStatus);
      setBugs((prev) =>
        prev.map((b) => (b.id === bugId ? { ...b, status: newStatus as any } : b))
      );
    } catch (err) {
      console.error('Failed to update bug status', err);
    }
  };

  const copyFix = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!activeProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Layers className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-base font-semibold text-white">No Repository Selected</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">
          Select or upload an active repository from Projects to trigger AST and semantic bug audits.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition"
        >
          Select Repository
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>AI Bug & Vulnerability Detection</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Static pattern analysis combined with LLM semantic reasoning to identify security risks, null errors, and logic flaws in{' '}
            <span className="font-mono text-slate-300">{activeProject.name}</span>.
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={analyzing}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-rose-500/20 transition flex items-center gap-2 self-start"
        >
          {analyzing ? <LoadingSpinner size="sm" /> : <Play className="w-3.5 h-3.5" />}
          <span>{analyzing ? 'Auditing Codebase...' : 'Run Security & Bug Audit'}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-dark-900 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Severity:</span>
          </span>
          {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                severityFilter === sev
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30 font-semibold'
                  : 'bg-dark-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium mr-1">Status:</span>
          {['ALL', 'open', 'resolved', 'ignored'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono capitalize transition ${
                statusFilter === st
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'bg-dark-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bug Finding Cards */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" label="Querying vulnerability reports..." />
        </div>
      ) : bugs.length === 0 ? (
        <div className="bg-dark-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto">
          <ShieldAlert className="w-10 h-10 text-emerald-400/80 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Issues Found</h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            No vulnerabilities or coding flaws currently reported matching your filter. Run an audit to scan repository files.
          </p>
          <button
            onClick={handleRunScan}
            disabled={analyzing}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition inline-flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Audit</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bugs.map((bug) => (
            <div
              key={bug.id}
              className="bg-dark-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-3"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <StatusBadge status={bug.severity} />
                  <span className="text-xs font-semibold text-white">{bug.category}</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <Code2 className="w-3.5 h-3.5 text-brand-400" />
                  <span className="text-slate-200">{bug.file_path}</span>
                  {bug.line_number && <span className="text-slate-500">:L{bug.line_number}</span>}
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-slate-200">{bug.description}</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{bug.explanation}</p>
              </div>

              {/* Suggested Fix */}
              {bug.suggested_fix && (
                <div className="p-3 bg-dark-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
                      Suggested Fix / Mitigation:
                    </span>
                    <button
                      onClick={() => copyFix(bug.id, bug.suggested_fix)}
                      className="text-slate-500 hover:text-slate-300 text-[11px] font-mono flex items-center gap-1 transition"
                    >
                      {copiedId === bug.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy fix</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {bug.suggested_fix}
                  </pre>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                <span className="text-[11px] font-mono text-slate-500">
                  Status: <span className="text-slate-300 uppercase">{bug.status}</span>
                </span>

                <div className="flex items-center gap-2">
                  {bug.status !== 'resolved' && (
                    <button
                      onClick={() => handleUpdateStatus(bug.id, 'resolved')}
                      className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium transition flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  )}
                  {bug.status !== 'ignored' && (
                    <button
                      onClick={() => handleUpdateStatus(bug.id, 'ignored')}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-medium transition flex items-center gap-1"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ignore</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
