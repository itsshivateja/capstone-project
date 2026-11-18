import React, { useState, useEffect, useRef } from 'react';
import { MonacoEditorWrapper } from '../components/common/MonacoEditorWrapper';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MarkdownViewer } from '../components/common/MarkdownViewer';
import {
  snippetService,
  SnippetAction,
  SnippetAnalysisResponse,
  BugItem,
  MultiProviderGenerationResponse,
  ProviderCodeSolution,
  CodeRunResponse,
} from '../services/snippet';
import {
  Sparkles,
  Play,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Download,
  Upload,
  FileCode,
  Bug,
  Wrench,
  HelpCircle,
  Zap,
  GitCompare,
  Info,
  Terminal as TerminalIcon,
  Trash2,
} from 'lucide-react';

const EXT_TO_LANG: Record<string, string> = {
  py: 'python',
  java: 'java',
  js: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  jsx: 'javascript',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  html: 'html',
  htm: 'html',
  css: 'css',
  sql: 'sql',
  php: 'php',
  go: 'go',
  rs: 'rust',
  json: 'json',
  sh: 'shell',
  bash: 'shell',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
};

const LANG_TO_EXT: Record<string, string> = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rs',
  sql: 'sql',
  html: 'html',
  css: 'css',
  php: 'php',
  shell: 'sh',
  json: 'json',
  markdown: 'md',
};

const LANGUAGES = [
  { id: 'python', name: 'Python' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'c', name: 'C' },
  { id: 'cpp', name: 'C++' },
  { id: 'java', name: 'Java' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'sql', name: 'SQL' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'php', name: 'PHP' },
];

const EXAMPLE_PROMPTS = [
  { label: 'Check even or odd', prompt: 'Write a function to check whether a number is even or odd.' },
  { label: 'Build a calculator', prompt: 'Create a calculator with addition, subtraction, multiplication, and division.' },
  { label: 'Find the largest in a list', prompt: 'Write a function to find the largest number in a list.' },
];

