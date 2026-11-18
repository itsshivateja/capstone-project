import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import { chatService } from '../../services/chat';
import { snippetService } from '../../services/snippet';
import { ChatMessage, Conversation } from '../../types';
import {
  X,
  Send,
  Maximize2,
  User as UserIcon,
  ChevronRight,
  Plus,
  Terminal,
  Bot,
} from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MarkdownViewer } from '../common/MarkdownViewer';

export const SupportPilotLogo: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="support-pilot-grad-1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" />
        <stop offset="0.45" stopColor="#0ea5e9" />
        <stop offset="1" stopColor="#14b8a6" />
      </linearGradient>
      <radialGradient id="support-pilot-core" cx="12" cy="11" r="5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#67e8f9" />
        <stop offset="1" stopColor="#3b82f6" />
      </radialGradient>
    </defs>
    {/* Outer Cyber Wings */}
    <path
      d="M12 2.5L3.5 7.5V13C3.5 17.8 7.1 21.8 12 23C16.9 21.8 20.5 17.8 20.5 13V7.5L12 2.5Z"
      stroke="url(#support-pilot-grad-1)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner Jet Aerodynamic Pilot Crest */}
    <path
      d="M12 6L15 11L19.5 12.5L16 16L16.8 20.5L12 18L7.2 20.5L8 16L4.5 12.5L9 11L12 6Z"
      fill="url(#support-pilot-grad-1)"
      fillOpacity="0.22"
      stroke="url(#support-pilot-grad-1)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Central Pulsing Neural Core */}
    <circle cx="12" cy="13" r="2.2" fill="url(#support-pilot-core)" />
    <circle cx="12" cy="13" r="4.2" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
  </svg>
);

