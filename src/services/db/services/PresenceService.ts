import { supabase } from '../../supabase';
import { User } from '../../../types';

type PresenceCallback = (onlineUsers: User[]) => void;

class PresenceService {
  private channel: any;
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
        const newState = this.channel.presenceState();
        this.updateOnlineUsers(newState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          await this.channel.track({
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

  private updateOnlineUsers(presenceState: any) {
    // Transform presence state object into a flat list of users
    // presenceState is like: { 'userId1': [ {userObj}, {userObj} ], 'userId2': ... }
    const users: User[] = [];
    
    Object.values(presenceState).forEach((presences: any) => {
      presences.forEach((presence: any) => {
        // Avoid duplicates if a user has multiple tabs open (though key is user.id, so Supabase handles mostly)
        // actually supbase presenceState groups by key.
        if (!users.find(u => u.id === presence.id)) {
            users.push({
                id: presence.id,
                name: presence.name,
                role: presence.role,
                avatar: presence.avatar
            } as User);
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
