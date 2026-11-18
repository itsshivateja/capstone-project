import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = '' }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  let codeBlockCounter = 0;

  return (
    <div className={`prose prose-invert max-w-none text-xs leading-relaxed space-y-2 break-words text-graphite-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-medium text-graphite-text border-b border-white/[0.08] pb-1 mt-3 mb-1.5 flex items-center gap-1.5">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-medium text-graphite-text mt-2.5 mb-1 flex items-center gap-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-medium text-graphite-text mt-2 mb-1 flex items-center gap-1.5">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2 leading-relaxed text-graphite-text">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="text-graphite-secondary italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-2 text-graphite-secondary">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-2 text-graphite-secondary">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/30 bg-white/[0.03] pl-3 py-1 my-2 text-graphite-secondary italic rounded-r">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-lg border border-white/[0.08] bg-graphite-deep">
              <table className="w-full text-left text-[11px] border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-graphite-raised text-graphite-text font-medium border-b border-white/[0.08]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody className="divide-y divide-white/[0.06]">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-white/[0.02] transition">{children}</tr>,
          th: ({ children }) => <th className="p-2 font-mono text-[10px] uppercase text-graphite-muted">{children}</th>,
          td: ({ children }) => <td className="p-2 align-top text-graphite-secondary">{children}</td>,
          code({ node, inline, className: codeClass, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClass || '');
            const lang = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const currentIndex = codeBlockCounter++;

            if (!inline && (match || codeString.includes('\n'))) {
              return (
                <div className="my-2 rounded-md overflow-hidden border border-white/[0.08] bg-graphite-deep group">
                  <div className="flex items-center justify-between px-3 py-1 bg-graphite-card border-b border-white/[0.08] text-[10px] text-graphite-muted font-mono">
                    <span className="flex items-center gap-1.5 text-graphite-text">
                      <Terminal className="w-3 h-3 text-graphite-muted" />
                      {lang || 'code'}
                    </span>
                    <button
                      onClick={() => handleCopyCode(codeString, currentIndex)}
                      className="flex items-center gap-1 text-graphite-muted hover:text-white transition px-1.5 py-0.5 rounded hover:bg-graphite-raised"
                      title="Copy code"
                    >
                      {copiedIndex === currentIndex ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 text-[11px] font-mono overflow-x-auto text-graphite-text leading-relaxed bg-[#0f0f10]">
                    <code>{codeString}</code>
                  </pre>
                </div>
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded bg-graphite-raised text-graphite-text font-mono text-[11px] border border-white/[0.08]"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
