import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project } from '../types';
import { projectService } from '../services/projects';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  isLoadingProjects: boolean;
  setActiveProject: (project: Project | null) => void;
  loadProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  uploadZip: (projectId: string, file: File, onProgress?: (p: any) => void) => Promise<Project>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);

  const loadProjects = async () => {
    if (!isAuthenticated) return;
    setIsLoadingProjects(true);
    try {
      const data = await projectService.getProjects();
      setProjects(data);

      const savedProjectId = localStorage.getItem('devmind_active_project_id');
      if (savedProjectId) {
        const found = data.find((p) => p.id === savedProjectId);
        if (found) {
          setActiveProjectState(found);
        } else if (data.length > 0) {
          setActiveProjectState(data[0]);
          localStorage.setItem('devmind_active_project_id', data[0].id);
        }
      } else if (data.length > 0) {
        setActiveProjectState(data[0]);
        localStorage.setItem('devmind_active_project_id', data[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    } else {
      setProjects([]);
      setActiveProjectState(null);
    }
  }, [isAuthenticated]);

  const setActiveProject = (project: Project | null) => {
    setActiveProjectState(project);
    if (project) {
      localStorage.setItem('devmind_active_project_id', project.id);
    } else {
      localStorage.removeItem('devmind_active_project_id');
    }
  };

  const createProject = async (name: string, description?: string) => {
    const created = await projectService.createProject({ name, description });
    await loadProjects();
    setActiveProject(created);
    return created;
  };

  const deleteProject = async (id: string) => {
    await projectService.deleteProject(id);
    if (activeProject?.id === id) {
      setActiveProject(null);
    }
    await loadProjects();
  };

  const uploadZip = async (projectId: string, file: File, onProgress?: (p: any) => void) => {
    const updated = await projectService.uploadZip(projectId, file, onProgress);
    await loadProjects();
    setActiveProject(updated);
    return updated;
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        isLoadingProjects,
        setActiveProject,
        loadProjects,
        createProject,
        deleteProject,
        uploadZip,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
