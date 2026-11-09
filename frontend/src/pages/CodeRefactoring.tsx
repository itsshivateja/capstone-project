import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { projectService } from '../services/projects';
import { refactorService, RefactorResponse } from '../services/refactor';
import { TreeNode } from '../types';
import { MonacoEditorWrapper } from '../components/common/MonacoEditorWrapper';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  Sparkles,
  GitCompare,
  Copy,
  Check,
  Download,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  ArrowRight,
  TrendingDown,
  Activity,
  Sliders,
} from 'lucide-react';

const REFACTOR_GOALS = [
  { id: 'simplify_functions', name: 'Simplify Complex Functions', desc: 'Break down deeply nested branching and cyclomatic complexity.' },
  { id: 'remove_duplicates', name: 'Eliminate Duplicate Code (DRY)', desc: 'Consolidate redundant routines and unify repeated patterns.' },
  { id: 'improve_naming', name: 'Improve Variable & Identifier Naming', desc: 'Rename ambiguous symbols to clear, self-documenting names.' },
  { id: 'extract_reusable', name: 'Extract Reusable Utilities', desc: 'Modularize reusable helper functions and clean domain logic.' },
  { id: 'optimize_algorithm', name: 'Optimize Algorithmic Efficiency', desc: 'Reduce loop overhead and lower Big-O time and space complexity.' },
  { id: 'modernize_idioms', name: 'Modernize Syntax & Idioms', desc: 'Adopt modern language syntax, type annotations, and patterns.' },
];

const DEFAULT_SAMPLE_CODE = `def process_orders(order_list, customer_info):
    # Deeply nested logic with duplicated calculations
    validated_orders = []
    for o in order_list:
        if o.get('status') == 'active':
            if o.get('amount') > 0:
                if customer_info.get('is_premium'):
                    discount = o.get('amount') * 0.15
                    tax = (o.get('amount') - discount) * 0.08
                    final = o.get('amount') - discount + tax
                    o['final_total'] = final
                    validated_orders.append(o)
                else:
                    discount = o.get('amount') * 0.05
                    tax = (o.get('amount') - discount) * 0.08
                    final = o.get('amount') - discount + tax
                    o['final_total'] = final
                    validated_orders.append(o)
    return validated_orders`;

