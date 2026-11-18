import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Settings as SettingsIcon,
  Key,
  Database,
  Cpu,
  ShieldCheck,
  Check,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Settings: React.FC = () => {
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverMsg, setServerMsg] = useState('');
  const [activeProvider, setActiveProvider] = useState('autonomous_local');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/settings');
        setActiveProvider(res.data.active_provider);
      } catch (e) {
        console.error('Failed to load settings status', e);
      }
    };
    fetchStatus();
  }, []);

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setServerMsg('');
    try {
      const res = await api.post('/settings/keys', {
        groq_api_key: groqKey || undefined,
        gemini_api_key: geminiKey || undefined,
        openai_api_key: openaiKey || undefined,
      });
      setSaved(true);
      setServerMsg(res.data.message || 'Settings saved successfully');
      setActiveProvider(res.data.active_provider);
      setTimeout(() => setSaved(false), 5000);
    } catch (err: any) {
      setServerMsg(err.response?.data?.detail || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-medium text-graphite-text tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-graphite-muted" />
          <span>System Settings</span>
        </h1>
        <p className="text-xs text-graphite-muted mt-0.5">
          Configure external LLM providers, vector indexing parameters, and inspection telemetry.
        </p>
      </div>

      {/* LLM Provider Keys Card */}
      <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
          <Key className="w-4 h-4 text-graphite-muted" />
          <h2 className="text-xs font-medium text-graphite-text">LLM Provider Configurations</h2>
        </div>

        <p className="text-xs text-graphite-muted leading-relaxed">
          AURON AI includes an intelligent built-in semantic engine that works out-of-the-box without external keys. To connect commercial high-volume LLM APIs, supply your API keys below or in the backend <code className="text-graphite-text font-mono bg-graphite-raised px-1 py-0.2 rounded text-[11px]">.env</code> file.
        </p>

        <form onSubmit={handleSaveKeys} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs text-graphite-muted mb-1">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 bg-graphite-deep border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-graphite-muted mb-1">
              OpenAI / Compatible API Key
            </label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-graphite-deep border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-graphite-muted mb-1">
              Groq API Key (High Speed LLaMA-3.3)
            </label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full px-3 py-2 bg-graphite-deep border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20 font-mono"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              {serverMsg && (
                <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{serverMsg}</span>
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-graphite-text hover:bg-white disabled:opacity-50 text-graphite-deep rounded-md text-xs font-medium transition flex items-center gap-2 self-end sm:self-auto"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Zap className="w-3.5 h-3.5" />}
              <span>{saving ? 'Testing & Saving...' : 'Save & Activate Provider'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Infrastructure Telemetry Card */}
      <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
          <Database className="w-4 h-4 text-graphite-muted" />
          <h2 className="text-xs font-medium text-graphite-text">System Architecture & Infrastructure</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-graphite-deep border border-white/[0.06] rounded-md space-y-1">
            <span className="text-graphite-muted font-medium text-[11px]">Relational Database Engine</span>
            <p className="text-graphite-text font-mono text-xs">SQLAlchemy + SQLite / PostgreSQL</p>
            <p className="text-[11px] text-graphite-muted">
              Stores users, projects, file trees, conversations, and audit reports.
            </p>
          </div>

          <div className="p-3 bg-graphite-deep border border-white/[0.06] rounded-md space-y-1">
            <span className="text-graphite-muted font-medium text-[11px]">Vector Database</span>
            <p className="text-graphite-text font-mono text-xs">Qdrant Vector Database (Cosine 384-dim)</p>
            <p className="text-[11px] text-graphite-muted">
              Handles dense semantic embeddings, code chunking, and similarity ranking.
            </p>
          </div>

          <div className="p-3 bg-graphite-deep border border-white/[0.06] rounded-md space-y-1">
            <span className="text-graphite-muted font-medium text-[11px]">API Server</span>
            <p className="text-graphite-text font-mono text-xs">FastAPI (Python 3.15) with Pydantic v2</p>
            <p className="text-[11px] text-graphite-muted">
              JWT authentication, Zip-Slip security filters, AST code parser.
            </p>
          </div>

          <div className="p-3 bg-graphite-deep border border-white/[0.06] rounded-md space-y-1">
            <span className="text-graphite-muted font-medium text-[11px]">Frontend Client</span>
            <p className="text-graphite-text font-mono text-xs">React 18 + Vite + TypeScript + Monaco Editor</p>
            <p className="text-[11px] text-graphite-muted">
              Clean matte graphite black UI, dynamic diff views, real-time repository navigation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

