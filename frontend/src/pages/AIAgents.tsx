import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { aiService, AgentRosterItem, AgentWorkflowResult } from '../services/ai';
import {
  Bot,
  Play,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Code2,
  FileText,
  TestTubes,
  ShieldAlert,
  Sparkles,
  FileCheck2,
  Copy,
  Check,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MonacoEditorWrapper } from '../components/common/MonacoEditorWrapper';
import { useNavigate } from 'react-router-dom';

const AGENT_ICON_MAP: Record<string, any> = {
  supervisor: Bot,
  repo_analyst: Layers,
  explainer: Cpu,
  bug_detector: ShieldAlert,
  code_gen: Sparkles,
  code_reviewer: FileCheck2,
  test_gen: TestTubes,
  doc_gen: FileText,
};

export const AIAgents: React.FC = () => {
  const { activeProject } = useProject();
  const [roster, setRoster] = useState<AgentRosterItem[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [workflowResult, setWorkflowResult] = useState<AgentWorkflowResult | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const data = await aiService.getAgentRoster();
        setRoster(data);
      } catch (err) {
        console.error('Failed to load agent roster', err);
      }
    };
    fetchRoster();
  }, []);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim() || !activeProject || executing) return;

    setExecuting(true);
    setWorkflowResult(null);

    try {
      const res = await aiService.executeAgentWorkflow(activeProject.id, taskInput.trim());
      setWorkflowResult(res);
    } catch (err) {
      console.error('Agent workflow execution failed', err);
    } finally {
      setExecuting(false);
    }
  };

  const copyOutput = () => {
    if (workflowResult) {
      navigator.clipboard.writeText(JSON.stringify(workflowResult.execution_result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!activeProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Bot className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-base font-semibold text-white">No Repository Selected</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">
          Select or upload an active repository to orchestrate multi-agent LangGraph workflows.
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-mono font-medium border border-purple-500/20 mb-2">
            <Bot className="w-3.5 h-3.5" />
            <span>LangGraph Multi-Agent Architecture</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">AI Autonomous Engineering Agents</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Orchestrate specialized AI agents coordinated by an intent supervisor with shared AST context in{' '}
            <span className="text-slate-200 font-mono">{activeProject.name}</span>.
          </p>
        </div>
      </div>

      {/* Task Prompt Bar */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-4">
        <form onSubmit={handleExecute} className="space-y-3">
          <label className="block text-xs font-medium text-slate-300">
            Dispatch Task to Supervisor Agent (e.g. "Audit security flaws in orders.py" or "Generate an API router with unit tests")
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="e.g. Audit potential SQL injection and bare excepts in repository modules"
              disabled={executing}
              className="flex-1 px-4 py-2.5 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition"
            />
            <button
              type="submit"
              disabled={!taskInput.trim() || executing}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition flex items-center gap-2 shrink-0"
            >
              {executing ? <LoadingSpinner size="sm" /> : <Play className="w-3.5 h-3.5" />}
              <span>{executing ? 'Orchestrating...' : 'Execute Workflow'}</span>
            </button>
          </div>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
          <span className="text-slate-500 font-mono">Suggestions:</span>
          {[
            'Audit security vulnerabilities and hardcoded secrets',
            'Generate a new REST API router for customer orders',
            'Perform a comprehensive architectural code review',
            'Generate pytest unit tests with edge conditions',
            'Synthesize complete README and API documentation',
          ].map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => setTaskInput(sug)}
              className="px-2.5 py-1 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Execution Graph & Trace Results */}
      {executing && (
        <div className="bg-dark-900 border border-brand-500/30 rounded-xl p-8 flex flex-col items-center justify-center space-y-3">
          <LoadingSpinner size="lg" label="Supervisor Agent executing LangGraph workflow..." />
          <p className="text-xs text-slate-400 font-mono">
            Routing intent • Retrieving vector context • Coordinating specialized agents
          </p>
        </div>
      )}

      {workflowResult && (
        <div className="bg-dark-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-semibold text-white">Execution Graph Complete</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 font-mono border border-brand-500/30">
                Routed to: {workflowResult.primary_agent}
              </span>
            </div>

            <button
              onClick={copyOutput}
              className="px-2.5 py-1 rounded bg-dark-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Result'}</span>
            </button>
          </div>

          {/* Workflow Step Trace Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {workflowResult.traces.map((trace) => (
              <div
                key={trace.step}
                className="p-3 bg-dark-950 border border-slate-800 rounded-lg space-y-1 relative"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono text-brand-400 font-semibold">Step {trace.step}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xs font-semibold text-slate-200">{trace.agent}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">{trace.message}</p>
              </div>
            ))}
          </div>

          {/* Result Output Preview */}
          <div className="mt-4 p-4 bg-dark-950 border border-slate-800 rounded-lg">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Structured Output:
            </p>
            <pre className="text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-96">
              {typeof workflowResult.execution_result === 'string'
                ? workflowResult.execution_result
                : JSON.stringify(workflowResult.execution_result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 8-Agent Roster Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-brand-400" />
          <span>Registered Autonomous Agent Roster ({roster.length})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {roster.map((agent) => {
            const Icon = AGENT_ICON_MAP[agent.id] || Bot;
            return (
              <div
                key={agent.id}
                className="bg-dark-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-brand-400 mb-2.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white">{agent.name}</h3>
                  <span className="text-[10px] text-brand-400/90 font-mono block mt-0.5">
                    {agent.role}
                  </span>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{agent.description}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Ready for dispatch</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

