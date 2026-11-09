import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  Database,
  Cpu,
  ShieldCheck,
  Check,
  ExternalLink,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('devmind_gemini_key') || '');
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('devmind_openai_key') || '');
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('devmind_groq_key') || '');
  const [saved, setSaved] = useState(false);

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('devmind_gemini_key', geminiKey.trim());
    localStorage.setItem('devmind_openai_key', openaiKey.trim());
    localStorage.setItem('devmind_groq_key', groqKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-brand-400" />
          <span>DevMind AI System Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure external LLM providers, vector indexing parameters, and inspection telemetry.
        </p>
      </div>

      {/* LLM Provider Keys Card */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Key className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-white">LLM Provider Configurations</h2>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          DevMind includes an intelligent built-in semantic engine that works out-of-the-box without external keys. To connect commercial high-volume LLM APIs, supply your API keys below or in the backend <code className="text-brand-400 font-mono">.env</code> file.
        </p>

        <form onSubmit={handleSaveKeys} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              OpenAI / Compatible API Key
            </label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Groq API Key (High Speed LLaMA-3.3)
            </label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {saved ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                <Check className="w-3.5 h-3.5" />
                <span>Settings persisted successfully</span>
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition flex items-center gap-1.5"
            >
              <span>Save Configurations</span>
            </button>
          </div>
        </form>
      </div>

      {/* Infrastructure Telemetry Card */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Database className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">System Architecture & Infrastructure</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-dark-950 border border-slate-800 rounded-lg space-y-1">
            <span className="text-slate-400 font-medium">Relational Database Engine</span>
            <p className="text-slate-200 font-mono">SQLAlchemy + PostgreSQL / SQLite</p>
            <p className="text-[11px] text-slate-500">
              Stores users, projects, file trees, conversations, and audit reports.
            </p>
          </div>

          <div className="p-3.5 bg-dark-950 border border-slate-800 rounded-lg space-y-1">
            <span className="text-slate-400 font-medium">Vector Database</span>
            <p className="text-slate-200 font-mono">Qdrant Vector Database (Cosine 384-dim)</p>
            <p className="text-[11px] text-slate-500">
              Handles dense semantic embeddings, code chunking, and similarity ranking.
            </p>
          </div>

          <div className="p-3.5 bg-dark-950 border border-slate-800 rounded-lg space-y-1">
            <span className="text-slate-400 font-medium">API Server</span>
            <p className="text-slate-200 font-mono">FastAPI (Python 3.15) with Pydantic v2</p>
            <p className="text-[11px] text-slate-500">
              JWT authentication, Zip-Slip security filters, AST code parser.
            </p>
          </div>

          <div className="p-3.5 bg-dark-950 border border-slate-800 rounded-lg space-y-1">
            <span className="text-slate-400 font-medium">Frontend Client</span>
            <p className="text-slate-200 font-mono">React 18 + Vite + TypeScript + Monaco Editor</p>
            <p className="text-[11px] text-slate-500">
              Professional dark UI, dynamic diff views, real-time repository navigation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

