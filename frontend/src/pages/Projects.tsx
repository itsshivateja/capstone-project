import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useProject } from '../context/ProjectContext';
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
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Projects: React.FC = () => {
  const { projects, activeProject, setActiveProject, createProject, deleteProject, uploadZip, isLoadingProjects, loadProjects } =
    useProject();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null); // projectId
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
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
  const navigate = useNavigate();

  const handleSelectFile = (file: File) => {
    setErrorMsg(null);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMsg('Invalid file format: Please select a valid .zip archive.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg(`File exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller repository.`);
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
      await api.post(`/projects/${proj.id}/import-github`, { github_url: githubUrl.trim() });
      await loadProjects();
      setShowGithubModal(false);
      setGithubUrl('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to import from GitHub. Ensure the repository is public.');
    } finally {
      setIsImportingGithub(false);
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
      // Open upload modal immediately for the newly created project
      setShowUploadModal(created.id);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create project');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !showUploadModal) return;

    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      setErrorMsg('Please upload a valid .zip file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStage('Uploading ZIP archive...');
    setErrorMsg(null);

    try {
      await uploadZip(showUploadModal, selectedFile, (event) => {
        if (event.total) {
          const percent = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(percent);
          if (percent >= 100) {
            setUploadStage('Extracting & Vector Indexing AST Chunks...');
          }
        }
      });
      setShowUploadModal(null);
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Upload failed. Check file size and archive validity.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete project failed:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Quick Switch Banner to Option 2: Paste Code */}
      <div className="bg-gradient-to-r from-dark-900 to-emerald-950/30 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white flex items-center gap-2">
              <span>Looking to test a single file or snippet?</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">Option 2: Paste Code</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Paste or type code into Monaco Editor and run the 9 instant actions (Bugs, Auto-Fix with side-by-side Diff, Optimization, Tests, Docs) without uploading a ZIP archive.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/sandbox')}
          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition whitespace-nowrap self-stretch sm:self-auto text-center"
        >
          Open Code Sandbox
        </button>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-brand-400" />
            <span>Repository Workspaces</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your ingested software repositories and launch AST-powered AI engineering workflows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                await api.post('/projects/sample-demo');
                await loadProjects();
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-3.5 py-2 bg-dark-950 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-mono transition flex items-center gap-1.5 self-start"
          >
            <span>⚡ Load Sample Repository</span>
          </button>
          <button
            onClick={() => {
              setErrorMsg(null);
              setShowGithubModal(true);
            }}
            className="px-3.5 py-2 bg-dark-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 self-start"
          >
            <Github className="w-4 h-4 text-white" />
            <span>Connect GitHub</span>
          </button>
          <button
            onClick={() => {
              setErrorMsg(null);
              setShowCreateModal(true);
            }}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition flex items-center gap-1.5 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>New Repository</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-between text-xs text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {isLoadingProjects ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" label="Loading repositories..." />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-dark-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-4">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No Projects Ingested Yet</h3>
          <p className="text-xs text-slate-400 mt-1.5 mb-6">
            Create your first project and upload a ZIP archive of your source code (FastAPI, React, Python, Node, Go, etc.) to begin.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const isActive = activeProject?.id === project.id;
            return (
              <div
                key={project.id}
                className={`bg-dark-900 border rounded-xl p-5 flex flex-col justify-between transition group relative ${
                  isActive
                    ? 'border-brand-500/50 shadow-xl shadow-brand-500/5 ring-1 ring-brand-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-brand-400 shrink-0">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white truncate">{project.name}</h3>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mt-1">
                    {project.description || 'No description provided.'}
                  </p>

                  {/* Telemetry Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4 py-2.5 px-3 bg-dark-950/60 rounded-lg border border-slate-800/80 text-center font-mono">
                    <div>
                      <p className="text-[10px] text-slate-500">Language</p>
                      <p className="text-xs font-semibold text-slate-200 truncate">{project.primary_language}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Files</p>
                      <p className="text-xs font-semibold text-slate-200">{project.total_files}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Lines</p>
                      <p className="text-xs font-semibold text-slate-200">{project.total_lines.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Framework Tags */}
                  {project.frameworks && project.frameworks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {project.frameworks.map((fw) => (
                        <span
                          key={fw}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        >
                          {fw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <span className="text-xs text-brand-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveProject(project)}
                        className="text-xs text-slate-400 hover:text-white transition font-medium"
                      >
                        Set Active
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setShowUploadModal(project.id);
                        setErrorMsg(null);
                      }}
                      title="Upload ZIP repository"
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-brand-400 transition"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveProject(project);
                        navigate('/explorer');
                      }}
                      title="Open in Repo Explorer"
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition"
                    >
                      <FolderTree className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(project.id)}
                      title="Delete project"
                      className="p-1.5 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition"
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Create New Project</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. backend-microservice"
                  className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="FastAPI + PostgreSQL order processing service..."
                  className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Create & Next
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload ZIP Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Upload Repository Archive</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upload a ZIP archive to safely index and parse</p>
              </div>
              <button
                disabled={isUploading}
                onClick={() => setShowUploadModal(null)}
                className="text-slate-400 hover:text-white"
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
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleSelectFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer relative ${
                  isDragging
                    ? 'border-brand-400 bg-brand-500/10 scale-[1.01]'
                    : 'border-slate-700 hover:border-brand-500 bg-dark-950/40'
                }`}
              >
                <input
                  type="file"
                  accept=".zip"
                  required={!selectedFile}
                  disabled={isUploading}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSelectFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className={`w-8 h-8 mx-auto mb-2 transition ${isDragging ? 'text-brand-400 scale-110' : 'text-slate-500'}`} />
                <p className="text-xs font-medium text-slate-300">
                  {selectedFile ? (
                    <span className="text-brand-400 font-mono font-semibold">{selectedFile.name}</span>
                  ) : (
                    'Drag & Drop ZIP file here, or click to browse'
                  )}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Supports .zip archives up to 50MB (auto-ignores node_modules, .git, venvs)
                </p>
              </div>

              {isUploading && (
                <div className="space-y-2 bg-dark-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs font-mono text-slate-300">
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span>{uploadStage}</span>
                    </span>
                    <span className="font-bold text-brand-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>1. Archive Upload</span>
                    <span>2. Zip Slip Sanitization</span>
                    <span>3. AST Extraction</span>
                    <span>4. Qdrant Index</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setShowUploadModal(null)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition flex items-center gap-2"
                >
                  {isUploading ? <LoadingSpinner size="sm" /> : 'Start Ingestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect GitHub Modal */}
      {showGithubModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold text-white">Import from GitHub</h3>
              </div>
              <button
                disabled={isImportingGithub}
                onClick={() => setShowGithubModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGithubImport} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Public GitHub Repository URL
                </label>
                <input
                  type="url"
                  required
                  value={githubUrl}
                  disabled={isImportingGithub}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/fastapi/fastapi"
                  className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  DevMind AI will fetch the main archive, extract source files, parse AST, and index embeddings into Qdrant.
                </p>
              </div>

              {isImportingGithub && (
                <div className="space-y-2 bg-dark-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                    <LoadingSpinner size="sm" />
                    <span>Cloning & Vector Indexing GitHub Repository...</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isImportingGithub}
                  onClick={() => setShowGithubModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!githubUrl.trim() || isImportingGithub}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition flex items-center gap-2"
                >
                  {isImportingGithub ? <LoadingSpinner size="sm" /> : <Github className="w-4 h-4" />}
                  <span>{isImportingGithub ? 'Importing...' : 'Clone & Ingest'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Delete Repository?</h3>
            <p className="text-xs text-slate-400 mb-5">
              This will permanently delete the repository files, vector embeddings, conversations, and audit reports.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-rose-500/20 transition"
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

