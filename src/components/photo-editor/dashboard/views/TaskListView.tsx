import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  FolderOpen,
  Folder,
  Layers3,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  RefreshCcw,
  Sparkles,
  Tags,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Album, AlbumImage, RetouchNote } from '../types';
import { Booking, BookingStatus } from '../../../../types';
import { CurrentUserService } from '../../../../services/CurrentUserService';

interface TaskListViewProps {
  bookings?: Booking[];
  onOpenAlbum?: (album: Album) => void;
  onStatusUpdate?: (id: string, status: BookingStatus, updates?: Partial<Booking>) => Promise<void>;
  initialAlbumId?: string | null;
  showProjectSidebar?: boolean;
  onBackToProjects?: () => void;
}

interface WorkspaceImage extends AlbumImage {
  originalPath: string;
  editedPath: string | null;
  clientNotes: string | null;
  clientTags: string[];
  likedByClient: boolean;
}

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory?: boolean;
}

interface PersonalTaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'normal' | 'high' | 'urgent';
}

interface SessionImagesSchema {
  fileColumn: 'fileName' | 'file_name' | null;
  bookingColumn: 'bookingId' | 'booking_id' | null;
  sessionColumn: 'sessionId' | 'session_id' | null;
  statusColumn: 'status' | null;
  likedColumn: 'liked' | null;
  notesColumn: 'notes' | null;
  updatedColumn: 'updatedAt' | 'updated_at' | null;
}

interface SessionImageMeta {
  status: string;
  liked: number;
  notes: string | null;
}

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|heic|tiff?|raw|cr2|cr3|nef|arw|dng|orf|rw2)$/i;
const DONE_STATUS_SET = new Set(['final', 'completed', 'done', 'editing_done', 'ready_to_print']);
const SELECTED_STATUS_SET = new Set(['selected', 'approved', 'editing', 'final']);
const PHOTO_EDITOR_PROGRESS_EVENT = 'photo-editor:album-progress-changed';
let sessionImagesSchemaCache: SessionImagesSchema | null | undefined = undefined;

const isClientSelectedMeta = (meta?: SessionImageMeta): boolean => {
  if (!meta) return false;
  const normalizedStatus = String(meta.status || '').toLowerCase();
  if (meta.liked > 0) return true;
  if (SELECTED_STATUS_SET.has(normalizedStatus)) return true;
  return typeof meta.notes === 'string' && meta.notes.trim().length > 0;
};

const createTaskId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `task_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
};

const toFileUrl = (targetPath: string): string => {
  if (!targetPath) return '';
  const normalized = targetPath.startsWith('file://') ? targetPath : `file://${targetPath}`;
  return encodeURI(normalized);
};

const normalizeBaseName = (fileName: string): string =>
  fileName.replace(/\.[^/.]+$/, '').trim().toLowerCase();

