import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Bell,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const notifications = [
    { id: 1, title: 'Repository Ingestion Completed', desc: 'AURON AI Core E-Commerce API indexed into Qdrant.', time: '10m ago' },
    { id: 2, title: 'Bug Scan Finished', desc: '3 logical vulnerabilities identified in security_audit_test.py.', time: '25m ago' },
    { id: 3, title: 'Groq LPU Acceleration Online', desc: 'Active model: openai/gpt-oss-120b.', time: '1h ago' },
  ];

  const isCodeMode = location.pathname.startsWith('/sandbox');

  return (
    <header className="h-14 border-b border-white/[0.08] bg-graphite-deep px-5 flex items-center justify-between z-10 shrink-0 text-xs">
      {/* Left: Clean Brand & Mode Header */}
      <div
        onClick={() => navigate('/sandbox')}
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
      >
        <img src="/auron-logo.png" alt="" className="h-5 w-5 object-contain" />
        <span className="font-medium text-graphite-text text-sm tracking-tight">AURON</span>
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-graphite-raised text-graphite-muted border border-white/[0.06]">
          {isCodeMode
            ? 'Code Mode'
            : location.pathname.startsWith('/projects')
            ? 'Project Mode'
            : location.pathname.startsWith('/chat')
            ? 'AI Chat'
            : location.pathname === '/' || location.pathname === '/welcome'
            ? 'Welcome'
            : 'Workspace'}
        </span>
      </div>

      {/* Right: Quick Search & Notifications */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 bg-graphite-card border border-white/[0.08] px-2.5 py-1 rounded-md text-graphite-muted focus-within:border-white/[0.2] transition w-52">
          <Search className="w-3.5 h-3.5" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search code or symbols..."
            className="bg-transparent border-none text-[11px] text-graphite-text placeholder:text-graphite-muted focus:outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-md hover:bg-graphite-raised text-graphite-muted hover:text-graphite-text transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-graphite-card border border-white/[0.08] rounded-md shadow-2xl py-2 z-50">
              <div className="px-3 pb-2 border-b border-white/[0.08] flex items-center justify-between">
                <span className="font-medium text-graphite-text text-xs">Activity</span>
                <span className="text-[10px] font-mono text-graphite-muted">3 events</span>
              </div>
              <div className="divide-y divide-white/[0.06] max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 hover:bg-graphite-raised transition">
                    <p className="text-[11px] font-medium text-graphite-text">{n.title}</p>
                    <p className="text-[10px] text-graphite-muted mt-0.5 leading-relaxed">{n.desc}</p>
                    <span className="text-[9px] text-graphite-muted font-mono mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
