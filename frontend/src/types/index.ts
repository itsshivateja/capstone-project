export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  total_files: number;
  total_lines: number;
  primary_language: string;
  languages: Record<string, number>;
  frameworks: string[];
  dependencies: Record<string, string>;
  status: 'ready' | 'indexing' | 'uploaded' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface TreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  language?: string;
  children?: TreeNode[];
}

export interface ProjectFileDetail {
  id: string;
  project_id: string;
  file_path: string;
  file_name: string;
  file_extension?: string;
  language: string;
  size_bytes: number;
  lines_count: number;
  is_binary: boolean;
  content?: string;
}

export interface SourceReference {
  file_path: string;
  start_line?: number;
  end_line?: number;
  snippet?: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  source_references?: SourceReference[];
  created_at: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface BugReport {
  id: string;
  project_id: string;
  file_path: string;
  line_number?: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: string;
  description: string;
  explanation: string;
  suggested_fix: string;
  status: 'open' | 'resolved' | 'ignored';
  created_at: string;
}

export interface CodeGenResponse {
  generated_code: string;
  explanation: string;
  target_file?: string;
  diff_preview?: string;
  affected_files: string[];
}

export interface CodeReviewFinding {
  category: string;
  severity: string;
  message: string;
  suggestion: string;
}

export interface CodeReview {
  id: string;
  project_id: string;
  file_path?: string;
  overall_score: number;
  summary: string;
  metrics: {
    maintainability?: number;
    security?: number;
    performance?: number;
    code_style?: number;
  };
  findings: CodeReviewFinding[];
  recommendations: string[];
  created_at: string;
}

export interface TestCaseSummary {
  name: string;
  type: string;
}

export interface TestSuite {
  id: string;
  project_id: string;
  file_path: string;
  framework: string;
  test_code: string;
  test_cases_summary: TestCaseSummary[];
  created_at: string;
}

export interface DocumentationArtifact {
  id: string;
  project_id: string;
  doc_type: string;
  title: string;
  content_markdown: string;
  created_at: string;
}

export interface DashboardStats {
  total_projects: number;
  total_files: number;
  total_lines: number;
  total_bugs: number;
  bugs_by_severity: Record<string, number>;
  total_conversations: number;
  total_messages: number;
  languages: Record<string, number>;
  recent_activities: Array<{
    type: string;
    title: string;
    timestamp: string;
    status: string;
    project_name: string;
    project_id: string;
  }>;
  projects_overview: Array<{
    id: string;
    name: string;
    primary_language: string;
    total_files: number;
    total_lines: number;
    status: string;
    created_at: string;
  }>;
}

