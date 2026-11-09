import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { aiService } from '../services/ai';
import { CodeReview as CodeReviewType } from '../types';
import {
  FileCheck2,
  Play,
  Award,
  ShieldCheck,
  Zap,
  Code,
  Layers,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import { useNavigate } from 'react-router-dom';

export const CodeReview: React.FC = () => {
  const { activeProject } = useProject();
  const [reviews, setReviews] = useState<CodeReviewType[]>([]);
  const [activeReview, setActiveReview] = useState<CodeReviewType | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchReviews = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await aiService.getReviews(activeProject.id);
      setReviews(data);
      if (data.length > 0) {
        setActiveReview(data[0]);
      }
    } catch (err) {
      console.error('Failed to load code reviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [activeProject]);

  const handleRunReview = async () => {
    if (!activeProject || reviewing) return;
    setReviewing(true);
    try {
      const newReview = await aiService.reviewCode(activeProject.id);
      setReviews([newReview, ...reviews]);
      setActiveReview(newReview);
    } catch (err) {
      console.error('Code review failed', err);
    } finally {
      setReviewing(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Layers className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-base font-semibold text-white">No Repository Selected</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">
          Select or upload an active repository to trigger comprehensive code quality and architectural reviews.
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
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <span>AI Code & Architecture Review</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated multi-dimensional evaluation covering maintainability, security, naming conventions, redundancy, and efficiency.
          </p>
        </div>

        <button
          onClick={handleRunReview}
          disabled={reviewing}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 self-start"
        >
          {reviewing ? <LoadingSpinner size="sm" /> : <Play className="w-3.5 h-3.5" />}
          <span>{reviewing ? 'Analyzing Code Quality...' : 'Run New Architecture Review'}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" label="Loading reviews..." />
        </div>
      ) : !activeReview ? (
        <div className="bg-dark-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto">
          <FileCheck2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Reviews Yet</h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Trigger your first architectural review to get a scored report on code maintainability and structure.
          </p>
          <button
            onClick={handleRunReview}
            disabled={reviewing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-500/20 transition inline-flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Start Review</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Score Header Card */}
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
              {/* Overall Score */}
              <div className="flex flex-col items-center justify-center p-4 bg-dark-950/80 rounded-xl border border-slate-800 text-center">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Overall Quality Score
                </span>
                <div className="text-4xl font-extrabold text-emerald-400 font-mono tracking-tight">
                  {activeReview.overall_score.toFixed(1)}
                  <span className="text-sm font-normal text-slate-500 ml-1">/10</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Weighted architectural evaluation</p>
              </div>

              {/* Dimension Metrics */}
              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-dark-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-brand-400" />
                    <span>Maintainability</span>
                  </div>
                  <p className="text-lg font-bold text-white font-mono">
                    {activeReview.metrics?.maintainability || 8.5}/10
                  </p>
                </div>

                <div className="p-3 bg-dark-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                    <span>Security</span>
                  </div>
                  <p className="text-lg font-bold text-white font-mono">
                    {activeReview.metrics?.security || 8.0}/10
                  </p>
                </div>

                <div className="p-3 bg-dark-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Performance</span>
                  </div>
                  <p className="text-lg font-bold text-white font-mono">
                    {activeReview.metrics?.performance || 8.2}/10
                  </p>
                </div>

                <div className="p-3 bg-dark-950 border border-slate-800 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Code className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Code Style</span>
                  </div>
                  <p className="text-lg font-bold text-white font-mono">
                    {activeReview.metrics?.code_style || 8.8}/10
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-5 pt-4 border-t border-slate-800/80">
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-emerald-400">Executive Summary:</strong> {activeReview.summary}
              </p>
            </div>
          </div>

          {/* Detailed Findings & Recommendations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Findings */}
            <div className="bg-dark-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-brand-400" />
                <span>Quality Observations ({activeReview.findings?.length || 0})</span>
              </h2>

              <div className="space-y-3">
                {activeReview.findings?.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-dark-950 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">{item.category}</span>
                      <StatusBadge status={item.severity} />
                    </div>
                    <p className="text-xs text-slate-300">{item.message}</p>
                    {item.suggestion && (
                      <p className="text-[11px] text-brand-400/90 font-mono pt-1">
                        ↳ Suggestion: {item.suggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-dark-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Actionable Recommendations</span>
              </h2>

              <div className="space-y-3">
                {activeReview.recommendations?.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-dark-950 border border-slate-800 rounded-lg flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center text-xs font-mono shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