const parseNotesPayload = (raw: string | null): { note: string; tags: string[] } => {
  if (!raw || raw.trim().length === 0) return { note: '', tags: [] };
  const text = raw.trim();

  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text) as { note?: unknown; tags?: unknown };
      const note = typeof parsed.note === 'string' ? parsed.note.trim() : '';
      const tags = Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
        : [];
      return { note, tags: Array.from(new Set(tags)) };
    } catch {
      // Fall through to plain-text parsing.
    }
  }

  const hashTags = text.match(/#[\p{L}\p{N}_-]+/gu) || [];
  const tags = Array.from(new Set(hashTags.map(tag => tag.replace('#', ''))));
  const note = text.replace(/#[\p{L}\p{N}_-]+/gu, '').replace(/\s+/g, ' ').trim();
  return { note, tags };
};

const extractTagsFromNotes = (notes: string | null): string[] => parseNotesPayload(notes).tags;

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const statusEquals = (value: string | BookingStatus | undefined, target: BookingStatus): boolean =>
  String(value || '').toLowerCase() === String(target).toLowerCase();

const EMPTY_WORKSPACE_IMAGES: WorkspaceImage[] = [];

const querySelectionReadyBookingIds = async (): Promise<Set<string>> => {
  const api = window.electronAPI;
  if (!api?.db?.query) return new Set<string>();

  const readyIds = new Set<string>();
  const queryAttempts: string[] = [
    `SELECT bookingId AS booking_id,
            SUM(CASE
                  WHEN liked = 1
                    OR status IN ('selected','approved','editing','final')
                    OR (notes IS NOT NULL AND TRIM(notes) <> '')
                  THEN 1 ELSE 0 END) AS selected_count
       FROM session_images
      GROUP BY bookingId`,
    `SELECT booking_id,
            SUM(CASE
                  WHEN liked = 1
                    OR status IN ('selected','approved','editing','final')
                    OR (notes IS NOT NULL AND TRIM(notes) <> '')
                  THEN 1 ELSE 0 END) AS selected_count
       FROM session_images
      GROUP BY booking_id`,
  ];

  for (const sql of queryAttempts) {
    try {
      const rows = await api.db.query(sql);
      if (!Array.isArray(rows)) continue;

      for (const row of rows) {
        if (typeof row !== 'object' || row === null) continue;
        const item = row as Record<string, unknown>;
        const bookingId =
          typeof item.booking_id === 'string'
            ? item.booking_id
            : typeof item.bookingId === 'string'
              ? item.bookingId
              : '';
        const count = toNumber(item.selected_count ?? item.count ?? 0);
        if (bookingId && count > 0) readyIds.add(bookingId);
      }
      return readyIds;
    } catch {
      // Try next schema
    }
  }

  return readyIds;
};

const listImageFiles = async (dirPath: string): Promise<DirectoryEntry[]> => {
  const api = window.electronAPI;
  if (!api?.fileSystem?.listDirectory || !dirPath) return [];

  try {
    const entries = await api.fileSystem.listDirectory(dirPath);
    if (!Array.isArray(entries)) return [];

    return entries
      .map(entry => {
        if (typeof entry === 'string') {
          return { name: entry, path: `${dirPath}/${entry}` };
        }
        return entry;
      })
      .filter(
        (entry): entry is DirectoryEntry =>
          Boolean(entry) &&
          typeof entry.name === 'string' &&
          typeof entry.path === 'string' &&
          !entry.isDirectory &&
          IMAGE_EXTENSIONS.test(entry.name)
      );
  } catch {
    return [];
  }
};

const resolveSessionPath = async (album: Album): Promise<string> => {
  if (album.folderPath) return album.folderPath;

  const api = window.electronAPI;
  if (!api?.db?.query) return '';

  const attempts: Array<{ sql: string; params: string[] }> = [
    {
      sql: `SELECT nasPath AS path FROM sessions WHERE bookingId = ? AND nasPath IS NOT NULL ORDER BY updatedAt DESC LIMIT 1`,
      params: [album.bookingId],
    },
    {
      sql: `SELECT nas_path AS path FROM sessions WHERE booking_id = ? AND nas_path IS NOT NULL ORDER BY updated_at DESC LIMIT 1`,
      params: [album.bookingId],
    },
  ];

  for (const attempt of attempts) {
    try {
      const rows = await api.db.query(attempt.sql, attempt.params);
      const firstRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (typeof firstRow === 'object' && firstRow !== null && 'path' in firstRow) {
        const pathValue = (firstRow as { path?: unknown }).path;
        if (typeof pathValue === 'string' && pathValue.trim().length > 0) {
          return pathValue;
        }
      }
    } catch {
      // Try next schema variation
    }
  }

  return '';
};

const resolveSessionImagesSchema = async (): Promise<SessionImagesSchema | null> => {
  if (sessionImagesSchemaCache !== undefined) return sessionImagesSchemaCache;

  const api = window.electronAPI;
  if (!api?.db?.query) {
    sessionImagesSchemaCache = null;
    return null;
  }

  try {
    const rows = await api.db.query('PRAGMA table_info(session_images)');
    if (!Array.isArray(rows) || rows.length === 0) {
      sessionImagesSchemaCache = null;
      return null;
    }

    const columnNames = new Set(
      rows
        .filter(row => typeof row === 'object' && row !== null)
        .map(row => String((row as Record<string, unknown>).name || '').trim())
        .filter(Boolean)
    );

    const schema: SessionImagesSchema = {
      fileColumn: columnNames.has('fileName') ? 'fileName' : columnNames.has('file_name') ? 'file_name' : null,
      bookingColumn: columnNames.has('bookingId') ? 'bookingId' : columnNames.has('booking_id') ? 'booking_id' : null,
      sessionColumn: columnNames.has('sessionId') ? 'sessionId' : columnNames.has('session_id') ? 'session_id' : null,
      statusColumn: columnNames.has('status') ? 'status' : null,
      likedColumn: columnNames.has('liked') ? 'liked' : null,
      notesColumn: columnNames.has('notes') ? 'notes' : null,
      updatedColumn: columnNames.has('updatedAt') ? 'updatedAt' : columnNames.has('updated_at') ? 'updated_at' : null,
    };

    if (!schema.fileColumn || (!schema.bookingColumn && !schema.sessionColumn)) {
      sessionImagesSchemaCache = null;
      return null;
    }

    sessionImagesSchemaCache = schema;
    return schema;
  } catch {
    sessionImagesSchemaCache = null;
    return null;
  }
};

const buildSessionImagesWhere = (
  schema: SessionImagesSchema,
  bookingId: string
): { clause: string; params: string[] } | null => {
  if (schema.bookingColumn && schema.sessionColumn) {
    return {
      clause: `(${schema.bookingColumn} = ? OR ${schema.sessionColumn} = ?)`,
      params: [bookingId, bookingId],
    };
  }
  if (schema.bookingColumn) {
    return {
      clause: `${schema.bookingColumn} = ?`,
      params: [bookingId],
    };
  }
  if (schema.sessionColumn) {
    return {
      clause: `${schema.sessionColumn} = ?`,
      params: [bookingId],
    };
  }
  return null;
};

const querySessionImagesMeta = async (bookingId: string): Promise<Map<string, SessionImageMeta>> => {
  const api = window.electronAPI;
  const byBaseName = new Map<string, SessionImageMeta>();
  if (!api?.db?.query) return byBaseName;
  const schema = await resolveSessionImagesSchema();
  if (!schema) return byBaseName;

  const where = buildSessionImagesWhere(schema, bookingId);
  if (!where) return byBaseName;

  const selectColumns = [`${schema.fileColumn} AS file_name`];
  if (schema.statusColumn) selectColumns.push(`${schema.statusColumn} AS status`);
  if (schema.likedColumn) selectColumns.push(`${schema.likedColumn} AS liked`);
  if (schema.notesColumn) selectColumns.push(`${schema.notesColumn} AS notes`);

  try {
    const rows = await api.db.query(
      `SELECT ${selectColumns.join(', ')} FROM session_images WHERE ${where.clause}`,
      where.params
    );
    if (!Array.isArray(rows)) return byBaseName;

    for (const row of rows) {
      if (typeof row !== 'object' || row === null) continue;
      const rowObject = row as Record<string, unknown>;
      const fileName =
        typeof rowObject.file_name === 'string'
          ? rowObject.file_name
          : typeof rowObject.fileName === 'string'
            ? rowObject.fileName
            : '';
      if (!fileName) continue;

      byBaseName.set(normalizeBaseName(fileName), {
        status: String(rowObject.status || '').toLowerCase(),
        liked: toNumber(rowObject.liked),
        notes: typeof rowObject.notes === 'string' ? rowObject.notes : null,
      });
    }
  } catch {
    return byBaseName;
  }

  return byBaseName;
};

const mapNoteToRetouch = (notes: string | null): RetouchNote[] => {
  const parsed = parseNotesPayload(notes);
  if (!parsed.note) return [];
  return [
    {
      id: `note-${Math.random().toString(16).slice(2)}`,
      type: 'Client Note',
      note: parsed.note,
    },
  ];
};

const toDetailsRecord = (details: Booking['details']): Record<string, unknown> => {
  if (typeof details === 'object' && details !== null) {
    return { ...(details as Record<string, unknown>) };
  }
  return {};
};

const TaskListView: React.FC<TaskListViewProps> = ({
  bookings = [],
  onOpenAlbum,
  onStatusUpdate,
  initialAlbumId = null,
  showProjectSidebar = true,
  onBackToProjects,
}) => {
  const [selectionReadyBookingIds, setSelectionReadyBookingIds] = useState<Set<string>>(new Set());

  const albums = useMemo<Album[]>(() => {
    return bookings
      .filter(booking => {
        if (statusEquals(booking.status, BookingStatus.EDITING) || statusEquals(booking.status, BookingStatus.READY_TO_PRINT)) {
          return true;
        }
        const hasSelectionEvidence = selectionReadyBookingIds.has(booking.id);
        return (
          hasSelectionEvidence &&
          (statusEquals(booking.status, BookingStatus.SELECTION) ||
            statusEquals(booking.status, BookingStatus.SHOOTING_COMPLETED))
        );
      })
      .map(booking => ({
        id: booking.id,
        bookingId: booking.id,
        clientName: booking.clientName,
        projectName: booking.title,
        folderPath: booking.folderPath || '',
        images: [],
        totalImages: 0,
        completedImages: 0,
        priority: booking.isPriority ? 'high' : 'normal',
        deadline: booking.deliveryDeadline || '',
        timeSpent: 0,
        status: statusEquals(booking.status, BookingStatus.READY_TO_PRINT) ? 'completed' : 'in-progress',
      }));
  }, [bookings, selectionReadyBookingIds]);

  const albumById = useMemo(() => {
    const map = new Map<string, Album>();
    for (const album of albums) map.set(album.id, album);
    return map;
  }, [albums]);

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(initialAlbumId || albums[0]?.id || null);
  const [imagesByAlbum, setImagesByAlbum] = useState<Record<string, WorkspaceImage[]>>({});
  const [selectedImageByAlbum, setSelectedImageByAlbum] = useState<Record<string, string>>({});
  const [sessionPathByAlbum, setSessionPathByAlbum] = useState<Record<string, string>>({});
  const [loadingAlbumId, setLoadingAlbumId] = useState<string | null>(null);
  const [taskPaneVisible, setTaskPaneVisible] = useState(true);
  const [taskPopVisible, setTaskPopVisible] = useState(false);
  const [taskPopPinned, setTaskPopPinned] = useState(false);
  const [taskPopPos, setTaskPopPos] = useState({ x: 24, y: 100 });
  const [taskPopDragging, setTaskPopDragging] = useState(false);
  const [taskPopDragOffset, setTaskPopDragOffset] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetPath: string | null;
  }>({ visible: false, x: 0, y: 0, targetPath: null });
  const [personalTasksByAlbum, setPersonalTasksByAlbum] = useState<Record<string, PersonalTaskItem[]>>({});
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'normal' | 'high' | 'urgent'>('normal');

  const taskPopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedAlbumId && albums.length > 0) {
      const firstAlbum = albums[0];
      if (firstAlbum) setSelectedAlbumId(firstAlbum.id);
    } else if (selectedAlbumId && !albumById.has(selectedAlbumId)) {
      setSelectedAlbumId(albums[0]?.id ?? null);
    }
  }, [albumById, albums, selectedAlbumId]);

  useEffect(() => {
    if (initialAlbumId && initialAlbumId !== selectedAlbumId) {
      setSelectedAlbumId(initialAlbumId);
    }
  }, [initialAlbumId, selectedAlbumId]);

  useEffect(() => {
    let mounted = true;
    const loadSelectionReady = async () => {
      const ids = await querySelectionReadyBookingIds();
      if (mounted) setSelectionReadyBookingIds(ids);
    };
    void loadSelectionReady();
    return () => {
      mounted = false;
    };
  }, [bookings]);

  const selectedAlbum = selectedAlbumId ? albumById.get(selectedAlbumId) ?? null : null;
  const currentImages = useMemo<WorkspaceImage[]>(() => {
    if (!selectedAlbumId) return EMPTY_WORKSPACE_IMAGES;
    return imagesByAlbum[selectedAlbumId] ?? EMPTY_WORKSPACE_IMAGES;
  }, [imagesByAlbum, selectedAlbumId]);
  const selectedImageId = selectedAlbumId ? selectedImageByAlbum[selectedAlbumId] : undefined;
  const currentImage =
    (selectedImageId ? currentImages.find(image => image.id === selectedImageId) : undefined) || currentImages[0];
  const currentImageIndex = currentImage ? currentImages.findIndex(image => image.id === currentImage.id) : -1;

  const selectedAlbumTasks = selectedAlbumId ? personalTasksByAlbum[selectedAlbumId] || [] : [];

  const loadPersonalTasks = useCallback(async (albumId: string) => {
    const api = window.electronAPI;
    if (!api?.db?.query) {
      setPersonalTasksByAlbum(prev => ({ ...prev, [albumId]: [] }));
      return;
    }

    const attempts: Array<{ sql: string; params: string[] }> = [
      {
        sql: `SELECT id, title, completed, priority
              FROM dashboard_tasks
              WHERE deletedAt IS NULL
                AND source = 'manual'
                AND relatedBookingId = ?
                AND (type = 'photo_editor' OR type = 'editing')
              ORDER BY createdAt DESC`,
        params: [albumId],
      },
      {
        sql: `SELECT id, title, completed, priority
              FROM dashboard_tasks
              WHERE deleted_at IS NULL
                AND source = 'manual'
                AND related_booking_id = ?
                AND (type = 'photo_editor' OR type = 'editing')
              ORDER BY created_at DESC`,
        params: [albumId],
      },
    ];

    for (const attempt of attempts) {
      try {
        const rows = await api.db.query(attempt.sql, attempt.params);
        if (!Array.isArray(rows)) continue;

        const tasks: PersonalTaskItem[] = rows
          .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
          .map(row => ({
            id: String(row.id || ''),
            title: String(row.title || ''),
            completed: toNumber(row.completed) > 0,
            priority: (['normal', 'high', 'urgent'].includes(String(row.priority))
              ? String(row.priority)
              : 'normal') as PersonalTaskItem['priority'],
          }))
          .filter(task => task.id && task.title);

        setPersonalTasksByAlbum(prev => ({ ...prev, [albumId]: tasks }));
        return;
      } catch {
        // Try next schema variant
      }
    }

    setPersonalTasksByAlbum(prev => ({ ...prev, [albumId]: [] }));
  }, []);

  useEffect(() => {
    if (!selectedAlbumId) return;
    void loadPersonalTasks(selectedAlbumId);
  }, [loadPersonalTasks, selectedAlbumId]);

  const addPersonalTask = useCallback(async () => {
    const albumId = selectedAlbumId;
    const title = newTaskTitle.trim();
    if (!albumId || !title) return;

    const api = window.electronAPI;
    if (!api?.db?.run) return;

    const taskId = createTaskId();
    const now = new Date().toISOString();
    const attempts: Array<{ sql: string; params: unknown[] }> = [
      {
        sql: `INSERT INTO dashboard_tasks (id, title, time, completed, type, source, priority, relatedBookingId, createdAt)
              VALUES (?, ?, ?, 0, 'photo_editor', 'manual', ?, ?, ?)`,
        params: [taskId, title, null, newTaskPriority, albumId, now],
      },
      {
        sql: `INSERT INTO dashboard_tasks (id, title, time, completed, type, source, priority, related_booking_id, created_at)
              VALUES (?, ?, ?, 0, 'photo_editor', 'manual', ?, ?, ?)`,
        params: [taskId, title, null, newTaskPriority, albumId, now],
      },
    ];

    for (const attempt of attempts) {
      try {
        await api.db.run(attempt.sql, attempt.params);
        setNewTaskTitle('');
        await loadPersonalTasks(albumId);
        toast.success('تمت إضافة مهمة للمحرر');
        return;
      } catch {
        // Try next schema
      }
    }

    toast.error('تعذر إضافة المهمة');
  }, [loadPersonalTasks, newTaskPriority, newTaskTitle, selectedAlbumId]);

  const togglePersonalTask = useCallback(
    async (taskId: string) => {
      const albumId = selectedAlbumId;
      const api = window.electronAPI;
      if (!albumId || !api?.db?.run) return;

      const attempts: Array<{ sql: string; params: unknown[] }> = [
        {
          sql: `UPDATE dashboard_tasks
                SET completed = CASE WHEN completed = 1 THEN 0 ELSE 1 END
                WHERE id = ?`,
          params: [taskId],
        },
      ];

      for (const attempt of attempts) {
        try {
          await api.db.run(attempt.sql, attempt.params);
          await loadPersonalTasks(albumId);
          return;
        } catch {
          // Try next variant
        }
      }
    },
    [loadPersonalTasks, selectedAlbumId]
  );

  const deletePersonalTask = useCallback(
    async (taskId: string) => {
      const albumId = selectedAlbumId;
      const api = window.electronAPI;
      if (!albumId || !api?.db?.run) return;

      const now = Date.now();
      const attempts: Array<{ sql: string; params: unknown[] }> = [
        {
          sql: `UPDATE dashboard_tasks SET deletedAt = ? WHERE id = ?`,
          params: [now, taskId],
        },
        {
          sql: `UPDATE dashboard_tasks SET deleted_at = ? WHERE id = ?`,
          params: [now, taskId],
        },
      ];

      for (const attempt of attempts) {
        try {
          await api.db.run(attempt.sql, attempt.params);
          await loadPersonalTasks(albumId);
          return;
        } catch {
          // Try next variant
        }
      }
    },
    [loadPersonalTasks, selectedAlbumId]
  );

  const loadAlbumImages = useCallback(
    async (album: Album) => {
      if (!album?.id) return;
      setLoadingAlbumId(album.id);

      try {
        const sessionPath = await resolveSessionPath(album);
        setSessionPathByAlbum(prev => ({ ...prev, [album.id]: sessionPath }));
        if (!sessionPath) {
          setImagesByAlbum(prev => ({ ...prev, [album.id]: [] }));
          return;
        }

        const selectedDir = `${sessionPath}/02_SELECTED`;
        const rawDir = `${sessionPath}/01_RAW`;
        const editedDir = `${sessionPath}/03_EDITED`;

        let sourceFiles = await listImageFiles(selectedDir);
        const rawFiles = await listImageFiles(rawDir);
        const editedFiles = await listImageFiles(editedDir);
        const metaMap = await querySessionImagesMeta(album.bookingId);

        // Self-healing fallback:
        // If 02_SELECTED is empty but we have selected evidence in DB, copy matching RAW files.
        if (sourceFiles.length === 0 && rawFiles.length > 0) {
          const selectedRawFiles = rawFiles.filter((file) => {
            const baseName = normalizeBaseName(file.name);
            return isClientSelectedMeta(metaMap.get(baseName));
          });

          if (selectedRawFiles.length > 0) {
            try {
              const copyToSelected = window.electronAPI?.sessionLifecycle?.copyToSelected;
              if (copyToSelected) {
                await copyToSelected(
                  sessionPath,
                  selectedRawFiles.map((file) => file.name)
                );
                sourceFiles = await listImageFiles(selectedDir);
              }
            } catch (copyError) {
              console.warn('[PhotoEditor] copyToSelected fallback failed:', copyError);
            }

            if (sourceFiles.length === 0) {
              sourceFiles = selectedRawFiles;
            }
          }
        }

        // Final fallback: never show empty gallery if RAW exists.
        if (sourceFiles.length === 0 && rawFiles.length > 0) {
          sourceFiles = rawFiles;
        }

        const rawByBase = new Map(rawFiles.map(file => [normalizeBaseName(file.name), file]));
        const editedByBase = new Map(editedFiles.map(file => [normalizeBaseName(file.name), file]));

        const mappedImages: WorkspaceImage[] = sourceFiles.map((file, index) => {
          const baseName = normalizeBaseName(file.name);
          const rawMatch = rawByBase.get(baseName);
          const editedMatch = editedByBase.get(baseName);
          const meta = metaMap.get(baseName);
          const parsedNotes = parseNotesPayload(meta?.notes ?? null);
          const tagsFromNotes = [...parsedNotes.tags];
          const likedByClient = toNumber(meta?.liked) > 0;
          const isDone = meta ? DONE_STATUS_SET.has(meta.status) : false;

          if (likedByClient && !tagsFromNotes.includes('مختارة-من-العميل')) {
            tagsFromNotes.unshift('مختارة-من-العميل');
          }

          return {
            id: `${album.id}-${baseName}-${index}`,
            filename: file.name,
            path: file.path,
            originalPath: rawMatch?.path || file.path,
            editedPath: editedMatch?.path || null,
            status: isDone ? 'completed' : 'pending',
            retouchNotes: mapNoteToRetouch(meta?.notes ?? null),
            thumbnail: toFileUrl(editedMatch?.path || file.path),
            clientNotes: parsedNotes.note || null,
            clientTags: tagsFromNotes,
            likedByClient,
          };
        });

        setImagesByAlbum(prev => ({ ...prev, [album.id]: mappedImages }));
        setSelectedImageByAlbum(prev => ({
          ...prev,
          [album.id]: prev[album.id] || mappedImages[0]?.id || '',
        }));
      } catch (error) {
        console.error('[PhotoEditor] Failed to load album images:', error);
        toast.error('تعذر تحميل صور المشروع');
      } finally {
        setLoadingAlbumId(null);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedAlbum && !imagesByAlbum[selectedAlbum.id]) {
      void loadAlbumImages(selectedAlbum);
    }
  }, [imagesByAlbum, loadAlbumImages, selectedAlbum]);

  const selectImage = useCallback(
    (imageId: string) => {
      if (!selectedAlbumId) return;
      setSelectedImageByAlbum(prev => ({ ...prev, [selectedAlbumId]: imageId }));
    },
    [selectedAlbumId]
  );

  const goToNextImage = useCallback(() => {
    if (!selectedAlbumId || currentImages.length === 0 || currentImageIndex < 0) return;
    const nextIndex = (currentImageIndex + 1) % currentImages.length;
    const nextImage = currentImages[nextIndex];
    if (nextImage) selectImage(nextImage.id);
  }, [currentImageIndex, currentImages, selectImage, selectedAlbumId]);

  const goToPreviousImage = useCallback(() => {
    if (!selectedAlbumId || currentImages.length === 0 || currentImageIndex < 0) return;
    const previousIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
    const previousImage = currentImages[previousIndex];
    if (previousImage) selectImage(previousImage.id);
  }, [currentImageIndex, currentImages, selectImage, selectedAlbumId]);

  const saveImageStatus = useCallback(async (album: Album, image: WorkspaceImage, done: boolean): Promise<boolean> => {
    const api = window.electronAPI;
    if (!api?.db?.run) return false;
    const schema = await resolveSessionImagesSchema();
    if (!schema?.fileColumn || !schema.statusColumn || !schema.updatedColumn) return false;
    const where = buildSessionImagesWhere(schema, album.bookingId);
    if (!where) return false;

    const status = done ? 'final' : 'selected';
    const updatedAt = new Date().toISOString();
    const baseName = normalizeBaseName(image.filename);
    const likePattern = `${baseName}.%`;

    // Phase 1: UPDATE by exact file name.
    try {
      const updateExact = await api.db.run(
        `UPDATE session_images
            SET ${schema.statusColumn} = ?, ${schema.updatedColumn} = ?
          WHERE ${where.clause}
            AND (${schema.fileColumn} = ? OR lower(${schema.fileColumn}) = lower(?))`,
        [status, updatedAt, ...where.params, image.filename, image.filename]
      );
      if ((updateExact?.changes || 0) > 0) return true;
    } catch {
      // Continue to LIKE update.
    }

    // Phase 1b: UPDATE by basename fallback.
    try {
      const updateLike = await api.db.run(
        `UPDATE session_images
            SET ${schema.statusColumn} = ?, ${schema.updatedColumn} = ?
          WHERE ${where.clause}
            AND lower(${schema.fileColumn}) LIKE ?`,
        [status, updatedAt, ...where.params, likePattern]
      );
      if ((updateLike?.changes || 0) > 0) return true;
    } catch {
      // Continue to INSERT fallback.
    }

    // Phase 2: UPDATE affected 0 rows — fallback to INSERT so status is never lost.
    const imageId = `${album.bookingId}-${baseName}-${Date.now()}`;
    const insertColumns: string[] = [];
    const insertParams: unknown[] = [];
    const pushInsert = (column: string | null, value: unknown) => {
      if (!column || insertColumns.includes(column)) return;
      insertColumns.push(column);
      insertParams.push(value);
    };

    pushInsert('id', imageId);
    pushInsert(schema.bookingColumn, album.bookingId);
    pushInsert(schema.sessionColumn, album.bookingId);
    pushInsert(schema.fileColumn, image.filename);
    pushInsert(schema.statusColumn, status);
    pushInsert(schema.likedColumn, 0);
    pushInsert(schema.updatedColumn, updatedAt);

    if (insertColumns.length > 0) {
      try {
        const placeholders = insertColumns.map(() => '?').join(', ');
        const result = await api.db.run(
          `INSERT INTO session_images (${insertColumns.join(', ')}) VALUES (${placeholders})`,
          insertParams
        );
        if ((result?.changes || 0) > 0) {
          console.log('[PhotoEditor] Inserted new session_images row for:', image.filename);
          return true;
        }
      } catch {
        // Fall through to final error log.
      }
    }

    console.error('[PhotoEditor] Failed to save image status (both UPDATE and INSERT failed):', image.filename);
    return false;
  }, []);

  const copyImageToEdited = useCallback(
    async (album: Album, image: WorkspaceImage): Promise<string | null> => {
      const api = window.electronAPI;
      if (!api?.sessionLifecycle?.copyToEdited) return null;

      const sessionPath = sessionPathByAlbum[album.id] || (await resolveSessionPath(album));
      if (!sessionPath) return null;

      const sourcePath = image.path || image.originalPath;
      if (!sourcePath) return null;

      try {
        const result = await api.sessionLifecycle.copyToEdited(sourcePath, sessionPath, image.filename);
        if (!result?.success || !result.destPath) {
          throw new Error(result?.error || 'copyToEdited failed');
        }
        return result.destPath;
      } catch (error) {
        console.error('[PhotoEditor] copy to 03_EDITED failed:', error);
        return null;
      }
    },
    [sessionPathByAlbum]
  );

  const moveCompletedAlbumToFinal = useCallback(
    async (album: Album, albumImages: WorkspaceImage[]): Promise<boolean> => {
      const api = window.electronAPI;
      if (!api?.sessionLifecycle?.moveEditedToFinal) {
        console.error('[PhotoEditor] moveEditedToFinal IPC is unavailable');
        return false;
      }

      const sessionPath = sessionPathByAlbum[album.id] || (await resolveSessionPath(album));
      if (!sessionPath) {
        console.error('[PhotoEditor] Missing session path for album:', album.id);
        return false;
      }

      const fileNames = Array.from(
        new Set(
          albumImages
            .map(image => image.filename)
            .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
        )
      );

      if (fileNames.length === 0) return true;

      try {
        const result = await api.sessionLifecycle.moveEditedToFinal(sessionPath, fileNames);
        if (!result?.success) {
          console.error('[PhotoEditor] Failed moving files to 04_FINAL:', result?.errors || result);
          return false;
        }

        const movedOrSkipped = (result.moved || 0) + (result.skipped || 0);
        if (movedOrSkipped < fileNames.length) {
          console.error('[PhotoEditor] Incomplete move to 04_FINAL:', {
            expected: fileNames.length,
            moved: result.moved,
            skipped: result.skipped,
            failed: result.failed,
            errors: result.errors,
          });
          return false;
        }

        return true;
      } catch (error) {
        console.error('[PhotoEditor] moveEditedToFinal failed:', error);
        return false;
      }
    },
    [sessionPathByAlbum]
  );

  const toggleImageDone = useCallback(
    async (imageId: string) => {
      if (!selectedAlbumId) return;
      const album = albumById.get(selectedAlbumId);
      if (!album) return;

      // Compute the toggled image directly from current state so we have
      // a reliable reference *before* calling the async DB/FS operations.
      const existingImages = imagesByAlbum[selectedAlbumId] || [];
      const imageIndex = existingImages.findIndex(image => image.id === imageId);
      if (imageIndex < 0) return;

      const current = existingImages[imageIndex] as WorkspaceImage | undefined;
      if (!current) return;
      const nextDone = current.status !== 'completed';
      const toggledImage: WorkspaceImage = {
        ...current,
        status: nextDone ? 'completed' : 'pending',
      };

      // Optimistic UI update
      const updatedImages = [...existingImages];
      updatedImages[imageIndex] = toggledImage;
      setImagesByAlbum(prev => ({ ...prev, [selectedAlbumId]: updatedImages }));

      // Persist status to DB (with upsert fallback)
      const saved = await saveImageStatus(album, toggledImage, nextDone);
      if (!saved) {
        toast.error(`فشل تحديث حالة الصورة: ${toggledImage.filename}`);
      }

      // Copy to 03_EDITED when marking as completed
      if (nextDone) {
        const editedPath = await copyImageToEdited(album, toggledImage);
        if (editedPath) {
          setImagesByAlbum(prev => {
            const next = { ...prev };
            next[selectedAlbumId] = (next[selectedAlbumId] || []).map(image =>
              image.id === toggledImage.id
                ? { ...image, editedPath, thumbnail: toFileUrl(editedPath) }
                : image
            );
            return next;
          });
        } else {
          toast.error(`تم التحديد لكن لم يتم نسخ الصورة إلى 03_EDITED: ${toggledImage.filename}`);
        }
      }

      // Check if ALL images are now completed → update booking status
      const allDone =
        updatedImages.length > 0 &&
        updatedImages.every(image => image.status === 'completed');

      if (allDone && onStatusUpdate) {
        const movedToFinal = await moveCompletedAlbumToFinal(album, updatedImages);
        if (!movedToFinal) {
          toast.error('اكتمل التحديد لكن فشل نقل الملفات إلى 04_FINAL، الحالة لن تتغير');
          return;
        }

        try {
          const currentUser = CurrentUserService.getCurrentUser();
          const editorName = currentUser?.name || 'غير معروف';
          const editorId = currentUser?.id || 'unknown';
          const nowIso = new Date().toISOString();
          const bookingRef = bookings.find(item => item.id === album.bookingId);
          const details = toDetailsRecord(bookingRef?.details);
          const startedAt =
            typeof details.photoEditorStartedAt === 'string' && details.photoEditorStartedAt.trim().length > 0
              ? details.photoEditorStartedAt
              : bookingRef?.actualSelectionDate || nowIso;
          const startedDate = new Date(startedAt);
          const durationMinutes = Number.isNaN(startedDate.getTime())
            ? 0
            : Math.max(0, Math.round((Date.parse(nowIso) - startedDate.getTime()) / 60000));

          const detailsUpdate: Booking['details'] = {
            ...(bookingRef?.details || {}),
            photoEditorStartedAt: startedAt,
            photoEditorCompletedAt: nowIso,
            photoEditorCompletedById: editorId,
            photoEditorCompletedByName: editorName,
            photoEditorDurationMinutes: durationMinutes,
            photoEditorCompletedImages: updatedImages.length,
          };

          await onStatusUpdate(album.bookingId, BookingStatus.READY_TO_PRINT, {
            details: detailsUpdate,
            photoEditCompletedAt: nowIso,
          });
          window.dispatchEvent(new CustomEvent(PHOTO_EDITOR_PROGRESS_EVENT, { detail: { bookingId: album.bookingId } }));
          toast.success('تم إنهاء الألبوم ونقل الملفات إلى FINAL وتحديث الحالة');
        } catch {
          toast.error('تم حفظ حالة الصور لكن تحديث حالة الحجز فشل');
        }
      } else {
        window.dispatchEvent(new CustomEvent(PHOTO_EDITOR_PROGRESS_EVENT, { detail: { bookingId: album.bookingId } }));
      }
    },
    [albumById, bookings, copyImageToEdited, imagesByAlbum, moveCompletedAlbumToFinal, onStatusUpdate, saveImageStatus, selectedAlbumId]
  );

  const openOriginalFile = useCallback(async (targetPathOverride?: string) => {
    const api = window.electronAPI;
    const targetPath = targetPathOverride || currentImage?.originalPath || currentImage?.path;
    if (!targetPath) return;

    try {
      if (api?.fileSystem?.showInFolder) {
        const result = await api.fileSystem.showInFolder(targetPath);
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to reveal file');
        }
      } else if (api?.fileSystem?.openPath) {
        await api.fileSystem.openPath(targetPath);
      } else {
        window.open(toFileUrl(targetPath), '_blank');
      }
    } catch (error) {
      console.error('[PhotoEditor] open original failed:', error);
      toast.error('تعذر فتح الصورة الأصلية');
    }
  }, [currentImage?.originalPath, currentImage?.path]);

  const openInPhotoshop = useCallback(async (targetPathOverride?: string) => {
    const api = window.electronAPI;
    const targetPath = targetPathOverride || currentImage?.originalPath || currentImage?.path;
    if (!targetPath) return;

    try {
      if (api?.fileSystem?.openInPhotoshop) {
        const result = await api.fileSystem.openInPhotoshop(targetPath);
        if (!result?.success) {
          throw new Error(result?.error || 'Photoshop launch failed');
        }
      } else if (api?.fileSystem?.openPath) {
        const result = await api.fileSystem.openPath(targetPath);
        if (!result?.success) {
          throw new Error(result?.error || 'Open path failed');
        }
      } else {
        window.open(toFileUrl(targetPath), '_blank');
      }
    } catch (error) {
      console.error('[PhotoEditor] open photoshop failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('photoshop app not found')) {
        toast.error('تعذر العثور على Photoshop على هذا الجهاز');
      } else {
        toast.error('تعذر فتح الملف داخل Photoshop');
      }
    }
  }, [currentImage]);

  const showContextMenu = useCallback((event: React.MouseEvent, targetPath: string | null) => {
    event.preventDefault();
    if (!targetPath) return;
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      targetPath,
    });
  }, []);

  useEffect(() => {
    if (!contextMenu.visible) return;

    const closeMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
    // Defer adding listeners to avoid the same right-click event that opened
    // the menu from immediately closing it via the contextmenu listener.
    const timerId = window.setTimeout(() => {
      window.addEventListener('click', closeMenu);
      window.addEventListener('contextmenu', closeMenu);
    }, 0);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('contextmenu', closeMenu);
    };
  }, [contextMenu.visible]);

  const toggleTaskPopPin = useCallback(async () => {
    const nextPinned = !taskPopPinned;
    setTaskPopPinned(nextPinned);

    try {
      const result = await window.electronAPI?.setAlwaysOnTop?.(nextPinned);
      if (result && !result.success) {
        throw new Error(result.error || 'Failed to toggle always-on-top');
      }
    } catch (error) {
      console.error('[TaskPop] always-on-top failed:', error);
      toast.error('تعذر تفعيل وضع دائما بالأعلى');
      setTaskPopPinned(false);
    }
  }, [taskPopPinned]);

  useEffect(() => {
    return () => {
      if (taskPopPinned) {
        void window.electronAPI?.setAlwaysOnTop?.(false);
      }
    };
  }, [taskPopPinned]);

  useEffect(() => {
    if (!taskPopVisible && taskPopPinned) {
      setTaskPopPinned(false);
      void window.electronAPI?.setAlwaysOnTop?.(false);
    }
  }, [taskPopPinned, taskPopVisible]);

  const totalDone = currentImages.filter(image => image.status === 'completed').length;
  const donePercent = currentImages.length > 0 ? Math.round((totalDone / currentImages.length) * 100) : 0;
  const activeSessionPath = selectedAlbumId ? sessionPathByAlbum[selectedAlbumId] || '' : '';

  const taskRows = (
    <div className="space-y-2 overflow-y-auto pr-1">
      {currentImages.map(image => (
        <div
          key={image.id}
          onClick={() => selectImage(image.id)}
          onContextMenu={event => showContextMenu(event, image.originalPath || image.path)}
          className={`w-full cursor-pointer rounded-2xl border p-3 text-right transition-all ${
            currentImage?.id === image.id
              ? 'border-cyan-500/60 bg-cyan-500/10'
              : 'border-white/10 bg-black/20 hover:border-white/20'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              selectImage(image.id);
            }
          }}
        >
          <div className="flex items-start gap-2">
            <button
              onClick={event => {
                event.stopPropagation();
                void toggleImageDone(image.id);
              }}
              className="mt-0.5 shrink-0"
              title="تبديل حالة الإنجاز"
            >
              {image.status === 'completed' ? (
                <CheckCircle2 size={17} className="text-emerald-400" />
              ) : (
                <Circle size={17} className="text-zinc-500" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{image.filename}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                {image.clientNotes && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/15 px-2 py-0.5 text-amber-300">
                    <MessageSquareText size={11} />
                    ملاحظة
                  </span>
                )}
                {image.clientTags.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-purple-400/15 px-2 py-0.5 text-purple-300">
                    <Tags size={11} />
                    {image.clientTags.length}
                  </span>
                )}
                {image.likedByClient && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-400/15 px-2 py-0.5 text-emerald-300">
                    <Sparkles size={11} />
                    مختارة
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      {currentImages.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-center text-sm text-zinc-500">
          لا توجد صور في هذا المشروع
        </div>
      )}
    </div>
  );

  const selectedImageInsights = (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-black text-white">تفاصيل الصورة الحالية</p>
      <p className="truncate text-[11px] text-zinc-400">{currentImage?.filename || 'لا توجد صورة محددة'}</p>

      <div className="flex flex-wrap gap-1">
        {currentImage?.clientTags?.length ? (
          currentImage.clientTags.map(tag => (
            <span key={tag} className="rounded-md border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-200">
              #{tag}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-zinc-500">لا توجد تاغات من العميل</span>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0e1320] p-2.5">
        <p className="mb-1 text-[11px] font-bold text-amber-200">ملاحظة العميل</p>
        <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-300">
          {currentImage?.clientNotes?.trim() || 'لا توجد ملاحظة على هذه الصورة'}
        </p>
      </div>
    </div>
  );

  const personalTasksPanel = (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-black text-white">مهامي الشخصية</p>

      <div className="flex gap-1.5">
        <input
          value={newTaskTitle}
          onChange={event => setNewTaskTitle(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void addPersonalTask();
            }
          }}
          placeholder="اكتب مهمة للمحرر..."
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0d1422] px-2 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-400/50 focus:outline-none"
        />
        <select
          value={newTaskPriority}
          onChange={event => setNewTaskPriority(event.target.value as 'normal' | 'high' | 'urgent')}
          className="rounded-lg border border-white/10 bg-[#0d1422] px-2 py-1.5 text-xs text-zinc-200 focus:border-cyan-400/50 focus:outline-none"
        >
          <option value="normal">عادي</option>
          <option value="high">عالي</option>
          <option value="urgent">عاجل</option>
        </select>
        <button
          onClick={() => void addPersonalTask()}
          className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-cyan-500"
        >
          <Plus size={12} />
          إضافة
        </button>
      </div>

      <div className="max-h-40 space-y-1.5 overflow-y-auto">
        {selectedAlbumTasks.map(task => (
          <div key={task.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0d1422] px-2 py-1.5">
            <button
              onClick={() => void togglePersonalTask(task.id)}
              className="shrink-0"
              title="تبديل حالة المهمة"
            >
              {task.completed ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Circle size={14} className="text-zinc-500" />}
            </button>
            <p className={`min-w-0 flex-1 truncate text-xs ${task.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
              {task.title}
            </p>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                task.priority === 'urgent'
                  ? 'bg-red-500/20 text-red-300'
                  : task.priority === 'high'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-zinc-600/30 text-zinc-300'
              }`}
            >
              {task.priority === 'urgent' ? 'عاجل' : task.priority === 'high' ? 'عالي' : 'عادي'}
            </span>
            <button
              onClick={() => void deletePersonalTask(task.id)}
              className="shrink-0 text-zinc-400 hover:text-red-300"
              title="حذف"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {selectedAlbumTasks.length === 0 && (
          <p className="text-[11px] text-zinc-500">ماكو مهام شخصية بعد لهذا الألبوم</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full p-4" dir="rtl">
      <div
        className={`grid h-full gap-4 ${
          showProjectSidebar ? 'grid-cols-[320px_minmax(0,1fr)_340px]' : 'grid-cols-[minmax(0,1fr)_340px]'
        }`}
      >
        {/* Right: Projects */}
        {showProjectSidebar ? (
          <aside className="overflow-hidden rounded-3xl border border-white/10 bg-[#151922]">
          <div className="border-b border-white/10 p-4">
            <h3 className="text-lg font-black text-white">المشاريع</h3>
            <p className="text-xs text-zinc-400">اختر مشروع وابدأ التعديل مباشرة</p>
          </div>
          <div className="space-y-2 overflow-y-auto p-3">
            {albums.map(album => {
              const albumImages = imagesByAlbum[album.id] || [];
              const completed = albumImages.filter(image => image.status === 'completed').length;
              const total = albumImages.length;
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <button
                  key={album.id}
                  onClick={() => {
                    setSelectedAlbumId(album.id);
                    onOpenAlbum?.(album);
                  }}
                  className={`w-full rounded-2xl border p-3 text-right transition-all ${
                    selectedAlbumId === album.id
                      ? 'border-blue-500/60 bg-blue-500/10'
                      : 'border-white/10 bg-black/20 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Folder size={16} className="mt-0.5 shrink-0 text-blue-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{album.projectName}</p>
                      <p className="truncate text-xs text-zinc-400">{album.clientName}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {completed}/{total} • {progress}%
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            {albums.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-zinc-500">
                لا توجد مشاريع بحالة تعديل
              </div>
            )}
          </div>
          </aside>
        ) : null}

        {/* Center: Viewer */}
        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-3xl border border-white/10 bg-[#11151d]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              {!showProjectSidebar && onBackToProjects ? (
                <button
                  onClick={onBackToProjects}
                  className="mb-2 inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10"
                >
                  <ArrowRight size={12} />
                  رجوع إلى المعرض
                </button>
              ) : null}
              <h2 className="text-lg font-black text-white">{selectedAlbum?.projectName || 'اختر مشروع'}</h2>
              <p className="text-xs text-zinc-400">{activeSessionPath || 'لا يوجد مسار جلسة مرتبط'}</p>
            </div>
            <p className="text-[11px] text-zinc-400">فتح الملفات يتم من كلك يمين فقط (Finder / Photoshop)</p>
          </div>

          <div className="relative min-h-0 bg-[#090c12] p-4">
            {loadingAlbumId === selectedAlbumId ? (
              <div className="flex h-full items-center justify-center text-zinc-400">
                <RefreshCcw className="ml-2 animate-spin" size={18} />
                تحميل الصور...
              </div>
            ) : currentImage ? (
              <div className="flex h-full flex-col">
                <div
                  className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40"
                  onContextMenu={event => showContextMenu(event, currentImage.originalPath || currentImage.path)}
                >
                  <img
                    src={toFileUrl(currentImage.editedPath || currentImage.path)}
                    alt={currentImage.filename}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button onClick={goToPreviousImage} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-300">
                    السابق
                  </button>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{currentImage.filename}</p>
                    <p className="text-xs text-zinc-400">
                      {currentImageIndex + 1}/{currentImages.length}
                    </p>
                  </div>
                  <button onClick={goToNextImage} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-300">
                    التالي
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">اختر صورة من الشريط السفلي</div>
            )}
          </div>

          <div className="border-t border-white/10 px-3 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {currentImages.map(image => (
                <button
                  key={image.id}
                  onClick={() => selectImage(image.id)}
                  onContextMenu={event => showContextMenu(event, image.originalPath || image.path)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${
                    currentImage?.id === image.id ? 'border-cyan-400' : 'border-transparent'
                  }`}
                >
                  <img src={toFileUrl(image.editedPath || image.path)} alt={image.filename} className="h-full w-full object-cover" />
                  {image.status === 'completed' && (
                    <span className="absolute left-1 top-1 rounded-full bg-emerald-500 p-0.5 text-white">
                      <CheckCircle2 size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Left: Task Manager */}
        <aside className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#151922]">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <h3 className="text-lg font-black text-white">Task Manager</h3>
              <p className="text-xs text-zinc-400">
                {totalDone}/{currentImages.length} • {donePercent}%
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTaskPopVisible(prev => !prev)}
                className="rounded-lg border border-white/10 p-1.5 text-zinc-300 hover:bg-white/10"
                title="Task Pop"
              >
                <Layers3 size={15} />
              </button>
              <button
                onClick={() => setTaskPaneVisible(prev => !prev)}
                className="rounded-lg border border-white/10 p-1.5 text-zinc-300 hover:bg-white/10"
                title="إخفاء/إظهار"
              >
                {taskPaneVisible ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
              </button>
            </div>
          </div>

          {taskPaneVisible ? (
            <div className="h-[calc(100%-72px)] space-y-3 overflow-y-auto p-3">
              {taskRows}
              {selectedImageInsights}
              {personalTasksPanel}
            </div>
          ) : null}
        </aside>
      </div>

      {/* Floating Task Pop */}
      {taskPopVisible && (
        <div
          ref={taskPopRef}
          className="fixed z-[12000] w-[320px] overflow-hidden rounded-2xl border border-cyan-400/40 bg-[#0b1119] shadow-2xl"
          style={{ left: taskPopPos.x, top: taskPopPos.y }}
          onMouseMove={event => {
            if (!taskPopDragging) return;
            setTaskPopPos({ x: event.clientX - taskPopDragOffset.x, y: event.clientY - taskPopDragOffset.y });
          }}
          onMouseUp={() => setTaskPopDragging(false)}
          onMouseLeave={() => setTaskPopDragging(false)}
        >
          <div
            className="flex cursor-move items-center justify-between border-b border-white/10 bg-cyan-500/10 px-3 py-2"
            onMouseDown={event => {
              setTaskPopDragging(true);
              setTaskPopDragOffset({
                x: event.clientX - taskPopPos.x,
                y: event.clientY - taskPopPos.y,
              });
            }}
          >
            <p className="text-sm font-black text-cyan-300">Task Pop</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => void toggleTaskPopPin()}
                className="rounded-lg border border-white/10 p-1 text-zinc-200 hover:bg-white/10"
                title="Always On Top"
              >
                {taskPopPinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
              <button
                onClick={() => setTaskPopVisible(false)}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
              >
                إغلاق
              </button>
            </div>
          </div>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
            {taskRows}
            {selectedImageInsights}
            {personalTasksPanel}
          </div>
        </div>
      )}

      {contextMenu.visible && contextMenu.targetPath ? (
        <div
          className="fixed z-[13000] min-w-[190px] overflow-hidden rounded-xl border border-white/15 bg-[#0f1520] shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              void openOriginalFile(contextMenu.targetPath || undefined);
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm text-white hover:bg-white/10"
          >
            <FolderOpen size={14} />
            فتح في Finder
          </button>
          <button
            onClick={() => {
              void openInPhotoshop(contextMenu.targetPath || undefined);
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2 text-right text-sm text-white hover:bg-white/10"
          >
            <ExternalLink size={14} />
            فتح في Photoshop
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default TaskListView;
