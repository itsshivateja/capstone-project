import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { securityService, SecurityScanResponse, VulnerabilityItem } from '../services/security';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MonacoEditorWrapper } from '../components/common/MonacoEditorWrapper';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Key,
  Database,
  FileCode,
  Copy,
  Check,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  Bug,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SAMPLE_SECURITY_CODE = `import os
import sqlite3

# Critical: Hardcoded production secret
API_KEY = "sk_live_prod_998127392109841249"

def search_user_records(user_input):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    # Critical: SQL Injection via unescaped string formatting
    query = f"SELECT * FROM users WHERE username = '{user_input}'"
    cursor.execute(query)
    return cursor.fetchall()

def execute_diagnostics(user_host):
    # Critical: Command Injection via shell execution
    os.system(f"ping -c 1 {user_host}")`;

export const SecurityAnalysis: React.FC = () => {
  const { activeProject } = useProject();
  const [scanMode, setScanMode] = useState<'repo' | 'snippet'>('repo');
  const [snippetCode, setSnippetCode] = useState<string>(SAMPLE_SECURITY_CODE);
  const [language, setLanguage] = useState<string>('python');
  const [scanResult, setScanResult] = useState<SecurityScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleScan = async () => {
    setIsLoading(true);
    setScanResult(null);

    try {
      if (scanMode === 'repo') {
        if (!activeProject) return;
        const res = await securityService.scanProject(activeProject.id);
        setScanResult(res);
      } else {
        const res = await securityService.scanSnippet(snippetCode, language);
        setScanResult(res);
      }
    } catch (err) {
      console.error('Security scan failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeProject && scanMode === 'repo') {
      handleScan();
    }
  }, [activeProject, scanMode]);

  const filteredVulns = scanResult?.vulnerabilities.filter((v) => {
    if (severityFilter === 'all') return true;
    return v.severity.toLowerCase() === severityFilter.toLowerCase();
  }) || [];

  const getSeverityBadge = (severity: string) => {
    const s = severity.toLowerCase();
    if (s === 'critical') return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    if (s === 'high') return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    if (s === 'medium') return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Security & OWASP Vulnerability Center</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Static secret scanning, OWASP Top 10 threat detection, SQL injection analysis, and automated remediation.
          </p>
        </div>

        {/* Scan Mode Toggle */}
        <div className="flex items-center gap-2 bg-dark-900 border border-slate-800 rounded-xl p-1 self-start">
          <button
            onClick={() => setScanMode('repo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              scanMode === 'repo' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Repository Scan
          </button>
          <button
            onClick={() => setScanMode('snippet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              scanMode === 'snippet' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Snippet / Paste Scan
          </button>
        </div>
      </div>

      {/* Snippet Input Mode */}
      {scanMode === 'snippet' && (
        <div className="bg-dark-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60">
            <span className="text-xs font-semibold text-slate-300">Target Code to Audit</span>
            <button
              onClick={handleScan}
              disabled={isLoading || !snippetCode.trim()}
              className="px-3.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium transition flex items-center gap-1.5"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span>{isLoading ? 'Scanning...' : 'Scan Code for Threats'}</span>
            </button>
          </div>
          <div className="h-56">
            <MonacoEditorWrapper
              value={snippetCode}
              language={language}
              readOnly={false}
              onChange={(val) => setSnippetCode(val || '')}
            />
          </div>
        </div>
      )}

      {/* Posture Overview KPIs */}
      {scanResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Security Score */}
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-5">
            <span className="text-xs text-slate-400 font-medium">Security Posture Score</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span
                className={`text-3xl font-extrabold font-mono ${
                  scanResult.security_score >= 80
                    ? 'text-emerald-400'
                    : scanResult.security_score >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {scanResult.security_score}/100
              </span>
              <span className="text-xs text-slate-400">({scanResult.risk_level})</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full ${
                  scanResult.security_score >= 80
                    ? 'bg-emerald-500'
                    : scanResult.security_score >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${scanResult.security_score}%` }}
              />
            </div>
          </div>

          {/* Total Findings */}
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-5">
            <span className="text-xs text-slate-400 font-medium">Total Vulnerabilities</span>
            <p className="text-3xl font-extrabold text-white font-mono mt-2">
              {scanResult.total_vulnerabilities}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Across scanned source files</p>
          </div>

          {/* Critical & High */}
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-5">
            <span className="text-xs text-slate-400 font-medium">Critical & High Threats</span>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold font-mono text-xl">
                <span>{scanResult.breakdown['Critical'] || 0}</span>
                <span className="text-xs uppercase font-sans text-rose-400/80">Critical</span>
              </div>
              <div className="flex items-center gap-1.5 text-orange-400 font-bold font-mono text-xl">
                <span>{scanResult.breakdown['High'] || 0}</span>
                <span className="text-xs uppercase font-sans text-orange-400/80">High</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Immediate remediation recommended</p>
          </div>

          {/* Medium & Low */}
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-5">
            <span className="text-xs text-slate-400 font-medium">Medium & Low Warnings</span>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold font-mono text-xl">
                <span>{scanResult.breakdown['Medium'] || 0}</span>
                <span className="text-xs uppercase font-sans text-amber-400/80">Medium</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-400 font-bold font-mono text-xl">
                <span>{scanResult.breakdown['Low'] || 0}</span>
                <span className="text-xs uppercase font-sans text-blue-400/80">Low</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Code hardening opportunities</p>
          </div>
        </div>
      )}

      {/* Severity Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5">
          {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                severityFilter === sev
                  ? 'bg-dark-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredVulns.length} vulnerabilities
        </span>
      </div>

      {/* Vulnerabilities List */}
      {isLoading ? (
        <div className="py-16 text-center">
          <LoadingSpinner size="lg" label="Running OWASP & Static Vulnerability Audit..." />
        </div>
      ) : filteredVulns.length === 0 ? (
        <div className="bg-dark-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Vulnerabilities Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {scanResult
              ? 'The analyzed code satisfies OWASP Top 10 security standards with no exposed secrets or injection flaws.'
              : 'Click "Scan Code for Threats" to initiate an automated security analysis.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVulns.map((vuln) => (
            <div
              key={vuln.id}
              className="bg-dark-900 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(
                      vuln.severity
                    )}`}
                  >
                    {vuln.severity}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-dark-950 border border-slate-800 text-slate-400">
                    {vuln.cwe_id}
                  </span>
                  <h3 className="text-sm font-bold text-white">{vuln.title}</h3>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>{vuln.file_path}</span>
                  {vuln.line_number && <span className="text-brand-400">:L{vuln.line_number}</span>}
                </div>
              </div>

              {/* Problem Snippet */}
              {vuln.vulnerable_snippet && (
                <div className="bg-dark-950 border border-rose-500/20 rounded-lg p-2.5 font-mono text-xs text-rose-300">
                  <span className="text-[10px] uppercase font-bold text-rose-500 block mb-1">
                    Vulnerable Expression:
                  </span>
                  <code>{vuln.vulnerable_snippet}</code>
                </div>
              )}

              {/* Explanation */}
              <p className="text-xs text-slate-300 leading-relaxed">{vuln.explanation}</p>

              {/* Remediation Code */}
              {vuln.remediation_code && (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Recommended Remediation:
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(vuln.remediation_code);
                        setCopiedId(vuln.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono"
                    >
                      {copiedId === vuln.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === vuln.id ? 'Copied' : 'Copy Remediation'}</span>
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-emerald-200 overflow-x-auto whitespace-pre-wrap">
                    {vuln.remediation_code}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

