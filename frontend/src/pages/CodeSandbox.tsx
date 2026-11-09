import React, { useState } from 'react';
import { MonacoEditorWrapper } from '../components/common/MonacoEditorWrapper';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { snippetService, SnippetAction, SnippetAnalysisResponse, BugItem } from '../services/snippet';
import {
  Code2,
  Bug,
  Wrench,
  HelpCircle,
  Zap,
  FileCheck,
  ShieldAlert,
  TestTubes,
  FileText,
  Sparkles,
  Copy,
  Check,
  Download,
  GitCompare,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

const SAMPLE_SNIPPETS: { label: string; lang: string; code: string }[] = [
  {
    label: 'Python: Logical Bug & Zero Division',
    lang: 'python',
    code: `def process_user_records(users):
    results = []
    for i in range(len(users)):
        user = users[i]
        # Potential NoneType dereference and zero division
        avg_score = user['score'] / user['attempts']
        results.append({
            'user_id': user['id'],
            'avg_score': avg_score
        })
    return results`,
  },
  {
    label: 'JavaScript: SQL Injection & Missing Await',
    lang: 'javascript',
    code: `async function getUserOrders(userId) {
    // Critical: Direct SQL interpolation vulnerability
    const query = \`SELECT * FROM orders WHERE customer_id = '\${userId}'\`;
    const result = db.execute(query); // Missing await
    return result.rows;
}`,
  },
  {
    label: 'TypeScript: Recursive Fibonacci (O(2^n))',
    lang: 'typescript',
    code: `function fibonacci(n: number): number {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    // Exponential time complexity O(2^n) bottleneck
    return fibonacci(n - 1) + fibonacci(n - 2);
}`,
  },
];

const LANGUAGES = [
  { id: 'python', name: 'Python' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'sql', name: 'SQL' },
  { id: 'html', name: 'HTML / Web' },
];

export const CodeSandbox: React.FC = () => {
  const [code, setCode] = useState<string>(SAMPLE_SNIPPETS[0].code);
  const [language, setLanguage] = useState<string>('python');
  const [activeAction, setActiveAction] = useState<SnippetAction | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<SnippetAnalysisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fix My Code states
  const [isDiffMode, setIsDiffMode] = useState<boolean>(true);
  const [showFixExplanation, setShowFixExplanation] = useState<boolean>(true);
  const [copiedFixed, setCopiedFixed] = useState<boolean>(false);
  const [appliedNotification, setAppliedNotification] = useState<boolean>(false);

  // Generate Code prompt state
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [showPromptInput, setShowPromptInput] = useState<boolean>(false);

  const handleAction = async (action: SnippetAction) => {
    if (!code.trim()) {
      setErrorMsg('Please paste or write some code in the editor first.');
      return;
    }

    if (action === 'generate_code' && !showPromptInput) {
      setShowPromptInput(true);
      return;
    }

    setActiveAction(action);
    setIsLoading(true);
    setErrorMsg(null);
    setAppliedNotification(false);

    try {
      const res = await snippetService.analyzeSnippet({
        code,
        language,
        action,
        prompt: customPrompt || undefined,
      });
      setAnalysisResult(res);
      if (action === 'fix_code') {
        setIsDiffMode(true);
      }
    } catch (err: any) {
      console.error('Analysis action failed', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Analysis action failed.');
    } finally {
      setIsLoading(false);
      if (action === 'generate_code') {
        setShowPromptInput(false);
      }
    }
  };

  const handleAutoDetect = async () => {
    try {
      const res = await snippetService.detectLanguage(code);
      if (res.language && res.language !== 'plaintext') {
        setLanguage(res.language);
      }
    } catch (err) {
      console.error('Language auto-detection failed', err);
    }
  };

  const handleApplyFix = () => {
    if (analysisResult?.fix_result?.corrected_code) {
      setCode(analysisResult.fix_result.corrected_code);
      setAppliedNotification(true);
      setIsDiffMode(false);
      setTimeout(() => setAppliedNotification(false), 3000);
    }
  };

  const handleCopyFixed = () => {
    if (analysisResult?.fix_result?.corrected_code) {
      navigator.clipboard.writeText(analysisResult.fix_result.corrected_code);
      setCopiedFixed(true);
      setTimeout(() => setCopiedFixed(false), 2000);
    }
  };

  const handleDownloadFixed = () => {
    if (!analysisResult?.fix_result?.corrected_code) return;
    const extMap: Record<string, string> = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      go: 'go',
      rust: 'rs',
      java: 'java',
      cpp: 'cpp',
      sql: 'sql',
      html: 'html',
    };
    const ext = extMap[language] || 'txt';
    const blob = new Blob([analysisResult.fix_result.corrected_code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repaired_code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityBadge = (severity: string) => {
    const s = severity.toLowerCase();
    if (s === 'critical') return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    if (s === 'high') return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    if (s === 'medium') return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col gap-3 overflow-hidden">
      {/* Top Controls Bar */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-brand-400" />
            <h1 className="text-sm font-bold text-white tracking-tight">Code Sandbox</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono font-medium">
              Option 2: Paste Code
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Language Selector */}
          <div className="flex items-center gap-1.5">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-2.5 py-1.5 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleAutoDetect}
              title="Automatically detect code language"
              className="px-2.5 py-1.5 bg-dark-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden md:inline">Auto-Detect</span>
            </button>
          </div>
        </div>

        {/* Preset Samples Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden lg:inline">Quick Samples:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {SAMPLE_SNIPPETS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCode(s.code);
                  setLanguage(s.lang);
                  setAnalysisResult(null);
                  setErrorMsg(null);
                }}
                className="px-2.5 py-1 bg-dark-950 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-slate-300 transition whitespace-nowrap"
              >
                {s.label.split(':')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar with the 9 Requested Actions */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl px-4 py-2.5 shrink-0 flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
          Actions:
        </span>

        {/* 1. Detect Bugs */}
        <button
          onClick={() => handleAction('detect_bugs')}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeAction === 'detect_bugs'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20'
              : 'bg-dark-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Bug className="w-3.5 h-3.5 text-rose-400" />
          <span>1. Detect Bugs</span>
        </button>

        {/* 2. Fix My Code */}
        <button
          onClick={() => handleAction('fix_code')}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeAction === 'fix_code'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-dark-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-emerald-400" />
          <span>2. Fix My Code</span>
        </button>

        {/* 3. Explain Code */}
        <button
          onClick={() => handleAction('explain')}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeAction === 'explain'
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
              : 'bg-dark-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-brand-400" />
          <span>3. Explain Code</span>
        </button>

        {/* 4. Optimize Code */}
        <button
          onClick={() => handleAction('optimize')}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeAction === 'optimize'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'bg-dark-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>4. Optimize Code</span>
        </button>

        {/* 5. Code Review */}
        <button
          onClick={() => handleAction('review')}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeAction === 'review'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'bg-dark-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>5. Code Review</span>
        </button>

        {/* 6. Security Analysis */}
        <button
          onClick={() => handleAction('security')}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeAction === 'security'
              ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
              : 'bg-dark-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          <span>6. Security Analysis</span>
        </button>

        {/* 7. Generate Test Cases */}
        <button
          onClick={() => handleAction('generate_tests')}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeAction === 'generate_tests'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
              : 'bg-dark-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <TestTubes className="w-3.5 h-3.5 text-teal-400" />
          <span>7. Generate Tests</span>
        </button>

        {/* 8. Generate Documentation */}
        <button
          onClick={() => handleAction('generate_docs')}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeAction === 'generate_docs'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-dark-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>8. Documentation</span>
        </button>

        {/* 9. Generate Code */}
        <button
          onClick={() => handleAction('generate_code')}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
            activeAction === 'generate_code' || showPromptInput
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'bg-dark-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>9. Generate Code</span>
        </button>
      </div>

      {/* Optional Prompt Bar for "Generate Code" */}
      {showPromptInput && (
        <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 shrink-0 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe what you want to add or modify (e.g., 'Add input validation, logging, and type hints')..."
            className="flex-1 bg-dark-950 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAction('generate_code');
            }}
          />
          <button
            onClick={() => handleAction('generate_code')}
            disabled={isLoading}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition shrink-0"
          >
            Execute Generation
          </button>
        </div>
      )}

      {/* Applied Fix Notification Toast */}
      {appliedNotification && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg text-xs flex items-center gap-2 shrink-0 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Fix applied successfully! The Monaco editor buffer has been updated with the corrected code.</span>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-2 rounded-lg text-xs flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Workspace Split View: Left = Monaco Code Editor, Right = Dynamic Analysis / Diff View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-hidden">
        {/* Left Column: Input Monaco Editor */}
        <div className="bg-dark-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60 shrink-0">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Code2 className="w-4 h-4 text-brand-400" />
              <span>Source Editor (Editable)</span>
              <span className="text-[10px] text-slate-500 font-mono">({language})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code);
                }}
                className="px-2 py-1 text-[11px] text-slate-400 hover:text-white rounded hover:bg-dark-800 transition flex items-center gap-1"
                title="Copy current code"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
              <button
                onClick={() => setCode('')}
                className="px-2 py-1 text-[11px] text-slate-400 hover:text-rose-400 rounded hover:bg-dark-800 transition"
                title="Clear editor"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <MonacoEditorWrapper
              value={code}
              language={language}
              readOnly={false}
              onChange={(val) => setCode(val || '')}
            />
          </div>
        </div>

        {/* Right Column: AI Analysis Results / Side-by-Side Diff */}
        <div className="bg-dark-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <LoadingSpinner size="lg" label={`Executing AI ${activeAction?.replace('_', ' ')}...`} />
              <p className="text-xs text-slate-500 mt-2">Consulting Gemini & Groq neural inference engines...</p>
            </div>
          ) : !analysisResult ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <div className="w-12 h-12 rounded-xl bg-dark-950 border border-slate-800 flex items-center justify-center mb-3 text-slate-400">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">Ready for Analysis</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Paste your code on the left and select any of the 9 actions above to detect bugs, auto-fix errors, generate test suites, or conduct security reviews.
              </p>
            </div>
          ) : analysisResult.action === 'fix_code' && analysisResult.fix_result ? (
            /* ================= FIX MY CODE VIEW WITH INTERACTIVE DIFF ================= */
            <div className="h-full flex flex-col overflow-hidden">
              {/* Diff Header & Action Toolbar */}
              <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60 shrink-0">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Repaired Code Comparison</span>
                </div>

                {/* Fix My Code Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsDiffMode(!isDiffMode)}
                    className="px-2.5 py-1 bg-dark-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition flex items-center gap-1 border border-slate-700"
                    title="Toggle side-by-side comparison"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-brand-400" />
                    <span>{isDiffMode ? 'Single View' : 'Compare Changes'}</span>
                  </button>

                  <button
                    onClick={handleCopyFixed}
                    className="px-2.5 py-1 bg-dark-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition flex items-center gap-1 border border-slate-700"
                    title="Copy repaired code"
                  >
                    {copiedFixed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFixed ? 'Copied' : 'Copy Fixed Code'}</span>
                  </button>

                  <button
                    onClick={handleDownloadFixed}
                    className="px-2.5 py-1 bg-dark-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition flex items-center gap-1 border border-slate-700"
                    title="Download repaired code file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={handleApplyFix}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-md shadow-emerald-500/20 transition flex items-center gap-1"
                    title="Apply repaired code to the main editor"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply Fix to Editor</span>
                  </button>
                </div>
              </div>

              {/* Diff Editor Container */}
              <div className="flex-1 overflow-hidden relative">
                {isDiffMode ? (
                  <MonacoEditorWrapper
                    value={analysisResult.fix_result.corrected_code}
                    originalValue={analysisResult.fix_result.original_code}
                    language={language}
                    readOnly={true}
                  />
                ) : (
                  <MonacoEditorWrapper
                    value={analysisResult.fix_result.corrected_code}
                    language={language}
                    readOnly={true}
                  />
                )}
              </div>

              {/* Modifications & Explanations Drawer */}
              <div className="border-t border-slate-800 bg-dark-950/90 max-h-48 overflow-y-auto p-3 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Info className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Applied Modifications & Rationale</span>
                  </div>
                  <button
                    onClick={() => setShowFixExplanation(!showFixExplanation)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    {showFixExplanation ? 'Hide Details' : 'Explain Fix'}
                  </button>
                </div>

                {showFixExplanation && (
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-300 leading-relaxed bg-dark-900/60 p-2.5 rounded border border-slate-800/80">
                      {analysisResult.fix_result.explanation}
                    </p>
                    {analysisResult.fix_result.changes_summary?.length > 0 && (
                      <ul className="space-y-1 pl-4 list-disc text-slate-400 text-[11px]">
                        {analysisResult.fix_result.changes_summary.map((change, idx) => (
                          <li key={idx} className="leading-snug">
                            {change}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : analysisResult.action === 'detect_bugs' ? (
            /* ================= BUG DETECTION VIEW ================= */
            <div className="h-full flex flex-col overflow-hidden">
              <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60 shrink-0">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-white">Bug Detection Diagnostics</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                      analysisResult.has_bugs
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {analysisResult.has_bugs
                      ? `${analysisResult.bugs?.length || 0} Issues Detected`
                      : 'Clean Code – No Bugs'}
                  </span>
                  {analysisResult.has_bugs && (
                    <button
                      onClick={() => handleAction('fix_code')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition flex items-center gap-1"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Auto-Fix All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bugs List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(!analysisResult.bugs || analysisResult.bugs.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
                    <p className="font-semibold text-white">No Defects Identified</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      The code passed AST validation, null safety checks, and edge-case boundary reasoning.
                    </p>
                  </div>
                ) : (
                  analysisResult.bugs.map((bug: BugItem, idx: number) => (
                    <div
                      key={idx}
                      className="bg-dark-950 border border-slate-800 rounded-xl p-4 space-y-2.5 shadow-sm hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(
                              bug.severity
                            )}`}
                          >
                            {bug.severity}
                          </span>
                          <span className="font-semibold text-white text-xs">{bug.error_type}</span>
                        </div>
                        {bug.line_number && (
                          <span className="text-[11px] font-mono px-2 py-0.5 bg-dark-900 border border-slate-800 rounded text-slate-400">
                            Line {bug.line_number}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Problem Description:
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">{bug.description}</p>
                      </div>

                      <div className="bg-dark-900/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
                          Root Cause:
                        </span>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{bug.root_cause}</p>
                      </div>

                      <div className="bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/20 space-y-1">
                        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                          Recommended Solution:
                        </span>
                        <p className="text-[11px] text-emerald-300 leading-relaxed whitespace-pre-wrap font-mono">
                          {bug.recommended_solution}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* ================= GENERAL MARKDOWN ANALYSIS VIEW ================= */
            <div className="h-full flex flex-col overflow-hidden">
              <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60 shrink-0">
                <div className="flex items-center gap-2">
                  {activeAction === 'review' && <FileCheck className="w-4 h-4 text-indigo-400" />}
                  {activeAction === 'explain' && <HelpCircle className="w-4 h-4 text-brand-400" />}
                  {activeAction === 'optimize' && <Zap className="w-4 h-4 text-amber-400" />}
                  {activeAction === 'security' && <ShieldAlert className="w-4 h-4 text-red-400" />}
                  {activeAction === 'generate_tests' && <TestTubes className="w-4 h-4 text-teal-400" />}
                  {activeAction === 'generate_docs' && <FileText className="w-4 h-4 text-blue-400" />}
                  {activeAction === 'generate_code' && <Sparkles className="w-4 h-4 text-purple-400" />}
                  <span className="text-xs font-bold text-white capitalize">
                    {activeAction?.replace('_', ' ')} Output
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {analysisResult.review_score !== undefined && (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold font-mono">
                      <span>Score:</span>
                      <span>{analysisResult.review_score}/10</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (analysisResult.text_result) {
                        navigator.clipboard.writeText(analysisResult.text_result);
                      }
                    }}
                    className="px-2.5 py-1 bg-dark-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition flex items-center gap-1 border border-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Output</span>
                  </button>
                </div>
              </div>

              {/* Rendered Text / Markdown Body */}
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-brand-500/30">
                {analysisResult.text_result}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
