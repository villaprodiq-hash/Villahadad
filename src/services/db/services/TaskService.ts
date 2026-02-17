import { supabase } from '../../supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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

interface TaskRow {
  id: string;
  text: string;
  assignee: string;
  target_role: string;
  completed: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
  created_at: string;
  created_by?: string | null;
}

type LocalTaskEvent =
  | { action: 'upsert'; task: ChatTask }
  | { action: 'delete'; taskId: string }
  | { action: 'sync'; source: 'sqlite' | 'supabase' };

const LOCAL_TASKS_KEY = 'vh_local_chat_tasks_v1';
const LOCAL_TASK_EVENT = 'vh:chat-task';
const ARCHIVE_RETENTION_DAYS = 60;
const COMPLETED_RETENTION_DAYS = 7;
const SQLITE_POLL_INTERVAL_MS = 1800;
const LAN_TASK_CHANNEL = 'task-sync';

interface LanTaskPayload {
  action: 'upsert' | 'delete';
  task?: ChatTask;
  taskId?: string;
}

interface LanSyncEvent {
  channel?: string;
  payload?: unknown;
}

class TaskService {
  private channel: RealtimeChannel | null = null;
  private sqliteReady = false;

  private getDb() {
    if (typeof window === 'undefined') return null;
    return window.electronAPI?.db ?? null;
  }

