import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PersistentChatDrawer } from '../chat/PersistentChatDrawer';

export const AppLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="auron-workspace relative flex h-screen w-screen overflow-hidden bg-graphite-bg font-sans text-graphite-text">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-5 bg-graphite-bg">
          <Outlet />
        </main>
      </div>
      <PersistentChatDrawer />
    </div>
  );
};
