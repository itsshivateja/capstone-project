import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { chatService } from '../services/chat';
import { Conversation, ChatMessage } from '../types';
import {
  MessageSquareCode,
  Plus,
  Send,
  User as UserIcon,
  Bot,
  FileCode,
  ChevronDown,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MarkdownViewer } from '../components/common/MarkdownViewer';
import { useNavigate } from 'react-router-dom';

export const AIChat: React.FC = () => {
  const { activeProject } = useProject();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages, sending]);

  useEffect(() => {
    const storedPrompt = sessionStorage.getItem('auron_ai_chat_prompt');
    if (storedPrompt) {
      setInputMessage(storedPrompt);
      sessionStorage.removeItem('auron_ai_chat_prompt');
    }

    if (!activeProject) return;
    const loadConversations = async () => {
      setLoadingChats(true);
      try {
        const convList = await chatService.getConversations(activeProject.id);
        setConversations(convList);
        if (convList.length > 0) {
          setActiveConvId(convList[0].id);
        } else {
          const newC = await chatService.createConversation(activeProject.id, 'Repository Architecture Discussion');
          setConversations([newC]);
          setActiveConvId(newC.id);
        }
      } catch (err) {
        console.error('Failed to load conversations', err);
      } finally {
        setLoadingChats(false);
      }
    };
    loadConversations();
  }, [activeProject]);

  useEffect(() => {
    if (!activeProject || !activeConvId) return;
    const loadDetails = async () => {
      try {
        const fullConv = await chatService.getConversationDetails(activeProject.id, activeConvId);
        setActiveConv(fullConv);
      } catch (err) {
        console.error('Failed to load conversation details', err);
      }
    };
    loadDetails();
  }, [activeProject, activeConvId]);

  const handleNewChat = async () => {
    if (!activeProject) return;
    try {
      const created = await chatService.createConversation(activeProject.id, 'New Conversation');
      setConversations([created, ...conversations]);
      setActiveConvId(created.id);
    } catch (err) {
      console.error('Failed to create new chat', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeProject || !activeConvId || sending) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConvId,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };

    if (activeConv) {
      setActiveConv({
        ...activeConv,
        messages: [...(activeConv.messages || []), tempUserMsg],
      });
    }

    try {
      const assistantMsg = await chatService.sendMessage(activeProject.id, activeConvId, userText);
      setActiveConv((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...(prev.messages || []).filter((m) => m.id !== tempUserMsg.id), tempUserMsg, assistantMsg],
        };
      });
    } catch (err: any) {
      console.error('Failed to send message', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        conversation_id: activeConvId,
        role: 'assistant',
        content: `Error generating response: ${err.response?.data?.detail || err.message || 'Please check your connection.'}`,
        created_at: new Date().toISOString(),
      };
      setActiveConv((prev) => (prev ? { ...prev, messages: [...(prev.messages || []), errorMsg] } : null));
    } finally {
      setSending(false);
    }
  };

  const toggleSourceSnippet = (key: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!activeProject) {
    return (
      <div className="h-[calc(100vh-6rem)] flex flex-col items-center justify-center p-6 text-center text-xs text-graphite-muted">
        <div className="w-10 h-10 rounded-md bg-graphite-card border border-white/[0.08] flex items-center justify-center text-graphite-muted mb-3">
          <Terminal className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-medium text-graphite-text">No active repository</h2>
        <p className="text-xs text-graphite-muted mt-1 max-w-sm">
          Select or upload a repository in Project Mode to enable vector-grounded RAG conversations.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-4 px-3 py-1.5 bg-graphite-text hover:bg-white text-graphite-deep rounded-md transition text-xs font-medium"
        >
          Select repository
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-3 overflow-hidden text-xs text-graphite-text">
      {/* Left Column: Conversations */}
      <div className="w-64 bg-graphite-card border border-white/[0.08] rounded-xl flex flex-col overflow-hidden shrink-0">
        <div className="p-3 border-b border-white/[0.08] flex items-center justify-between">
          <span className="text-xs font-medium text-graphite-text">Conversations</span>
          <button
            onClick={handleNewChat}
            className="p-1 rounded bg-graphite-raised hover:bg-white/[0.08] text-graphite-secondary hover:text-graphite-text transition flex items-center gap-1 text-[11px] px-2 border border-white/[0.06]"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {loadingChats ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner size="sm" label="Loading..." />
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConvId(c.id)}
                className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition flex items-center gap-2 ${
                  activeConvId === c.id
                    ? 'bg-graphite-raised text-graphite-text font-medium border border-white/[0.08]'
                    : 'text-graphite-secondary hover:text-graphite-text hover:bg-graphite-raised/50 border border-transparent'
                }`}
              >
                <MessageSquareCode className="w-3.5 h-3.5 shrink-0 text-graphite-muted" />
                <span className="truncate flex-1">{c.title}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Area: Messages & Input */}
      <div className="flex-1 bg-graphite-card border border-white/[0.08] rounded-xl flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="h-12 px-4 border-b border-white/[0.08] flex items-center justify-between bg-graphite-card shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-graphite-text truncate">
              {activeConv?.title || 'Repository Assistant'}
            </span>
            <span className="text-graphite-muted">•</span>
            <span className="text-[11px] font-mono text-graphite-muted">
              RAG Indexed ({activeProject.name})
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeConv?.messages && activeConv.messages.length > 0 ? (
            activeConv.messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id || idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-7 h-7 rounded-md bg-graphite-raised border border-white/[0.08] flex items-center justify-center text-graphite-secondary shrink-0">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[82%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-lg text-xs leading-relaxed ${
                        isUser
                          ? 'bg-graphite-raised border border-white/[0.08] text-graphite-text whitespace-pre-wrap'
                          : 'bg-graphite-deep border border-white/[0.08] text-graphite-text'
                      }`}
                    >
                      {isUser ? (
                        msg.content
                      ) : (
                        <MarkdownViewer content={msg.content} />
                      )}
                    </div>

                    {/* Source Citations */}
                    {!isUser && msg.source_references && msg.source_references.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        <p className="text-[10px] font-mono text-graphite-muted flex items-center gap-1">
                          <FileCode className="w-3 h-3 text-graphite-muted" />
                          <span>Citations ({msg.source_references.length}):</span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {msg.source_references.map((src, sIdx) => {
                            const sourceKey = `${msg.id || idx}-${sIdx}`;
                            const isSnippetOpen = !!expandedSources[sourceKey];
                            return (
                              <div key={sIdx} className="w-full">
                                <button
                                  onClick={() => toggleSourceSnippet(sourceKey)}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-graphite-deep hover:bg-graphite-raised text-graphite-secondary font-mono text-[10px] border border-white/[0.06] transition"
                                >
                                  {isSnippetOpen ? (
                                    <ChevronDown className="w-3 h-3 text-graphite-muted" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-graphite-muted" />
                                  )}
                                  <span className="text-graphite-text">{src.file_path}</span>
                                  {src.start_line && src.end_line && (
                                    <span className="text-graphite-muted">
                                      :L{src.start_line}-L{src.end_line}
                                    </span>
                                  )}
                                </button>

                                {isSnippetOpen && src.snippet && (
                                  <div className="mt-1 p-2 bg-graphite-deep border border-white/[0.06] rounded font-mono text-[10px] text-graphite-secondary overflow-x-auto whitespace-pre">
                                    {src.snippet}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-graphite-muted py-12">
              <MessageSquareCode className="w-8 h-8 text-graphite-muted mb-2" />
              <p className="font-medium text-graphite-text">Empty session</p>
              <p className="text-[11px] text-graphite-muted mt-1 max-w-xs">
                Ask architectural questions, locate implementation details, or request code modifications.
              </p>
            </div>
          )}

          {sending && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-graphite-deep border border-white/[0.08] text-graphite-muted">
              <LoadingSpinner size="sm" />
              <span>Querying vector store & inference engine...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-white/[0.08] bg-graphite-card">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question about the active repository..."
              disabled={sending}
              className="flex-1 bg-graphite-deep border border-white/[0.08] rounded-md px-3 py-2 text-xs text-graphite-text placeholder:text-graphite-muted focus:outline-none focus:border-white/[0.2] transition font-sans"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || sending}
              className="px-4 py-2 bg-graphite-text hover:bg-white text-graphite-deep font-medium rounded-md transition text-xs disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
