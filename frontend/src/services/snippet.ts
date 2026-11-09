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
  text_result?: string;
  review_score?: number;
  metrics?: Record<string, any>;
}

export interface LanguageDetectResponse {
  language: string;
  confidence: number;
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
};

