import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useProject } from '../context/ProjectContext';
import { projectService } from '../services/projects';
import {
  Project,
  TreeNode,
  ProjectFileDetail,
  RepositoryHealthScoreResponse,
  CategoryScore,
  IssueItem,
} from '../types';
import {
  FolderKanban,
  Plus,
  Upload,
  Trash2,
  FolderTree,
  FileCode,
  AlertCircle,
  CheckCircle2,
  X,
  Github,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Layers,
  Code2,
  FileText,
  TestTubes,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Copy,
  Check,
  Search,
  ExternalLink,
  ArrowRight,
  Zap,
  RefreshCw,
  Clock,
  KeyRound,
  Bot,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MonacoEditorWrapper } from '../components/common/MonacoEditorWrapper';

type ProjectTab = 'health' | 'explorer' | 'manage';

export const Projects: React.FC = () => {
  const {
    projects,
    activeProject,
    setActiveProject,
    createProject,
    deleteProject,
    uploadZip,
    isLoadingProjects,
    loadProjects,
  } = useProject();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as ProjectTab) || (activeProject ? 'health' : 'manage');
  const [activeTab, setActiveTab] = useState<ProjectTab>(initialTab);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [isImportingGithub, setIsImportingGithub] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStage, setUploadStage] = useState<string>('Uploading ZIP archive...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);

  // Health Score state
  const [healthScore, setHealthScore] = useState<RepositoryHealthScoreResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // AST File Tree & Explorer state
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [treeSearch, setTreeSearch] = useState('');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileDetail, setFileDetail] = useState<ProjectFileDetail | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState(false);

  const navigate = useNavigate();

  // Check for auto-import URL from Universal Workflow Detector
  useEffect(() => {
    const autoGithub = sessionStorage.getItem('auron_ai_github_import_url');
    if (autoGithub) {
      setGithubUrl(autoGithub);
      setShowGithubModal(true);
      setActiveTab('manage');
      sessionStorage.removeItem('auron_ai_github_import_url');
    }

    const openZip = sessionStorage.getItem('auron_ai_open_zip_upload');
    if (openZip) {
      if (activeProject) {
        setShowUploadModal(activeProject.id);
      } else {
        setShowCreateModal(true);
      }
      setActiveTab('manage');
      sessionStorage.removeItem('auron_ai_open_zip_upload');
    }
  }, [activeProject]);

  // Sync tab with URL search parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') as ProjectTab;
    if (tabParam && ['health', 'explorer', 'manage'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const fetchHealthScore = async (projectId: string) => {
    setLoadingHealth(true);
    try {
      const res = await projectService.getHealthScore(projectId);
      setHealthScore(res);
    } catch (err) {
      console.error('Failed to load health score', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  // Load Health Score when active project changes or tab switches to health
  useEffect(() => {
    if (!activeProject) {
      setHealthScore(null);
      return;
    }
    fetchHealthScore(activeProject.id);
  }, [activeProject]);

  // Load AST File Tree when active project changes
  useEffect(() => {
    if (!activeProject) {
      setTreeData([]);
      return;
    }

    const fetchTree = async () => {
      setLoadingTree(true);
      try {
        const nodes = await projectService.getRepositoryTree(activeProject.id);
        setTreeData(nodes);

        const initialExpanded: Record<string, boolean> = {};
        nodes.forEach((n) => {
          if (n.is_dir) initialExpanded[n.path] = true;
        });
        setExpandedFolders(initialExpanded);

        const findFirstFile = (list: TreeNode[]): string | null => {
          for (const item of list) {
            if (!item.is_dir) return item.path;
            if (item.children) {
              const res = findFirstFile(item.children);
              if (res) return res;
            }
          }
          return null;
        };
        const first = findFirstFile(nodes);
        if (first) setSelectedFilePath(first);
      } catch (err) {
        console.error('Failed to load file tree', err);
      } finally {
        setLoadingTree(false);
      }
    };

    fetchTree();
  }, [activeProject]);

  // Load selected file detail in explorer
  useEffect(() => {
    if (!activeProject || !selectedFilePath) {
      setFileDetail(null);
      return;
    }

    const fetchFile = async () => {
      setLoadingFile(true);
      try {
        const detail = await projectService.getFileContent(activeProject.id, selectedFilePath);
        setFileDetail(detail);
      } catch (err) {
        console.error('Failed to load file content', err);
      } finally {
        setLoadingFile(false);
      }
    };

    fetchFile();
  }, [activeProject, selectedFilePath]);

  const handleSelectFile = (file: File) => {
    setErrorMsg(null);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMsg('Invalid file format: Please select a valid .zip archive.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg(`File exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleGithubImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    setIsImportingGithub(true);
    setErrorMsg(null);
    try {
      const match = githubUrl.trim().match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git|\/)?$/);
      const repoName = match ? match[2] : 'GitHub Repo';
      const proj = await createProject(repoName, `Imported from ${githubUrl.trim()}`);
      await projectService.importGithub(proj.id, githubUrl.trim(), githubToken.trim() || undefined);
      await loadProjects();
      setActiveProject(proj);
      setShowGithubModal(false);
      setGithubUrl('');
      setGithubToken('');
      setActiveTab('health');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to import from GitHub. If this is a private repo, provide an access token.');
    } finally {
      setIsImportingGithub(false);
    }
  };

  const handleCreateDemo = async () => {
    setIsCreatingDemo(true);
    setErrorMsg(null);
    try {
      const demo = await projectService.createSampleDemo();
      await loadProjects();
      setActiveProject(demo);
      setActiveTab('health');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to generate demo repository');
    } finally {
      setIsCreatingDemo(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const created = await createProject(newProjectName.trim(), newProjectDesc.trim());
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setShowUploadModal(created.id);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create project');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !showUploadModal) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStage('Uploading ZIP archive...');
    setErrorMsg(null);

    try {
      const updated = await uploadZip(showUploadModal, selectedFile, (event: any) => {
        if (event.total) {
          const percent = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(percent);
          if (percent === 100) {
            setUploadStage('Parsing AST, chunking code & indexing Qdrant vectors...');
          }
        }
      });
      setShowUploadModal(null);
      setSelectedFile(null);
      setActiveProject(updated);
      setActiveTab('health');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Upload or indexing failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendToRemediation = () => {
    if (!activeProject || !healthScore) return;
    const targets = [
      ...(healthScore.critical_issues || []).map((i) => i.file_path).filter(Boolean),
      ...(healthScore.high_issues || []).map((i) => i.file_path).filter(Boolean),
    ];
    const targetStr = targets.length > 0 ? `Target files: ${Array.from(new Set(targets)).join(', ')}. ` : '';
    const task = `Analyze repository '${activeProject.name}', remediate critical issues, generate unit test suites, and review proposed changes. ${targetStr}`;
    sessionStorage.setItem('auron_ai_chat_prompt', task);
    navigate('/chat');
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const copyFileToClipboard = () => {
    if (fileDetail?.content) {
      navigator.clipboard.writeText(fileDetail.content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Render tree node recursive component
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders[node.path];
    const isSelected = selectedFilePath === node.path;
    const matchesSearch = !treeSearch || node.name.toLowerCase().includes(treeSearch.toLowerCase());

    if (!matchesSearch && !node.is_dir) return null;

    return (
      <div key={node.path} className="select-none">
        <div
          onClick={() => {
            if (node.is_dir) toggleFolder(node.path);
            else setSelectedFilePath(node.path);
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`flex items-center gap-1.5 py-1 px-2 rounded-md text-xs cursor-pointer transition ${
            isSelected
              ? 'bg-graphite-raised text-graphite-text font-medium border border-white/[0.08]'
              : 'text-graphite-secondary hover:text-graphite-text hover:bg-white/[0.04]'
          }`}
        >
          {node.is_dir ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-graphite-muted shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-graphite-muted shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-graphite-text shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-graphite-muted shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-3.5 shrink-0" />
              <FileCode className="w-4 h-4 text-graphite-muted shrink-0" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>

        {node.is_dir && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 text-xs text-graphite-text">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-graphite-muted">Full repository intelligence</span>
          </div>
          <h1 className="text-lg font-medium text-graphite-text tracking-tight">Repository workspace</h1>
          <p className="text-xs text-graphite-muted mt-0.5">
            AST symbol mapping, Qdrant vector indexing, and 6-category weighted health scoring.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCreateDemo}
            disabled={isCreatingDemo}
            className="px-3 py-1.5 bg-graphite-card hover:bg-graphite-raised text-graphite-text border border-white/[0.08] rounded-md text-xs font-medium transition flex items-center gap-1.5"
          >
            {isCreatingDemo ? <LoadingSpinner size="sm" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
            <span>Sample API</span>
          </button>
          <button
            onClick={() => setShowGithubModal(true)}
            className="px-3 py-1.5 bg-graphite-card hover:bg-graphite-raised text-graphite-text border border-white/[0.08] rounded-md text-xs font-medium transition flex items-center gap-1.5"
          >
            <Github className="w-3.5 h-3.5 text-graphite-muted" />
            <span>Connect GitHub</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 bg-graphite-text hover:bg-white text-graphite-deep rounded-md text-xs font-medium transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload ZIP</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-center justify-between text-xs text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab('health');
              setSearchParams({ tab: 'health' });
            }}
            className={`px-3 py-1.5 rounded-md text-xs transition flex items-center gap-1.5 ${
              activeTab === 'health'
                ? 'bg-graphite-raised text-graphite-text font-medium border border-white/[0.08]'
                : 'text-graphite-secondary hover:text-graphite-text hover:bg-graphite-raised/50 border border-transparent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-graphite-muted" />
            <span>Health Score (0–100)</span>
            {healthScore && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-graphite-deep text-emerald-400 border border-emerald-500/20">
                {healthScore.overall_score}/100 ({healthScore.grade})
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('explorer');
              setSearchParams({ tab: 'explorer' });
            }}
            className={`px-3 py-1.5 rounded-md text-xs transition flex items-center gap-1.5 ${
              activeTab === 'explorer'
                ? 'bg-graphite-raised text-graphite-text font-medium border border-white/[0.08]'
                : 'text-graphite-secondary hover:text-graphite-text hover:bg-graphite-raised/50 border border-transparent'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-graphite-muted" />
            <span>AST File Tree & Code</span>
            {activeProject && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-graphite-deep text-graphite-muted border border-white/[0.06]">
                {activeProject.total_files} files
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('manage');
              setSearchParams({ tab: 'manage' });
            }}
            className={`px-3 py-1.5 rounded-md text-xs transition flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'bg-graphite-raised text-graphite-text font-medium border border-white/[0.08]'
                : 'text-graphite-secondary hover:text-graphite-text hover:bg-graphite-raised/50 border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-graphite-muted" />
            <span>All Repositories ({projects.length})</span>
          </button>
        </div>

        {activeProject && (
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-graphite-muted">
            <span>Active:</span>
            <span className="text-graphite-text font-medium">{activeProject.name}</span>
            <span>({activeProject.primary_language})</span>
          </div>
        )}
      </div>

      {/* TAB 1: REPOSITORY HEALTH SCORE (0-100) */}
      {activeTab === 'health' && (
        <div className="space-y-5">
          {!activeProject ? (
            <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-8 text-center max-w-lg mx-auto">
              <FolderKanban className="w-8 h-8 text-graphite-muted mx-auto mb-2" />
              <h3 className="text-xs font-medium text-graphite-text">No active repository selected</h3>
              <p className="text-[11px] text-graphite-muted mt-1 mb-4">
                Select or upload a repository to compute its comprehensive 0–100 Health Score across 6 weighted categories.
              </p>
              <button
                onClick={() => setActiveTab('manage')}
                className="px-3.5 py-1.5 bg-graphite-text hover:bg-white text-graphite-deep text-xs font-medium rounded-md transition"
              >
                Choose repository
              </button>
            </div>
          ) : loadingHealth ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="md" label="Computing AST and Repository Health Score (0–100)..." />
            </div>
          ) : healthScore ? (
            <>
              {/* Executive Summary Card */}
              <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-5 flex flex-col lg:flex-row items-center justify-between gap-5">
                <div className="flex items-center gap-5">
                  {/* Circular Score Badge */}
                  <div className="relative w-24 h-24 rounded-full bg-graphite-deep border-2 border-white/[0.12] flex flex-col items-center justify-center shrink-0">
                    <span className="text-3xl font-medium text-graphite-text tracking-tight font-mono">
                      {healthScore.overall_score}
                    </span>
                    <span className="text-[9px] text-graphite-muted uppercase font-mono">Out of 100</span>
                    <div className="absolute -top-1.5 -right-1.5 px-2 py-0.2 rounded-full bg-emerald-500 text-graphite-deep font-bold text-[10px] font-mono">
                      Grade {healthScore.grade}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-graphite-raised text-emerald-400 text-[11px] font-mono border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Health verified</span>
                      </div>
                      {healthScore.analyzed_at && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-graphite-muted font-mono">
                          <Clock className="w-3 h-3" />
                          <span>Scanned: {new Date(healthScore.analyzed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-medium text-graphite-text">
                      {activeProject.name} Health Evaluation
                    </h2>
                    <p className="text-xs text-graphite-muted mt-1 max-w-xl leading-relaxed">
                      {healthScore.summary}
                    </p>
                  </div>
                </div>

                {/* Quick Action Navigation & AI Remediation */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full lg:w-auto">
                  <button
                    onClick={handleSendToRemediation}
                    className="px-3.5 py-2 bg-graphite-text hover:bg-white text-graphite-deep rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5"
                  >
                    <Bot className="w-3.5 h-3.5 text-graphite-deep" />
                    <span>Ask Support Pilot to remediate</span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchHealthScore(activeProject.id)}
                      className="flex-1 px-3 py-1.5 bg-graphite-raised hover:bg-white/[0.08] text-graphite-secondary hover:text-graphite-text border border-white/[0.08] rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-graphite-muted" />
                      <span>Re-Scan</span>
                    </button>
                    <button
                      onClick={() => navigate('/chat')}
                      className="flex-1 px-3 py-1.5 bg-graphite-raised hover:bg-white/[0.08] text-graphite-secondary hover:text-graphite-text border border-white/[0.08] rounded-md text-xs font-medium transition flex items-center justify-center gap-1.5"
                    >
                      <span>Ask AI Chat</span>
                      <ArrowRight className="w-3.5 h-3.5 text-graphite-muted" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Exact 6 Weighted Categories Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono uppercase text-graphite-muted tracking-wider">
                    6 Weighted Health Categories (100% Model)
                  </h3>
                  <span className="text-[11px] font-mono text-graphite-muted">
                    Quality (20%) • Security (20%) • Testing (20%) • Maint (15%) • Docs (10%) • Arch (15%)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(healthScore.categories).map(([key, cat]) => {
                    const getStatusColor = (score?: number | null) => {
                      if (score === null || score === undefined) return 'text-graphite-muted bg-graphite-deep border-white/[0.06]';
                      if (score >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                      if (score >= 75) return 'text-graphite-text bg-graphite-raised border-white/[0.08]';
                      if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                      return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                    };

                    const getBarColor = (score?: number | null) => {
                      if (score === null || score === undefined) return 'bg-white/[0.1]';
                      if (score >= 90) return 'bg-emerald-400';
                      if (score >= 75) return 'bg-white/80';
                      if (score >= 60) return 'bg-amber-400';
                      return 'bg-rose-400';
                    };

                    const weightPct = Math.round((cat.weight || 0.15) * 100);

                    return (
                      <div
                        key={key}
                        className="bg-graphite-card border border-white/[0.08] rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-white/[0.14] transition"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div>
                              <h4 className="text-xs font-medium text-graphite-text">
                                {cat.category}
                              </h4>
                              <span className="text-[10px] text-graphite-muted font-mono">
                                Weight: {weightPct}%
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.2 rounded border ${getStatusColor(
                                cat.score
                              )}`}
                            >
                              {cat.status}
                            </span>
                          </div>

                          {/* Progress Bar & Numeric Score */}
                          <div className="space-y-1 my-2.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-graphite-muted text-[11px]">Score</span>
                              <span className="font-medium text-graphite-text">
                                {cat.score !== null && cat.score !== undefined ? `${cat.score} / 100` : 'Not Evaluated'}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-graphite-deep rounded-full overflow-hidden border border-white/[0.06]">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getBarColor(cat.score)}`}
                                style={{ width: `${cat.score || 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Deduction Reasons */}
                          {cat.deduction_reasons && cat.deduction_reasons.length > 0 && (
                            <div className="mb-2 p-2 rounded bg-rose-950/20 border border-rose-500/20 space-y-0.5">
                              <span className="text-[10px] text-rose-400 font-mono font-medium block">
                                Deductions:
                              </span>
                              <ul className="space-y-0.5 text-[10px] text-rose-300/80">
                                {cat.deduction_reasons.map((dr, idx) => (
                                  <li key={idx} className="leading-snug">• {dr}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Concrete Evidence List */}
                          <div className="pt-2 border-t border-white/[0.06] space-y-1">
                            <span className="text-[10px] text-graphite-muted font-mono block">
                              Evidence:
                            </span>
                            <ul className="space-y-1 text-xs">
                              {cat.evidence.map((ev, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-graphite-secondary">
                                  <span className="text-graphite-muted shrink-0">•</span>
                                  <span>{ev}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Categorized Issues Section (Critical, High, Medium, Low) */}
              <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-graphite-muted" />
                    <h3 className="text-xs font-medium text-graphite-text">Issues detected by analysis</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="px-1.5 py-0.2 rounded bg-rose-950/30 text-rose-400 border border-rose-500/20">
                      {healthScore.critical_issues?.length || 0} Critical
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-950/30 text-amber-400 border border-amber-500/20">
                      {healthScore.high_issues?.length || 0} High
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-graphite-raised text-graphite-muted border border-white/[0.06]">
                      {healthScore.medium_issues?.length || 0} Medium
                    </span>
                  </div>
                </div>

                {/* Critical Issues */}
                {healthScore.critical_issues && healthScore.critical_issues.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-rose-400 block">
                      Critical Issues ({healthScore.critical_issues.length})
                    </span>
                    {healthScore.critical_issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="p-3 bg-graphite-deep border border-rose-500/20 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-mono text-[9px]">
                              CRITICAL
                            </span>
                            <span className="px-1 py-0.2 rounded bg-graphite-raised text-[9px] font-mono text-graphite-muted">
                              {issue.source_type === 'static_analysis' ? 'Static Analysis' : 'Test Verification'}
                            </span>
                            <span className="font-medium text-graphite-text text-xs">{issue.title}</span>
                          </div>
                          <p className="text-graphite-secondary text-[11px]">{issue.description}</p>
                          {issue.file_path && (
                            <p className="text-[10px] text-graphite-muted font-mono">
                              Location: <span className="text-graphite-text">{issue.file_path}</span>
                              {issue.line_number ? `:${issue.line_number}` : ''}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (issue.file_path) {
                              setSelectedFilePath(issue.file_path);
                              setActiveTab('explorer');
                            }
                          }}
                          className="px-2.5 py-1 bg-graphite-raised hover:bg-white/[0.08] text-graphite-text rounded text-xs font-medium border border-white/[0.08] transition shrink-0 self-end sm:self-auto"
                        >
                          Inspect File →
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* High Priority Issues */}
                {healthScore.high_issues && healthScore.high_issues.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono text-amber-400 block">
                      High-Priority Issues ({healthScore.high_issues.length})
                    </span>
                    {healthScore.high_issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="p-3 bg-graphite-deep border border-white/[0.08] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono text-[9px]">
                              HIGH
                            </span>
                            <span className="px-1 py-0.2 rounded bg-graphite-raised text-[9px] font-mono text-graphite-muted">
                              {issue.source_type}
                            </span>
                            <span className="font-medium text-graphite-text text-xs">{issue.title}</span>
                          </div>
                          <p className="text-graphite-secondary text-[11px]">{issue.description}</p>
                          {issue.file_path && (
                            <p className="text-[10px] text-graphite-muted font-mono">
                              Location: {issue.file_path} {issue.line_number ? `:${issue.line_number}` : ''}
                            </p>
                          )}
                        </div>
                        {issue.recommendation && (
                          <span className="text-[10px] text-graphite-muted italic max-w-xs text-right">
                            Rec: {issue.recommendation}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Positive Findings & Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/[0.08]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <h3 className="text-xs font-medium text-graphite-text">Verified positive findings</h3>
                  </div>
                  {healthScore.positive_findings && healthScore.positive_findings.length > 0 ? (
                    <ul className="space-y-1.5 text-xs">
                      {healthScore.positive_findings.map((pf, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-graphite-secondary leading-relaxed text-[11px]">
                          <span className="text-emerald-400 font-bold shrink-0">✓</span>
                          <span>{pf}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-graphite-muted">Run scan to evaluate positive patterns.</p>
                  )}
                </div>

                <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-graphite-muted" />
                      <h3 className="text-xs font-medium text-graphite-text">Actionable recommendations</h3>
                    </div>
                    <span className="text-[10px] text-graphite-muted font-mono">
                      {healthScore.recommendations?.length || 0} items
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {healthScore.recommendations && healthScore.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-graphite-deep border border-white/[0.08] rounded-lg flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase shrink-0 mt-0.5 ${
                              rec.priority === 'Critical'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : rec.priority === 'High'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-graphite-raised text-graphite-muted border border-white/[0.06]'
                            }`}
                          >
                            {rec.priority}
                          </span>
                          <div>
                            <p className="text-graphite-text font-medium">{rec.suggestion}</p>
                            {rec.file_path && (
                              <p className="text-[10px] text-graphite-muted font-mono">
                                Target: {rec.file_path}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (rec.file_path) {
                              setSelectedFilePath(rec.file_path);
                              setActiveTab('explorer');
                            } else {
                              handleSendToRemediation();
                            }
                          }}
                          className="px-2.5 py-1 bg-graphite-raised hover:bg-white/[0.08] text-graphite-text rounded text-xs font-medium border border-white/[0.08] transition shrink-0"
                        >
                          Resolve →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-graphite-muted text-xs">
              Unable to compute health score. Please re-index the repository.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AST FILE TREE & CODE VIEWER */}
      {activeTab === 'explorer' && (
        <div className="space-y-4">
          {!activeProject ? (
            <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-12 text-center max-w-lg mx-auto">
              <FolderTree className="w-10 h-10 text-graphite-muted mx-auto mb-3" />
              <h3 className="text-sm font-medium text-graphite-text">No active repository selected</h3>
              <p className="text-xs text-graphite-muted mt-1 mb-5">
                Select a repository from the Repositories tab to browse its file tree, AST symbols, and code contents.
              </p>
              <button
                onClick={() => setActiveTab('manage')}
                className="px-4 py-2 bg-graphite-text hover:bg-white text-graphite-deep text-xs font-medium rounded-md transition"
              >
                Choose repository
              </button>
            </div>
          ) : (
            <div className="bg-graphite-card border border-white/[0.08] rounded-xl overflow-hidden flex flex-col md:flex-row h-[700px]">
              {/* Left File Tree Sidebar */}
              <div className="w-full md:w-80 border-r border-white/[0.08] flex flex-col bg-graphite-deep">
                <div className="p-3 border-b border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-graphite-muted">
                      AST File Tree
                    </span>
                    <span className="text-[10px] text-graphite-muted font-mono">
                      {activeProject.total_files} files
                    </span>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-graphite-muted absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={treeSearch}
                      onChange={(e) => setTreeSearch(e.target.value)}
                      placeholder="Filter files..."
                      className="w-full pl-8 pr-3 py-1.5 bg-graphite-card border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {loadingTree ? (
                    <div className="py-12 flex justify-center">
                      <LoadingSpinner size="sm" label="Loading tree..." />
                    </div>
                  ) : treeData.length === 0 ? (
                    <div className="text-center py-12 text-xs text-graphite-muted">
                      No source files indexed yet.
                    </div>
                  ) : (
                    treeData.map((node) => renderTreeNode(node))
                  )}
                </div>
              </div>

              {/* Right Code Viewer */}
              <div className="flex-1 flex flex-col min-w-0 bg-graphite-deep">
                {selectedFilePath ? (
                  <>
                    {/* File Header */}
                    <div className="p-3 border-b border-white/[0.08] bg-graphite-card flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCode className="w-4 h-4 text-graphite-muted shrink-0" />
                        <span className="font-mono text-graphite-text truncate">{selectedFilePath}</span>
                        {fileDetail && (
                          <span className="text-[10px] text-graphite-muted font-mono hidden sm:inline">
                            • {fileDetail.lines_count} lines • {(fileDetail.size_bytes / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={copyFileToClipboard}
                          className="px-2.5 py-1 rounded-md bg-graphite-raised hover:bg-white/[0.08] text-graphite-text text-xs border border-white/[0.08] transition flex items-center gap-1.5"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-graphite-muted" />}
                          <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (fileDetail?.content) {
                              sessionStorage.setItem('auron_ai_pasted_code', fileDetail.content);
                              sessionStorage.setItem('auron_ai_pasted_filename', fileDetail.file_name);
                              sessionStorage.setItem('auron_ai_pasted_lang', fileDetail.language);
                              navigate('/sandbox');
                            }
                          }}
                          className="px-2.5 py-1 rounded-md bg-graphite-text hover:bg-white text-graphite-deep text-xs font-medium transition flex items-center gap-1.5"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>Open in Code Mode</span>
                        </button>
                      </div>
                    </div>

                    {/* Monaco Editor Code Display */}
                    <div className="flex-1 overflow-hidden relative">
                      {loadingFile ? (
                        <div className="h-full flex items-center justify-center">
                          <LoadingSpinner size="md" label="Fetching AST content..." />
                        </div>
                      ) : fileDetail ? (
                        <MonacoEditorWrapper
                          value={fileDetail.content || ''}
                          language={fileDetail.language || 'python'}
                          readOnly={true}
                          height="100%"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-graphite-muted">
                          File content not found.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-graphite-muted text-xs p-8 text-center">
                    <FileCode className="w-8 h-8 text-graphite-muted mb-2" />
                    <span>Select any file from the AST tree on the left to inspect source code.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALL REPOSITORIES & INGESTION */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          {isLoadingProjects ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="lg" label="Loading repositories..." />
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-12 text-center max-w-xl mx-auto shadow-xl">
              <div className="w-12 h-12 rounded-lg bg-graphite-raised flex items-center justify-center text-graphite-muted mx-auto mb-4">
                <FolderKanban className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-medium text-graphite-text">No repositories ingested yet</h3>
              <p className="text-xs text-graphite-muted mt-1.5 mb-6">
                Upload a ZIP archive or connect a GitHub repository to index files, parse AST, and evaluate health scores.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleCreateDemo}
                  disabled={isCreatingDemo}
                  className="px-3.5 py-1.5 bg-graphite-raised hover:bg-white/[0.08] text-graphite-text rounded-md text-xs font-medium border border-white/[0.08] transition flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>1-Click Sample API</span>
                </button>
                <button
                  onClick={() => setShowGithubModal(true)}
                  className="px-3.5 py-1.5 bg-graphite-raised hover:bg-white/[0.08] text-graphite-text rounded-md text-xs font-medium border border-white/[0.08] transition flex items-center gap-2"
                >
                  <Github className="w-4 h-4 text-graphite-muted" />
                  <span>Connect GitHub</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3.5 py-1.5 bg-graphite-text hover:bg-white text-graphite-deep rounded-md text-xs font-medium transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Project & Upload ZIP</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const isActive = activeProject?.id === project.id;
                const isGithub = project.description?.includes('Imported from https://github.com');
                return (
                  <div
                    key={project.id}
                    className={`bg-graphite-card border rounded-xl p-4 flex flex-col justify-between transition group relative ${
                      isActive
                        ? 'border-white/30 ring-1 ring-white/20'
                        : 'border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-graphite-raised flex items-center justify-center text-graphite-muted shrink-0">
                            {isGithub ? <Github className="w-4 h-4 text-graphite-text" /> : <FileCode className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-medium text-graphite-text truncate">{project.name}</h3>
                            {isGithub && (
                              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                GitHub connected
                              </span>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={project.status} />
                      </div>

                      <p className="text-[11px] text-graphite-muted line-clamp-2 min-h-[30px] mt-1">
                        {project.description || 'No description provided.'}
                      </p>

                      {/* Telemetry Stats */}
                      <div className="grid grid-cols-3 gap-2 mt-3 py-2 px-2.5 bg-graphite-deep rounded-md border border-white/[0.06] text-center font-mono">
                        <div>
                          <p className="text-[9px] text-graphite-muted">Language</p>
                          <p className="text-xs font-medium text-graphite-text truncate">{project.primary_language}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-graphite-muted">Files</p>
                          <p className="text-xs font-medium text-graphite-text">{project.total_files}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-graphite-muted">Lines</p>
                          <p className="text-xs font-medium text-graphite-text">{project.total_lines.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Framework Tags */}
                      {project.frameworks && project.frameworks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {project.frameworks.map((fw) => (
                            <span
                              key={fw}
                              className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-graphite-raised text-graphite-muted border border-white/[0.06]"
                            >
                              {fw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveProject(project);
                              setActiveTab('health');
                            }}
                            className="text-[11px] text-graphite-muted hover:text-graphite-text transition font-medium"
                          >
                            Set active
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setActiveProject(project);
                            setActiveTab('health');
                          }}
                          title="View Health Score"
                          className="p-1.5 rounded hover:bg-graphite-raised text-graphite-muted hover:text-emerald-400 transition"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setActiveProject(project);
                            setActiveTab('explorer');
                          }}
                          title="Open AST Explorer"
                          className="p-1.5 rounded hover:bg-graphite-raised text-graphite-muted hover:text-graphite-text transition"
                        >
                          <FolderTree className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setShowUploadModal(project.id);
                            setErrorMsg(null);
                          }}
                          title="Upload new ZIP"
                          className="p-1.5 rounded hover:bg-graphite-raised text-graphite-muted hover:text-graphite-text transition"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(project.id)}
                          title="Delete project"
                          className="p-1.5 rounded hover:bg-rose-500/10 text-graphite-muted hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-graphite-text">Create new repository</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-graphite-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-graphite-muted mb-1">Project name</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. backend-microservice"
                  className="w-full px-3 py-2 bg-graphite-deep border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs text-graphite-muted mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Optional brief description of this codebase"
                  className="w-full px-3 py-2 bg-graphite-deep border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs text-graphite-muted hover:text-graphite-text hover:bg-white/[0.04] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-graphite-text hover:bg-white text-graphite-deep rounded-md text-xs font-medium transition"
                >
                  Create & Next
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GITHUB IMPORT MODAL WITH TOKEN AUTHENTICATION */}
      {showGithubModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-graphite-text" />
                <h3 className="text-sm font-medium text-graphite-text">Connect GitHub repository</h3>
              </div>
              <button
                onClick={() => {
                  setShowGithubModal(false);
                  setIsImportingGithub(false);
                }}
                className="text-graphite-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleGithubImport} className="space-y-4">
              <div>
                <label className="block text-xs text-graphite-muted mb-1">GitHub repository URL</label>
                <input
                  type="url"
                  required
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="w-full px-3 py-2 bg-graphite-deep border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-graphite-muted">
                    Personal access token (Optional)
                  </label>
                  <span className="text-[10px] text-graphite-muted font-mono">Private repos</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-graphite-muted absolute left-2.5 top-2.5" />
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx (Requires repo read scope)"
                    className="w-full pl-8 pr-3 py-2 bg-graphite-deep border border-white/[0.08] rounded-md text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/20 font-mono"
                  />
                </div>
                <p className="text-[10px] text-graphite-muted mt-1">
                  Authorized GitHub access unlocks private repository ingestion and avoids rate limits.
                </p>
              </div>

              {isImportingGithub && (
                <div className="p-3 bg-graphite-deep border border-white/[0.08] rounded-md flex items-center gap-3">
                  <LoadingSpinner size="sm" />
                  <span className="text-xs text-graphite-secondary font-mono">
                    Retrieving repository archive, parsing AST & computing Health Score...
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isImportingGithub}
                  onClick={() => setShowGithubModal(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs text-graphite-muted hover:text-graphite-text hover:bg-white/[0.04] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImportingGithub || !githubUrl.trim()}
                  className="px-4 py-1.5 bg-graphite-text hover:bg-white disabled:opacity-50 text-graphite-deep rounded-md text-xs font-medium transition flex items-center gap-2"
                >
                  {isImportingGithub ? 'Connecting & Scoring...' : 'Connect & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD ZIP MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-graphite-text">Upload codebase (.zip)</h3>
              <button
                onClick={() => {
                  if (!isUploading) {
                    setShowUploadModal(null);
                    setSelectedFile(null);
                  }
                }}
                disabled={isUploading}
                className="text-graphite-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) handleSelectFile(e.dataTransfer.files[0]);
                }}
                className={`border border-dashed rounded-lg p-6 text-center transition cursor-pointer ${
                  isDragging
                    ? 'border-white/40 bg-white/[0.04]'
                    : selectedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-white/[0.12] hover:border-white/25 bg-graphite-deep'
                }`}
              >
                <input
                  type="file"
                  id="zipFileInput"
                  accept=".zip"
                  onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])}
                  className="hidden"
                />
                <label htmlFor="zipFileInput" className="cursor-pointer block">
                  <div className="w-10 h-10 rounded-md bg-graphite-raised flex items-center justify-center text-graphite-muted mx-auto mb-2">
                    <Upload className="w-4 h-4 text-graphite-muted" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-medium text-emerald-400 truncate max-w-xs mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-graphite-muted mt-0.5">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-graphite-text">
                        Drag and drop your repository .zip here
                      </p>
                      <p className="text-[10px] text-graphite-muted mt-1">
                        Max file size: 50MB (Source code only, exclude node_modules or .venv)
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {isUploading && (
                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-graphite-muted">{uploadStage}</span>
                    <span className="text-graphite-text font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-graphite-deep rounded-full overflow-hidden border border-white/[0.08]">
                    <div
                      className="h-full bg-white/80 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setShowUploadModal(null);
                    setSelectedFile(null);
                  }}
                  className="px-3.5 py-1.5 rounded-md text-xs text-graphite-muted hover:text-graphite-text hover:bg-white/[0.04] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-4 py-1.5 bg-graphite-text hover:bg-white disabled:opacity-50 text-graphite-deep rounded-md text-xs font-medium transition flex items-center gap-2"
                >
                  {isUploading ? <LoadingSpinner size="sm" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isUploading ? 'Processing...' : 'Upload & Index'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-graphite-card border border-white/[0.08] rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-medium text-graphite-text mb-2">Delete repository?</h3>
            <p className="text-xs text-graphite-muted mb-6">
              This will permanently remove the repository, its AST index, and vector embeddings from Qdrant.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-md text-xs text-graphite-muted hover:text-graphite-text hover:bg-white/[0.04] transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteProject(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-medium transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
