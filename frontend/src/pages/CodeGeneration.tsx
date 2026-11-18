import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { aiService } from '../services/ai';
import { CodeGenResponse } from '../types';
import { MonacoEditorWrapper } from '../components/common/MonacoEditorWrapper';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  Sparkles,
  Play,
  Check,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CodeGeneration: React.FC = () => {
  const { activeProject } = useProject();
  const [prompt, setPrompt] = useState('');
  const [targetFile, setTargetFile] = useState('');
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<CodeGenResponse | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'diff'>('editor');
  const navigate = useNavigate();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !activeProject || generating) return;

    setGenerating(true);
    setApplySuccess(false);
    try {
      const data = await aiService.generateCode(
        activeProject.id,
        prompt.trim(),
        targetFile.trim() || undefined
      );
      setResult(data);
      if (data.diff_preview) {
        setViewMode('diff');
      } else {
        setViewMode('editor');
      }
    } catch (err) {
      console.error('Code generation failed', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!activeProject || !result || applying) return;
    setApplying(true);
    try {
      await aiService.applyGeneratedCode(activeProject.id, result);
      setApplySuccess(true);
    } catch (err) {
      console.error('Failed to apply generated code', err);
    } finally {
      setApplying(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.generated_code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.target_file || 'generated_feature.py';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!activeProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Layers className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-base font-semibold text-white">No Repository Selected</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">
          Select or upload an active repository to enable context-aware feature code generation.
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
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-4 overflow-hidden">
      {/* Top Request Form */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-4 shrink-0">
        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Feature Request / Natural Language Prompt
              </label>
              <input
                type="text"
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Implement a JWT refresh token rotation endpoint with expiration checks"
                className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="w-full sm:w-72">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target File (Optional)
              </label>
              <input
                type="text"
                value={targetFile}
                onChange={(e) => setTargetFile(e.target.value)}
                placeholder="e.g. app/routers/auth.py"
                className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            <div className="self-end">
              <button
                type="submit"
                disabled={!prompt.trim() || generating}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition flex items-center gap-2 h-[34px]"
              >
                {generating ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                <span>{generating ? 'Generating...' : 'Generate Code'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Editor & Preview Area */}
      <div className="flex-1 bg-dark-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        {/* Subheader Toolbar */}
        <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <FileCode className="w-4 h-4 text-brand-400" />
              <span>{result?.target_file || 'generated_feature.py'}</span>
            </div>

            {result?.diff_preview && (
              <div className="flex items-center rounded-lg bg-dark-950 border border-slate-800 p-0.5 text-[11px] font-mono">
                <button
                  onClick={() => setViewMode('editor')}
                  className={`px-2 py-0.5 rounded transition ${
                    viewMode === 'editor' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setViewMode('diff')}
                  className={`px-2 py-0.5 rounded transition ${
                    viewMode === 'diff' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Diff Preview
                </button>
              </div>
            )}
          </div>

          {result && (
            <div className="flex items-center gap-2">
              {applySuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Applied to repository</span>
                </span>
              )}
              <button
                onClick={handleDownload}
                className="px-3 py-1 rounded bg-dark-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-semibold shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{applying ? 'Applying...' : 'Apply to Repository'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden relative">
          {generating ? (
            <div className="h-full flex flex-col items-center justify-center">
              <LoadingSpinner size="lg" label="Retrieving repository context & synthesizing code..." />
            </div>
          ) : result ? (
            <div className="h-full flex flex-col">
              {result.explanation && (
                <div className="p-3 bg-brand-500/5 border-b border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <strong className="text-brand-400">Architectural Rationale:</strong> {result.explanation}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <MonacoEditorWrapper
                  value={result.generated_code}
                  language={activeProject.primary_language}
                  readOnly={false}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 text-xs">
              <Sparkles className="w-10 h-10 text-slate-700 mb-2" />
              <p className="font-medium text-slate-300">Ready to Generate Features</p>
              <p className="text-slate-500 mt-1 max-w-sm">
                Describe the feature, API endpoint, or refactor you need. AURON AI will use your repository context to create compatible code with a live diff view.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