export const CodeRefactoring: React.FC = () => {
  const { activeProject } = useProject();
  const [fileList, setFileList] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [code, setCode] = useState<string>(DEFAULT_SAMPLE_CODE);
  const [language, setLanguage] = useState<string>('python');
  const [selectedGoal, setSelectedGoal] = useState<string>('simplify_functions');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [refactorResult, setRefactorResult] = useState<RefactorResponse | null>(null);
  const [isDiffMode, setIsDiffMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [appliedNotification, setAppliedNotification] = useState<boolean>(false);

  useEffect(() => {
    if (!activeProject) return;
    const loadFiles = async () => {
      try {
        const tree = await projectService.getRepositoryTree(activeProject.id);
        const paths: string[] = [];
        const extract = (nodes: TreeNode[]) => {
          for (const n of nodes) {
            if (!n.is_dir) paths.push(n.path);
            if (n.children) extract(n.children);
          }
        };
        extract(tree);
        setFileList(paths);
      } catch (err) {
        console.error('Failed to load project files for refactorer', err);
      }
    };
    loadFiles();
  }, [activeProject]);

  const handleSelectProjectFile = async (filePath: string) => {
    if (!activeProject || !filePath) return;
    setSelectedFile(filePath);
    try {
      const fileData = await projectService.getFileContent(activeProject.id, filePath);
      setCode(fileData.content || '');
      if (fileData.language) setLanguage(fileData.language);
      setRefactorResult(null);
    } catch (err) {
      console.error('Failed to read file content', err);
    }
  };

  const handleExecuteRefactor = async () => {
    if (!code.trim() || isLoading) return;
    setIsLoading(true);
    setRefactorResult(null);
    setAppliedNotification(false);

    try {
      const res = await refactorService.refactorSnippet({
        code,
        language,
        goal: selectedGoal,
        custom_instruction: customPrompt.trim() || undefined,
      });
      setRefactorResult(res);
      setIsDiffMode(true);
    } catch (err) {
      console.error('Refactoring failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToEditor = () => {
    if (!refactorResult) return;
    setCode(refactorResult.refactored_code);
    setIsDiffMode(false);
    setAppliedNotification(true);
    setTimeout(() => setAppliedNotification(false), 3000);
  };

  const handleCopy = () => {
    if (!refactorResult) return;
    navigator.clipboard.writeText(refactorResult.refactored_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!refactorResult) return;
    const blob = new Blob([refactorResult.refactored_code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `refactored_${selectedFile.split('/').pop() || 'code.py'}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col gap-3 overflow-hidden">
      {/* Top Configuration Bar */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h1 className="text-sm font-bold text-white tracking-tight">Code Refactoring Studio</h1>
          </div>

          {fileList.length > 0 && (
            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <span className="text-xs text-slate-400">Load Project File:</span>
              <select
                value={selectedFile}
                onChange={(e) => handleSelectProjectFile(e.target.value)}
                className="px-2.5 py-1 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono max-w-xs truncate"
              >
                <option value="">-- Or Paste Custom Code --</option>
                {fileList.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExecuteRefactor}
            disabled={isLoading || !code.trim()}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-500/20 transition flex items-center gap-2"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isLoading ? 'Refactoring Code...' : 'Execute Refactor'}</span>
          </button>
        </div>
      </div>

      {/* Goal Selector Buttons */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-2.5 shrink-0 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
          Refactoring Target:
        </span>
        {REFACTOR_GOALS.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelectedGoal(g.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 flex items-center gap-1.5 ${
              selectedGoal === g.id
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-dark-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>{g.name}</span>
          </button>
        ))}
      </div>

      {appliedNotification && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg text-xs flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Refactored code applied to the editor buffer!</span>
        </div>
      )}

      {/* Main Split View: Input Editor on Left, Diff/Output on Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-hidden">
        {/* Left: Input Editor */}
        <div className="bg-dark-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60 shrink-0">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>Original Source Code</span>
            </span>
            <button
              onClick={() => setCode('')}
              className="text-[11px] text-slate-400 hover:text-rose-400 transition"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <MonacoEditorWrapper
              value={code}
              language={language}
              readOnly={false}
              onChange={(val) => setCode(val || '')}
            />
          </div>
        </div>

        {/* Right: Refactored Diff View */}
        <div className="bg-dark-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <LoadingSpinner size="lg" label="Analyzing control flow, identifying duplication & refactoring..." />
              <p className="text-xs text-slate-500 mt-2">Generating idiomatic, modular implementation...</p>
            </div>
          ) : !refactorResult ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <Cpu className="w-12 h-12 text-slate-700 mb-2" />
              <p className="font-semibold text-slate-300">Ready to Refactor</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Choose a refactoring goal above and click "Execute Refactor" to view a side-by-side Monaco diff comparison.
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Diff Controls Header */}
              <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60 shrink-0">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <GitCompare className="w-4 h-4 text-emerald-400" />
                  <span>Refactored Code Comparison</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDiffMode(!isDiffMode)}
                    className="px-2.5 py-1 bg-dark-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition border border-slate-700"
                  >
                    {isDiffMode ? 'Single View' : 'Side-by-Side'}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 bg-dark-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition border border-slate-700 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-2.5 py-1 bg-dark-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition border border-slate-700"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleApplyToEditor}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition"
                  >
                    Apply to Editor
                  </button>
                </div>
              </div>

              {/* Monaco Diff Viewer */}
              <div className="flex-1 overflow-hidden">
                {isDiffMode ? (
                  <MonacoEditorWrapper
                    value={refactorResult.refactored_code}
                    originalValue={refactorResult.original_code}
                    language={language}
                    readOnly={true}
                  />
                ) : (
                  <MonacoEditorWrapper
                    value={refactorResult.refactored_code}
                    language={language}
                    readOnly={true}
                  />
                )}
              </div>

              {/* Metrics & Rationale Bottom Drawer */}
              <div className="border-t border-slate-800 bg-dark-950/80 p-3 max-h-44 overflow-y-auto shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  {Object.entries(refactorResult.metrics_improvement || {}).map(([metric, val], idx) => (
                    <div key={idx} className="bg-dark-900 border border-slate-800 rounded p-2 text-xs">
                      <span className="text-[10px] text-slate-400 font-medium block">{metric}</span>
                      <span className="font-semibold text-emerald-400 font-mono">{val}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-300 bg-dark-900/50 p-2 rounded border border-slate-800/80 leading-relaxed">
                  {refactorResult.explanation}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