  private getLanSync() {
    if (typeof window === 'undefined') return null;
    return window.electronAPI?.lanSync ?? null;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private safeDbUserId(userId?: string): string | null {
    if (!userId) return null;
    return this.isUuid(userId) ? userId : null;
  }

  private generateTaskId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `local_task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      return normalized === '1' || normalized === 'true';
    }
    return false;
  }

  private mapRowToTask(row: TaskRow): ChatTask {
    return {
      id: row.id,
      text: row.text,
      assignee: row.assignee,
      targetRole: row.target_role,
      completed: row.completed,
      completedAt: row.completed_at ?? undefined,
      completedBy: row.completed_by ?? undefined,
      createdAt: row.created_at,
      createdBy: row.created_by ?? undefined
    };
  }

  private isTaskRow(value: unknown): value is TaskRow {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as TaskRow).id === 'string' &&
      typeof (value as TaskRow).text === 'string' &&
      typeof (value as TaskRow).assignee === 'string' &&
      typeof (value as TaskRow).target_role === 'string' &&
      typeof (value as TaskRow).created_at === 'string'
    );
  }

  private mapSqliteRowToTask(value: unknown): ChatTask | null {
    if (typeof value !== 'object' || value === null) return null;
    const row = value as Record<string, unknown>;

    const id = typeof row.id === 'string' ? row.id : '';
    const text = typeof row.text === 'string' ? row.text : '';
    const assignee = typeof row.assignee === 'string' ? row.assignee : 'عام (للجميع)';
    const targetRole =
      typeof row.target_role === 'string'
        ? row.target_role
        : typeof row.targetRole === 'string'
          ? row.targetRole
          : 'all';
    const createdAt =
      typeof row.created_at === 'string'
        ? row.created_at
        : typeof row.createdAt === 'string'
          ? row.createdAt
          : new Date().toISOString();

    if (!id || !text) return null;

    return {
      id,
      text,
      assignee,
      targetRole,
      completed: this.toBoolean(row.completed),
      completedAt:
        typeof row.completed_at === 'string'
          ? row.completed_at
          : typeof row.completedAt === 'string'
            ? row.completedAt
            : undefined,
      completedBy:
        typeof row.completed_by === 'string'
          ? row.completed_by
          : typeof row.completedBy === 'string'
            ? row.completedBy
            : undefined,
      createdAt,
      createdBy:
        typeof row.created_by === 'string'
          ? row.created_by
          : typeof row.createdBy === 'string'
            ? row.createdBy
            : undefined
    };
  }

  private readLocalTasks(): ChatTask[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_TASKS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is ChatTask =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as ChatTask).id === 'string' &&
          typeof (item as ChatTask).text === 'string'
      );
    } catch (error) {
      console.error('[TaskService] Failed to read local tasks:', error);
      return [];
    }
  }

  private saveLocalTasks(tasks: ChatTask[]) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('[TaskService] Failed to save local tasks:', error);
    }
  }

  private normalizeTasks(tasks: ChatTask[]): ChatTask[] {
    const archiveCutoff = new Date();
    archiveCutoff.setDate(archiveCutoff.getDate() - ARCHIVE_RETENTION_DAYS);
    const archiveCutoffTime = archiveCutoff.getTime();

    const byId = new Map<string, ChatTask>();
    for (const task of tasks) {
      if (!task?.id) continue;
      const createdTime = new Date(task.createdAt || '').getTime();
      if (Number.isFinite(createdTime) && createdTime < archiveCutoffTime) continue;
      byId.set(task.id, task);
    }

    return Array.from(byId.values()).sort((a, b) => {
      const aTime = new Date(a.createdAt || '').getTime();
      const bTime = new Date(b.createdAt || '').getTime();
      return bTime - aTime;
    });
  }

  private visibleTasks(tasks: ChatTask[]): ChatTask[] {
    const completedCutoff = new Date();
    completedCutoff.setDate(completedCutoff.getDate() - COMPLETED_RETENTION_DAYS);
    const completedCutoffTime = completedCutoff.getTime();

    return tasks.filter(task => {
      if (!task.completed) return true;
      if (!task.completedAt) return true;
      const completedTime = new Date(task.completedAt).getTime();
      return Number.isFinite(completedTime) && completedTime >= completedCutoffTime;
    });
  }

  private upsertLocalTask(task: ChatTask): ChatTask[] {
    const current = this.readLocalTasks();
    const next = this.normalizeTasks([...current.filter(item => item.id !== task.id), task]);
    this.saveLocalTasks(next);
    return next;
  }

  private removeLocalTask(taskId: string): ChatTask[] {
    const current = this.readLocalTasks();
    const next = current.filter(task => task.id !== taskId);
    this.saveLocalTasks(next);
    return next;
  }

  private patchLocalTask(
    taskId: string,
    patch: Partial<Pick<ChatTask, 'text' | 'completed' | 'completedAt' | 'completedBy'>>
  ): ChatTask | null {
    const tasks = this.readLocalTasks();
    const idx = tasks.findIndex(task => task.id === taskId);
    if (idx === -1) return null;
    const existingTask = tasks[idx];
    if (!existingTask) return null;

    const updated: ChatTask = { ...existingTask, ...patch };
    tasks[idx] = updated;
    const normalized = this.normalizeTasks(tasks);
    this.saveLocalTasks(normalized);
    return updated;
  }

  private emitLocalEvent(event: LocalTaskEvent) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<LocalTaskEvent>(LOCAL_TASK_EVENT, { detail: event }));
  }

  private isValidTask(task: unknown): task is ChatTask {
    return (
      typeof task === 'object' &&
      task !== null &&
      typeof (task as ChatTask).id === 'string' &&
      typeof (task as ChatTask).text === 'string' &&
      typeof (task as ChatTask).assignee === 'string' &&
      typeof (task as ChatTask).targetRole === 'string' &&
      typeof (task as ChatTask).createdAt === 'string' &&
      typeof (task as ChatTask).completed === 'boolean'
    );
  }

  private async publishLanTask(payload: LanTaskPayload) {
    const lanSync = this.getLanSync();
    if (!lanSync?.publish) return;

    try {
      await lanSync.publish(LAN_TASK_CHANNEL, payload);
    } catch (error) {
      console.error('[TaskService] LAN publish failed:', error);
    }
  }

  private async applyLanTaskPayload(payload: LanTaskPayload) {
    if (payload.action === 'delete') {
      if (!payload.taskId) return;
      this.removeLocalTask(payload.taskId);
      await this.deleteSqliteTask(payload.taskId);
      this.emitLocalEvent({ action: 'delete', taskId: payload.taskId });
      return;
    }

    if (!this.isValidTask(payload.task)) return;
    const task = payload.task;
    this.upsertLocalTask(task);
    await this.upsertSqliteTask(task);
    this.emitLocalEvent({ action: 'upsert', task });
  }

  private buildTasksSignature(tasks: ChatTask[]): string {
    return tasks
      .map(task => `${task.id}|${task.completed ? '1' : '0'}|${task.text}|${task.completedAt ?? ''}`)
      .join('||');
  }

  private async ensureSqliteTasksTable() {
    if (this.sqliteReady) return;
    const db = this.getDb();
    if (!db?.run) return;

    try {
      await db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL,
          assignee TEXT NOT NULL,
          target_role TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 0,
          completed_at TEXT,
          completed_by TEXT,
          created_at TEXT NOT NULL,
          created_by TEXT
        )
      `);
      this.sqliteReady = true;
    } catch (error) {
      console.error('[TaskService] Failed to ensure sqlite tasks table:', error);
    }
  }

  private async fetchSqliteTasks(limit = 500): Promise<ChatTask[]> {
    const db = this.getDb();
    if (!db?.query) return [];
    await this.ensureSqliteTasksTable();

    try {
      const rows = await db.query(
        `
          SELECT id, text, assignee, target_role, completed, completed_at, completed_by, created_at, created_by
          FROM tasks
          ORDER BY created_at DESC
          LIMIT ?
        `,
        [limit]
      );

      if (!Array.isArray(rows)) return [];
      const parsed = rows
        .map(row => this.mapSqliteRowToTask(row))
        .filter((task): task is ChatTask => task !== null);

      return this.normalizeTasks(parsed);
    } catch (error) {
      console.error('[TaskService] Failed to read sqlite tasks:', error);
      return [];
    }
  }

  private async upsertSqliteTask(task: ChatTask) {
    const db = this.getDb();
    if (!db?.run) return;
    await this.ensureSqliteTasksTable();

    try {
      await db.run(
        `
          INSERT INTO tasks (
            id, text, assignee, target_role, completed, completed_at, completed_by, created_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            text = excluded.text,
            assignee = excluded.assignee,
            target_role = excluded.target_role,
            completed = excluded.completed,
            completed_at = excluded.completed_at,
            completed_by = excluded.completed_by,
            created_at = excluded.created_at,
            created_by = excluded.created_by
        `,
        [
          task.id,
          task.text,
          task.assignee,
          task.targetRole,
          task.completed ? 1 : 0,
          task.completedAt ?? null,
          task.completedBy ?? null,
          task.createdAt,
          task.createdBy ?? null
        ]
      );
    } catch (error) {
      console.error('[TaskService] Failed to upsert sqlite task:', error);
    }
  }

  private async deleteSqliteTask(taskId: string) {
    const db = this.getDb();
    if (!db?.run) return;
    await this.ensureSqliteTasksTable();

    try {
      await db.run(`DELETE FROM tasks WHERE id = ?`, [taskId]);
    } catch (error) {
      console.error('[TaskService] Failed to delete sqlite task:', error);
    }
  }

  private async handleRealtimePayload(payload: RealtimePostgresChangesPayload<TaskRow>) {
    if (payload.eventType === 'DELETE') {
      const oldId = typeof payload.old?.id === 'string' ? payload.old.id : null;
      if (!oldId) return;
      this.removeLocalTask(oldId);
      await this.deleteSqliteTask(oldId);
      this.emitLocalEvent({ action: 'delete', taskId: oldId });
      return;
    }

    const newRow = payload.new;
    if (!this.isTaskRow(newRow)) return;
    const task = this.mapRowToTask(newRow);
    this.upsertLocalTask(task);
    await this.upsertSqliteTask(task);
    this.emitLocalEvent({ action: 'upsert', task });
  }

  async getTasks(): Promise<ChatTask[]> {
    const localTasks = this.normalizeTasks(this.readLocalTasks());
    const sqliteTasks = await this.fetchSqliteTasks();
    const baseline = this.normalizeTasks([...localTasks, ...sqliteTasks]);
    this.saveLocalTasks(baseline);

    try {
      const archiveLimit = new Date();
      archiveLimit.setDate(archiveLimit.getDate() - ARCHIVE_RETENTION_DAYS);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .gte('created_at', archiveLimit.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const remoteRows = ((data ?? []) as TaskRow[]).filter(this.isTaskRow.bind(this));
      const remoteTasks = remoteRows.map(row => this.mapRowToTask(row));
      const merged = this.normalizeTasks([...baseline, ...remoteTasks]);
      this.saveLocalTasks(merged);
      await Promise.all(remoteTasks.map(task => this.upsertSqliteTask(task)));
      return this.visibleTasks(merged);
    } catch (error) {
      console.error('[TaskService] Failed to fetch remote tasks, using LAN/local cache:', error);
      return this.visibleTasks(baseline);
    }
  }

  async addTask(text: string, assignee: string, targetRole: string, createdBy?: string) {
    const taskId = this.generateTaskId();
    const createdAt = new Date().toISOString();
    const optimisticTask: ChatTask = {
      id: taskId,
      text,
      assignee,
      targetRole,
      completed: false,
      createdAt,
      createdBy
    };

    this.upsertLocalTask(optimisticTask);
    await this.upsertSqliteTask(optimisticTask);
    this.emitLocalEvent({ action: 'upsert', task: optimisticTask });
    await this.publishLanTask({ action: 'upsert', task: optimisticTask });

    const insertPayload = {
      id: taskId,
      text,
      assignee,
      target_role: targetRole,
      completed: false,
      created_by: this.safeDbUserId(createdBy),
      created_at: createdAt
    };

    try {
      const { data, error } = await supabase.from('tasks').insert(insertPayload).select().single();
      if (error) throw error;
      if (!this.isTaskRow(data)) throw new Error('Invalid task payload from Supabase');

      const remoteTask = this.mapRowToTask(data);
      this.upsertLocalTask(remoteTask);
      await this.upsertSqliteTask(remoteTask);
      this.emitLocalEvent({ action: 'upsert', task: remoteTask });
      return remoteTask;
    } catch (error) {
      console.error('[TaskService] Remote add failed, kept LAN/local copy:', error);
      return optimisticTask;
    }
  }

  async toggleTask(id: string, completed: boolean, userId?: string) {
    const completedAt = completed ? new Date().toISOString() : undefined;
    const completedBy = completed ? userId : undefined;

    const patchedLocalTask = this.patchLocalTask(id, {
      completed,
      completedAt,
      completedBy
    });
    if (patchedLocalTask) {
      await this.upsertSqliteTask(patchedLocalTask);
      this.emitLocalEvent({ action: 'upsert', task: patchedLocalTask });
      await this.publishLanTask({ action: 'upsert', task: patchedLocalTask });
    }

    if (id.startsWith('local_task_') || id.startsWith('local_')) return;

    const updateData: Record<string, boolean | string | null> = { completed };
    if (completed) {
      updateData.completed_at = completedAt ?? new Date().toISOString();
      updateData.completed_by = this.safeDbUserId(userId);
    } else {
      updateData.completed_at = null;
      updateData.completed_by = null;
    }

    const { error } = await supabase.from('tasks').update(updateData).eq('id', id);
    if (error) console.error('[TaskService] Error toggling remote task:', error);
  }

  async deleteTask(id: string) {
    this.removeLocalTask(id);
    await this.deleteSqliteTask(id);
    this.emitLocalEvent({ action: 'delete', taskId: id });
    await this.publishLanTask({ action: 'delete', taskId: id });

    if (id.startsWith('local_task_') || id.startsWith('local_')) return;

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('[TaskService] Error deleting remote task:', error);
  }

  async updateTask(id: string, text: string) {
    const patchedLocalTask = this.patchLocalTask(id, { text });
    if (patchedLocalTask) {
      await this.upsertSqliteTask(patchedLocalTask);
      this.emitLocalEvent({ action: 'upsert', task: patchedLocalTask });
      await this.publishLanTask({ action: 'upsert', task: patchedLocalTask });
    }

    if (id.startsWith('local_task_') || id.startsWith('local_')) return;

    const { error } = await supabase.from('tasks').update({ text }).eq('id', id);
    if (error) console.error('[TaskService] Error updating remote task:', error);
  }

  subscribe(callback: (payload: unknown) => void) {
    let removeLocalListener: (() => void) | null = null;
    let removeLanListener: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let lastSignature = '';
    let initialized = false;

    if (typeof window !== 'undefined') {
      const onLocalTask = (event: Event) => {
        const customEvent = event as CustomEvent<LocalTaskEvent>;
        if (!customEvent.detail) return;
        callback(customEvent.detail);
      };
      window.addEventListener(LOCAL_TASK_EVENT, onLocalTask as EventListener);
      removeLocalListener = () =>
        window.removeEventListener(LOCAL_TASK_EVENT, onLocalTask as EventListener);
    }

    const lanSync = this.getLanSync();
    if (lanSync?.onEvent) {
      removeLanListener = lanSync.onEvent((event: LanSyncEvent) => {
        if (!event || event.channel !== LAN_TASK_CHANNEL) return;
        const payload = event.payload as LanTaskPayload | null;
        if (!payload || (payload.action !== 'upsert' && payload.action !== 'delete')) return;

        void this.applyLanTaskPayload(payload);
        callback({ action: 'sync', source: 'lan' });
      });
    }

    const pollSqlite = async () => {
      const sqliteTasks = await this.fetchSqliteTasks();
      const merged = this.normalizeTasks([...this.readLocalTasks(), ...sqliteTasks]);
      this.saveLocalTasks(merged);
      const signature = this.buildTasksSignature(merged);

      if (!initialized) {
        lastSignature = signature;
        initialized = true;
        return;
      }

      if (signature !== lastSignature) {
        lastSignature = signature;
        callback({ action: 'sync', source: 'sqlite' });
      }
    };

    void pollSqlite();
    pollTimer = setInterval(() => {
      void pollSqlite();
    }, SQLITE_POLL_INTERVAL_MS);

    this.channel = supabase
      .channel('tasks-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        payload => {
          void this.handleRealtimePayload(payload as RealtimePostgresChangesPayload<TaskRow>);
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      if (this.channel) supabase.removeChannel(this.channel);
      this.channel = null;
      removeLocalListener?.();
      removeLanListener?.();
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    };
  }
}

export const taskService = new TaskService();
