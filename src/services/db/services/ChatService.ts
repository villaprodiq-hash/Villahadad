
import { supabase } from '../../supabase';
import { User } from '../../../types';

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId?: string | null;
  type: 'text' | 'image' | 'file' | 'audio';
  createdAt: string;
  isRead: boolean;
}

class ChatService {
  private channel: any;

  async sendMessage(content: string, sender: User, recipientId?: string | null, type: 'text' | 'image' | 'file' | 'audio' = 'text') {
    const message = {
      content,
      sender_id: sender.id,
      sender_name: sender.name,
      sender_role: sender.role,
      recipient_id: recipientId || null,
      type,
      created_at: new Date().toISOString(),
      is_read: false
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    return data;
  }

  subscribe(callback: (message: ChatMessage) => void) {
    this.channel = supabase
      .channel('chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          callback({
            id: newMsg.id,
            content: newMsg.content,
            senderId: newMsg.sender_id,
            senderName: newMsg.sender_name,
            senderRole: newMsg.sender_role,
            recipientId: newMsg.recipient_id,
            type: newMsg.type,
            createdAt: newMsg.created_at,
            isRead: newMsg.is_read
          });
        }
      )
      .subscribe();

    return () => {
      if (this.channel) supabase.removeChannel(this.channel);
    };
  }

  async getRecentMessages(limit = 100): Promise<ChatMessage[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .gte('created_at', yesterday.toISOString()) // Only last 24 hours
      .order('created_at', { ascending: false }) // Get newest first
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    // Return in chronological order (oldest first) for UI
    return data.reverse().map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.sender_id,
      senderName: msg.sender_name,
      senderRole: msg.sender_role,
      recipientId: msg.recipient_id,
      type: msg.type,
      createdAt: msg.created_at,
      isRead: msg.is_read
    }));
  }
}

export const chatService = new ChatService();
