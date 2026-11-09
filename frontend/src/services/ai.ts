import api from './api';
import {
  BugReport,
  CodeGenResponse,
  CodeReview,
  TestSuite,
  DocumentationArtifact,
  DashboardStats,
} from '../types';

export interface AgentRosterItem {
  id: string;
  name: string;
  role: string;
  description: string;
}

export interface AgentStepTrace {
  step: number;
  agent: string;
  status: string;
  message: string;
}

export interface AgentWorkflowResult {
  status: string;
  project_id: string;
  query: string;
  intent: string;
  primary_agent: string;
  traces: AgentStepTrace[];
  execution_result: any;
}

export interface TestRunResult {
  status: string;
  total_passed: number;
  total_failed: number;
  duration_ms: number;
  output_log: string;
}

export const aiService = {
  // Bug Detection
  async analyzeBugs(projectId: string, filePath?: string): Promise<BugReport[]> {
    const res = await api.post<BugReport[]>(`/bugs/${projectId}/analyze`, {
      file_path: filePath || null,
    });
    return res.data;
  },

  async getBugReports(projectId: string, severity?: string, status?: string): Promise<BugReport[]> {
    const res = await api.get<BugReport[]>(`/bugs/${projectId}`, {
      params: { severity, status },
    });
    return res.data;
  },

  async updateBugStatus(projectId: string, bugId: string, status: string): Promise<BugReport> {
    const res = await api.patch<BugReport>(`/bugs/${projectId}/${bugId}/status`, null, {
      params: { status },
    });
    return res.data;
  },

  // Code Generation
  async generateCode(projectId: string, prompt: string, targetFile?: string): Promise<CodeGenResponse> {
    const res = await api.post<CodeGenResponse>(`/generate/${projectId}`, {
      prompt,
      target_file: targetFile || null,
    });
    return res.data;
  },

  async applyGeneratedCode(projectId: string, data: CodeGenResponse): Promise<any> {
    const res = await api.post(`/generate/${projectId}/apply`, data);
    return res.data;
  },

  // Code Review
  async reviewCode(projectId: string, filePath?: string): Promise<CodeReview> {
    const res = await api.post<CodeReview>(`/review/${projectId}`, {
      file_path: filePath || null,
    });
    return res.data;
  },

  async getReviews(projectId: string): Promise<CodeReview[]> {
    const res = await api.get<CodeReview[]>(`/review/${projectId}`);
    return res.data;
  },

  // Test Generation & Sandbox Execution
  async generateTests(projectId: string, filePath: string, framework: string = 'pytest'): Promise<TestSuite> {
    const res = await api.post<TestSuite>(`/tests/${projectId}/generate`, {
      file_path: filePath,
      framework,
    });
    return res.data;
  },

  async getTestSuites(projectId: string): Promise<TestSuite[]> {
    const res = await api.get<TestSuite[]>(`/tests/${projectId}`);
    return res.data;
  },

  async runTestSuite(projectId: string, testSuiteId?: string, testCode?: string): Promise<TestRunResult> {
    const res = await api.post<TestRunResult>(`/tests/${projectId}/run`, {
      test_suite_id: testSuiteId || null,
      test_code: testCode || null,
    });
    return res.data;
  },

  // Documentation Generation
  async generateDocumentation(projectId: string, docType: string = 'readme', title?: string): Promise<DocumentationArtifact> {
    const res = await api.post<DocumentationArtifact>(`/docs/${projectId}/generate`, {
      doc_type: docType,
      title: title || null,
    });
    return res.data;
  },

  async getDocumentation(projectId: string): Promise<DocumentationArtifact[]> {
    const res = await api.get<DocumentationArtifact[]>(`/docs/${projectId}`);
    return res.data;
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await api.get<DashboardStats>('/dashboard/stats');
    return res.data;
  },

  // LangGraph Autonomous Agents
  async executeAgentWorkflow(projectId: string, taskDescription: string, targetFile?: string): Promise<AgentWorkflowResult> {
    const res = await api.post<AgentWorkflowResult>(`/agents/${projectId}/execute`, {
      task_description: taskDescription,
      target_file: targetFile || null,
    });
    return res.data;
  },

  async getAgentRoster(): Promise<AgentRosterItem[]> {
    const res = await api.get<AgentRosterItem[]>('/agents/roster');
    return res.data;
  },
};
