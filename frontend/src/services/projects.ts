import api from './api';
import { Project, TreeNode, ProjectFileDetail, RepositoryHealthScoreResponse } from '../types';

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const res = await api.get<Project[]>('/projects');
    return res.data;
  },

  async getProject(id: string): Promise<Project> {
    const res = await api.get<Project>(`/projects/${id}`);
    return res.data;
  },

  async createProject(data: { name: string; description?: string }): Promise<Project> {
    const res = await api.post<Project>('/projects', data);
    return res.data;
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async uploadZip(projectId: string, file: File, onUploadProgress?: (progressEvent: any) => void): Promise<Project> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<Project>(`/projects/${projectId}/upload-zip`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return res.data;
  },

  async importGithub(projectId: string, githubUrl: string, githubToken?: string): Promise<Project> {
    const res = await api.post<Project>(`/projects/${projectId}/import-github`, {
      github_url: githubUrl,
      github_token: githubToken || undefined,
    });
    return res.data;
  },

  async createSampleDemo(): Promise<Project> {
    const res = await api.post<Project>('/projects/sample-demo');
    return res.data;
  },

  async getHealthScore(projectId: string): Promise<RepositoryHealthScoreResponse> {
    const res = await api.get<RepositoryHealthScoreResponse>(`/projects/${projectId}/health-score`);
    return res.data;
  },

  async getRepositoryTree(projectId: string): Promise<TreeNode[]> {
    const res = await api.get<TreeNode[]>(`/repository/${projectId}/tree`);
    return res.data;
  },

  async getFileContent(projectId: string, filePath: string): Promise<ProjectFileDetail> {
    const res = await api.get<ProjectFileDetail>(`/repository/${projectId}/file`, {
      params: { path: filePath },
    });
    return res.data;
  },
};

