import React, { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { projectService } from '../services/projects';
import { TreeNode, ProjectFileDetail } from '../types';
import { MonacoEditorWrapper } from '../components/common/MonacoEditorWrapper';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  Folder,
  FolderOpen,
  FileCode,
  Search,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RepoExplorer: React.FC = () => {
  const { activeProject } = useProject();
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileDetail, setFileDetail] = useState<ProjectFileDetail | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeProject) return;
    const fetchTree = async () => {
      setLoadingTree(true);
      try {
        const nodes = await projectService.getRepositoryTree(activeProject.id);
        setTreeData(nodes);
        // Expand root by default
        const initialExpanded: Record<string, boolean> = {};
        nodes.forEach((n) => {
          if (n.is_dir) initialExpanded[n.path] = true;
        });
        setExpandedFolders(initialExpanded);

        // Auto select first file if available
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

  useEffect(() => {
    if (!activeProject || !selectedFilePath) return;
    const fetchFile = async () => {
      setLoadingFile(true);
      try {
        const detail = await projectService.getFileContent(activeProject.id, selectedFilePath);
        setFileDetail(detail);
      } catch (err) {
        console.error('Failed to load file detail', err);
      } finally {
        setLoadingFile(false);
      }
    };
    fetchFile();
  }, [activeProject, selectedFilePath]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const copyToClipboard = () => {
    if (fileDetail?.content) {
      navigator.clipboard.writeText(fileDetail.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!activeProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Layers className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-base font-semibold text-white">No Repository Selected</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">
          Select or upload an active repository from the Projects workspace to explore source files.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition"
        >
          Go to Projects
        </button>
      </div>
    );
  }

  // Recursive tree renderer
  const renderTree = (nodes: TreeNode[]) => {
    return nodes
      .filter((n) => {
        if (!searchQuery.trim()) return true;
        return n.name.toLowerCase().includes(searchQuery.toLowerCase()) || n.path.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .map((node) => {
        const isExpanded = !!expandedFolders[node.path];
        const isSelected = selectedFilePath === node.path;

        if (node.is_dir) {
          return (
            <div key={node.path} className="select-none">
              <div
                onClick={() => toggleFolder(node.path)}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-300 hover:bg-slate-800/60 cursor-pointer transition"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-400/80 shrink-0" />
                )}
                <span className="truncate">{node.name}</span>
              </div>
              {isExpanded && node.children && (
                <div className="pl-4 border-l border-slate-800/80 ml-2 mt-0.5 space-y-0.5">
                  {renderTree(node.children)}
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={node.path}
            onClick={() => setSelectedFilePath(node.path)}
            className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition select-none ${
              isSelected
                ? 'bg-brand-500/15 text-brand-400 font-semibold border-l-2 border-brand-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{node.name}</span>
          </div>
        );
      });
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-4 overflow-hidden">
      {/* Left Pane: Tree & Search */}
      <div className="w-80 bg-dark-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shrink-0">
        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repository files..."
              className="w-full pl-8 pr-3 py-1.5 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loadingTree ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="sm" label="Scanning files..." />
            </div>
          ) : treeData.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No files found. Ensure ZIP archive is extracted.
            </div>
          ) : (
            renderTree(treeData)
          )}
        </div>

        {/* Tree Footer */}
        <div className="p-2.5 border-t border-slate-800 bg-dark-950/60 text-[11px] font-mono text-slate-500 flex justify-between">
          <span>{activeProject.total_files} files</span>
          <span>{activeProject.total_lines.toLocaleString()} lines</span>
        </div>
      </div>

      {/* Right Pane: File Viewer & Monaco Editor */}
      <div className="flex-1 bg-dark-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        {/* File Header Bar */}
        <div className="h-11 px-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 overflow-hidden">
            <FileText className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span className="truncate">{selectedFilePath || 'No file selected'}</span>
            {fileDetail && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-400 border border-slate-700">
                  {fileDetail.language}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] text-slate-500">{fileDetail.lines_count} lines</span>
              </>
            )}
          </div>

          {fileDetail && (
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-dark-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>

        {/* Editor Body */}
        <div className="flex-1 overflow-hidden relative">
          {loadingFile ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner size="md" label="Loading file source..." />
            </div>
          ) : fileDetail ? (
            <MonacoEditorWrapper
              value={fileDetail.content || ''}
              language={fileDetail.language}
              readOnly={true}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
              <FileCode className="w-8 h-8 text-slate-600 mb-2" />
              <span>Select a file from the repository tree to inspect</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
