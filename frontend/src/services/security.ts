import api from './api';

export interface VulnerabilityItem {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  category: string;
  cwe_id: string;
  file_path: string;
  line_number?: number | null;
  vulnerable_snippet: string;
  explanation: string;
  remediation_code: string;
}

export interface SecurityScanResponse {
  security_score: number;
  risk_level: string;
  total_vulnerabilities: number;
  breakdown: Record<string, number>;
  vulnerabilities: VulnerabilityItem[];
}

export const securityService = {
  async scanSnippet(code: string, language: string = 'python', filePath: string = 'snippet.py'): Promise<SecurityScanResponse> {
    const res = await api.post<SecurityScanResponse>('/security/snippet', {
      code,
      language,
      file_path: filePath,
    });
    return res.data;
  },

  async scanProject(projectId: string): Promise<SecurityScanResponse> {
    const res = await api.post<SecurityScanResponse>(`/security/${projectId}/scan`);
    return res.data;
  },
};
