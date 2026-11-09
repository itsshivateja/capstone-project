import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { aiService } from '../services/ai';
import { DocumentationArtifact } from '../types';
import { MonacoEditorWrapper } from '../components/common/MonacoEditorWrapper';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  FileText,
  Play,
  Download,
  Layers,
  BookOpen,
  Code2,
  Cpu,
  Eye,
  FileCode,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DOC_TYPES = [
  { id: 'readme', name: 'README.md', icon: BookOpen, desc: 'Project overview, installation & usage' },
  { id: 'architecture', name: 'Architecture Spec', icon: Cpu, desc: 'System design, services & layers' },
  { id: 'api', name: 'API Reference', icon: Code2, desc: 'Endpoints, schemas, headers & payloads' },
  { id: 'module', name: 'Module Documentation', icon: FileCode, desc: 'Function & class level breakdowns' },
];

export const Documentation: React.FC = () => {
  const { activeProject } = useProject();
  const [selectedType, setSelectedType] = useState('readme');
  const [generating, setGenerating] = useState(false);
  const [activeDoc, setActiveDoc] = useState<DocumentationArtifact | null>(null);
  const [existingDocs, setExistingDocs] = useState<DocumentationArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const navigate = useNavigate();

  const loadDocs = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await aiService.getDocumentation(activeProject.id);
      setExistingDocs(data);
      const match = data.find((d) => d.doc_type === selectedType);
      if (match) {
        setActiveDoc(match);
      } else if (data.length > 0) {
        setActiveDoc(data[0]);
        setSelectedType(data[0].doc_type);
      }
    } catch (err) {
      console.error('Failed to load documentation', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [activeProject, selectedType]);

  const handleGenerate = async () => {
    if (!activeProject || generating) return;
    setGenerating(true);
    try {
      const doc = await aiService.generateDocumentation(
        activeProject.id,
        selectedType,
        `${activeProject.name} ${selectedType.toUpperCase()}`
      );
      setActiveDoc(doc);
      setExistingDocs([doc, ...existingDocs]);
    } catch (err) {
      console.error('Failed to generate doc', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc.content_markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeDoc.doc_type}_${activeProject?.name.toLowerCase().replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!activeProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Layers className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-base font-semibold text-white">No Repository Selected</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">
          Select or upload an active repository to generate technical Markdown documentation.
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
      {/* Doc Type Selector Toolbar */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {DOC_TYPES.map((dt) => {
            const Icon = dt.icon;
            const isSelected = selectedType === dt.id;
            return (
              <button
                key={dt.id}
                onClick={() => {
                  setSelectedType(dt.id);
                  const found = existingDocs.find((d) => d.doc_type === dt.id);
                  setActiveDoc(found || null);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                  isSelected
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30 font-semibold'
                    : 'bg-dark-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{dt.name}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full sm:w-auto px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition flex items-center justify-center gap-2 shrink-0"
        >
          {generating ? <LoadingSpinner size="sm" /> : <Play className="w-3.5 h-3.5" />}
          <span>{generating ? 'Synthesizing...' : `Generate ${selectedType.toUpperCase()}`}</span>
        </button>
      </div>

      {/* Editor & Preview Container */}
      <div className="flex-1 bg-dark-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-300">
              {activeDoc ? activeDoc.title : `${selectedType}.md`}
            </span>
            {activeDoc && (
              <div className="flex items-center rounded-lg bg-dark-950 border border-slate-800 p-0.5 text-[11px] font-mono">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2 py-0.5 rounded transition ${
                    viewMode === 'preview' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rendered View
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-2 py-0.5 rounded transition ${
                    viewMode === 'raw' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Raw Markdown
                </button>
              </div>
            )}
          </div>

          {activeDoc && (
            <button
              onClick={handleDownload}
              className="px-3 py-1 rounded bg-dark-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Markdown</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden relative">
          {generating ? (
            <div className="h-full flex flex-col items-center justify-center">
              <LoadingSpinner size="lg" label="Extracting repository metadata & drafting technical document..." />
            </div>
          ) : activeDoc ? (
            viewMode === 'raw' ? (
              <MonacoEditorWrapper
                value={activeDoc.content_markdown}
                language="markdown"
                readOnly={true}
              />
            ) : (
              <div className="h-full overflow-y-auto p-8 max-w-4xl mx-auto prose prose-invert prose-sm leading-relaxed">
                <div className="whitespace-pre-wrap font-sans text-xs text-slate-200">
                  {activeDoc.content_markdown}
                </div>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 text-xs">
              <FileText className="w-10 h-10 text-slate-700 mb-2" />
              <p className="font-medium text-slate-300">No {selectedType.toUpperCase()} Generated</p>
              <p className="text-slate-500 mt-1 max-w-sm">
                Click "Generate {selectedType.toUpperCase()}" to build structured documentation directly from your repository's files.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
