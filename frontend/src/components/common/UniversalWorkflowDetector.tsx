import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code2,
  FolderKanban,
  MessageSquareCode,
  Bot,
  Upload,
  ArrowRight,
  Github,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export type DetectedWorkflow = 'project_zip' | 'project_github' | 'code' | 'chat' | 'agent';

export const UniversalWorkflowDetector: React.FC = () => {
  const [inputVal, setInputVal] = useState('');
  const [detectedMode, setDetectedMode] = useState<DetectedWorkflow | null>(null);
  const [detectionReason, setDetectionReason] = useState<string>('');
  const [detectedLang, setDetectedLang] = useState<string>('text');
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setDetectedMode(null);
      setDetectionReason('');
      return;
    }

    // 1. Detect GitHub repository URL
    const githubRegex = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)(?:\/.*)?$/;
    if (githubRegex.test(trimmed)) {
      setDetectedMode('project_github');
      setDetectionReason('GitHub repository URL detected → Project Mode');
      return;
    }

    // 2. Detect Code snippet
    const codeKeywords = [
      'def ', 'function ', 'class ', 'import ', 'from ', 'export ', 'const ', 'let ', 'var ',
      'public class', 'fn ', 'func ', 'package ', '#include', 'SELECT ', 'INSERT ', 'UPDATE ',
      'CREATE TABLE', 'return ', 'if __name__ ==', '<template>', '<script>', '<div'
    ];
    const isCode = codeKeywords.some((kw) => trimmed.includes(kw)) ||
      (trimmed.includes('{') && trimmed.includes('}')) ||
      (trimmed.includes('(') && trimmed.includes(');')) ||
      (trimmed.includes('def ') && trimmed.includes(':'));

    if (isCode) {
      setDetectedMode('code');
      let lang = 'python';
      if (trimmed.includes('func ') || trimmed.includes('package ')) lang = 'go';
      else if (trimmed.includes('fn ') || trimmed.includes('impl ')) lang = 'rust';
      else if (trimmed.includes('public class ') || trimmed.includes('System.out')) lang = 'java';
      else if (trimmed.includes('#include')) lang = 'cpp';
      else if (trimmed.includes('interface ') || trimmed.includes(': string') || trimmed.includes(': number')) lang = 'typescript';
      else if (trimmed.includes('const ') || trimmed.includes('let ') || trimmed.includes('function ')) lang = 'javascript';
      else if (/SELECT|FROM|WHERE|INSERT/i.test(trimmed)) lang = 'sql';
      setDetectedLang(lang);
      setDetectionReason(`Source snippet (${lang}) detected → Code Mode`);
      return;
    }

    // 3. Detect Code Generation Task vs General Chat Query
    const codeGenKeywords = ['generate', 'create', 'build', 'write', 'function', 'class', 'implement', 'script', 'fastapi', 'rest api', 'sql query', 'fix code', 'unit test'];
    const isCodeGenTask = codeGenKeywords.some((kw) => trimmed.toLowerCase().includes(kw));

    if (isCodeGenTask) {
      setDetectedMode('code');
      setDetectionReason('Code generation task detected → Code Mode');
    } else {
      setDetectedMode('chat');
      setDetectionReason('Natural language inquiry detected → AI Chat Mode');
    }
  }, [inputVal]);

  const handleLaunch = () => {
    if (!detectedMode) return;

    if (detectedMode === 'project_github') {
      sessionStorage.setItem('auron_ai_github_import_url', inputVal.trim());
      navigate('/projects');
    } else if (detectedMode === 'code') {
      const trimmed = inputVal.trim();
      const looksLikeSourceCode =
        trimmed.includes('{') ||
        trimmed.includes('}') ||
        trimmed.includes(';') ||
        trimmed.includes('def ') ||
        trimmed.includes('class ') ||
        trimmed.includes('import ') ||
        trimmed.includes('\n');

      if (looksLikeSourceCode && !trimmed.toLowerCase().startsWith('generate ') && !trimmed.toLowerCase().startsWith('create ') && !trimmed.toLowerCase().startsWith('write ')) {
        sessionStorage.setItem('auron_ai_pasted_code', inputVal);
        sessionStorage.setItem('auron_ai_pasted_lang', detectedLang);
      } else {
        sessionStorage.setItem('auron_ai_generate_prompt', trimmed);
      }
      navigate('/sandbox');
    } else {
      sessionStorage.setItem('auron_ai_chat_prompt', inputVal.trim());
      navigate('/chat');
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    handleFile(files[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleFile(files[0]);
  };

  const handleFile = (file: File) => {
    if (file.name.toLowerCase().endsWith('.zip')) {
      sessionStorage.setItem('auron_ai_open_zip_upload', 'true');
      navigate('/projects');
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || '';
        sessionStorage.setItem('auron_ai_pasted_code', content);
        sessionStorage.setItem('auron_ai_pasted_filename', file.name);

        const ext = file.name.split('.').pop()?.toLowerCase();
        const extToLang: Record<string, string> = {
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
        };
        const lang = (ext && extToLang[ext]) || 'python';
        sessionStorage.setItem('auron_ai_pasted_lang', lang);
        navigate('/sandbox');
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-graphite-muted" />
          <h3 className="text-xs font-medium text-graphite-text">Intake & routing</h3>
          <span className="text-[10px] text-graphite-muted">
            — Paste code, repository URL, or drop files to route automatically
          </span>
        </div>

        {detectedMode && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-graphite-raised text-graphite-secondary text-[11px] font-mono border border-white/[0.08] self-start md:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="capitalize">{detectedMode.replace('_', ' ')}</span>
          </div>
        )}
      </div>

      {/* Input container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        className={`rounded-lg border transition ${
          isDragging
            ? 'border-accent bg-accent-subtle'
            : 'border-white/[0.08] bg-graphite-deep focus-within:border-white/[0.2]'
        }`}
      >
        <textarea
          rows={3}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Paste source code, GitHub repository link, or an engineering instruction..."
          className="w-full p-3 bg-transparent text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none resize-none font-mono"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 border-t border-white/[0.06] bg-graphite-deep text-xs">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer px-2.5 py-1 rounded bg-graphite-raised hover:bg-graphite-card text-graphite-secondary hover:text-graphite-text text-[11px] border border-white/[0.08] flex items-center gap-1.5 transition">
              <Upload className="w-3 h-3 text-graphite-muted" />
              <span>Upload file or ZIP</span>
              <input type="file" onChange={handleFileInput} className="hidden" />
            </label>
            {detectionReason && (
              <span className="text-[11px] text-graphite-muted truncate max-w-md hidden md:inline">
                {detectionReason}
              </span>
            )}
          </div>

          <button
            onClick={handleLaunch}
            disabled={!detectedMode}
            className="px-3.5 py-1 bg-graphite-text hover:bg-white text-graphite-deep font-medium rounded text-xs transition flex items-center justify-center gap-1.5 self-end sm:self-auto disabled:opacity-30 disabled:pointer-events-none"
          >
            <span>
              {detectedMode === 'project_github'
                ? 'Open Project Mode'
                : detectedMode === 'code'
                ? 'Open Code Mode'
                : detectedMode === 'chat'
                ? 'Open AI Chat'
                : 'Route'}
            </span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Quick intake samples */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px] text-graphite-muted">
        <span className="font-mono text-[10px]">Sample intake:</span>
        <button
          onClick={() =>
            setInputVal(`def compute_discount(price, discount):\n    # Bug: Division by zero when discount is 0\n    return price / discount`)
          }
          className="px-2 py-0.5 rounded bg-graphite-raised hover:bg-white/[0.08] text-graphite-secondary hover:text-graphite-text border border-white/[0.06] transition"
        >
          Python defect
        </button>
        <button
          onClick={() => setInputVal('https://github.com/tiangolo/fastapi')}
          className="px-2 py-0.5 rounded bg-graphite-raised hover:bg-white/[0.08] text-graphite-secondary hover:text-graphite-text border border-white/[0.06] transition flex items-center gap-1"
        >
          <Github className="w-3 h-3 text-graphite-muted" />
          <span>FastAPI repo</span>
        </button>
        <button
          onClick={() =>
            setInputVal('Audit security vulnerabilities, SQL injection, and hardcoded secrets across all modules')
          }
          className="px-2 py-0.5 rounded bg-graphite-raised hover:bg-white/[0.08] text-graphite-secondary hover:text-graphite-text border border-white/[0.06] transition"
        >
          Security audit task
        </button>
        <button
          onClick={() => setInputVal('How does RAG retrieval combine AST chunking with Qdrant vector search?')}
          className="px-2 py-0.5 rounded bg-graphite-raised hover:bg-white/[0.08] text-graphite-secondary hover:text-graphite-text border border-white/[0.06] transition"
        >
          Architecture query
        </button>
      </div>
    </div>
  );
};