export const PersistentChatDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { activeProject } = useProject();
  const location = useLocation();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);

  // Active editor context from Code Mode
  const [editorCode, setEditorCode] = useState<string>('');
  const [editorFile, setEditorFile] = useState<string>('main.py');
  const [editorLang, setEditorLang] = useState<string>('python');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const code = sessionStorage.getItem('auron_ai_active_code') || '';
    const file = sessionStorage.getItem('auron_ai_active_filename') || 'main.py';
    const lang = sessionStorage.getItem('auron_ai_active_lang') || 'python';
    setEditorCode(code);
    setEditorFile(file);
    setEditorLang(lang);
  }, [isOpen, location.pathname]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, isOpen]);

  useEffect(() => {
    if (!activeProject || !isOpen) return;

    const initChat = async () => {
      setLoadingConv(true);
      try {
        const list = await chatService.getConversations(activeProject.id);
        if (list.length > 0) {
          const latest = await chatService.getConversationDetails(activeProject.id, list[0].id);
          setConversation(latest);
          setMessages(latest.messages || []);
        } else {
          const created = await chatService.createConversation(
            activeProject.id,
            'Repository Session'
          );
          setConversation(created);
          setMessages([]);
        }
      } catch (err) {
        console.error('Failed to initialize drawer chat:', err);
      } finally {
        setLoadingConv(false);
      }
    };

    if (!conversation || conversation.project_id !== activeProject.id) {
      initChat();
    }
  }, [activeProject, isOpen]);

  const handleNewConversation = async () => {
    if (activeProject) {
      try {
        const created = await chatService.createConversation(
          activeProject.id,
          `Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        );
        setConversation(created);
        setMessages([]);
      } catch (err) {
        console.error('Failed to create new chat session', err);
      }
    } else {
      setMessages([]);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const userText = inputText.trim();
    setInputText('');
    setIsSending(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation?.id || 'code-session',
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      if (activeProject) {
        let convId = conversation?.id;
        if (!convId) {
          const newConv = await chatService.createConversation(activeProject.id, 'Repository Session');
          setConversation(newConv);
          convId = newConv.id;
        }

        let queryToSend = userText;
        if (location.pathname.startsWith('/sandbox') && editorCode) {
          queryToSend = `[Context File: ${editorFile} (${editorLang})]\n\`\`\`${editorLang}\n${editorCode.slice(0, 1500)}\n\`\`\`\n\nQuestion: ${userText}`;
        }

        const aiResponse = await chatService.sendMessage(activeProject.id, convId, queryToSend);
        setMessages((prev) => [...prev, aiResponse]);
      } else {
        const codeToAnalyze = editorCode || '# Python Scratch\ndef example():\n    pass\n';
        const res = await snippetService.analyzeSnippet({
          code: codeToAnalyze,
          language: editorLang,
          action: 'explain',
          prompt: `User Query regarding ${editorFile}: ${userText}`,
        });

        const snippetResponse: ChatMessage = {
          id: `ai-${Date.now()}`,
          conversation_id: 'code-session',
          role: 'assistant',
          content: res.text_result || res.fix_result?.explanation || 'Analysis completed.',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, snippetResponse]);
      }
    } catch (err: any) {
      console.error('Failed to send drawer message:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        conversation_id: 'err',
        role: 'assistant',
        content: `Error: ${err.response?.data?.detail || err.message || 'Please check your connection and retry.'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const isCodeMode = location.pathname.startsWith('/sandbox');
  const assistantName = 'Support Pilot';

  const quickPrompts = isCodeMode
    ? [
        'Find bugs in this code.',
        'Explain this code line by line.',
        'How can I optimize this code?',
        'Suggest unit tests for this code.',
        'Refactor to follow clean architecture.',
      ]
    : [
        'Find bugs in this project.',
        'Explain the project architecture.',
        'Find the authentication implementation.',
        'Improve code quality.',
        'Help me implement a new feature.',
      ];

  return (
    <>
      {/* Support bot floating launcher */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title={`Open ${assistantName}`}
          aria-label={`Open ${assistantName}`}
          className="auron-support-bot fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/35 bg-gradient-to-br from-cyan-400/25 via-sky-500/25 to-teal-500/30 text-cyan-100 shadow-[0_12px_35px_rgba(8,145,178,0.35)] backdrop-blur-xl transition-all duration-200 hover:scale-110 hover:border-cyan-200/70 hover:shadow-[0_14px_42px_rgba(34,211,238,0.45)] group"
        >
          <span className="absolute inset-1 rounded-full border border-white/20" />
          <Bot className="relative h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#111827] bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
        </button>
      )}

      {/* Slide-out Persistent Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-graphite-deep border-l border-white/[0.08] shadow-2xl z-50 flex flex-col text-xs text-graphite-text">
          {/* Header */}
          <div className="h-14 px-4 border-b border-white/[0.08] bg-graphite-deep flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-graphite-card border border-white/[0.1] flex items-center justify-center text-graphite-text shrink-0 shadow-inner">
                <SupportPilotLogo size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-semibold text-graphite-text truncate">{assistantName}</h3>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-graphite-muted truncate font-mono">
                  {isCodeMode && editorFile ? (
                    `File: ${editorFile} (${editorLang})`
                  ) : activeProject ? (
                    `Repo: ${activeProject.name}`
                  ) : (
                    'Active workspace'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleNewConversation}
                title="New conversation"
                className="p-1 rounded text-graphite-muted hover:text-graphite-text hover:bg-graphite-raised transition text-[11px] flex items-center gap-1 px-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/chat');
                }}
                title="Expand to full screen"
                className="p-1 rounded text-graphite-muted hover:text-graphite-text hover:bg-graphite-raised transition"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1 rounded text-graphite-muted hover:text-graphite-text hover:bg-graphite-raised transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingConv ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner size="md" label="Loading context..." />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-8 space-y-3 text-center">
                <div className="w-10 h-10 rounded-xl bg-graphite-card border border-white/[0.08] flex items-center justify-center text-graphite-muted mx-auto shadow-inner">
                  <SupportPilotLogo size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-graphite-text">{assistantName} Assistant</h4>
                  <p className="text-[11px] text-graphite-muted max-w-xs mx-auto mt-0.5">
                    Grounded in repository AST symbols and active editor code buffers.
                  </p>
                </div>

                {/* Suggested Questions */}
                <div className="pt-2 space-y-1 text-left max-w-xs mx-auto">
                  <span className="text-[10px] text-graphite-muted block mb-1">
                    Suggested prompts:
                  </span>
                  {quickPrompts.map((qp) => (
                    <button
                      key={qp}
                      onClick={() => setInputText(qp)}
                      className="w-full text-left px-2.5 py-1.5 rounded bg-graphite-card border border-white/[0.06] hover:border-white/[0.14] text-[11px] text-graphite-secondary hover:text-graphite-text transition truncate flex items-center justify-between group"
                    >
                      <span className="truncate">{qp}</span>
                      <ChevronRight className="w-3 h-3 text-graphite-muted group-hover:text-graphite-text shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isAssistant = m.role === 'assistant';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col gap-1 ${isAssistant ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-graphite-muted font-mono px-1">
                      {isAssistant ? (
                        <>
                          <SupportPilotLogo size={13} />
                          <span className="text-cyan-400 font-medium">{assistantName}</span>
                        </>
                      ) : (
                        <>
                          <span>You</span>
                          <UserIcon className="w-3 h-3 text-graphite-muted" />
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[90%] rounded-lg p-3 text-xs leading-relaxed ${
                        isAssistant
                          ? 'bg-graphite-card border border-white/[0.08] text-graphite-text'
                          : 'bg-graphite-raised border border-white/[0.08] text-graphite-text'
                      }`}
                    >
                      {isAssistant ? (
                        <MarkdownViewer content={m.content} />
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      )}

                      {/* Source Citations */}
                      {m.source_references && m.source_references.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1">
                          <p className="text-[10px] text-graphite-muted font-mono">
                            Citations ({m.source_references.length}):
                          </p>
                          {m.source_references.map((ref, idx) => (
                            <div
                              key={idx}
                              className="text-[10px] font-mono text-graphite-secondary bg-graphite-deep px-2 py-0.5 rounded border border-white/[0.06] flex items-center justify-between"
                            >
                              <span className="truncate">{ref.file_path}</span>
                              {ref.start_line && (
                                <span className="text-graphite-muted shrink-0 ml-1">
                                  :L{ref.start_line}{ref.end_line ? `-L${ref.end_line}` : ''}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-graphite-card border border-white/[0.08] text-graphite-muted text-xs">
                <LoadingSpinner size="sm" />
                <span>Generating response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-white/[0.08] bg-graphite-deep">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Ask ${assistantName} about this code or repository...`}
                disabled={isSending}
                className="flex-1 bg-graphite-card border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/[0.2] transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-3 py-1.5 bg-graphite-text hover:bg-white text-graphite-deep font-medium rounded-md transition text-xs disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
