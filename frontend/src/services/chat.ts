import api from './api';
import { Conversation, ChatMessage } from '../types';

export const chatService = {
  async getConversations(projectId: string): Promise<Conversation[]> {
    const res = await api.get<Conversation[]>(`/chat/${projectId}/conversations`);
    return res.data;
  },

  async createConversation(projectId: string, title?: string): Promise<Conversation> {
    const res = await api.post<Conversation>(`/chat/${projectId}/conversations`, {
      project_id: projectId,
      title: title || 'New Conversation',
    });
    return res.data;
  },

  async getConversationDetails(projectId: string, conversationId: string): Promise<Conversation> {
    const res = await api.get<Conversation>(`/chat/${projectId}/conversations/${conversationId}`);
    return res.data;
  },

  async sendMessage(projectId: string, conversationId: string, content: string): Promise<ChatMessage> {
    const res = await api.post<ChatMessage>(`/chat/${projectId}/conversations/${conversationId}/messages`, {
      content,
    });
    return res.data;
  },
};
