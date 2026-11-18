import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { projectService } from '../services/projects';
import { aiService, TestRunResult } from '../services/ai';
import { TestSuite, TreeNode } from '../types';
import { MonacoEditorWrapper } from '../components/common/MonacoEditorWrapper';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  TestTubes,
  Play,
  Download,
  FileCode,
  Layers,
  CheckCircle,
  AlertCircle,
  Terminal,
  Clock,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TestGeneration: React.FC = () => {
  const { activeProject } = useProject();
  const [fileList, setFileList] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [framework, setFramework] = useState<string>('pytest');
  const [generating, setGenerating] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null);
  const [pastSuites, setPastSuites] = useState<TestSuite[]>([]);
  const [testRunResult, setTestRunResult] = useState<TestRunResult | null>(null);
  const navigate = useNavigate();

  // Load files for dropdown
  useEffect(() => {
    if (!activeProject) return;
    const loadFiles = async () => {
      try {
        const tree = await projectService.getRepositoryTree(activeProject.id);
        const paths: string[] = [];
        const extract = (nodes: TreeNode[]) => {
          for (const n of nodes) {
            if (!n.is_dir) paths.push(n.path);
            if (n.children) extract(n.children);
          }
        };
        extract(tree);
        setFileList(paths);
        if (paths.length > 0) setSelectedFile(paths[0]);

        const suites = await aiService.getTestSuites(activeProject.id);
        setPastSuites(suites);
        if (suites.length > 0) setTestSuite(suites[0]);
      } catch (err) {
        console.error('Failed to load project files for test generator', err);
      }
    };
    loadFiles();
  }, [activeProject]);

  const handleGenerateTests = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !selectedFile || generating) return;
    setGenerating(true);
    setTestRunResult(null);
    try {
      const generated = await aiService.generateTests(activeProject.id, selectedFile, framework);
      setTestSuite(generated);
      setPastSuites([generated, ...pastSuites]);
    } catch (err) {
      console.error('Failed to generate tests', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleRunTests = async () => {
    if (!activeProject || !testSuite || runningTests) return;
    setRunningTests(true);
    try {
      const res = await aiService.runTestSuite(activeProject.id, testSuite.id, testSuite.test_code);
      setTestRunResult(res);
    } catch (err: any) {
      console.error('Failed to run test suite', err);
      setTestRunResult({
        status: 'failed',
        total_passed: 0,
        total_failed: 1,
        duration_ms: 0,
        output_log: err?.response?.data?.detail || err.message || 'Error occurred while executing tests.',
      });
    } finally {
      setRunningTests(false);
    }
  };

  const handleDownload = () => {
    if (!testSuite) return;
    const blob = new Blob([testSuite.test_code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const base = testSuite.file_path.replace(/\.[^/.]+$/, '');
    link.download = `test_${base.split('/').pop()}.py`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!activeProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Layers className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-base font-semibold text-white">No Repository Selected</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">
          Select or upload an active repository to generate automated test suites.
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
      {/* Target File & Framework Selection Bar */}
      <div className="bg-dark-900 border border-slate-800 rounded-xl p-4 shrink-0">
        <form onSubmit={handleGenerateTests} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Select Source File to Generate Tests For
            </label>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
            >
              {fileList.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-slate-300 mb-1">Test Framework</label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
            >
              <option value="pytest">pytest (Python)</option>
              <option value="unittest">unittest (Python)</option>
              <option value="vitest">Vitest / Jest (TS/JS)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!selectedFile || generating}
            className="w-full sm:w-auto px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition flex items-center justify-center gap-2 h-[34px]"
          >
            {generating ? <LoadingSpinner size="sm" /> : <TestTubes className="w-4 h-4" />}
            <span>{generating ? 'Generating Test Suite...' : 'Generate Test Cases'}</span>
          </button>
        </form>
      </div>

      {/* Editor & Test Case Summary Area */}
      <div className="flex-1 bg-dark-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        {/* Subheader */}
        <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-dark-950/60 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <FileCode className="w-4 h-4 text-brand-400" />
            <span>
              {testSuite ? `test_${testSuite.file_path.split('/').pop()}` : 'No test suite generated'}
            </span>
          </div>

          {testSuite && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunTests}
                disabled={runningTests}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
              >
                {runningTests ? <LoadingSpinner size="sm" /> : <Play className="w-3.5 h-3.5" />}
                <span>{runningTests ? 'Running in Sandbox...' : 'Run in Sandbox'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="px-3 py-1 rounded bg-dark-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Test File</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Monaco Editor */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-hidden">
              {generating ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <LoadingSpinner size="lg" label="Generating parameterized test cases & edge scenarios..." />
                </div>
              ) : testSuite ? (
                <MonacoEditorWrapper
                  value={testSuite.test_code}
                  language={framework === 'pytest' || framework === 'unittest' ? 'python' : 'typescript'}
                  readOnly={true}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 text-xs">
                  <TestTubes className="w-10 h-10 text-slate-700 mb-2" />
                  <p className="font-medium text-slate-300">Ready to Generate Unit Tests</p>
                  <p className="text-slate-500 mt-1 max-w-sm">
                    Select a target module and let AURON AI generate complete pytest cases with edge bounds, negative checks, and mocking fixtures.
                  </p>
                </div>
              )}
            </div>

            {/* Test Run Execution Log Terminal */}
            {testRunResult && (
              <div className="h-44 border-t border-slate-800 bg-dark-950 flex flex-col">
                <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs bg-dark-900/80">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-brand-400" />
                    <span className="font-semibold text-slate-200">Sandbox Test Runner Output</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        testRunResult.status === 'passed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {testRunResult.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-mono">
                      <CheckCircle className="w-3 h-3" /> {testRunResult.total_passed} Passed
                    </span>
                    <span className="flex items-center gap-1 text-red-400 font-mono">
                      <XCircle className="w-3 h-3" /> {testRunResult.total_failed} Failed
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 font-mono">
                      <Clock className="w-3 h-3" /> {testRunResult.duration_ms}ms
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] text-slate-300 whitespace-pre-wrap selection:bg-slate-700">
                  {testRunResult.output_log}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Generated Test Cases Breakdown */}
          {testSuite && testSuite.test_cases_summary && (
            <div className="w-72 border-l border-slate-800 bg-dark-950/40 p-4 overflow-y-auto hidden md:block">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                Covered Test Scenarios ({testSuite.test_cases_summary.length})
              </h3>
              <div className="space-y-2">
                {testSuite.test_cases_summary.map((tc, idx) => (
                  <div key={idx} className="p-2 rounded bg-dark-900 border border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 font-mono text-slate-300 text-[11px]">
                      <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{tc.name}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 pl-4">
                      {tc.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
