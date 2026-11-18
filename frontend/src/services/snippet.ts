import api from './api';

export interface BugItem {
  line_number?: number | null;
  error_type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  description: string;
  root_cause: string;
  recommended_solution: string;
}

export interface FixCodeResult {
  original_code: string;
  corrected_code: string;
  explanation: string;
  changes_summary: string[];
}

export type SnippetAction =
  | 'detect_bugs'
  | 'fix_code'
  | 'explain'
  | 'optimize'
  | 'review'
  | 'security'
  | 'generate_tests'
  | 'generate_docs'
  | 'generate_code';

export interface SnippetAnalysisRequest {
  code: string;
  language: string;
  action: SnippetAction;
  prompt?: string;
}

export interface SnippetAnalysisResponse {
  action: SnippetAction;
  language: string;
  has_bugs?: boolean;
  bugs?: BugItem[];
  fix_result?: FixCodeResult;
  generated_code?: string;
  explanation?: string;
  text_result?: string;
  review_score?: number;
  metrics?: Record<string, any>;
}

export interface LanguageDetectResponse {
  language: string;
  confidence: number;
}

// ================= THREE AI PROVIDERS INTERFACES =================
export interface ProviderCodeSolution {
  provider: 'gemini' | 'groq' | 'openai';
  provider_name: string;
  status: 'success' | 'error';
  code?: string | null;
  explanation?: string | null;
  error_message?: string | null;
  model?: string | null;
  duration_ms?: number | null;
  line_count?: number | null;
}

export interface MultiProviderGenerationRequest {
  prompt: string;
  language: string;
  existing_code?: string;
}

export interface MultiProviderGenerationResponse {
  prompt: string;
  language: string;
  solutions: {
    gemini: ProviderCodeSolution;
    groq: ProviderCodeSolution;
    openai: ProviderCodeSolution;
  };
  recommended_provider?: 'gemini' | 'groq' | 'openai' | 'comparable' | null;
  recommendation_reason?: string | null;
}

// ================= OUTPUT TERMINAL / EXECUTION INTERFACES =================
export interface CodeRunRequest {
  code: string;
  language: string;
  stdin?: string;
}

export interface CodeRunResponse {
  status: 'success' | 'error' | 'timeout' | 'unsupported';
  stdout: string;
  stderr: string;
  exit_code: number;
  execution_time_ms: number;
  sandbox_type: string;
}

export const snippetService = {
  async analyzeSnippet(payload: SnippetAnalysisRequest): Promise<SnippetAnalysisResponse> {
    const res = await api.post<SnippetAnalysisResponse>('/snippet/analyze', payload);
    return res.data;
  },

  async detectLanguage(code: string): Promise<LanguageDetectResponse> {
    const res = await api.post<LanguageDetectResponse>('/snippet/detect-language', { code });
    return res.data;
  },

  async generateMultiProvider(payload: MultiProviderGenerationRequest): Promise<MultiProviderGenerationResponse> {
    const res = await api.post<MultiProviderGenerationResponse>('/snippet/generate-multi', payload);
    return res.data;
  },

  async runCode(payload: CodeRunRequest): Promise<CodeRunResponse> {
    const res = await api.post<CodeRunResponse>('/snippet/run', payload);
    return res.data;
  },
};
