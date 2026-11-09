import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { chatService } from '../services/chat';
import { Conversation, ChatMessage } from '../types';
import {
  MessageSquareCode,
  Plus,
  Send,
  User as UserIcon,
  Cpu,
  FileCode,
  Layers,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
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

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages, sending]);

  // Load conversations when active project changes
  useEffect(() => {
    if (!activeProject) return;
    const loadConversations = async () => {
      setLoadingChats(true);
      try {
        const convList = await chatService.getConversations(activeProject.id);
        setConversations(convList);
        if (convList.length > 0) {
          setActiveConvId(convList[0].id);
        } else {
          // Auto create a first conversation
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

  // Load active conversation details & messages
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

    // Optimistically append user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConvId,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };

    setActiveConv((prev) =>
      prev ? { ...prev, messages: [...(prev.messages || []), tempUserMsg] } : null
    );

    try {
      const assistantMsg = await chatService.sendMessage(activeProject.id, activeConvId, userText);
      setActiveConv((prev) =>
        prev
          ? {
              ...prev,
              messages: (prev.messages || []).map((m) => (m.id === tempUserMsg.id ? tempUserMsg : m)).concat(assistantMsg),
            }
          : null
      );
      // Refresh conversation list to get updated titles
      const convList = await chatService.getConversations(activeProject.id);
      setConversations(convList);
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const toggleSourceSnippet = (key: string) => {
    setExpandedSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!activeProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Layers className="w-12 h-12 text-slate-600 mb-3" />
        <h2 className="text-base font-semibold text-white">No Repository Selected</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">
          Select or upload an active repository to enable RAG-powered context chat.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition"
        >
          Select Repository
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-4 overflow-hidden">
      {/* Left Drawer: Conversations */}
      <div className="w-72 bg-dark-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Conversations</span>
          <button
            onClick={handleNewChat}
            className="p-1 rounded bg-brand-600 hover:bg-brand-500 text-white transition flex items-center gap-1 text-[11px] px-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingChats ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner size="sm" label="Loading chats..." />
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConvId(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition flex items-center gap-2.5 ${
                  activeConvId === c.id
                    ? 'bg-brand-500/15 text-brand-400 font-semibold border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <MessageSquareCode className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1">{c.title}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Area: Message Stream & Input */}
      <div className="flex-1 bg-dark-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="h-12 px-5 border-b border-slate-800 flex items-center justify-between bg-dark-950/60 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-white truncate">
              {activeConv?.title || 'Repository Assistant'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] font-mono text-brand-400">
              Qdrant RAG Enabled ({activeProject.name})
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeConv?.messages && activeConv.messages.length > 0 ? (
            activeConv.messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id || idx} className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-500/20">
                      <Cpu className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-4 rounded-xl text-xs leading-relaxed whitespace-pre-wrap font-sans ${
                        isUser
                          ? 'bg-brand-600 text-white rounded-tr-none shadow-md'
                          : 'bg-dark-950 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Source Citations for Assistant */}
                    {!isUser && msg.source_references && msg.source_references.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <FileCode className="w-3 h-3 text-brand-400" />
                          <span>Retrieved Source Citations ({msg.source_references.length}):</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.source_references.map((src, sIdx) => {
                            const sourceKey = `${msg.id || idx}-${sIdx}`;
                            const isSnippetOpen = !!expandedSources[sourceKey];
                            return (
                              <div key={sIdx} className="w-full">
                                <button
                                  onClick={() => toggleSourceSnippet(sourceKey)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700/80 transition"
                                >
                                  {isSnippetOpen ? (
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-slate-400" />
                                  )}
                                  <span className="text-brand-400 font-semibold">{src.file_path}</span>
                                  {src.start_line && src.end_line && (
                                    <span className="text-slate-500">
                                      :L{src.start_line}-L{src.end_line}
                                    </span>
                                  )}
                                  {src.score && (
                                    <span className="text-[10px] text-emerald-400/90 ml-1">
                                      {(src.score * 100).toFixed(0)}% match
                                    </span>
                                  )}
                                </button>

                                {isSnippetOpen && src.snippet && (
                                  <div className="mt-1 p-2.5 bg-dark-950 border border-slate-800/90 rounded-md font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
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

                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <MessageSquareCode className="w-10 h-10 text-slate-700 mb-2" />
              <p className="text-xs font-medium text-slate-300">Repository RAG Ready</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Ask questions about your codebase, functions, architecture, or find where features are implemented.
              </p>
            </div>
          )}

          {sending && (
            <div className="flex gap-3.5 items-start">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="p-3.5 bg-dark-950 border border-slate-800 rounded-xl rounded-tl-none">
                <LoadingSpinner size="sm" label="Searching repository vector index..." />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-dark-950/60 shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Ask about ${activeProject.name} (e.g. 'Where is authentication handled?' or 'Explain the database models')...`}
              disabled={sending}
              className="flex-1 px-4 py-2.5 bg-dark-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || sending}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/20 transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
