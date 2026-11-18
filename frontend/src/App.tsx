import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { AppLayout } from './components/layout/AppLayout';
import { Register } from './pages/Register';
import { Welcome } from './pages/Welcome';
import { Projects } from './pages/Projects';
import { CodeSandbox } from './pages/CodeSandbox';
import { AIChat } from './pages/AIChat';
import { Settings } from './pages/Settings';
import { LoadingSpinner } from './components/common/LoadingSpinner';

const RootRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { pathname } = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-graphite-bg">
        <LoadingSpinner size="lg" label="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return pathname === '/' || pathname === '/welcome' ? <Welcome /> : <Navigate to="/" replace />;
  }

  if (pathname === '/' || pathname === '/welcome') {
    return <Navigate to="/sandbox" replace />;
  }

  return <AppLayout />;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-graphite-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              }
            />

            {/* Protected Workspace Layout */}
            <Route
              path="/"
              element={
                <RootRoute />
              }
            >
              {/* AURON AI Starting Welcome Page */}
              <Route index element={<Welcome />} />
              <Route path="welcome" element={<Welcome />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />

              {/* Core Workflows */}
              <Route path="projects" element={<Projects />} />
              <Route path="sandbox" element={<CodeSandbox />} />
              <Route path="chat" element={<AIChat />} />
              <Route path="agents" element={<Navigate to="/" replace />} />

              {/* Settings & Configuration */}
              <Route path="settings" element={<Settings />} />

              {/* Compatibility Aliases & Clean Consolidation Redirects */}
              <Route path="project" element={<Navigate to="/projects" replace />} />
              <Route path="code" element={<Navigate to="/sandbox" replace />} />
              <Route path="explorer" element={<Navigate to="/projects?tab=explorer" replace />} />
              <Route path="bugs" element={<Navigate to="/projects?tab=health" replace />} />
              <Route path="security" element={<Navigate to="/projects?tab=health" replace />} />
              <Route path="review" element={<Navigate to="/sandbox" replace />} />
              <Route path="codegen" element={<Navigate to="/sandbox" replace />} />
              <Route path="refactor" element={<Navigate to="/sandbox" replace />} />
              <Route path="tests" element={<Navigate to="/sandbox" replace />} />
              <Route path="docs" element={<Navigate to="/projects?tab=health" replace />} />
              <Route path="history" element={<Navigate to="/projects" replace />} />
            </Route>

            {/* Catch-all redirect to starting page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
