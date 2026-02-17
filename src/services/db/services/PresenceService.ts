import { supabase } from '../../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { User } from '../../../types';

type PresenceCallback = (onlineUsers: User[]) => void;

interface PresenceUserState {
  id: string;
  name: string;
  role: User['role'];
  avatar?: string;
  online_at?: string;
}

type PresenceStateMap = Record<string, PresenceUserState[]>;

interface PresenceJoinPayload {
  key: string;
  newPresences: PresenceUserState[];
}

interface PresenceLeavePayload {
  key: string;
  leftPresences: PresenceUserState[];
}

class PresenceService {
  private channel: RealtimeChannel | null = null;
  private onlineUsers: User[] = [];
  private callbacks: PresenceCallback[] = [];
  private currentUser: User | null = null;
  private isConnected = false;

  constructor() {
    this.init();
  }

  private init() {
    // We defer channel creation until join() is called to ensure we have user info
  }

  public async join(user: User) {
    if (this.isConnected && this.currentUser?.id === user.id) return; // Already connected

    this.currentUser = user;
    
    // Create channel if not exists or rejoin
    if (this.channel) {
       await this.leave();
    }

    this.channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    this.channel
      .on('presence', { event: 'sync' }, () => {
        const newState = this.channel?.presenceState() as PresenceStateMap;
        this.updateOnlineUsers(newState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: PresenceJoinPayload) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: PresenceLeavePayload) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          const channel = this.channel;
          if (!channel) return;
          await channel.track({
            id: user.id,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            online_at: new Date().toISOString(),
          });
          console.log(`🟢 Realtime Presence: Joined as ${user.name}`);
        }
      });
  }

  public async leave() {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
      this.isConnected = false;
      this.currentUser = null;
      console.log('🔴 Realtime Presence: Disconnected');
    }
  }

  public subscribe(callback: PresenceCallback) {
    this.callbacks.push(callback);
    // Send immediate state if available
    if (this.onlineUsers.length > 0) {
        callback(this.onlineUsers);
    }
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  private updateOnlineUsers(presenceState: PresenceStateMap) {
    // Transform presence state object into a flat list of users
    // presenceState is like: { 'userId1': [ {userObj}, {userObj} ], 'userId2': ... }
    const users: User[] = [];
    
    Object.values(presenceState).forEach((presences: PresenceUserState[]) => {
      presences.forEach((presence: PresenceUserState) => {
        // Avoid duplicates if a user has multiple tabs open (though key is user.id, so Supabase handles mostly)
        // actually supbase presenceState groups by key.
        if (!users.find(u => u.id === presence.id)) {
            users.push({
                id: presence.id,
                name: presence.name,
                role: presence.role as User['role'],
                avatar: presence.avatar
            });
        }
      });
    });

    this.onlineUsers = users;
    this.notifySubscribers();
  }

  private notifySubscribers() {
    this.callbacks.forEach(cb => cb(this.onlineUsers));
  }
  
  public getOnlineUsers() {
      return this.onlineUsers;
  }
}

export const presenceService = new PresenceService();
