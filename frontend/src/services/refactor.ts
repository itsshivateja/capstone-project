import api from './api';

export interface RefactorRequest {
  code?: string;
  file_path?: string;
  language?: string;
  goal: string;
  custom_instruction?: string;
}

export interface RefactorResponse {
  original_code: string;
  refactored_code: string;
  explanation: string;
  changes: string[];
  metrics_improvement: Record<string, string>;
}

export const refactorService = {
  async refactorSnippet(payload: RefactorRequest): Promise<RefactorResponse> {
    const res = await api.post<RefactorResponse>('/refactor/snippet', payload);
    return res.data;
  },

  async refactorProjectFile(projectId: string, payload: RefactorRequest): Promise<RefactorResponse> {
    const res = await api.post<RefactorResponse>(`/refactor/${projectId}`, payload);
    return res.data;
  },
};
