import { supabase } from '../../supabase';
import { User } from '../../../types';

export interface ChatTask {
  id: string;
  text: string;
  assignee: string; // Label
  targetRole: string; // Value
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  createdBy?: string;
}

class TaskService {
  private channel: any;

  async getTasks(): Promise<ChatTask[]> {
    // Retention Policy:
    // Fetch last 60 days (Hard Limit)
    // Client-side filter: Active OR (Completed within last 7 days)
    
    const archiveLimit = new Date();
    archiveLimit.setDate(archiveLimit.getDate() - 60);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .gte('created_at', archiveLimit.toISOString()) 
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
    
    // Filter locally to ensure logic correctness
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const filtereddata = data.filter((t: any) => {
        if (!t.completed) return true; // Keep all active
        if (!t.completed_at) return true; // Keep legacy completed (no date) just in case
        
        // "End of Day" logic:
        // Keep if completed_at is AFTER today's start (i.e., completed today)
        return new Date(t.completed_at) >= todayStart;
    });

    return filtereddata.map((t: any) => ({
      id: t.id,
      text: t.text,
      assignee: t.assignee,
      targetRole: t.target_role,
      completed: t.completed,
      completedAt: t.completed_at,
      completedBy: t.completed_by,
      createdAt: t.created_at,
      createdBy: t.created_by
    }));
  }



  async addTask(text: string, assignee: string, targetRole: string, createdBy?: string) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        text,
        assignee,
        target_role: targetRole,
        completed: false,
        created_by: createdBy,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding task:', error);
      throw error;
    }

    return {
      id: data.id,
      text: data.text,
      assignee: data.assignee,
      targetRole: data.target_role,
      completed: data.completed,
      createdAt: data.created_at
    };
  }

  async toggleTask(id: string, completed: boolean, userId?: string) {
    const updateData: any = { completed };
    
    if (completed) {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = userId;
    } else {
        updateData.completed_at = null;
        updateData.completed_by = null;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id);

    if (error) console.error('Error toggling task:', error);
  }

  async deleteTask(id: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting task:', error);
  }

  async updateTask(id: string, text: string) {
    const { error } = await supabase
      .from('tasks')
      .update({ text })
      .eq('id', id);

    if (error) console.error('Error updating task:', error);
  }

  subscribe(callback: (payload: any) => void) {
    this.channel = supabase
      .channel('tasks-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      if (this.channel) supabase.removeChannel(this.channel);
    };
  }
}

export const taskService = new TaskService();