export const CodeSandbox: React.FC = () => {
  // Core Monaco Editor & File state
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python');
  const [fileName, setFileName] = useState<string>('main.py');

  // AI Code Generator & Multi-Provider state
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [multiResponse, setMultiResponse] = useState<MultiProviderGenerationResponse | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'groq' | 'openai' | null>(null);

  // Staged replacement approval if user already had code in editor
  const [stagedReplacement, setStagedReplacement] = useState<{
    code: string;
    provider: 'gemini' | 'groq' | 'openai';
    explanation: string;
  } | null>(null);

  // Output Terminal state
  const [terminalOpen, setTerminalOpen] = useState<boolean>(true);
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<CodeRunResponse | null>(null);
  const [stdinValue, setStdinValue] = useState<string>('');
  const [terminalHeight, setTerminalHeight] = useState<number>(180);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState<boolean>(false);

  // Exactly Five Code Actions state
  const [activeAction, setActiveAction] = useState<SnippetAction | null>(null);
  const [isLoadingAction, setIsLoadingAction] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<SnippetAnalysisResponse | null>(null);

  // UI notifications and diff states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isDiffMode, setIsDiffMode] = useState<boolean>(true);
  const [showFixExplanation, setShowFixExplanation] = useState<boolean>(true);
  const [copiedFixed, setCopiedFixed] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasCode = code.trim().length > 0;
  const showResultsPane = isLoadingAction || isGenerating || Boolean(analysisResult);

  // Restore state passed from Intake or SessionStorage
  useEffect(() => {
    const pasted = sessionStorage.getItem('auron_ai_pasted_code');
    const lang = sessionStorage.getItem('auron_ai_pasted_lang');
    const name = sessionStorage.getItem('auron_ai_pasted_filename');
    const incomingPrompt = sessionStorage.getItem('auron_ai_generate_prompt');

    if (pasted) {
      setCode(pasted);
      sessionStorage.removeItem('auron_ai_pasted_code');
    }
    if (lang) {
      setLanguage(lang);
      sessionStorage.removeItem('auron_ai_pasted_lang');
    }
    if (name) {
      setFileName(name);
      sessionStorage.removeItem('auron_ai_pasted_filename');
    }
    if (incomingPrompt) {
      setPrompt(incomingPrompt);
      sessionStorage.removeItem('auron_ai_generate_prompt');
      setTimeout(() => {
        handleGenerateMulti(incomingPrompt);
      }, 150);
    }
  }, []);

  // Sync active code context with AI Copilot sidebar
  useEffect(() => {
    sessionStorage.setItem('auron_ai_active_code', code);
    sessionStorage.setItem('auron_ai_active_filename', fileName || 'main.py');
    sessionStorage.setItem('auron_ai_active_lang', language);
  }, [code, fileName, language]);

  const showNotificationBanner = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const loadFileContent = (name: string, content: string) => {
    setCode(content);
    setFileName(name);
    setAnalysisResult(null);
    setStagedReplacement(null);
    setSelectedProvider(null);
    setShowComparison(false);
    setErrorMsg(null);
    setActiveAction(null);
    setExecutionResult(null);

    const ext = name.split('.').pop()?.toLowerCase();
    if (ext && EXT_TO_LANG[ext]) {
      setLanguage(EXT_TO_LANG[ext]);
    } else {
      detectCodeLanguage(content);
    }
    showNotificationBanner(`Loaded file "${name}" into Monaco Editor.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      loadFileContent(file.name, content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const detectCodeLanguage = async (sourceCode: string) => {
    try {
      const res = await snippetService.detectLanguage(sourceCode);
      if (res.language && res.language !== 'plaintext') {
        setLanguage(res.language);
      }
    } catch (err) {
      console.error('Language auto-detection failed', err);
    }
  };

  // ================= 1, 2, 3. THREE AI PROVIDERS CODE GENERATION =================
  const handleGenerateMulti = async (overridePrompt?: string) => {
    const query = (overridePrompt || prompt).trim();
    if (!query) {
      setErrorMsg('Please enter a description of the code you want to generate.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setMultiResponse(null);

    try {
      const res = await snippetService.generateMultiProvider({
        prompt: query,
        language,
        existing_code: hasCode ? code : '',
      });

      setMultiResponse(res);
      setShowComparison(true);
      showNotificationBanner('Generated three model options! Compare them below.');
    } catch (err: any) {
      console.error('Multi-provider code generation failed', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'AI code generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ================= 5. USER SELECTION – ONLY ONE CODE OPTION =================
  const handleSelectSolution = (providerKey: 'gemini' | 'groq' | 'openai') => {
    if (!multiResponse) return;
    const modelLabel = providerKey === 'gemini' ? 'Model 1' : providerKey === 'groq' ? 'Model 2' : 'Model 3';
    const sol = multiResponse.solutions[providerKey];
    if (!sol || sol.status !== 'success' || !sol.code) {
      setErrorMsg(`Cannot select ${modelLabel}: this model encountered an error.`);
      return;
    }

    // If editor already has code, preserve it and prompt for approval
    if (hasCode && code.trim() !== sol.code.trim()) {
      setStagedReplacement({
        code: sol.code,
        provider: providerKey,
        explanation: sol.explanation || '',
      });
      showNotificationBanner(`Selected ${modelLabel}. Approve replacement below to update editor.`);
    } else {
      // Load directly into editor
      setCode(sol.code);
      setSelectedProvider(providerKey);
      setShowComparison(false); // Hide the other two comparison options
      showNotificationBanner(`Loaded ${modelLabel} solution into Monaco Editor.`);
    }
  };

  // ================= 6. USE RECOMMENDED CODE =================
  const handleUseRecommended = () => {
    if (!multiResponse) return;
    let recKey = multiResponse.recommended_provider;
    if (recKey === 'comparable' || !recKey) {
      // Pick first successful provider
      const firstSuccess = (['groq', 'gemini', 'openai'] as const).find(
        (k) => multiResponse.solutions[k]?.status === 'success' && multiResponse.solutions[k]?.code
      );
      if (firstSuccess) recKey = firstSuccess;
    }

    if (recKey && recKey !== 'comparable') {
      handleSelectSolution(recKey as 'gemini' | 'groq' | 'openai');
    }
  };

  const handleApproveStagedReplacement = () => {
    if (!stagedReplacement) return;
    setCode(stagedReplacement.code);
    setSelectedProvider(stagedReplacement.provider);
    setShowComparison(false);
    setStagedReplacement(null);
    setAnalysisResult(null);
    setActiveAction(null);
    showNotificationBanner('Editor buffer updated with the selected AI code.');
  };

  const handleDiscardStagedReplacement = () => {
    setStagedReplacement(null);
    showNotificationBanner('Discarded replacement. Existing editor code preserved.');
  };

  // Drag-to-resize terminal height up & down
  const handleTerminalResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingTerminal(true);
    const startY = e.clientY;
    const startH = terminalHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const deltaY = startY - ev.clientY; // Dragging up increases height
      const nextH = Math.min(Math.max(startH + deltaY, 36), 550);
      setTerminalHeight(nextH);
    };

    const onMouseUp = () => {
      setIsDraggingTerminal(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ================= 7. RUN CODE IN ISOLATED SANDBOX TERMINAL =================
  const handleRunCode = async () => {
    if (!code.trim()) {
      setErrorMsg('No code in editor to execute.');
      return;
    }

    setIsRunningCode(true);
    setErrorMsg(null);
    setTerminalOpen(true);
    if (terminalHeight < 120) {
      setTerminalHeight(180);
    }

    try {
      const res = await snippetService.runCode({
        code,
        language,
        stdin: stdinValue,
      });
      setExecutionResult(res);
    } catch (err: any) {
      console.error('Code execution failed', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Execution error in sandbox.');
    } finally {
      setIsRunningCode(false);
    }
  };

  const handleClearTerminal = () => {
    setExecutionResult(null);
  };

  // ================= 4. EXACTLY FIVE CODE ACTIONS =================
  const handleAction = async (action: SnippetAction) => {
    if (!code.trim()) {
      setErrorMsg('Please generate code, upload a file, or enter code first.');
      return;
    }

    setActiveAction(action);
    setIsLoadingAction(true);
    setErrorMsg(null);

    try {
      const res = await snippetService.analyzeSnippet({
        code,
        language,
        action,
      });
      setAnalysisResult(res);
      if (action === 'fix_code') {
        setIsDiffMode(true);
      }
    } catch (err: any) {
      console.error('Analysis action failed', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Analysis action failed.');
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleApplyFix = () => {
    if (analysisResult?.fix_result?.corrected_code) {
      setCode(analysisResult.fix_result.corrected_code);
      setIsDiffMode(false);
      showNotificationBanner('Fix applied successfully! Monaco editor updated.');
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
    const ext = fileName.includes('.') ? fileName.split('.').pop() : 'txt';
    const blob = new Blob([analysisResult.fix_result.corrected_code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixed_${fileName || 'code.' + ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadOriginal = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'source_code.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getSeverityBadge = (severity: string) => {
    const s = severity.toLowerCase();
    if (s === 'critical') return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    if (s === 'high') return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    if (s === 'medium') return 'bg-graphite-raised text-graphite-text border-white/[0.08]';
    return 'bg-graphite-deep text-graphite-muted border-white/[0.06]';
  };

  return (
    <div className="auron-sandbox auron-code-mode h-[calc(100vh-4.5rem)] flex flex-col gap-3 overflow-hidden text-graphite-text">
      <div className="auron-code-titlebar flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="auron-code-mark">
            <FileCode className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-graphite-text">Code Lab</h1>
              <span className="auron-live-dot" />
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-300/80">Ready</span>
            </div>
            <p className="text-[11px] text-graphite-muted truncate">Generate, edit, and run code</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-graphite-muted">
          <span className="auron-context-chip">{language}</span>
          <span>{hasCode ? `${code.split('\n').length} lines loaded` : 'Empty buffer'}</span>
        </div>
      </div>

      <div className={`auron-top-panel flex flex-col shrink-0 min-h-0 ${showComparison ? 'has-comparison' : ''}`}>
      {/* ================= 1. AI CODE GENERATOR SEARCH BAR ================= */}
      <div className="auron-generator bg-graphite-card border border-white/[0.08] rounded-xl px-3 py-2.5 shrink-0 space-y-2 shadow-lg">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div>
              <span className="text-sm font-semibold text-graphite-text tracking-tight block">Generate code</span>
              <span className="text-[11px] text-graphite-muted hidden md:block">Describe what you want to build</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* File Upload Button */}
            <label className="cursor-pointer px-2.5 py-1 rounded-md bg-graphite-deep hover:bg-graphite-raised border border-white/[0.08] text-graphite-secondary hover:text-white text-xs font-medium flex items-center gap-1.5 transition">
              <Upload className="w-3.5 h-3.5 text-graphite-muted" />
              <span>{hasCode ? 'Upload File' : 'Upload Code File'}</span>
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>

            {hasCode && (
              <>
                <button
                  onClick={handleDownloadOriginal}
                  title="Download current source code"
                  className="p-1.5 rounded-md bg-graphite-deep hover:bg-graphite-raised border border-white/[0.08] text-graphite-muted hover:text-graphite-text transition"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setCode('');
                    setFileName('main.py');
                    setMultiResponse(null);
                    setShowComparison(false);
                    setSelectedProvider(null);
                    setStagedReplacement(null);
                    setAnalysisResult(null);
                    setActiveAction(null);
                    setExecutionResult(null);
                  }}
                  className="px-2 py-1 text-xs text-graphite-muted hover:text-rose-400 rounded-md hover:bg-white/[0.04] transition"
                >
                  Clear
                </button>
              </>
              )}
          </div>
        </div>

        {/* Multiline Prompt Input with Generate Button */}
        <div className="auron-prompt-shell bg-graphite-deep border border-white/[0.08] rounded-lg p-2 focus-within:border-white/25 transition">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerateMulti();
              }
            }}
            placeholder="What would you like to build?"
            rows={2}
            className="w-full bg-transparent border-none text-sm text-graphite-text placeholder:text-graphite-muted focus:outline-none resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06] flex-wrap">
            {/* Left: Language Selection & Shortcut hint */}
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setLanguage(newLang);
                  const ext = LANG_TO_EXT[newLang] || 'py';
                  setFileName(`main.${ext}`);
                }}
                className="px-2.5 py-1.5 bg-graphite-card border border-white/[0.08] rounded-lg text-xs text-graphite-text focus:outline-none focus:border-white/20 font-mono"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>

              <span className="text-[11px] text-graphite-muted hidden xl:inline">
                Enter to generate · Shift+Enter for a new line
              </span>
            </div>

            {/* Right: Clear Prompt & Generate Button */}
            <div className="flex items-center gap-2">
              {prompt && (
                <button
                  type="button"
                  onClick={() => setPrompt('')}
                  className="p-1 text-graphite-muted hover:text-white rounded transition text-xs"
                  title="Clear prompt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleGenerateMulti()}
                disabled={isGenerating || !prompt.trim()}
                className="px-3 py-1.5 bg-graphite-text hover:bg-white text-graphite-deep font-semibold rounded-md text-xs transition flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
              >
                {isGenerating ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying 3 AI APIs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Beginner Example Prompt Pills */}
        <div className="auron-prompt-examples flex flex-wrap items-center gap-1.5 text-[11px] text-graphite-muted">
          <span className="text-[10px] shrink-0 text-graphite-muted">Sample prompts</span>
          {EXAMPLE_PROMPTS.map((ex, idx) => (
            <button
              key={ex.label}
              onClick={() => {
                setPrompt(ex.prompt);
                if (textareaRef.current) textareaRef.current.focus();
              }}
              title={ex.prompt}
              className="px-2 py-1 bg-transparent hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.16] rounded-md text-[10px] text-graphite-secondary hover:text-white transition"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= 3, 4, 6. THREE AI SOLUTIONS COMPARISON INTERFACE ================= */}
      {multiResponse && showComparison && (
        <div className="auron-comparison bg-graphite-card border border-accent/30 rounded-2xl p-4 shrink-0 space-y-3 shadow-xl transition">
          {/* Header & Recommendation Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-accent-subtle text-accent border border-accent/40 uppercase">
                AI Solutions Comparison
              </span>
              <p className="text-xs text-graphite-text font-medium">
                {multiResponse.recommendation_reason || 'Comparing 3 independent AI responses.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUseRecommended}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-graphite-deep font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Use Recommended Code</span>
              </button>
              <button
                onClick={() => setShowComparison(false)}
                className="p-1 text-graphite-muted hover:text-white rounded transition"
                title="Hide comparison"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Three Provider Option Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* OPTION 1: GEMINI */}
            {(() => {
              const sol = multiResponse.solutions.gemini;
              const isRec = multiResponse.recommended_provider === 'gemini';
              return (
                <div
                  className={`bg-graphite-deep border rounded-xl p-3 flex flex-col justify-between transition ${
                    isRec
                      ? 'border-accent shadow-md shadow-accent/5 ring-1 ring-accent/20'
                      : 'border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-graphite-text">Model 1</span>
                        <span className="text-[9px] font-mono bg-cyan-500/10 text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-500/20">
                          Modular Function
                        </span>
                        {isRec && (
                          <span className="text-[9px] font-mono bg-accent-subtle text-accent px-1.5 py-0.2 rounded border border-accent/30 font-semibold">
                            Recommended
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-graphite-muted">
                        {sol.status === 'success' ? `${sol.duration_ms}ms` : 'Error'}
                      </span>
                    </div>

                    {sol.status === 'success' && sol.code ? (
                      <>
                        <div className="bg-graphite-card p-2 rounded-md border border-white/[0.06] text-[11px] font-mono text-graphite-secondary max-h-32 overflow-y-auto whitespace-pre leading-snug">
                          {sol.code}
                        </div>
                        <p className="text-[11px] text-graphite-muted leading-relaxed line-clamp-2">
                          {sol.explanation}
                        </p>
                      </>
                    ) : (
                      <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                        <p className="font-medium">Provider Notice:</p>
                        <p className="text-[10px] mt-0.5 opacity-90">{sol.error_message || 'API key not configured.'}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleSelectSolution('gemini')}
                    disabled={sol.status !== 'success'}
                    className="mt-3 w-full py-1.5 px-3 bg-graphite-card hover:bg-graphite-raised disabled:opacity-40 disabled:pointer-events-none border border-white/[0.08] text-xs font-medium rounded-lg text-graphite-text transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-accent" />
                    <span>Select Model 1</span>
                  </button>
                </div>
              );
            })()}

            {/* OPTION 2: GROQ */}
            {(() => {
              const sol = multiResponse.solutions.groq;
              const isRec = multiResponse.recommended_provider === 'groq';
              return (
                <div
                  className={`bg-graphite-deep border rounded-xl p-3 flex flex-col justify-between transition ${
                    isRec
                      ? 'border-accent shadow-md shadow-accent/5 ring-1 ring-accent/20'
                      : 'border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-graphite-text">Model 2</span>
                        <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          Direct Script
                        </span>
                        {isRec && (
                          <span className="text-[9px] font-mono bg-accent-subtle text-accent px-1.5 py-0.2 rounded border border-accent/30 font-semibold">
                            Recommended
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-graphite-muted">
                        {sol.status === 'success' ? `${sol.duration_ms}ms` : 'Error'}
                      </span>
                    </div>

                    {sol.status === 'success' && sol.code ? (
                      <>
                        <div className="bg-graphite-card p-2 rounded-md border border-white/[0.06] text-[11px] font-mono text-graphite-secondary max-h-32 overflow-y-auto whitespace-pre leading-snug">
                          {sol.code}
                        </div>
                        <p className="text-[11px] text-graphite-muted leading-relaxed line-clamp-2">
                          {sol.explanation}
                        </p>
                      </>
                    ) : (
                      <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                        <p className="font-medium">Provider Notice:</p>
                        <p className="text-[10px] mt-0.5 opacity-90">{sol.error_message || 'API key not configured.'}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleSelectSolution('groq')}
                    disabled={sol.status !== 'success'}
                    className="mt-3 w-full py-1.5 px-3 bg-graphite-card hover:bg-graphite-raised disabled:opacity-40 disabled:pointer-events-none border border-white/[0.08] text-xs font-medium rounded-lg text-graphite-text transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-accent" />
                    <span>Select Model 2</span>
                  </button>
                </div>
              );
            })()}

            {/* OPTION 3: OPENAI */}
            {(() => {
              const sol = multiResponse.solutions.openai;
              const isRec = multiResponse.recommended_provider === 'openai';
              return (
                <div
                  className={`bg-graphite-deep border rounded-xl p-3 flex flex-col justify-between transition ${
                    isRec
                      ? 'border-accent shadow-md shadow-accent/5 ring-1 ring-accent/20'
                      : 'border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-graphite-text">Model 3</span>
                        <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20">
                          Interactive Flow
                        </span>
                        {isRec && (
                          <span className="text-[9px] font-mono bg-accent-subtle text-accent px-1.5 py-0.2 rounded border border-accent/30 font-semibold">
                            Recommended
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-graphite-muted">
                        {sol.status === 'success' ? `${sol.duration_ms}ms` : 'Error'}
                      </span>
                    </div>

                    {sol.status === 'success' && sol.code ? (
                      <>
                        <div className="bg-graphite-card p-2 rounded-md border border-white/[0.06] text-[11px] font-mono text-graphite-secondary max-h-32 overflow-y-auto whitespace-pre leading-snug">
                          {sol.code}
                        </div>
                        <p className="text-[11px] text-graphite-muted leading-relaxed line-clamp-2">
                          {sol.explanation}
                        </p>
                      </>
                    ) : (
                      <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                        <p className="font-medium">Provider Notice:</p>
                        <p className="text-[10px] mt-0.5 opacity-90">{sol.error_message || 'API key not configured.'}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleSelectSolution('openai')}
                    disabled={sol.status !== 'success'}
                    className="mt-3 w-full py-1.5 px-3 bg-graphite-card hover:bg-graphite-raised disabled:opacity-40 disabled:pointer-events-none border border-white/[0.08] text-xs font-medium rounded-lg text-graphite-text transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-accent" />
                    <span>Select Model 3</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      </div>

      {/* ================= STAGED CODE REPLACEMENT APPROVAL ================= */}
      {stagedReplacement && (
        <div className="bg-graphite-card border border-accent/40 rounded-xl p-3 shrink-0 flex items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent-subtle border border-accent/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-graphite-text truncate">
                Replace existing editor code with {stagedReplacement.provider.toUpperCase()} solution?
              </p>
              <p className="text-[11px] text-graphite-muted truncate max-w-xl">
                {stagedReplacement.explanation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDiscardStagedReplacement}
              className="px-3 py-1.5 bg-graphite-deep hover:bg-graphite-raised border border-white/[0.08] text-graphite-muted hover:text-white text-xs rounded-md transition"
            >
              Discard
            </button>
            <button
              onClick={handleApproveStagedReplacement}
              className="px-3.5 py-1.5 bg-graphite-text hover:bg-white text-graphite-deep font-semibold text-xs rounded-md transition flex items-center gap-1.5 shadow"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Replace Code in Editor</span>
            </button>
          </div>
        </div>
      )}

      {/* Notifications and Alerts */}
      {notification && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-lg text-xs flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-1.5 rounded-lg text-xs flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ================= MAIN SPLIT WORKSPACE ================= */}
      <div className={`flex-1 grid grid-cols-1 ${showResultsPane ? 'lg:grid-cols-[1.08fr_0.92fr]' : 'lg:grid-cols-1'} gap-3 overflow-hidden min-h-0`}>
        {/* ================= LEFT COLUMN: MONACO EDITOR + 5 ACTIONS + OUTPUT TERMINAL ================= */}
        <div className="auron-editor-panel bg-graphite-card border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden h-full shadow-lg min-h-0">
          {/* Monaco Editor Header */}
          <div className="auron-panel-header h-12 px-4 border-b border-white/[0.08] flex items-center justify-between bg-graphite-card shrink-0">
            <div className="flex items-center gap-2 text-xs min-w-0">
              <FileCode className="h-3.5 w-3.5 shrink-0 text-graphite-muted" />
              <span className="font-mono text-xs text-graphite-text bg-graphite-deep px-2 py-0.5 rounded border border-white/[0.08] truncate">
                {fileName}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-graphite-raised text-emerald-400 border border-emerald-500/20 uppercase">
                {language}
              </span>

              {/* Selected Provider Badge */}
              {selectedProvider && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-subtle text-accent border border-accent/30 font-medium">
                  {selectedProvider.toUpperCase()}
                </span>
              )}

              {multiResponse && !showComparison && (
                <button
                  onClick={() => setShowComparison(true)}
                  className="text-[10px] font-medium text-graphite-muted hover:text-white underline underline-offset-2 ml-1"
                >
                  Compare other providers
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-graphite-muted shrink-0">
              <span>{code ? code.split('\n').length : 0} lines</span>
              <button
                onClick={handleCopyCode}
                className="p-1 hover:text-white rounded hover:bg-graphite-raised transition"
                title="Copy code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Monaco Code Editor */}
          <div className="flex-1 overflow-hidden relative min-h-0 bg-graphite-deep">
            <MonacoEditorWrapper
              value={code}
              language={language}
              readOnly={false}
              onChange={(val) => setCode(val || '')}
            />
            {!hasCode && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 text-center bg-graphite-deep/80 backdrop-blur-xs">
                <p className="text-xs font-medium text-graphite-muted">Start typing or generate code</p>
              </div>
            )}
          </div>

          {/* ================= 4. EXACTLY FIVE CODE ACTIONS ================= */}
          {hasCode && (
            <div className="auron-action-dock shrink-0 border-t border-white/[0.08] px-3 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
                {([
                  { action: 'detect_bugs', label: 'Bugs', title: 'Detect Bugs', icon: Bug, color: 'text-rose-400' },
                  { action: 'fix_code', label: 'Fix', title: 'Fix Code', icon: Wrench, color: 'text-emerald-400' },
                  { action: 'explain', label: 'Explain', title: 'Explain Code', icon: HelpCircle, color: 'text-slate-300' },
                  { action: 'optimize', label: 'Optimize', title: 'Optimize Code', icon: Zap, color: 'text-amber-400' },
                  { action: 'review', label: 'Review', title: 'Review Code', icon: GitCompare, color: 'text-cyan-300' },
                ] as const).map(({ action, label, title, icon: Icon, color }) => (
                  <button
                    key={action}
                    onClick={() => handleAction(action)}
                    disabled={isLoadingAction}
                    title={title}
                    aria-label={title}
                    aria-pressed={activeAction === action}
                    className={`flex min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-[11px] font-medium transition ${
                      activeAction === action
                        ? 'border-cyan-300/30 bg-cyan-300/10 text-graphite-text'
                        : 'border-white/[0.06] bg-transparent text-graphite-secondary hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-graphite-text'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================= 7. INTEGRATED OUTPUT TERMINAL ================= */}
          {/* Draggable Vertical Resize Splitter */}
          <div
            onMouseDown={handleTerminalResizeStart}
            className={`h-2 relative z-20 cursor-row-resize flex items-center justify-center group transition select-none border-t border-white/[0.08] ${
              isDraggingTerminal ? 'bg-accent/40' : 'bg-graphite-card/60 hover:bg-white/[0.08]'
            }`}
            title="Drag up or down to resize Output Terminal and Monaco Editor"
          >
            <div className="w-12 h-1 rounded-full bg-white/[0.2] group-hover:bg-accent transition" />
          </div>

          <div
            style={{ height: `${terminalHeight}px` }}
            className="bg-[#0c0c0d] flex flex-col shrink-0 overflow-hidden transition-[height] duration-75 min-h-[36px]"
          >
            {/* Terminal Header */}
            <div className="h-8 px-3 flex items-center justify-between border-b border-white/[0.06] bg-graphite-card shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <TerminalIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-semibold text-graphite-text font-mono truncate">Output Terminal</span>
                {executionResult && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border truncate ${
                      executionResult.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : executionResult.status === 'timeout'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {executionResult.status.toUpperCase()} ({executionResult.execution_time_ms}ms)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setTerminalHeight(terminalHeight <= 40 ? 190 : 36)}
                  className="rounded px-2 py-1 text-[10px] text-graphite-muted transition hover:bg-white/[0.04] hover:text-graphite-text"
                  title={terminalHeight <= 40 ? 'Restore terminal' : 'Collapse terminal'}
                >
                  {terminalHeight <= 40 ? 'Expand' : 'Collapse'}
                </button>

                {executionResult && (
                  <button
                    onClick={handleClearTerminal}
                    className="p-1 text-graphite-muted hover:text-white rounded transition"
                    title="Clear Output"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                <button
                  onClick={handleRunCode}
                  disabled={isRunningCode || !hasCode}
                  className="px-3 py-1 bg-cyan-300 hover:bg-cyan-200 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-semibold text-[11px] rounded-md transition flex items-center gap-1"
                >
                  {isRunningCode ? (
                    <>
                      <RotateCcw className="w-3 h-3 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Run Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="auron-stdin-row flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] shrink-0">
              <label htmlFor="code-stdin" className="text-[10px] font-medium text-graphite-muted whitespace-nowrap">
                Program input
              </label>
              <input
                id="code-stdin"
                type="text"
                value={stdinValue}
                onChange={(e) => setStdinValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRunCode();
                  }
                }}
                placeholder="Optional input (e.g. 8 for input()-based even/odd code)"
                aria-label="Program input"
                className="auron-stdin-input min-w-0 flex-1 rounded-md border border-white/[0.08] bg-graphite-deep px-2.5 py-1.5 text-[11px] font-mono text-graphite-text placeholder:text-graphite-muted/70 focus:border-cyan-300/40 focus:outline-none"
              />
            </div>

            {/* Terminal Body */}
            <div className="p-2.5 font-mono text-[11px] overflow-y-auto flex-1 leading-relaxed select-text min-h-0">
              {isRunningCode ? (
                <div className="flex items-center gap-2 text-graphite-muted">
                  <RotateCcw className="w-3 h-3 animate-spin text-emerald-400" />
                  <span>Executing inside isolated sandbox...</span>
                </div>
              ) : !executionResult ? (
                <div className="text-graphite-muted/60 text-[11px] italic">
                  Ready to run. Output will appear here.
                </div>
              ) : (
                <div className="space-y-1">
                  {executionResult.stdout && (
                    <div className="text-emerald-300 whitespace-pre-wrap">{executionResult.stdout}</div>
                  )}
                  {executionResult.stderr && (
                    <div className="text-rose-400 whitespace-pre-wrap">{executionResult.stderr}</div>
                  )}
                  <div className="text-[10px] text-graphite-muted/80 pt-1 border-t border-white/[0.04]">
                    Exit code: {executionResult.exit_code} • Execution time: {executionResult.execution_time_ms}ms • Sandbox: {executionResult.sandbox_type}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: WORKSPACE RESULTS PANE ================= */}
        {showResultsPane && (
        <div className="auron-results-panel bg-graphite-card border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden h-full shadow-lg min-h-0">
          {isLoadingAction ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <LoadingSpinner
                size="lg"
                label={
                  activeAction === 'detect_bugs'
                    ? 'Analyzing code for bugs...'
                    : activeAction === 'fix_code'
                    ? 'Generating corrected code & diff comparison...'
                    : activeAction === 'explain'
                    ? 'Explaining code structure in simple English...'
                    : activeAction === 'optimize'
                    ? 'Computing algorithmic optimizations & benchmarks...'
                    : 'Reviewing code quality, maintainability, and design...'
                }
              />
              <p className="text-xs text-graphite-muted mt-2 font-mono">
                Consulting the code analysis engine...
              </p>
            </div>
          ) : isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <LoadingSpinner
                size="lg"
                label="Comparing three generated solutions in parallel..."
              />
              <p className="text-xs text-graphite-muted mt-2 font-mono">
                Generating beginner-friendly solutions for: "{prompt}"
              </p>
            </div>
          ) : analysisResult?.action === 'fix_code' && analysisResult.fix_result ? (
            /* ================= FIX CODE RESULT VIEW WITH DIFF ================= */
            <div className="h-full flex flex-col overflow-hidden min-h-0">
              <div className="h-9 px-4 border-b border-white/[0.08] flex items-center justify-between bg-graphite-card shrink-0">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-graphite-text">Repaired Code Comparison</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsDiffMode(!isDiffMode)}
                    className="px-2.5 py-1 bg-graphite-raised hover:bg-white/[0.08] text-graphite-text rounded-md text-xs transition flex items-center gap-1 border border-white/[0.08]"
                    title="Toggle side-by-side comparison"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-graphite-muted" />
                    <span>{isDiffMode ? 'Single view' : 'Compare changes'}</span>
                  </button>

                  <button
                    onClick={handleCopyFixed}
                    className="px-2.5 py-1 bg-graphite-raised hover:bg-white/[0.08] text-graphite-text rounded-md text-xs transition flex items-center gap-1 border border-white/[0.08]"
                    title="Copy repaired code"
                  >
                    {copiedFixed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-graphite-muted" />}
                    <span>{copiedFixed ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleDownloadFixed}
                    className="px-2.5 py-1 bg-graphite-raised hover:bg-white/[0.08] text-graphite-text rounded-md text-xs transition flex items-center gap-1 border border-white/[0.08]"
                    title="Download repaired file"
                  >
                    <Download className="w-3.5 h-3.5 text-graphite-muted" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={handleApplyFix}
                    className="px-3 py-1 bg-graphite-text hover:bg-white text-graphite-deep rounded-md text-xs font-medium transition flex items-center gap-1"
                    title="Apply repaired code directly to editor"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply Fix to Editor</span>
                  </button>
                </div>
              </div>

              {/* Monaco Diff Editor */}
              <div className="flex-1 overflow-hidden relative min-h-0 bg-graphite-deep">
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

              {/* Fix Rationale Drawer */}
              <div className="border-t border-white/[0.08] bg-graphite-deep max-h-48 overflow-y-auto p-3 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-graphite-text">
                    <Info className="w-3.5 h-3.5 text-graphite-muted" />
                    <span>Applied Modifications & Rationale</span>
                  </div>
                  <button
                    onClick={() => setShowFixExplanation(!showFixExplanation)}
                    className="text-[11px] text-graphite-muted hover:text-white"
                  >
                    {showFixExplanation ? 'Hide details' : 'Explain fix'}
                  </button>
                </div>

                {showFixExplanation && (
                  <div className="space-y-2 text-xs">
                    <p className="text-graphite-secondary leading-relaxed bg-graphite-card p-2.5 rounded-md border border-white/[0.08]">
                      {analysisResult.fix_result.explanation}
                    </p>
                    {analysisResult.fix_result.changes_summary?.length > 0 && (
                      <ul className="space-y-1 pl-4 list-disc text-graphite-muted text-[11px]">
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
          ) : analysisResult?.action === 'detect_bugs' ? (
            /* ================= DETECT BUGS RESULT VIEW ================= */
            <div className="h-full flex flex-col overflow-hidden min-h-0">
              <div className="h-9 px-4 border-b border-white/[0.08] flex items-center justify-between bg-graphite-card shrink-0">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-medium text-graphite-text">Bug Detection Diagnostics</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.2 rounded font-mono text-[10px] border ${
                      analysisResult.has_bugs
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {analysisResult.has_bugs
                      ? `${analysisResult.bugs?.length || 0} Issues Detected`
                      : 'Clean Code – No Bugs'}
                  </span>
                  {analysisResult.has_bugs && (
                    <button
                      onClick={() => handleAction('fix_code')}
                      className="px-2.5 py-1 bg-graphite-text hover:bg-white text-graphite-deep rounded-md text-xs font-medium transition flex items-center gap-1"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Fix Code</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bugs List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!analysisResult.bugs || analysisResult.bugs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-graphite-muted">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                    <p className="font-medium text-graphite-text text-xs">No defects identified</p>
                    <p className="text-xs text-graphite-muted mt-1 max-w-sm">
                      The code passed AST validation, null safety checks, and edge-case boundary reasoning.
                    </p>
                  </div>
                ) : (
                  analysisResult.bugs.map((bug: BugItem, idx: number) => (
                    <div
                      key={idx}
                      className="bg-graphite-deep border border-white/[0.08] rounded-lg p-3 space-y-2 hover:border-white/[0.14] transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider border ${getSeverityBadge(
                              bug.severity
                            )}`}
                          >
                            {bug.severity}
                          </span>
                          <span className="font-medium text-graphite-text text-xs">{bug.error_type}</span>
                        </div>
                        {bug.line_number && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-graphite-card border border-white/[0.08] rounded text-graphite-muted">
                            Line {bug.line_number}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[9px] font-mono text-graphite-muted uppercase tracking-wider block mb-0.5">
                          Problem description:
                        </span>
                        <p className="text-xs text-graphite-text leading-relaxed">{bug.description}</p>
                      </div>

                      <div className="bg-graphite-card p-2 rounded border border-white/[0.06] space-y-0.5">
                        <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider block">
                          Root cause:
                        </span>
                        <p className="text-[11px] text-graphite-muted leading-relaxed">{bug.root_cause}</p>
                      </div>

                      <div className="bg-graphite-card p-2 rounded border border-white/[0.06] space-y-0.5">
                        <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider block">
                          Recommended solution:
                        </span>
                        <p className="text-[11px] text-graphite-secondary leading-relaxed whitespace-pre-wrap font-mono">
                          {bug.recommended_solution}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : analysisResult ? (
            /* ================= EXPLAIN | OPTIMIZE | REVIEW ================= */
            <div className="h-full flex flex-col overflow-hidden min-h-0">
              <div className="h-9 px-4 border-b border-white/[0.08] flex items-center justify-between bg-graphite-card shrink-0">
                <div className="flex items-center gap-2">
                  {activeAction === 'explain' && <HelpCircle className="w-4 h-4 text-graphite-muted" />}
                  {activeAction === 'optimize' && <Zap className="w-4 h-4 text-amber-400" />}
                  {activeAction === 'review' && <GitCompare className="w-4 h-4 text-cyan-300" />}
                  <span className="text-xs font-medium text-graphite-text capitalize">
                    {activeAction === 'explain'
                      ? 'Code Explanation'
                      : activeAction === 'optimize'
                      ? 'Code Optimization'
                      : 'Code Review'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (analysisResult.text_result) {
                      navigator.clipboard.writeText(analysisResult.text_result);
                    }
                  }}
                  className="px-2.5 py-1 bg-graphite-raised hover:bg-white/[0.08] text-graphite-text rounded-md text-xs transition flex items-center gap-1 border border-white/[0.08]"
                >
                  <Copy className="w-3.5 h-3.5 text-graphite-muted" />
                  <span>Copy output</span>
                </button>
              </div>

              {/* Formatted Markdown Output Pane */}
              <div className="flex-1 overflow-y-auto p-4 leading-relaxed">
                {activeAction === 'optimize' ? (
                  <pre className="whitespace-pre-wrap rounded-lg border border-white/[0.08] bg-graphite-deep p-4 text-xs leading-relaxed text-graphite-text font-mono">
                    {analysisResult.text_result || ''}
                  </pre>
                ) : (
                  <MarkdownViewer content={analysisResult.text_result || ''} />
                )}
              </div>
            </div>
          ) : (
            /* ================= READY STATE: EXPLANATION OF 5 ACTIONS ================= */
            <div className="auron-empty-state h-full flex flex-col items-center justify-center text-center p-5 text-graphite-muted">
              <div className="auron-empty-icon w-11 h-11 rounded-xl bg-graphite-deep border border-white/[0.08] flex items-center justify-center mb-3 text-graphite-muted">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-sm font-medium text-graphite-text">
                {hasCode ? 'Code Ready for Analysis & Execution' : 'AURON AI Beginner Workspace'}
              </h3>
              <p className="text-[11px] text-graphite-muted mt-1 max-w-sm leading-relaxed">
                {hasCode
                  ? 'Use the Output Terminal below the editor to run the code in an isolated sandbox, or use the five buttons to detect bugs, optimize, and review.'
                  : 'Enter a programming prompt above to compare three generated solutions.'}
              </p>

              <div className="auron-empty-grid grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5 max-w-md w-full text-left">
                <div className="p-2.5 bg-graphite-deep border border-white/[0.06] rounded-lg">
                  <span className="text-xs font-medium text-graphite-text flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Run in Sandbox</span>
                  </span>
                  <p className="text-[11px] text-graphite-muted mt-0.5">Executes code securely with timeout protection.</p>
                </div>

                <div className="p-2.5 bg-graphite-deep border border-white/[0.06] rounded-lg">
                  <span className="text-xs font-medium text-graphite-text flex items-center gap-1.5">
                    <Bug className="w-3.5 h-3.5 text-rose-400" />
                    <span>Detect Bugs</span>
                  </span>
                  <p className="text-[11px] text-graphite-muted mt-0.5">Finds logic & syntax errors with line numbers.</p>
                </div>

                <div className="p-2.5 bg-graphite-deep border border-white/[0.06] rounded-lg">
                  <span className="text-xs font-medium text-graphite-text flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Fix Code</span>
                  </span>
                  <p className="text-[11px] text-graphite-muted mt-0.5">Side-by-side diff review & 1-click apply fix.</p>
                </div>

                <div className="p-2.5 bg-graphite-deep border border-white/[0.06] rounded-lg">
                  <span className="text-xs font-medium text-graphite-text flex items-center gap-1.5">
                    <GitCompare className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Review Code</span>
                  </span>
                  <p className="text-[11px] text-graphite-muted mt-0.5">Review quality, structure, and maintainability.</p>
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default CodeSandbox;
