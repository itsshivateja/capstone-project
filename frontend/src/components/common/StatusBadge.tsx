import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeStyle = (st: string) => {
    switch (st.toLowerCase()) {
      case 'ready':
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'indexing':
      case 'uploaded':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'failed':
      case 'critical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'high':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'medium':
        return 'bg-graphite-raised text-graphite-text border-white/[0.08]';
      case 'low':
      case 'info':
        return 'bg-graphite-raised text-graphite-muted border-white/[0.08]';
      case 'ignored':
      default:
        return 'bg-graphite-deep text-graphite-muted border-white/[0.06]';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${getBadgeStyle(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {status.toUpperCase()}
    </span>
  );
};

