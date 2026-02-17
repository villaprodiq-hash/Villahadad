import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  LayoutGrid, Image, MessageCircle, Camera, Clock, CheckCircle2,
  CalendarDays, Search, Phone, Eye, Send, ArrowRight,
  AlertTriangle, HardDrive, Bell, FolderOpen, Star,
  Sparkles, X, ZoomIn, Heart, ThumbsDown, Minus,
  ChevronLeft, ChevronRight, RefreshCw, Loader2,
  Copy, Plus, Link2, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Booking, BookingStatus, BookingCategory, User } from '../../types';
import UnifiedTeamChat from '../shared/UnifiedTeamChat';
import { toast } from 'sonner';
import { electronBackend } from '../../services/mockBackend';
import { buildClientPortalUrl, getClientPortalLinkError } from '../../utils/clientPortal';
import { getWhatsAppUrl, openWhatsAppUrl } from '../../utils/whatsapp';
import { SyncManager } from '../../services/sync/SyncManager';
import {
  callClientPortal,
  ClientPortalError,
  ensureClientPortalToken,
  generateClientPortalToken,
} from '../../services/clientPortalService';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
interface SelectionDashboardProps {
  bookings: Booking[];
  currentUser?: User;
  users?: User[];
  onStatusUpdate?: (id: string, status: BookingStatus) => Promise<void>;
}

type ViewState = 'HOME' | 'GALLERY' | 'CHAT';
type PhotoStatus = 'approved' | 'rejected' | 'pending' | 'maybe';

interface GalleryPhoto {
  id: number;
  src: string;
  name: string;
  status: PhotoStatus;
  rating: number;
  note: string;
  tags: string[];
  cloudUrl?: string | null;
  thumbnailUrl?: string | null;
  localPath?: string | null;
  sourceKey?: string;
  uploadError?: string | null;
}

type DesktopFile = File & { path?: string };

interface IngestionCandidate {
  sourceKey: string;
  file: DesktopFile;
  filePath?: string;
}

interface FailedUploadItem extends IngestionCandidate {
  error: string;
}

type GenericRecord = Record<string, unknown>;
type ListDirectoryEntry = string | { name: string; path: string; isDirectory?: boolean };
type SessionImagesSchema = {
  fileColumn:
    | 'fileName'
    | 'file_name'
    | 'originalPath'
    | 'original_path'
    | 'localPath'
    | 'local_path'
    | 'path'
    | null;
  bookingColumn: 'bookingId' | 'booking_id' | null;
  sessionColumn: 'sessionId' | 'session_id' | null;
  statusColumn: 'status' | null;
  likedColumn: 'liked' | null;
  selectedColumn: 'is_selected' | 'isSelected' | null;
  notesColumn: 'notes' | null;
  updatedColumn: 'updatedAt' | 'updated_at' | null;
  createdColumn: 'createdAt' | 'created_at' | null;
  cloudColumn: 'cloudUrl' | 'cloud_url' | null;
};

type SessionImageMeta = {
  status: PhotoStatus;
  note: string;
  tags: string[];
};

const isRecord = (value: unknown): value is GenericRecord =>
  typeof value === 'object' && value !== null;

const getElectronAPI = () => window.electronAPI;

const asDetails = (details: Booking['details'] | undefined): GenericRecord =>
  isRecord(details) ? (details as GenericRecord) : {};

const DELIVERY_WINDOW_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const fileStem = (name: string) => name.replace(/\.[^/.]+$/, '').toLowerCase();
const normalizeFileName = (name: string) => String(name || '').trim().toLowerCase();
const normalizeFsPath = (value: string) => value.replace(/\\/g, '/').toLowerCase();
const buildSourceKey = (file: DesktopFile): string => {
  const diskPath = typeof file.path === 'string' && file.path.trim().length > 0 ? file.path : null;
  if (diskPath) return `path:${normalizeFsPath(diskPath)}`;
  return `meta:${normalizeFileName(file.name)}:${file.size}:${file.lastModified}`;
};

const toFileName = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return (lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized).trim();
};

const toFileUrl = (path?: string | null): string | null => {
  if (typeof path !== 'string' || path.trim().length === 0) return null;
  return path.startsWith('file://') ? path : `file://${path}`;
};

const parseNotesPayload = (raw: unknown): { note: string; tags: string[] } => {
  if (typeof raw !== 'string' || raw.trim().length === 0) return { note: '', tags: [] };
  const text = raw.trim();
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text) as { note?: unknown; tags?: unknown };
      const parsedNote = typeof parsed.note === 'string' ? parsed.note.trim() : '';
      const parsedTags = Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
        : [];
      return { note: parsedNote, tags: Array.from(new Set(parsedTags)) };
    } catch {
      // Fall back to plain note parsing below.
    }
  }

  const hashTags = text.match(/#[\p{L}\p{N}_-]+/gu) || [];
  const tags = Array.from(new Set(hashTags.map((tag) => tag.replace('#', ''))));
  const cleanedNote = text.replace(/#[\p{L}\p{N}_-]+/gu, '').replace(/\s+/g, ' ').trim();
  return { note: cleanedNote, tags };
};

const buildNotesPayload = (note: string, tags: string[]): string => {
  const cleanNote = note.trim();
  const cleanTags = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
  if (cleanTags.length === 0) return cleanNote;
  return JSON.stringify({ note: cleanNote, tags: cleanTags });
};

const getGridPhotoSrc = (photo: GalleryPhoto): string =>
  photo.thumbnailUrl || photo.cloudUrl || toFileUrl(photo.localPath) || photo.src;

const getLightboxPhotoSrc = (photo: GalleryPhoto): string =>
  toFileUrl(photo.localPath) || photo.cloudUrl || photo.src;

function getSelectionCountdown(booking: Booking): {
  remainingDays: number;
  isOverdue: boolean;
  hasDate: boolean;
} {
  const details = asDetails(booking.details);
  const detailsSelectionCompletedAt =
    typeof details.selectionCompletedAt === 'string' ? details.selectionCompletedAt : null;
  const detailsSelectionConfirmedAt =
    typeof details.selectionConfirmedAt === 'string' ? details.selectionConfirmedAt : null;
  const baseDate =
    booking.actualSelectionDate ||
    detailsSelectionCompletedAt ||
    detailsSelectionConfirmedAt ||
    null;
  if (!baseDate) return { remainingDays: DELIVERY_WINDOW_DAYS, isOverdue: false, hasDate: false };

  const start = new Date(baseDate);
  if (Number.isNaN(start.getTime())) {
    return { remainingDays: DELIVERY_WINDOW_DAYS, isOverdue: false, hasDate: false };
  }

  const elapsedDays = Math.max(0, Math.floor((Date.now() - start.getTime()) / DAY_MS));
  const remainingDays = DELIVERY_WINDOW_DAYS - elapsedDays;
  return { remainingDays, isOverdue: remainingDays < 0, hasDate: true };
}

function getSelectionDelayFromSend(booking: Booking): {
  sentAt: string | null;
  delayedDays: number;
} {
  const details = asDetails(booking.details);
  const sentAt = typeof details.selectionLinkSentAt === 'string' ? details.selectionLinkSentAt : null;
  if (!sentAt) return { sentAt: null, delayedDays: 0 };

  const sentDate = new Date(sentAt);
  if (Number.isNaN(sentDate.getTime())) return { sentAt: null, delayedDays: 0 };
  const delayedDays = Math.max(0, Math.floor((Date.now() - sentDate.getTime()) / DAY_MS));
  return { sentAt, delayedDays };
}

const EDITING_TAGS = [
  'تبييض أسنان', 'إزالة عيوب', 'تنعيم بشرة', 'تنحيف',
  'فتح عيون', 'إزالة كائن', 'تعديل ألوان', 'تأطير'
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
const SelectionDashboard: React.FC<SelectionDashboardProps> = ({
  bookings, currentUser, users = [], onStatusUpdate
}) => {
  const portalPasswordCacheRef = useRef<Record<string, { token: string; password: string }>>({});
  const notePersistTimersRef = useRef<Record<number, number>>({});
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'waiting' | 'active' | 'done' | 'delayed' | 'no_send'>('all');

  // Gallery state
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [showTagsPopover, setShowTagsPopover] = useState(false);
  const [failedUploads, setFailedUploads] = useState<FailedUploadItem[]>([]);
  const [ingestionProgress, setIngestionProgress] = useState<{
    percent: number; status: string; current?: number; total?: number; startTime?: number;
  } | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<Array<{
    id: string; type: 'warning' | 'info' | 'success'; message: string; bookingId: string; time: string;
  }>>([]);
  const resolveSessionImagesSchema = useCallback(async (): Promise<SessionImagesSchema | null> => {
    const electronAPI = getElectronAPI();
    if (!electronAPI?.db?.query) {
      return null;
    }

    try {
      const rows = await electronAPI.db.query(`PRAGMA table_info(session_images)`);
      if (!Array.isArray(rows) || rows.length === 0) {
        return null;
      }

      const columnNames = new Set(
        rows
          .filter(isRecord)
          .map((row) => String(row.name || '').trim())
          .filter((name) => name.length > 0)
      );

      const schema: SessionImagesSchema = {
        fileColumn: columnNames.has('fileName')
          ? 'fileName'
          : columnNames.has('file_name')
            ? 'file_name'
            : columnNames.has('originalPath')
              ? 'originalPath'
              : columnNames.has('original_path')
                ? 'original_path'
                : columnNames.has('localPath')
                  ? 'localPath'
                  : columnNames.has('local_path')
                    ? 'local_path'
                    : columnNames.has('path')
                      ? 'path'
                      : null,
        bookingColumn: columnNames.has('bookingId') ? 'bookingId' : columnNames.has('booking_id') ? 'booking_id' : null,
        sessionColumn: columnNames.has('sessionId') ? 'sessionId' : columnNames.has('session_id') ? 'session_id' : null,
        statusColumn: columnNames.has('status') ? 'status' : null,
        likedColumn: columnNames.has('liked') ? 'liked' : null,
        selectedColumn: columnNames.has('is_selected') ? 'is_selected' : columnNames.has('isSelected') ? 'isSelected' : null,
        notesColumn: columnNames.has('notes') ? 'notes' : null,
        updatedColumn: columnNames.has('updatedAt') ? 'updatedAt' : columnNames.has('updated_at') ? 'updated_at' : null,
        createdColumn: columnNames.has('createdAt') ? 'createdAt' : columnNames.has('created_at') ? 'created_at' : null,
        cloudColumn: columnNames.has('cloudUrl') ? 'cloudUrl' : columnNames.has('cloud_url') ? 'cloud_url' : null,
      };

      if (!schema.fileColumn || (!schema.bookingColumn && !schema.sessionColumn)) {
        return null;
      }

      return schema;
    } catch {
      return null;
    }
  }, []);

  const buildSessionImagesWhere = useCallback(
    (schema: SessionImagesSchema, bookingId: string): { clause: string; params: unknown[] } | null => {
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
    },
    []
  );

  const getSessionPathFromDB = useCallback(async (bookingId: string): Promise<string | null> => {
    const electronAPI = getElectronAPI();
    if (!electronAPI?.db?.query) return null;

    const attempts: Array<{ sql: string; params: unknown[] }> = [
      {
        sql: `SELECT nasPath AS path FROM sessions WHERE bookingId = ? AND nasPath IS NOT NULL ORDER BY updatedAt DESC LIMIT 1`,
        params: [bookingId],
      },
      {
        sql: `SELECT nasPath AS path FROM sessions WHERE id = ? AND nasPath IS NOT NULL ORDER BY updatedAt DESC LIMIT 1`,
        params: [bookingId],
      },
      {
        sql: `SELECT nas_path AS path FROM sessions WHERE booking_id = ? AND nas_path IS NOT NULL ORDER BY updated_at DESC LIMIT 1`,
        params: [bookingId],
      },
      {
        sql: `SELECT nas_path AS path FROM sessions WHERE id = ? AND nas_path IS NOT NULL ORDER BY updated_at DESC LIMIT 1`,
        params: [bookingId],
      },
    ];

    for (const attempt of attempts) {
      try {
        const rows = await electronAPI.db.query(attempt.sql, attempt.params);
        const row = Array.isArray(rows) && rows.length > 0 && isRecord(rows[0]) ? rows[0] : null;
        const resolved = row && typeof row.path === 'string' ? row.path : null;
        if (resolved) return resolved;
      } catch {
        // Try next schema variation
      }
    }
    return null;
  }, []);

  const getSelectedFileNamesForBooking = useCallback(
    async (booking: Booking): Promise<string[]> => {
      const electronAPI = getElectronAPI();
      if (!electronAPI?.db?.query) return [];

      const bookingId = booking.id;
      const schema = await resolveSessionImagesSchema();
      if (!schema) return [];

      const where = buildSessionImagesWhere(schema, bookingId);
      if (!where) return [];

      const selectParts: string[] = [`${schema.fileColumn} AS file_name`];
      if (schema.statusColumn) selectParts.push(`${schema.statusColumn} AS status`);
      if (schema.likedColumn) selectParts.push(`${schema.likedColumn} AS liked`);
      if (schema.selectedColumn) selectParts.push(`${schema.selectedColumn} AS is_selected`);
      const sql = `SELECT ${selectParts.join(', ')} FROM session_images WHERE ${where.clause}`;

      try {
        const rows = await electronAPI.db.query(sql, where.params);
        if (!Array.isArray(rows)) return [];
        const selected = rows
          .filter((row) => {
            if (!isRecord(row)) return false;
            const s = String(row.status || '').toLowerCase();
            if (s === 'selected' || s === 'approved') return true;
            if (Number(row.liked || 0) > 0) return true;
            if (Number(row.is_selected || 0) > 0) return true;
            return false;
          })
          .map((row) => {
            if (!isRecord(row)) return '';
            return toFileName(row.file_name || row.fileName);
          })
          .filter((n: string) => n.length > 0);
        return Array.from(new Set(selected));
      } catch {
        return [];
      }
    },
    [buildSessionImagesWhere, resolveSessionImagesSchema]
  );

  const getSelectionStatusMap = useCallback(
    async (booking: Booking): Promise<Map<string, SessionImageMeta>> => {
      const electronAPI = getElectronAPI();
      const map = new Map<string, SessionImageMeta>();
      if (!electronAPI?.db?.query) return map;

      const bookingId = booking.id;
      const schema = await resolveSessionImagesSchema();
      if (!schema) return map;

      const where = buildSessionImagesWhere(schema, bookingId);
      if (!where) return map;

      const selectParts: string[] = [`${schema.fileColumn} AS file_name`];
      if (schema.statusColumn) selectParts.push(`${schema.statusColumn} AS status`);
      if (schema.likedColumn) selectParts.push(`${schema.likedColumn} AS liked`);
      if (schema.selectedColumn) selectParts.push(`${schema.selectedColumn} AS is_selected`);
      if (schema.notesColumn) selectParts.push(`${schema.notesColumn} AS notes`);
      const sql = `SELECT ${selectParts.join(', ')} FROM session_images WHERE ${where.clause}`;

      try {
        const rows = await electronAPI.db.query(sql, where.params);
        if (!Array.isArray(rows)) return map;

        rows.forEach((row) => {
          if (!isRecord(row)) return;
          const name = toFileName(row.file_name || row.fileName);
          if (!name) return;
          const status = String(row.status || '').toLowerCase();
          let uiStatus: PhotoStatus = 'pending';
          if (status === 'selected' || status === 'approved' || Number(row.liked || 0) > 0 || Number(row.is_selected || 0) > 0) {
            uiStatus = 'approved';
          } else if (status === 'rejected') {
            uiStatus = 'rejected';
          } else if (status === 'maybe') {
            uiStatus = 'maybe';
          }
          const parsed = parseNotesPayload(row.notes);
          map.set(fileStem(name), {
            status: uiStatus,
            note: parsed.note,
            tags: parsed.tags,
          });
        });
      } catch {
        return map;
      }

      return map;
    },
    [buildSessionImagesWhere, resolveSessionImagesSchema]
  );

  const persistPhotoMeta = useCallback(
    async (booking: Booking, photo: GalleryPhoto) => {
      const electronAPI = getElectronAPI();
      if (!electronAPI?.db?.query || !electronAPI?.db?.run) return;
      const schema = await resolveSessionImagesSchema();
      if (!schema || !schema.fileColumn) return;

      const where = buildSessionImagesWhere(schema, booking.id);
      if (!where) return;

      const fileName = photo.name.trim();
      if (!fileName) return;

      const normalizedStatus =
        photo.status === 'approved'
          ? 'selected'
          : photo.status === 'rejected'
            ? 'rejected'
            : photo.status === 'maybe'
              ? 'maybe'
              : 'pending';
      const liked = photo.status === 'approved' ? 1 : 0;
      const notesPayload = buildNotesPayload(photo.note, photo.tags);
      const updatedAt = new Date().toISOString();

      const lookupSql = `SELECT id FROM session_images WHERE ${where.clause} AND ${schema.fileColumn} = ? LIMIT 1`;
      const lookupParams = [...where.params, fileName];

      try {
        const found = await electronAPI.db.query(lookupSql, lookupParams);
        const existingRow = Array.isArray(found) && found.length > 0 && isRecord(found[0]) ? found[0] : null;
        const existingId = existingRow && typeof existingRow.id === 'string' ? existingRow.id : null;

        if (existingId) {
          const setParts: string[] = [];
          const values: unknown[] = [];

          if (schema.statusColumn) {
            setParts.push(`${schema.statusColumn} = ?`);
            values.push(normalizedStatus);
          }
          if (schema.likedColumn) {
            setParts.push(`${schema.likedColumn} = ?`);
            values.push(liked);
          }
          if (schema.selectedColumn) {
            setParts.push(`${schema.selectedColumn} = ?`);
            values.push(liked > 0 ? 1 : 0);
          }
          if (schema.notesColumn) {
            setParts.push(`${schema.notesColumn} = ?`);
            values.push(notesPayload);
          }
          if (setParts.length === 0) return;

          if (schema.updatedColumn && (schema.statusColumn || schema.likedColumn || schema.selectedColumn || schema.notesColumn)) {
            setParts.push(`${schema.updatedColumn} = ?`);
            values.push(updatedAt);
          }

          values.push(existingId);
          await electronAPI.db.run(`UPDATE session_images SET ${setParts.join(', ')} WHERE id = ?`, values);
          return;
        }

        const insertColumns = ['id', schema.fileColumn];
        const insertValues: unknown[] = [
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `session-image-${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
          fileName,
        ];

        if (schema.bookingColumn) {
          insertColumns.push(schema.bookingColumn);
          insertValues.push(booking.id);
        }
        if (schema.sessionColumn) {
          insertColumns.push(schema.sessionColumn);
          insertValues.push(booking.id);
        }
        if (schema.statusColumn) {
          insertColumns.push(schema.statusColumn);
          insertValues.push(normalizedStatus);
        }
        if (schema.likedColumn) {
          insertColumns.push(schema.likedColumn);
          insertValues.push(liked);
        }
        if (schema.selectedColumn) {
          insertColumns.push(schema.selectedColumn);
          insertValues.push(liked > 0 ? 1 : 0);
        }
        if (schema.notesColumn) {
          insertColumns.push(schema.notesColumn);
          insertValues.push(notesPayload);
        }
        if (schema.createdColumn) {
          insertColumns.push(schema.createdColumn);
          insertValues.push(updatedAt);
        }
        if (schema.updatedColumn) {
          insertColumns.push(schema.updatedColumn);
          insertValues.push(updatedAt);
        }

        const placeholders = insertColumns.map(() => '?').join(', ');
        await electronAPI.db.run(
          `INSERT INTO session_images (${insertColumns.join(', ')}) VALUES (${placeholders})`,
          insertValues
        );
      } catch (error) {
        console.error('[Selection] Failed to persist photo metadata:', error);
      }
    },
    [buildSessionImagesWhere, resolveSessionImagesSchema]
  );

  // ── Computed Data ──────────────────────────────────────
  const pendingSelectionBookings = useMemo(() =>
    bookings.filter(b =>
      b.status === BookingStatus.SHOOTING_COMPLETED ||
      b.status === BookingStatus.SELECTION
    ), [bookings]);

  const doneSelectionBookings = useMemo(() =>
    bookings.filter(b => b.status === BookingStatus.EDITING), [bookings]);

  const selectionRoleBookings = useMemo(
    () => [...pendingSelectionBookings, ...doneSelectionBookings],
    [pendingSelectionBookings, doneSelectionBookings]
  );

  const doneCountdownBookings = useMemo(
    () =>
      doneSelectionBookings
        .map(booking => ({ booking, countdown: getSelectionCountdown(booking) }))
        .sort((a, b) => a.countdown.remainingDays - b.countdown.remainingDays),
    [doneSelectionBookings]
  );

  const readyForPickup = useMemo(() =>
    bookings.filter(b => b.status === BookingStatus.READY_FOR_PICKUP), [bookings]);

  const filteredBookings = useMemo(() => {
    let result = selectionRoleBookings;

    if (filterTab === 'waiting') {
      result = pendingSelectionBookings.filter(b => b.status === BookingStatus.SHOOTING_COMPLETED);
    } else if (filterTab === 'active') {
      result = pendingSelectionBookings.filter(b => b.status === BookingStatus.SELECTION);
    } else if (filterTab === 'done') {
      result = doneSelectionBookings;
    } else if (filterTab === 'delayed') {
      result = pendingSelectionBookings.filter(b => {
        const delay = getSelectionDelayFromSend(b);
        return !!delay.sentAt && delay.delayedDays > 0;
      });
      result = [...result].sort(
        (a, b) => getSelectionDelayFromSend(b).delayedDays - getSelectionDelayFromSend(a).delayedDays
      );
    } else if (filterTab === 'no_send') {
      result = pendingSelectionBookings.filter(b => !getSelectionDelayFromSend(b).sentAt);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        (b.clientName || '').toLowerCase().includes(q) ||
        (b.title || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [selectionRoleBookings, pendingSelectionBookings, doneSelectionBookings, filterTab, searchQuery]);

  // ── Generate Notifications ────────────────────────────
  useEffect(() => {
    const notifs: typeof notifications = [];

    pendingSelectionBookings.forEach(b => {
      if (b.status === BookingStatus.SHOOTING_COMPLETED) {
        if (b.nasStatus === 'pending' || b.nasStatus === 'none' || !b.nasStatus) {
          notifs.push({
            id: `nas-${b.id}`,
            type: 'warning',
            message: `الصور لم تُنقل بعد من NAS - ${b.clientName}`,
            bookingId: b.id,
            time: 'الآن'
          });
        }
        if (b.nasStatus === 'synced') {
          notifs.push({
            id: `ready-${b.id}`,
            type: 'info',
            message: `الصور جاهزة للاختيار - ${b.clientName}`,
            bookingId: b.id,
            time: 'الآن'
          });
        }
      }
    });

    setNotifications(notifs);
  }, [pendingSelectionBookings]);

  // ── Handlers ──────────────────────────────────────────
  const handleStartSelection = useCallback(async (booking: Booking) => {
    if (!onStatusUpdate) return;
    try {
      await onStatusUpdate(booking.id, BookingStatus.SELECTION);
      toast.success(`بدأ اختيار الصور - ${booking.clientName}`);
    } catch {
      toast.error('فشل بدء الاختيار');
    }
  }, [onStatusUpdate]);

  const normalizePortalPassword = useCallback((value?: string): string => {
    const password = String(value || '').trim();
    // Primary format: 6-digit numeric password.
    if (/^\d{6}$/.test(password)) return password;
    // Backward compatibility for old links generated before numeric-only rollout.
    if (/^[A-Za-z0-9]{6,12}$/.test(password)) return password.toUpperCase();
    return '';
  }, []);

  const buildPortalShareText = useCallback((portalUrl: string, portalPassword: string): string => {
    return `رابط اختيار الصور:\n${portalUrl}\nرمز الدخول: ${portalPassword}`;
  }, []);

  const buildPortalWhatsAppMessage = useCallback(
    (booking: Booking, portalUrl: string, portalPassword: string): string => {
      return `مرحباً ${booking.clientName} 🌷\nرابط اختيار الصور جاهز.\nاضغط هنا 👇\n${portalUrl}\nرمز الدخول: ${portalPassword}`;
    },
    []
  );

  const resolveShareablePortalUrl = useCallback(
    async (portalUrl: string, token: string): Promise<string> => {
      const template = String(import.meta.env.VITE_CLIENT_PORTAL_SHORT_URL_TEMPLATE || '').trim();
      if (template.length > 0) {
        const hasTokenPlaceholder = template.includes('{token}');
        const hasUrlPlaceholder = template.includes('{url}');
        if (hasTokenPlaceholder || hasUrlPlaceholder) {
          const resolved = template
            .replaceAll('{token}', encodeURIComponent(token))
            .replaceAll('{url}', encodeURIComponent(portalUrl));
          if (resolved.length > 0) return resolved;
        }
        try {
          // Fallback for static short-domain path (no placeholders).
          // Example: https://select.villahadad.org/r  ->  ?t=...
          const shortUrl = new URL(template);
          shortUrl.searchParams.set('t', token);
          return shortUrl.toString();
        } catch {
          // Ignore and fallback to other strategies.
        }
      }

      const shortenerEndpoint = String(import.meta.env.VITE_CLIENT_PORTAL_SHORTENER_ENDPOINT || '').trim();
      if (!shortenerEndpoint) return portalUrl;

      try {
        const shortenerApiKey = String(import.meta.env.VITE_CLIENT_PORTAL_SHORTENER_API_KEY || '').trim();
        const response = await fetch(shortenerEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(shortenerApiKey ? { Authorization: `Bearer ${shortenerApiKey}` } : {}),
          },
          body: JSON.stringify({
            url: portalUrl,
            token,
          }),
        });
        if (!response.ok) return portalUrl;

        const payload = (await response.json()) as Record<string, unknown>;
        const candidate = [
          payload.shortUrl,
          payload.short_url,
          payload.link,
          payload.url,
        ].find(value => typeof value === 'string' && value.trim().length > 0) as string | undefined;

        return candidate?.trim() || portalUrl;
      } catch {
        return portalUrl;
      }
    },
    []
  );

  const ensurePortalUrlForBooking = useCallback(
    async (
      booking: Booking,
      forceNew = false
    ): Promise<{ token: string; portalUrl: string; portalPassword?: string }> => {
      let token = booking.client_token || '';
      const isLegacySignedToken = token.startsWith('vh.') && token.split('.').length === 3;
      if (!forceNew && token && !isLegacySignedToken) {
        const existingLinkError = getClientPortalLinkError(token);
        if (!existingLinkError) {
          const existingPortalUrl = buildClientPortalUrl(token);
          if (existingPortalUrl) {
            let isTokenStillValid = true;
            try {
              await callClientPortal({
                action: 'get_access_state',
                token,
              });
            } catch (error) {
              if (error instanceof ClientPortalError) {
                const invalidCodes = new Set([
                  'INVALID_TOKEN',
                  'TOKEN_EXPIRED',
                  'TOKEN_TAMPERED',
                  'BOOKING_NOT_FOUND',
                ]);
                if (error.code && invalidCodes.has(error.code)) {
                  isTokenStillValid = false;
                } else if (error.status === 401 || error.status === 404) {
                  isTokenStillValid = false;
                }
              }
            }

            if (isTokenStillValid) {
              return { token, portalUrl: existingPortalUrl };
            }
          }
        }
      }

      // Force backend issuance when no usable token exists (or when explicit rotation requested).
      let issued: { token: string; portalPassword?: string };
      try {
        issued = forceNew
          ? await generateClientPortalToken(booking.id, currentUser)
          : await ensureClientPortalToken(booking.id, currentUser);
      } catch (error) {
        if (error instanceof ClientPortalError) {
          if (error.status === 403 || error.code === 'FORBIDDEN_ADMIN_ACTION') {
            throw new Error('تعذر إصدار رابط جديد حالياً. تحقق من إعدادات CLIENT_PORTAL_ADMIN_KEY.');
          }
          if (error.code === 'CONFIG_ERROR') {
            throw new Error('إعدادات بوابة العميل غير مكتملة (SUPABASE/PORTAL).');
          }
          if (typeof error.message === 'string' && error.message.trim().length > 0) {
            throw new Error(error.message);
          }
        }
        throw error;
      }
      token = issued.token;
      const portalPassword = issued.portalPassword;

      try {
        await electronBackend.updateBooking(booking.id, {
          client_token: token,
        });
      } catch {
        // Non-blocking: link will still be usable for immediate share/copy.
      }

      const linkError = getClientPortalLinkError(token);
      if (linkError) throw new Error(linkError);

      const portalUrl = buildClientPortalUrl(token);
      if (!portalUrl) throw new Error('تعذر توليد رابط البوابة');
      return { token, portalUrl, portalPassword };
    },
    [currentUser]
  );

  const ensureShareablePortalCredentials = useCallback(
    async (
      booking: Booking,
      forceNew = false
    ): Promise<{ token: string; portalUrl: string; portalPassword: string }> => {
      let issued = await ensurePortalUrlForBooking(booking, forceNew);
      let portalPassword = normalizePortalPassword(issued.portalPassword);
      const cached = portalPasswordCacheRef.current[booking.id];

      if (!portalPassword && cached && cached.token === issued.token) {
        portalPassword = normalizePortalPassword(cached.password);
      }

      // If we cannot retrieve a valid password for the existing token,
      // rotate once to guarantee a shareable credential pair.
      if (!portalPassword) {
        issued = await ensurePortalUrlForBooking(booking, true);
        portalPassword = normalizePortalPassword(issued.portalPassword);
      }

      if (!portalPassword) throw new Error('تعذر تجهيز رمز دخول للرابط. أعد المحاولة.');

      portalPasswordCacheRef.current[booking.id] = {
        token: issued.token,
        password: portalPassword,
      };

      return {
        token: issued.token,
        portalUrl: issued.portalUrl,
        portalPassword,
      };
    },
    [ensurePortalUrlForBooking, normalizePortalPassword]
  );

  const handleCopyPortalLink = useCallback(
    async (booking: Booking) => {
      try {
        const { token, portalUrl, portalPassword } = await ensureShareablePortalCredentials(booking, false);
        const shareUrl = await resolveShareablePortalUrl(portalUrl, token);
        const textToCopy = buildPortalShareText(shareUrl, portalPassword);
        await navigator.clipboard.writeText(textToCopy);
        toast.success('تم نسخ الرابط + رمز الدخول');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'فشل نسخ رابط الألبوم');
      }
    },
    [buildPortalShareText, ensureShareablePortalCredentials, resolveShareablePortalUrl]
  );

  const handleGenerateNewPortalLink = useCallback(
    async (booking: Booking) => {
      try {
        const { token, portalUrl, portalPassword } = await ensureShareablePortalCredentials(booking, true);
        const shareUrl = await resolveShareablePortalUrl(portalUrl, token);
        const textToCopy = buildPortalShareText(shareUrl, portalPassword);
        await navigator.clipboard.writeText(textToCopy);
        toast.success('تم توليد رابط جديد ونسخه مع رمز الدخول');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'فشل توليد رابط جديد');
      }
    },
    [buildPortalShareText, ensureShareablePortalCredentials, resolveShareablePortalUrl]
  );

  const handleSendPortalLink = useCallback(
    async (booking: Booking) => {
      try {
        // Always ensure a valid link + password pair before sending.
        const { token, portalUrl, portalPassword } = await ensureShareablePortalCredentials(booking, false);

        // Guard: don't send an empty portal link if no cloud photos are ready yet.
        try {
          const electronAPI = getElectronAPI();
          if (electronAPI?.db?.query) {
            const schema = await resolveSessionImagesSchema();
            if (schema?.cloudColumn) {
              const where = buildSessionImagesWhere(schema, booking.id);
              if (where) {
                const countResult = await electronAPI.db.query(
                  `SELECT COUNT(*) as count FROM session_images WHERE ${where.clause} AND ${schema.cloudColumn} IS NOT NULL`,
                  where.params
                );
                const localCount = Number((countResult?.[0] as { count?: number | string } | undefined)?.count || 0);
                if (localCount <= 0) {
                  toast.error('لا توجد صور سحابية جاهزة للإرسال بعد');
                  return;
                }
              }
            }
          }
        } catch {
          // Non-blocking: continue and rely on cloud validation below
        }

        // Force immediate queue push before sending portal link.
        try {
          await SyncManager.pushChanges();
        } catch {
          // Non-blocking
        }

        // Quick cloud validation to avoid sending a link that opens empty.
        try {
          const portalPayload = await callClientPortal<{ totalCount?: number }>({
            action: 'get_photo_count',
            token,
          });
          const cloudCount = Number(portalPayload.totalCount || 0);
          if (cloudCount <= 0) {
            toast.error('الصور لم تصل للسحابة بعد. انتظر ثواني ثم أعد الإرسال');
            return;
          }
        } catch {
          // Non-blocking: if validation fails, still allow manual send.
        }

        const shareUrl = await resolveShareablePortalUrl(portalUrl, token);
        const message = buildPortalWhatsAppMessage(booking, shareUrl, portalPassword);
        const phone = (booking.clientPhone || '').replace(/[^0-9+]/g, '');

        // Open WhatsApp first for frictionless sending.
        const waUrl = getWhatsAppUrl(phone, message);
        await openWhatsAppUrl(waUrl);

        // Track first/last send timestamp to measure client delay.
        try {
          const nowIso = new Date().toISOString();
          const details = { ...asDetails(booking.details) };
          const nextCount = Number(details.selectionLinkSentCount || 0) + 1;
          details.selectionLinkSentAt = details.selectionLinkSentAt || nowIso;
          details.lastSelectionLinkSentAt = nowIso;
          details.selectionLinkSentCount = nextCount;
          details.selectionLinkSentBy = currentUser?.name || 'unknown';

          await electronBackend.updateBooking(booking.id, { details });
          toast.success(`تم فتح واتساب وتسجيل الإرسال (${nextCount})`);
        } catch {
          toast.success('تم فتح واتساب (فشل تسجيل وقت الإرسال)');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'فشل تجهيز رابط البوابة');
      }
    },
    [
      buildPortalWhatsAppMessage,
      buildSessionImagesWhere,
      currentUser?.name,
      ensureShareablePortalCredentials,
      resolveShareablePortalUrl,
      resolveSessionImagesSchema,
    ]
  );

  const handleFinishSelection = useCallback(async (booking: Booking) => {
    if (!onStatusUpdate) return;
    const approvedPhotos = galleryPhotos.filter(p => p.status === 'approved');
    let selectedFileNames = Array.from(
      new Set(
        approvedPhotos
          .map(p => p.name)
          .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      )
    );

    // Fallback: when UI cache is stale, read selected file names from session_images table.
    if (selectedFileNames.length === 0) {
      selectedFileNames = await getSelectedFileNamesForBooking(booking);
    }

    if (selectedFileNames.length === 0) {
      toast.error('لا توجد صور مختارة — اختر صور أولاً');
      return;
    }
    if (!window.confirm(`إنهاء الاختيار وإرسال "${booking.clientName}" للتصميم؟\n\nسيتم نسخ ${selectedFileNames.length} صورة مختارة إلى مجلد 02_SELECTED`)) return;
    try {
      const electronAPI = getElectronAPI();
      const resolvedSessionPath = booking.folderPath || (await getSessionPathFromDB(booking.id));
      if (!resolvedSessionPath) {
        toast.error('تعذر تحديد مسار جلسة الصور. افتح الألبوم مرة أخرى وأعد المحاولة.');
        return;
      }

      if (!electronAPI?.sessionLifecycle?.copyToSelected) {
        toast.error('خدمة نسخ الصور غير متاحة حالياً');
        return;
      }

      // Copy approved photos to 02_SELECTED folder.
      const copyResult = await electronAPI.sessionLifecycle.copyToSelected(
        resolvedSessionPath,
        selectedFileNames
      );

      const copied = Number(copyResult?.copied || 0);
      const failed = Number(copyResult?.failed || 0);
      const expected = selectedFileNames.length;

      if (copied < expected || failed > 0) {
        const errorText =
          Array.isArray(copyResult?.errors) && copyResult.errors.length > 0
            ? `\n${copyResult.errors.slice(0, 3).join('\n')}`
            : '';
        toast.error(
          `فشل نسخ كل الصور المختارة (${copied}/${expected}). لن يتم إرسال الحجز للتصميم قبل اكتمال النسخ.${errorText}`
        );
        return;
      }

      // Persist selection timestamp only after successful copy.
      const selectionNowIso = new Date().toISOString();
      const deliveryDeadlineIso = new Date(Date.now() + DELIVERY_WINDOW_DAYS * DAY_MS).toISOString();
      await electronBackend.updateBooking(booking.id, {
        actualSelectionDate: selectionNowIso,
        deliveryDeadline: deliveryDeadlineIso,
        details: {
          ...asDetails(booking.details),
          selectionCompletedAt: selectionNowIso,
        },
      });

      await onStatusUpdate(booking.id, BookingStatus.EDITING);
      toast.success(`تم نسخ ${copied} صورة وإرسال "${booking.clientName}" للتصميم`);
      setSelectedBooking(null);
      setCurrentView('GALLERY');
    } catch {
      toast.error('فشل إرسال الحجز للتصميم');
    }
  }, [onStatusUpdate, galleryPhotos, getSelectedFileNamesForBooking, getSessionPathFromDB]);

  /** Ensure session folder exists; create if missing and update booking with folderPath */
  const ensureSessionFolder = useCallback(async (booking: Booking): Promise<Booking> => {
    if (booking.folderPath) return booking;

    const electronAPI = getElectronAPI();
    if (!electronAPI?.sessionLifecycle?.createSessionDirectory) return booking;

    try {
      const sessionId = booking.nasSessionId || booking.id;
      const dateStr = booking.shootDate || new Date().toISOString();
      const result = await electronAPI.sessionLifecycle.createSessionDirectory(
        booking.clientName || '',
        sessionId,
        dateStr,
        booking as unknown as Record<string, unknown>
      );
      if (!result?.success || !result.sessionPath) return booking;

      await electronBackend.updateBooking(booking.id, {
        folderPath: result.sessionPath,
        nasSessionId: sessionId,
      });
      return { ...booking, folderPath: result.sessionPath, nasSessionId: sessionId };
    } catch (err) {
      console.error('[Selection] ensureSessionFolder failed:', err);
      return booking;
    }
  }, []);

  const loadPhotosFromNAS = useCallback(async (booking: Booking) => {
    setIsLoadingPhotos(true);
    setGalleryPhotos([]);
    setFailedUploads([]);

    try {
      const electronAPI = getElectronAPI();
      const resolvedSessionPath = booking.folderPath || (await getSessionPathFromDB(booking.id));
      if (resolvedSessionPath && electronAPI?.fileSystem?.listDirectory) {
        const rawPath = `${resolvedSessionPath}/01_RAW`;
        const files = await electronAPI.fileSystem.listDirectory(rawPath);
        const statusMap = await getSelectionStatusMap(booking);

        if (files && Array.isArray(files)) {
          const imageFiles = files
            .map((entry: ListDirectoryEntry) =>
              typeof entry === 'string'
                ? { name: entry, path: `${rawPath}/${entry}` }
                : entry
            )
            .filter((entry) => /\.(jpg|jpeg|png|raw|cr2|cr3|arw|nef|dng|orf|rw2|heic|webp)$/i.test(entry.name))
            .map((entry, i: number) => ({
              id: i + 1,
              src: `file://${entry.path}`,
              name: entry.name,
              status: statusMap.get(fileStem(entry.name))?.status || 'pending',
              rating: 0,
              note: statusMap.get(fileStem(entry.name))?.note || '',
              tags: statusMap.get(fileStem(entry.name))?.tags || ([] as string[]),
            }));
          setGalleryPhotos(imageFiles);
          toast.success(`تم تحميل ${imageFiles.length} صورة`);
        } else {
          // NAS folder exists but empty
          setGalleryPhotos([]);
        }
      } else {
        // No NAS - user adds photos manually
        setGalleryPhotos([]);
      }
    } catch (err) {
      console.error('[Gallery] Failed to load:', err);
      toast.error('فشل تحميل الصور');
    } finally {
      setIsLoadingPhotos(false);
    }
  }, [getSelectionStatusMap, getSessionPathFromDB]);

  const handleOpenGallery = useCallback(async (booking: Booking) => {
    const bookingWithFolder = await ensureSessionFolder(booking);
    setSelectedBooking(bookingWithFolder);
    setCurrentView('GALLERY');
    loadPhotosFromNAS(bookingWithFolder);
  }, [ensureSessionFolder, loadPhotosFromNAS]);

  // ── Ingest files via Electron IPC (cache + R2) ─────────
  const ingestCandidates = useCallback(async (rawCandidates: IngestionCandidate[]) => {
    if (!selectedBooking || rawCandidates.length === 0) return;

    const uniqueCandidates: IngestionCandidate[] = [];
    const seenKeys = new Set<string>();
    for (const candidate of rawCandidates) {
      if (seenKeys.has(candidate.sourceKey)) continue;
      seenKeys.add(candidate.sourceKey);
      uniqueCandidates.push(candidate);
    }
    if (uniqueCandidates.length === 0) return;

    const candidateByKey = new Map(uniqueCandidates.map((candidate) => [candidate.sourceKey, candidate]));
    const attemptedKeys = new Set(uniqueCandidates.map((candidate) => candidate.sourceKey));
    const electronAPI = getElectronAPI();

    // Ensure session folder exists before ingest.
    let booking = selectedBooking;
    if (!booking.folderPath) {
      booking = await ensureSessionFolder(booking);
      setSelectedBooking(booking);
    }

    // Show new photos instantly while preventing duplicate cards.
    setGalleryPhotos((prev) => {
      const next = [...prev];
      const indexBySourceKey = new Map<string, number>();
      next.forEach((item, i) => {
        if (item.sourceKey) indexBySourceKey.set(item.sourceKey, i);
      });

      for (const candidate of uniqueCandidates) {
        const existingIndex = indexBySourceKey.get(candidate.sourceKey);
        if (existingIndex !== undefined) {
          const existing = next[existingIndex];
          if (!existing) continue;
          next[existingIndex] = {
            ...existing,
            sourceKey: existing.sourceKey || candidate.sourceKey,
            uploadError: null,
          };
          continue;
        }

        const fallbackIndex = next.findIndex(
          (item) =>
            !item.sourceKey &&
            normalizeFileName(item.name) === normalizeFileName(candidate.file.name)
        );

        if (fallbackIndex >= 0) {
          const existing = next[fallbackIndex];
          if (!existing) continue;
          next[fallbackIndex] = {
            ...existing,
            sourceKey: candidate.sourceKey,
            uploadError: null,
          };
          indexBySourceKey.set(candidate.sourceKey, fallbackIndex);
          continue;
        }

        const previewUrl = URL.createObjectURL(candidate.file);
        next.push({
          id: Date.now() + next.length,
          src: previewUrl,
          name: candidate.file.name,
          status: 'pending',
          rating: 0,
          note: '',
          tags: [],
          sourceKey: candidate.sourceKey,
          uploadError: null,
        });
        indexBySourceKey.set(candidate.sourceKey, next.length - 1);
      }

      return next;
    });

    if (!electronAPI?.sessionLifecycle) {
      toast.success(`تم إضافة ${uniqueCandidates.length} صورة (معاينة فقط)`);
      return;
    }

    try {
      const startTime = Date.now();
      const totalFiles = uniqueCandidates.length;
      setIngestionProgress({
        percent: 0,
        status: 'جاري المعالجة...',
        current: 0,
        total: totalFiles,
        startTime,
      });

      const unsub = electronAPI.sessionLifecycle.onIngestionProgress?.((data: { progress?: number; status?: string }) => {
        const current = Math.round(((data.progress || 0) / 100) * totalFiles);
        setIngestionProgress({
          percent: data.progress || 0,
          status: data.status || '',
          current,
          total: totalFiles,
          startTime,
        });
      });

      const sessionInfo = {
        clientName: booking.clientName || '',
        sessionId: booking.id,
        bookingId: booking.id,
        date: new Date(),
        sessionPath: booking.folderPath || '',
      };

      type IngestionSuccess = {
        fileName: string;
        original?: string | null;
        local?: string | null;
        cloud?: string | null;
        thumbnail?: string | null;
        r2Error?: string | null;
      };
      type IngestionFailure = {
        filePath?: string;
        fileName?: string;
        original?: string;
        error?: string;
      };
      type IngestionResult = {
        success?: IngestionSuccess[];
        failed?: IngestionFailure[];
      };

      const hasAllFilePaths =
        uniqueCandidates.length > 0 &&
        uniqueCandidates.every((candidate) => typeof candidate.filePath === 'string' && candidate.filePath.length > 0);

      let result: IngestionResult | undefined;
      if (hasAllFilePaths && electronAPI.sessionLifecycle.processFiles) {
        const filePaths = uniqueCandidates
          .map((candidate) => candidate.filePath)
          .filter((path): path is string => typeof path === 'string' && path.length > 0);
        console.log('[Ingest] Non-sandbox mode — processing file paths:', filePaths.length);
        result = await electronAPI.sessionLifecycle.processFiles(filePaths, sessionInfo);
      } else if (electronAPI.sessionLifecycle.processFileBuffers) {
        console.log('[Ingest] Sandbox mode — reading files as buffers...');
        const fileBuffers = await Promise.all(
          uniqueCandidates.map(async (candidate) => ({
            name: candidate.file.name,
            buffer: await candidate.file.arrayBuffer(),
          }))
        );
        result = await electronAPI.sessionLifecycle.processFileBuffers(fileBuffers, sessionInfo);
      }

      unsub?.();
      console.log('[Ingest] Result:', JSON.stringify(result, null, 2));

      const successItems = result?.success ?? [];
      const failedItems = result?.failed ?? [];

      const matchedCandidateKeys = new Set<string>();
      const resolveCandidateFromResult = (payload: {
        fileName?: string;
        original?: string | null;
        filePath?: string;
      }): IngestionCandidate | null => {
        const rawPath = payload.original || payload.filePath || null;
        if (typeof rawPath === 'string' && rawPath.trim().length > 0) {
          const normalized = normalizeFsPath(rawPath);
          const byPath = uniqueCandidates.find(
            (candidate) =>
              !matchedCandidateKeys.has(candidate.sourceKey) &&
              candidate.filePath &&
              normalizeFsPath(candidate.filePath) === normalized
          );
          if (byPath) return byPath;
        }

        const resolvedName = payload.fileName || (rawPath ? toFileName(rawPath) : '');
        const normalizedName = normalizeFileName(resolvedName);
        if (!normalizedName) return null;
        const byName = uniqueCandidates.filter(
          (candidate) =>
            !matchedCandidateKeys.has(candidate.sourceKey) &&
            normalizeFileName(candidate.file.name) === normalizedName
        );
        return byName[0] || null;
      };

      const successBySourceKey = new Map<string, IngestionSuccess>();
      for (const successItem of successItems) {
        const candidate = resolveCandidateFromResult(successItem);
        if (!candidate) continue;
        matchedCandidateKeys.add(candidate.sourceKey);
        successBySourceKey.set(candidate.sourceKey, successItem);
      }

      const failedBySourceKey = new Map<string, string>();
      for (const failedItem of failedItems) {
        const candidate = resolveCandidateFromResult(failedItem);
        if (!candidate) continue;
        matchedCandidateKeys.add(candidate.sourceKey);
        failedBySourceKey.set(candidate.sourceKey, failedItem.error || 'خطأ غير معروف');
      }

      // Fallback: if backend returned failures without mappable metadata, keep the unmatched attempt as failed.
      if (failedItems.length > 0) {
        for (const candidate of uniqueCandidates) {
          if (!successBySourceKey.has(candidate.sourceKey) && !failedBySourceKey.has(candidate.sourceKey)) {
            failedBySourceKey.set(candidate.sourceKey, 'فشل رفع الصورة');
          }
        }
      }

      if (successBySourceKey.size > 0 || failedBySourceKey.size > 0) {
        setGalleryPhotos((prev) =>
          prev.map((photo) => {
            const key = photo.sourceKey;
            if (!key || !attemptedKeys.has(key)) return photo;

            const success = successBySourceKey.get(key);
            if (success) {
              return {
                ...photo,
                src: success.cloud || toFileUrl(success.local) || photo.src,
                cloudUrl: success.cloud ?? photo.cloudUrl ?? null,
                thumbnailUrl: success.thumbnail ?? photo.thumbnailUrl ?? null,
                localPath: success.local ?? photo.localPath ?? null,
                uploadError: null,
              };
            }

            if (failedBySourceKey.has(key)) {
              return {
                ...photo,
                uploadError: failedBySourceKey.get(key) || 'فشل رفع الصورة',
              };
            }

            return photo;
          })
        );
      }

      setFailedUploads((prev) => {
        const next = new Map(prev.map((item) => [item.sourceKey, item]));

        // Remove attempted items from previous failed queue.
        for (const key of attemptedKeys) {
          next.delete(key);
        }

        // Add only the items that still failed in this attempt.
        for (const [sourceKey, error] of failedBySourceKey.entries()) {
          const candidate = candidateByKey.get(sourceKey);
          if (!candidate) continue;
          next.set(sourceKey, {
            ...candidate,
            error,
          });
        }

        return Array.from(next.values());
      });

      if (successBySourceKey.size > 0) {
        const successList = Array.from(successBySourceKey.values());
        const uploadedCount = successList.filter((item) => item.cloud).length;
        const rawLocalOnlyCount = successList.filter((item) => item.r2Error === 'RAW_LOCAL_ONLY').length;
        if (uploadedCount > 0) {
          toast.success(`تم رفع ${uploadedCount} صورة إلى R2 بنجاح`);
        }
        if (rawLocalOnlyCount > 0) {
          toast.info(`تم حفظ ${rawLocalOnlyCount} ملف RAW محلياً فقط (Cache/NAS)`);
        }
        if (uploadedCount === 0 && rawLocalOnlyCount === 0) {
          let r2Reason = '';
          try {
            const r2Status = await electronAPI.sessionLifecycle.getR2Status?.();
            if (r2Status?.lastError) {
              r2Reason = ` | السبب: ${r2Status.lastError}`;
            } else if (r2Status?.enabled === false) {
              r2Reason = ' | R2 غير مفعّل';
            }
            console.log('[Ingest] R2 status after local-only ingest:', r2Status);
          } catch (statusErr) {
            console.warn('[Ingest] Failed to fetch R2 status:', statusErr);
          }
          toast.warning(`تم حفظ الصور محلياً فقط - فشل رفع R2${r2Reason}`);
        }
      }

      if (failedBySourceKey.size > 0) {
        const firstFailedMessage = Array.from(failedBySourceKey.values())[0] || 'خطأ غير معروف';
        toast.error(`فشل رفع ${failedBySourceKey.size} صورة. يمكنك إعادة المحاولة مباشرة. ${firstFailedMessage}`);
      }
    } catch (err) {
      console.error('[Selection] Ingestion failed:', err);
      toast.error('فشل معالجة الصور');
    } finally {
      setIngestionProgress(null);
    }
  }, [selectedBooking, ensureSessionFolder]);

  const ingestFiles = useCallback(async (files: File[]) => {
    const candidates = files.map((file) => {
      const desktopFile = file as DesktopFile;
      const filePath = typeof desktopFile.path === 'string' && desktopFile.path.trim().length > 0
        ? desktopFile.path
        : undefined;
      return {
        sourceKey: buildSourceKey(desktopFile),
        file: desktopFile,
        filePath,
      };
    });
    await ingestCandidates(candidates);
  }, [ingestCandidates]);

  const retryFailedUploadsOnly = useCallback(async () => {
    if (failedUploads.length === 0) return;
    await ingestCandidates(
      failedUploads.map((item) => ({
        sourceKey: item.sourceKey,
        file: item.file,
        filePath: item.filePath,
      }))
    );
  }, [failedUploads, ingestCandidates]);

  // ── Add photos manually (file picker) ──────────────────
  const handleAddPhotosManually = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      const files = Array.from(target?.files || []) as File[];
      if (files.length > 0) ingestFiles(files);
    };
    input.click();
  }, [ingestFiles]);

  // ── Drag & Drop handlers ──────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);

    const allFiles = Array.from(e.dataTransfer.files);
    console.log('[Drop] Total files dropped:', allFiles.length);
    allFiles.forEach((f, i) => {
      console.log(`[Drop] File ${i}: name=${f.name}, path=${f.path}, size=${f.size}, type=${f.type}`);
    });

    const files = allFiles.filter(f =>
      /\.(jpg|jpeg|png|gif|webp|heic|bmp|tiff?|cr2|cr3|arw|nef|dng|orf|rw2|raw)$/i.test(f.name)
    );

    if (files.length === 0) {
      toast.error('لم يتم العثور على صور صالحة');
      return;
    }

    console.log('[Drop] Valid image files:', files.length);
    ingestFiles(files);
  }, [ingestFiles]);

  const handlePhotoStatus = useCallback((photoId: number, status: PhotoStatus) => {
    let updatedPhoto: GalleryPhoto | null = null;
    setGalleryPhotos(prev => prev.map(p => {
      if (p.id !== photoId) return p;
      updatedPhoto = { ...p, status };
      return updatedPhoto;
    }));
    if (selectedBooking && updatedPhoto) {
      void persistPhotoMeta(selectedBooking, updatedPhoto);
    }
  }, [persistPhotoMeta, selectedBooking]);

  const handlePhotoRating = useCallback((photoId: number, rating: number) => {
    setGalleryPhotos(prev => prev.map(p =>
      p.id === photoId ? { ...p, rating } : p
    ));
  }, []);

  const handlePhotoNote = useCallback((photoId: number, note: string) => {
    let updatedPhoto: GalleryPhoto | null = null;
    setGalleryPhotos(prev => prev.map(p => {
      if (p.id !== photoId) return p;
      updatedPhoto = { ...p, note };
      return updatedPhoto;
    }));

    if (!selectedBooking || !updatedPhoto) return;
    if (notePersistTimersRef.current[photoId]) {
      window.clearTimeout(notePersistTimersRef.current[photoId]);
    }
    notePersistTimersRef.current[photoId] = window.setTimeout(() => {
      void persistPhotoMeta(selectedBooking, updatedPhoto as GalleryPhoto);
      delete notePersistTimersRef.current[photoId];
    }, 350);
  }, [persistPhotoMeta, selectedBooking]);

  const handleToggleTag = useCallback((photoId: number, tag: string) => {
    let updatedPhoto: GalleryPhoto | null = null;
    setGalleryPhotos(prev => prev.map(p => {
      if (p.id !== photoId) return p;
      const tags = p.tags.includes(tag)
        ? p.tags.filter(t => t !== tag)
        : [...p.tags, tag];
      updatedPhoto = { ...p, tags };
      return updatedPhoto;
    }));
    if (selectedBooking && updatedPhoto) {
      void persistPhotoMeta(selectedBooking, updatedPhoto);
    }
  }, [persistPhotoMeta, selectedBooking]);

  const handleAddCustomTag = useCallback(() => {
    const tag = customTagInput.trim();
    if (!tag) return;
    if (!customTags.includes(tag) && !EDITING_TAGS.includes(tag)) {
      setCustomTags(prev => [...prev, tag]);
    }
    // Also toggle it on the current photo
    if (lightboxIndex !== null && galleryPhotos[lightboxIndex]) {
      const photo = galleryPhotos[lightboxIndex];
      if (!photo.tags.includes(tag)) {
        handleToggleTag(photo.id, tag);
      }
    }
    setCustomTagInput('');
  }, [customTagInput, customTags, lightboxIndex, galleryPhotos, handleToggleTag]);

  const allTags = useMemo(() => [...EDITING_TAGS, ...customTags], [customTags]);

  const handleLightboxNav = useCallback((direction: 'next' | 'prev') => {
    if (lightboxIndex === null) return;
    const nextIdx = direction === 'next' ? lightboxIndex + 1 : lightboxIndex - 1;
    if (nextIdx >= 0 && nextIdx < galleryPhotos.length) {
      setLightboxIndex(nextIdx);
      setZoomLevel(1);
      setZoomPos({ x: 50, y: 50 });
      setShowTagsPopover(false);
    }
  }, [lightboxIndex, galleryPhotos.length]);

  // ── Stats ─────────────────────────────────────────────
  const stats = useMemo(() => [
    {
      label: 'بانتظار الاختيار',
      value: pendingSelectionBookings.filter(b => b.status === BookingStatus.SHOOTING_COMPLETED).length,
      icon: Clock, color: 'amber', gradient: 'from-amber-500 to-orange-600'
    },
    {
      label: 'جاري الاختيار',
      value: pendingSelectionBookings.filter(b => b.status === BookingStatus.SELECTION).length,
      icon: Eye, color: 'violet', gradient: 'from-violet-500 to-purple-600'
    },
    {
      label: 'تم الاختيار',
      value: doneSelectionBookings.length,
      icon: Send, color: 'blue', gradient: 'from-blue-500 to-cyan-600'
    },
    {
      label: 'جاهز للاستلام',
      value: readyForPickup.length,
      icon: CheckCircle2, color: 'emerald', gradient: 'from-emerald-500 to-teal-600'
    },
  ], [pendingSelectionBookings, doneSelectionBookings, readyForPickup]);

  // ── Gallery Stats ─────────────────────────────────────
  const galleryStats = useMemo(() => ({
    total: galleryPhotos.length,
    approved: galleryPhotos.filter(p => p.status === 'approved').length,
    rejected: galleryPhotos.filter(p => p.status === 'rejected').length,
    maybe: galleryPhotos.filter(p => p.status === 'maybe').length,
    pending: galleryPhotos.filter(p => p.status === 'pending').length,
  }), [galleryPhotos]);

  // ── Sidebar ───────────────────────────────────────────
  const navItems = [
    { id: 'HOME' as ViewState, icon: LayoutGrid, label: 'الرئيسية', count: selectionRoleBookings.length },
    { id: 'GALLERY' as ViewState, icon: Image, label: 'المعرض', count: galleryPhotos.length > 0 ? galleryStats.pending : 0 },
    { id: 'CHAT' as ViewState, icon: MessageCircle, label: 'الدردشة', count: 0 },
  ];

  return (
    <div className="h-full w-full flex overflow-hidden font-sans" dir="rtl">

      {/* ─── SIDEBAR ─── */}
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-[72px] shrink-0 my-3 mr-3 flex flex-col items-center py-4 rounded-2xl bg-[#0c0c10]/90 backdrop-blur-2xl border border-white/[0.04] z-50"
      >
        {/* Logo */}
        <div className="mb-4">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-violet-500/25">
            {currentUser?.name?.charAt(0) || 'S'}
          </div>
        </div>


        {/* Nav */}
        <div className="flex flex-col gap-2 w-full px-3 flex-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`group relative w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                currentView === item.id
                  ? 'bg-linear-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <item.icon size={18} strokeWidth={currentView === item.id ? 2.5 : 1.8} />
              <span className="text-[7px] font-bold tracking-wide">{item.label}</span>
              {item.count > 0 && (
                <div className="absolute -top-1 -left-1 min-w-[16px] h-4 px-1 bg-rose-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-[#0c0c10]">
                  {item.count}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Notifications Bell */}
        <div className="mt-auto relative">
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all">
            <Bell size={18} />
          </button>
          {notifications.filter(n => n.type === 'warning').length > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] font-bold text-black border-2 border-[#0c0c10] animate-pulse">
              {notifications.filter(n => n.type === 'warning').length}
            </div>
          )}
        </div>
      </motion.aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden m-3 ml-1.5">
        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════ */}
          {/* HOME VIEW                              */}
          {/* ═══════════════════════════════════════ */}
          {currentView === 'HOME' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h1 className="text-xl font-black text-white flex items-center gap-2">
                    صالة الاختيار
                    <Sparkles size={16} className="text-violet-400" />
                  </h1>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {selectionRoleBookings.length} حجز داخل السلكشن
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم..."
                    className="w-52 h-9 pr-9 pl-4 bg-white/[0.03] border border-white/6 rounded-xl text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30 transition-colors"
                  />
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-2 mb-4 shrink-0">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 hover:border-white/[0.08] transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg bg-linear-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                        <stat.icon size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-white leading-none">{stat.value}</p>
                        <p className="text-[9px] text-zinc-500 font-bold mt-0.5">{stat.label}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notifications Bar */}
              {notifications.filter(n => n.type === 'warning').length > 0 && (
                <div className="mb-3 shrink-0">
                  <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-3 flex items-center gap-3">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-amber-300 text-xs font-bold">تنبيهات النقل</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {notifications.filter(n => n.type === 'warning').map(n => (
                          <span key={n.id} className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/10">
                            {n.message}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 mb-3 shrink-0">
                  {[
                    { id: 'all' as const, label: 'الكل', count: selectionRoleBookings.length },
                    { id: 'waiting' as const, label: 'بانتظار', count: pendingSelectionBookings.filter(b => b.status === BookingStatus.SHOOTING_COMPLETED).length },
                    { id: 'active' as const, label: 'جاري', count: pendingSelectionBookings.filter(b => b.status === BookingStatus.SELECTION).length },
                    {
                      id: 'delayed' as const,
                      label: 'المتأخرين',
                      count: pendingSelectionBookings.filter(b => {
                        const delay = getSelectionDelayFromSend(b);
                        return !!delay.sentAt && delay.delayedDays > 0;
                      }).length,
                    },
                    { id: 'done' as const, label: 'تم الاختيار', count: doneSelectionBookings.length },
                  ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      filterTab === tab.id
                        ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                        : 'text-zinc-500 hover:text-zinc-400 border border-transparent'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Main Grid */}
              <div className="flex-1 grid grid-cols-3 gap-3 overflow-hidden min-h-0">

                {/* Column 1+2: Booking Cards */}
                <div className="col-span-2 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-2 pl-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {filteredBookings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                        <Camera size={40} className="mb-3 opacity-20" />
                        <p className="text-xs font-bold">لا توجد حجوزات</p>
                        <p className="text-[10px] mt-1 text-zinc-700">الحجوزات ستظهر هنا بعد إتمام التصوير</p>
                      </div>
                    ) : (
                      filteredBookings.map((booking, idx) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          index={idx}
                          onStartSelection={handleStartSelection}
                          onFinishSelection={handleFinishSelection}
                          onOpenGallery={handleOpenGallery}
                          onSendPortalLink={handleSendPortalLink}
                          onCopyPortalLink={handleCopyPortalLink}
                          onGeneratePortalLink={handleGenerateNewPortalLink}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Column 3: Ready for Pickup + Activity */}
                <div className="flex flex-col gap-3 overflow-hidden">
                  {/* Ready for Pickup */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <div className="p-3 border-b border-white/[0.04] shrink-0">
                      <h3 className="text-white font-bold text-sm flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        جاهز للاستلام
                        <span className="mr-auto text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{readyForPickup.length}</span>
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                      {readyForPickup.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-700">
                          <CheckCircle2 size={28} className="mb-2 opacity-15" />
                          <p className="text-[10px] font-bold">لا يوجد</p>
                        </div>
                      ) : (
                        readyForPickup.map(b => (
                          <div key={b.id} className="bg-emerald-500/[0.05] border border-emerald-500/10 rounded-lg p-2.5 hover:border-emerald-500/20 transition-all">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-xs">
                                {b.clientName?.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-bold truncate">{b.clientName}</p>
                                <p className="text-zinc-600 text-[9px] truncate">{b.title}</p>
                              </div>
                            </div>
                            {b.clientPhone && (
                              <a href={`tel:${b.clientPhone}`} className="mt-2 flex items-center justify-center gap-1 w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 rounded-md text-emerald-400 text-[9px] font-bold transition-colors">
                                <Phone size={9} /> اتصال
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Post-selection Countdown */}
                  <div className="shrink-0 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                    <h3 className="text-white font-bold text-xs flex items-center gap-2 mb-2">
                      <Clock size={13} className="text-cyan-400" />
                      متابعة 60 يوم بعد الاختيار
                    </h3>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                      {doneCountdownBookings.length === 0 ? (
                        <p className="text-[10px] text-zinc-700 text-center py-2">لا توجد حالات تم اختيارها</p>
                      ) : (
                        doneCountdownBookings.slice(0, 6).map(({ booking, countdown }) => (
                          <div key={`done-${booking.id}`} className="flex items-center gap-2 bg-cyan-500/[0.04] border border-cyan-500/10 rounded-lg p-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-zinc-200 font-bold truncate">{booking.clientName}</p>
                              <p className="text-[9px] text-zinc-500 truncate">{booking.title}</p>
                            </div>
                            <div
                              className={`text-[10px] font-black px-2 py-1 rounded-md border ${
                                !countdown.hasDate
                                  ? 'text-zinc-300 border-zinc-600 bg-zinc-700/30'
                                  : countdown.isOverdue
                                    ? 'text-rose-300 border-rose-500/30 bg-rose-500/15'
                                    : countdown.remainingDays <= 10
                                      ? 'text-amber-300 border-amber-500/30 bg-amber-500/15'
                                      : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/15'
                              }`}
                            >
                              {!countdown.hasDate
                                ? 'غير محدد'
                                : countdown.isOverdue
                                  ? `متأخر ${Math.abs(countdown.remainingDays)} يوم`
                                  : `${countdown.remainingDays} يوم`}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* NAS Transfer Status */}
                  <div className="shrink-0 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                    <h3 className="text-white font-bold text-xs flex items-center gap-2 mb-2">
                      <HardDrive size={13} className="text-blue-400" />
                      حالة النقل من NAS
                    </h3>
                    <div className="space-y-1.5">
                      {pendingSelectionBookings.slice(0, 3).map(b => (
                        <div key={b.id} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            b.nasStatus === 'synced' ? 'bg-emerald-400' :
                            b.nasStatus === 'pending' ? 'bg-amber-400 animate-pulse' :
                            'bg-zinc-600'
                          }`} />
                          <span className="text-[10px] text-zinc-400 truncate flex-1">{b.clientName}</span>
                          <span className={`text-[9px] font-bold ${
                            b.nasStatus === 'synced' ? 'text-emerald-400' :
                            b.nasStatus === 'pending' ? 'text-amber-400' :
                            'text-zinc-600'
                          }`}>
                            {b.nasStatus === 'synced' ? 'تم النقل' :
                             b.nasStatus === 'pending' ? 'جاري...' :
                             'لم ينقل'}
                          </span>
                        </div>
                      ))}
                      {pendingSelectionBookings.length === 0 && (
                        <p className="text-[10px] text-zinc-700 text-center py-2">لا توجد عمليات نقل</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════ */}
          {/* GALLERY VIEW                           */}
          {/* ═══════════════════════════════════════ */}
          {currentView === 'GALLERY' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col overflow-hidden"
            >
              {/* Gallery Header */}
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-3">
                  {selectedBooking && (
                    <button
                      onClick={() => {
                        setSelectedBooking(null);
                        setGalleryPhotos([]);
                        setFailedUploads([]);
                        setLightboxIndex(null);
                        setZoomLevel(1);
                        setShowTagsPopover(false);
                      }}
                      className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 transition-colors"
                    >
                      <ArrowRight size={16} />
                    </button>
                  )}
                  <div>
                    <h1 className="text-lg font-black text-white flex items-center gap-2">
                      {selectedBooking ? selectedBooking.clientName : 'المعرض'}
                      <Image size={15} className="text-violet-400" />
                    </h1>
                    <p className="text-zinc-500 text-[10px]">
                      {selectedBooking
                        ? `${selectedBooking.title} • ${galleryPhotos.length} صورة`
                        : 'اختر حجز لعرض الصور'
                      }
                    </p>
                  </div>
                </div>

                {/* Gallery Stats Bar */}
                {galleryPhotos.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-emerald-400 font-bold">{galleryStats.approved} مقبول</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-rose-400 font-bold">{galleryStats.rejected} مرفوض</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-amber-400 font-bold">{galleryStats.maybe} ربما</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-400 font-bold">{galleryStats.pending} معلق</span>
                    </div>
                    {selectedBooking && selectedBooking.status === BookingStatus.SELECTION && (
                      <button
                        onClick={() => handleFinishSelection(selectedBooking)}
                        className="px-4 py-1.5 bg-linear-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all"
                      >
                        إنهاء وإرسال للتصميم
                      </button>
                    )}
                    {/* Add More Photos Button */}
                    {selectedBooking && (
                      <button
                        onClick={handleAddPhotosManually}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1"
                      >
                        <Plus size={12} />
                        إضافة صور
                      </button>
                    )}
                    {selectedBooking && failedUploads.length > 0 && (
                      <button
                        onClick={() => void retryFailedUploadsOnly()}
                        disabled={Boolean(ingestionProgress)}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-amber-300 text-[10px] font-bold rounded-lg border border-amber-400/30 transition-all flex items-center gap-1"
                        title="إعادة محاولة رفع الصور التي فشل رفعها فقط"
                      >
                        <RefreshCw size={12} />
                        إعادة محاولة ({failedUploads.length})
                      </button>
                    )}
                    {/* Open Folder in Finder */}
                    {selectedBooking?.folderPath && (
                      <button
                        onClick={async () => {
                          try {
                            const electronAPI = getElectronAPI();
                            if (electronAPI?.nasConfig?.openFolder) {
                              await electronAPI.nasConfig.openFolder(selectedBooking.folderPath);
                            }
                          } catch {
                            toast.error('فشل فتح المجلد');
                          }
                        }}
                        className="px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 bg-zinc-500/20 hover:bg-zinc-500/30 text-zinc-300 border-zinc-500/30"
                      >
                        <FolderOpen size={12} />
                        فتح المجلد
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Gallery Content */}
              {!selectedBooking ? (
                /* No booking selected - show booking picker */
                <div className="flex-1 overflow-y-auto">
                  <p className="text-zinc-500 text-sm mb-4">اختر حجز لعرض صوره:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {selectionRoleBookings.map(b => (
                      <button
                        key={b.id}
                        onClick={() => handleOpenGallery(b)}
                        className="p-4 bg-white/[0.02] border border-white/6 rounded-xl hover:border-violet-500/20 hover:bg-violet-500/[0.03] transition-all text-right"
                      >
                        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center text-violet-400 text-xl font-black mb-3 border border-violet-500/10">
                          {b.clientName?.charAt(0)}
                        </div>
                        <p className="text-white font-bold text-sm truncate">{b.clientName}</p>
                        <p className="text-zinc-500 text-[10px] truncate mt-0.5">{b.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            b.status === BookingStatus.SELECTION
                              ? 'bg-violet-500/10 text-violet-400 border border-violet-500/15'
                              : b.status === BookingStatus.EDITING
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                          }`}>
                            {b.status === BookingStatus.SELECTION
                              ? 'جاري الاختيار'
                              : b.status === BookingStatus.EDITING
                                ? 'تم الاختيار'
                                : 'بانتظار'}
                          </span>
                          <span className={`text-[9px] ${
                            b.nasStatus === 'synced' ? 'text-emerald-400' : 'text-zinc-600'
                          }`}>
                            {b.nasStatus === 'synced' ? 'الصور منقولة' :
                             b.nasStatus === 'pending' ? 'جاري النقل' :
                             'لم تنقل'}
                          </span>
                        </div>
                      </button>
                    ))}
                    {selectionRoleBookings.length === 0 && (
                      <div className="col-span-3 flex flex-col items-center justify-center py-16 text-zinc-600">
                        <FolderOpen size={40} className="mb-3 opacity-20" />
                        <p className="text-sm font-bold">لا توجد حجوزات للعرض</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : isLoadingPhotos ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw size={32} className="text-violet-400 animate-spin mx-auto mb-3" />
                    <p className="text-zinc-400 text-sm">جاري تحميل الصور...</p>
                  </div>
                </div>
              ) : (
                /* Photo Grid with Drag & Drop */
                <div
                  className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Ingestion Progress Bar */}
                  {ingestionProgress && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mb-3 bg-zinc-900/80 backdrop-blur-md border border-white/6 rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Loader2 size={14} className="text-violet-400 animate-spin" />
                          <span className="text-xs text-zinc-300 font-bold">
                            {ingestionProgress.current || 0} / {ingestionProgress.total || 0} صورة
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {ingestionProgress.startTime && ingestionProgress.percent > 0 && ingestionProgress.percent < 100 && (
                            <span className="text-[10px] text-zinc-500">
                              ~{Math.max(1, Math.round(
                                ((Date.now() - ingestionProgress.startTime) / ingestionProgress.percent) * (100 - ingestionProgress.percent) / 1000
                              ))} ثانية متبقية
                            </span>
                          )}
                          <span className="text-[10px] text-violet-400 font-bold">
                            {ingestionProgress.percent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-linear-to-r from-violet-500 to-fuchsia-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${ingestionProgress.percent}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-[9px] text-zinc-600 mt-1.5 truncate">{ingestionProgress.status}</p>
                    </motion.div>
                  )}

                  {/* Drag overlay */}
                  {isDraggingFiles && (
                    <div className="fixed inset-0 z-50 bg-violet-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                      <div className="bg-zinc-900/95 border-2 border-dashed border-violet-500 rounded-2xl p-12 text-center">
                        <FolderOpen size={48} className="text-violet-400 mx-auto mb-3" />
                        <p className="text-violet-300 text-lg font-bold">أفلت الصور هنا</p>
                        <p className="text-zinc-500 text-xs mt-1">JPG, PNG, HEIC, WebP</p>
                      </div>
                    </div>
                  )}

                  {galleryPhotos.length === 0 ? (
                    /* Empty state - Drop zone */
                    <div
                      className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl hover:border-violet-500/30 transition-colors cursor-pointer"
                      onClick={handleAddPhotosManually}
                    >
                      <FolderOpen size={48} className="text-zinc-600 mb-4" />
                      <p className="text-zinc-400 text-sm font-bold">اسحب الصور هنا</p>
                      <p className="text-zinc-600 text-xs mt-1">أو اضغط لاختيار الصور من الجهاز</p>
                      <p className="text-zinc-700 text-[10px] mt-3">JPG, PNG, HEIC, WebP, RAW</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                    {galleryPhotos.map(photo => (
                      <div
                        key={photo.id}
                        className={`group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                          photo.status === 'approved' ? 'border-emerald-500/40' :
                          photo.status === 'rejected' ? 'border-rose-500/40 opacity-50' :
                          photo.status === 'maybe' ? 'border-amber-500/40' :
                          'border-transparent hover:border-white/10'
                        }`}
                        onClick={() => { setLightboxIndex(galleryPhotos.findIndex(p => p.id === photo.id)); setZoomLevel(1); }}
                      >
                        <img
                          src={getGridPhotoSrc(photo)}
                          alt={photo.name}
                          className="w-full h-full object-contain bg-black/35"
                          loading="lazy"
                          onError={(e) => {
                            const img = e.currentTarget;
                            // Deterministic fallback chain without infinite retry loops.
                            const localUrl = toFileUrl(photo.localPath);
                            const candidates = Array.from(
                              new Set([photo.thumbnailUrl, photo.cloudUrl, localUrl, photo.src].filter(Boolean))
                            ) as string[];

                            let failed = new Set<string>();
                            try {
                              failed = new Set(JSON.parse(img.dataset.failedSources || '[]'));
                            } catch {
                              failed = new Set<string>();
                            }

                            if (img.currentSrc) failed.add(img.currentSrc);
                            if (img.src) failed.add(img.src);
                            img.dataset.failedSources = JSON.stringify(Array.from(failed));

                            const nextSrc = candidates.find((u) => !failed.has(u));
                            if (nextSrc) {
                              img.src = nextSrc;
                            } else {
                              // Final fallback: hide broken icon, show placeholder
                              img.style.display = 'none';
                            }
                          }}
                        />

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <ZoomIn size={20} className="text-white" />
                        </div>

                        {/* Status Badge */}
                        {photo.status !== 'pending' && (
                          <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center ${
                            photo.status === 'approved' ? 'bg-emerald-500' :
                            photo.status === 'rejected' ? 'bg-rose-500' :
                            'bg-amber-500'
                          }`}>
                            {photo.status === 'approved' && <Heart size={10} className="text-white" />}
                            {photo.status === 'rejected' && <ThumbsDown size={10} className="text-white" />}
                            {photo.status === 'maybe' && <Minus size={10} className="text-white" />}
                          </div>
                        )}

                        {/* Rating */}
                        {photo.rating > 0 && (
                          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded-md">
                            <Star size={8} className="text-amber-400 fill-amber-400" />
                            <span className="text-[8px] text-white font-bold">{photo.rating}</span>
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          {/* Copy Image Link */}
                          {photo.cloudUrl && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(photo.cloudUrl!);
                                toast.success('تم نسخ رابط الصورة');
                              }}
                              className="w-6 h-6 rounded-md bg-blue-500/80 hover:bg-blue-500 flex items-center justify-center transition-colors"
                              title="نسخ رابط الصورة"
                            >
                              <Link2 size={10} className="text-white" />
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handlePhotoStatus(photo.id, 'approved'); }}
                            className="w-6 h-6 rounded-md bg-emerald-500/80 hover:bg-emerald-500 flex items-center justify-center transition-colors"
                          >
                            <Heart size={10} className="text-white" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handlePhotoStatus(photo.id, 'maybe'); }}
                            className="w-6 h-6 rounded-md bg-amber-500/80 hover:bg-amber-500 flex items-center justify-center transition-colors"
                          >
                            <Minus size={10} className="text-white" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handlePhotoStatus(photo.id, 'rejected'); }}
                            className="w-6 h-6 rounded-md bg-rose-500/80 hover:bg-rose-500 flex items-center justify-center transition-colors"
                          >
                            <ThumbsDown size={10} className="text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}
            </motion.div>
          )}


          {/* ═══════════════════════════════════════ */}
          {/* CHAT VIEW                              */}
          {/* ═══════════════════════════════════════ */}
          {currentView === 'CHAT' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-hidden rounded-2xl"
            >
              <UnifiedTeamChat users={users} currentUser={currentUser} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* LIGHTBOX - Vertical Stack Layout           */}
      {/* ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {lightboxIndex !== null && galleryPhotos[lightboxIndex] && (() => {
          const photo = galleryPhotos[lightboxIndex];
          const lightboxSrc = getLightboxPhotoSrc(photo);
          return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-black/95 backdrop-blur-xl flex flex-col items-center"
            onClick={() => { setLightboxIndex(null); setZoomLevel(1); setShowTagsPopover(false); }}
          >
            {/* ── TOP BAR: Close + Counter + Stats ── */}
            <div className="w-full flex items-center justify-between px-4 py-3 shrink-0 z-20" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="text-zinc-300 text-xs font-bold bg-black/40 px-3 py-1.5 rounded-lg">
                  {lightboxIndex + 1} / {galleryPhotos.length}
                </span>
                <span className="text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/15">
                  {galleryStats.approved} مقبول
                </span>
                <span className="text-rose-400 text-[10px] font-bold bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/15">
                  {galleryStats.rejected} مرفوض
                </span>
              </div>
              <button
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={() => { setLightboxIndex(null); setZoomLevel(1); setShowTagsPopover(false); }}
              >
                <X size={18} />
              </button>
            </div>

            {/* ── IMAGE AREA (with nav arrows + scroll zoom) ── */}
            <div className="flex-1 relative flex items-center justify-center w-full min-h-0 px-14">
              {/* Navigation Arrows */}
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors z-10"
                onClick={e => { e.stopPropagation(); handleLightboxNav('prev'); }}
              >
                <ChevronRight size={20} />
              </button>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors z-10"
                onClick={e => { e.stopPropagation(); handleLightboxNav('next'); }}
              >
                <ChevronLeft size={20} />
              </button>

              {/* Image Container - Clean, no overlays */}
              <div
                className="relative overflow-hidden rounded-lg bg-black/30 w-[92vw] h-[78vh] max-w-[1700px]"
                onClick={e => e.stopPropagation()}
                onMouseMove={e => {
                  if (zoomLevel > 1) {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    setZoomPos({ x, y });
                  }
                }}
                onWheel={e => {
                  e.stopPropagation();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;

                  const delta = e.deltaY > 0 ? -0.3 : 0.3;
                  const newZoom = Math.min(Math.max(zoomLevel + delta, 1), 5);

                  if (newZoom !== zoomLevel) {
                    setZoomPos({ x, y });
                    setZoomLevel(newZoom);
                  }
                }}
              >
                <motion.img
                  key={photo.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={lightboxSrc}
                  alt={photo.name}
                  className="w-full h-full object-contain select-none"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    cursor: zoomLevel > 1 ? 'grab' : 'default',
                    transition: 'transform 0.15s ease-out',
                  }}
                  draggable={false}
                  onError={(e) => {
                    const img = e.currentTarget;
                    const localUrl = toFileUrl(photo.localPath);
                    const candidates = Array.from(
                      new Set([photo.cloudUrl, localUrl, photo.thumbnailUrl, photo.src].filter(Boolean))
                    ) as string[];

                    let failed = new Set<string>();
                    try {
                      failed = new Set(JSON.parse(img.dataset.failedSources || '[]'));
                    } catch {
                      failed = new Set<string>();
                    }

                    if (img.currentSrc) failed.add(img.currentSrc);
                    if (img.src) failed.add(img.src);
                    img.dataset.failedSources = JSON.stringify(Array.from(failed));

                    const nextSrc = candidates.find((u) => !failed.has(u));
                    if (nextSrc) {
                      img.src = nextSrc;
                    }
                  }}
                />
                {/* Zoom percentage indicator (only when zoomed) */}
                {zoomLevel > 1 && (
                  <div className="absolute top-3 left-3 text-[10px] font-bold text-white/60 bg-black/40 px-2 py-1 rounded-md pointer-events-none">
                    {Math.round(zoomLevel * 100)}%
                  </div>
                )}
              </div>
            </div>

            {/* ── CONTROL BAR (fixed below image) ── */}
            <div
              className="w-full max-w-3xl mx-auto shrink-0 px-4 py-3 z-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 bg-zinc-900/90 backdrop-blur-xl rounded-2xl border border-white/10 px-5 py-2.5">
                {/* Photo Name */}
                <span className="text-zinc-400 text-[10px] font-medium ml-2 truncate max-w-[120px]">{photo.name}</span>

                {/* Rating Stars */}
                <div className="flex items-center gap-0.5 border-r border-white/10 pr-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handlePhotoRating(photo.id, star)}
                      className="p-0.5 transition-transform hover:scale-125"
                    >
                      <Star
                        size={14}
                        className={`${
                          star <= (photo.rating || 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-zinc-600'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>

                {/* Status Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePhotoStatus(photo.id, 'approved')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      photo.status === 'approved'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                    }`}
                  >
                    <Heart size={11} className="inline-block ml-1" />
                    مقبول
                  </button>
                  <button
                    onClick={() => handlePhotoStatus(photo.id, 'maybe')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      photo.status === 'maybe'
                        ? 'bg-amber-500 text-white'
                        : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                    }`}
                  >
                    <Minus size={11} className="inline-block ml-1" />
                    ربما
                  </button>
                  <button
                    onClick={() => handlePhotoStatus(photo.id, 'rejected')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      photo.status === 'rejected'
                        ? 'bg-rose-500 text-white'
                        : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                    }`}
                  >
                    <ThumbsDown size={11} className="inline-block ml-1" />
                    مرفوض
                  </button>
                </div>

                {/* Tags Button (replaces Zoom button) */}
                <div className="relative">
                  <button
                    onClick={() => setShowTagsPopover(!showTagsPopover)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                      showTagsPopover || photo.tags.length > 0
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/20'
                        : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Tag size={12} className="inline-block ml-0.5" />
                    {photo.tags.length > 0 ? `تاقات (${photo.tags.length})` : 'تاقات'}
                  </button>

                  {/* Tags Popover */}
                  <AnimatePresence>
                    {showTagsPopover && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 left-0 w-72 bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden z-30"
                        dir="rtl"
                      >
                        <div className="p-3">
                          <p className="text-[10px] text-zinc-500 font-bold mb-2">التعديلات المطلوبة</p>
                          <div className="flex flex-wrap gap-1">
                            {allTags.map(tag => (
                              <button
                                key={tag}
                                onClick={() => handleToggleTag(photo.id, tag)}
                                className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                                  photo.tags.includes(tag)
                                    ? 'bg-violet-500 text-white'
                                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/5'
                                }`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                          {/* Custom tag input */}
                          <div className="flex items-center gap-1 mt-2">
                            <input
                              type="text"
                              value={customTagInput}
                              onChange={e => setCustomTagInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddCustomTag(); }}
                              placeholder="أضف تاق جديد..."
                              className="flex-1 h-7 px-2 bg-white/[0.03] border border-white/6 rounded-md text-[9px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30"
                              dir="rtl"
                            />
                            <button
                              onClick={handleAddCustomTag}
                              disabled={!customTagInput.trim()}
                              className="h-7 px-2 bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 text-[9px] font-bold rounded-md border border-violet-500/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ── NOTES SECTION (below control bar) ── */}
            <div
              className="w-full max-w-3xl mx-auto shrink-0 px-4 pb-4 z-10"
              onClick={e => e.stopPropagation()}
            >
              <textarea
                value={photo.note}
                onChange={e => handlePhotoNote(photo.id, e.target.value)}
                placeholder="أضف ملاحظة للمصمم..."
                className="w-full h-16 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/30 resize-none"
                dir="rtl"
              />
            </div>
          </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// BOOKING CARD
// ═══════════════════════════════════════════════════════════
interface BookingCardProps {
  booking: Booking;
  index: number;
  onStartSelection: (b: Booking) => void;
  onFinishSelection: (b: Booking) => void;
  onOpenGallery: (b: Booking) => void;
  onSendPortalLink: (b: Booking) => void;
  onCopyPortalLink: (b: Booking) => void;
  onGeneratePortalLink: (b: Booking) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  index,
  onStartSelection,
  onFinishSelection,
  onOpenGallery,
  onSendPortalLink,
  onCopyPortalLink,
  onGeneratePortalLink,
}) => {
  const isActive = booking.status === BookingStatus.SELECTION;
  const isWaiting = booking.status === BookingStatus.SHOOTING_COMPLETED;
  const isDone = booking.status === BookingStatus.EDITING;
  const doneCountdown = isDone ? getSelectionCountdown(booking) : null;
  const selectionCompletedAtRaw = isDone
    ? (() => {
        const details = asDetails(booking.details);
        const fromDetails =
          typeof details.selectionCompletedAt === 'string'
            ? details.selectionCompletedAt
            : typeof details.selectionConfirmedAt === 'string'
              ? details.selectionConfirmedAt
              : null;
        return booking.actualSelectionDate || fromDetails || null;
      })()
    : null;
  const selectionCompletedAtDate =
    selectionCompletedAtRaw && !Number.isNaN(new Date(selectionCompletedAtRaw).getTime())
      ? new Date(selectionCompletedAtRaw)
      : null;
  const selectionCompletedLabel = selectionCompletedAtDate
    ? selectionCompletedAtDate.toLocaleString('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;
  const sendDelay = !isDone ? getSelectionDelayFromSend(booking) : null;
  const bookingDetails = asDetails(booking.details);
  const selectionLinkSentCount = Number(bookingDetails.selectionLinkSentCount ?? 1);
  const lastSelectionLinkSentAt =
    typeof bookingDetails.lastSelectionLinkSentAt === 'string'
      ? bookingDetails.lastSelectionLinkSentAt
      : null;
  const delayReason =
    booking.status === BookingStatus.SHOOTING_COMPLETED
      ? 'لم يبدأ الاختيار بعد'
      : booking.status === BookingStatus.SELECTION
        ? 'بدأ الاختيار ولم يكتمل'
        : 'بانتظار إجراء من العميل';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`group relative rounded-xl border p-3.5 transition-all duration-200 ${
        isActive
          ? 'bg-linear-to-bl from-violet-500/[0.08] to-fuchsia-500/[0.04] border-violet-500/20 shadow-lg shadow-violet-500/5'
          : isDone
          ? 'bg-emerald-500/[0.03] border-emerald-500/10'
          : 'bg-white/[0.015] border-white/[0.05] hover:border-white/[0.08]'
      }`}
    >
      {/* Active Badge */}
      {isActive && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-violet-500/15 border border-violet-500/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-[8px] font-black text-violet-300">جاري الاختيار</span>
        </div>
      )}
      {isDone && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/20 rounded-full">
          <CheckCircle2 size={9} className="text-emerald-400" />
          <span className="text-[8px] font-black text-emerald-300">تم الاختيار</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${
          isActive
            ? 'bg-linear-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20'
            : booking.category === BookingCategory.WEDDING
            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
            : 'bg-blue-500/10 text-blue-400 border border-blue-500/10'
        }`}>
          {booking.clientName?.charAt(0) || '?'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-sm truncate">{booking.clientName}</h3>
          <p className="text-zinc-500 text-[10px] mt-0.5 truncate">{booking.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="flex items-center gap-1 text-[9px] text-zinc-500">
              <CalendarDays size={9} />
              {booking.shootDate?.split('T')[0]}
            </span>
            {booking.category === BookingCategory.WEDDING && (
              <span className="text-[8px] px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded-full font-bold border border-rose-500/10">
                عرس
              </span>
            )}
            {/* NAS Status */}
            <span className={`text-[8px] font-bold flex items-center gap-0.5 ${
              booking.nasStatus === 'synced' ? 'text-emerald-400' :
              booking.nasStatus === 'pending' ? 'text-amber-400' :
              'text-zinc-600'
            }`}>
              <HardDrive size={8} />
              {booking.nasStatus === 'synced' ? 'منقول' :
               booking.nasStatus === 'pending' ? 'جاري النقل' :
               'لم ينقل'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {isWaiting && (
            <button
              onClick={() => onStartSelection(booking)}
              className="px-3 py-1.5 bg-linear-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-violet-500/15 transition-all hover:shadow-violet-500/25"
            >
              بدء الاختيار
            </button>
          )}
          {isActive && (
            <>
              <button
                onClick={() => onOpenGallery(booking)}
                className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-white text-[10px] font-bold rounded-lg border border-white/[0.08] transition-all"
              >
                فتح المعرض
              </button>
              <button
                onClick={() => onFinishSelection(booking)}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/15 transition-all"
              >
                إنهاء وإرسال
              </button>
            </>
          )}
          {isDone && (
            <button
              onClick={() => onOpenGallery(booking)}
              className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-300 text-[10px] font-bold rounded-lg border border-cyan-500/20 transition-all"
            >
              مراجعة الاختيار
            </button>
          )}
        </div>
      </div>

      {isDone && doneCountdown && (
        <div className="mt-2.5 pt-2 border-t border-white/[0.03] flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">العد التنازلي للإكمال</span>
          <span
            className={`text-[10px] font-black px-2 py-1 rounded-md border ${
              !doneCountdown.hasDate
                ? 'text-zinc-300 border-zinc-600 bg-zinc-700/30'
                : doneCountdown.isOverdue
                  ? 'text-rose-300 border-rose-500/30 bg-rose-500/15'
                  : doneCountdown.remainingDays <= 10
                    ? 'text-amber-300 border-amber-500/30 bg-amber-500/15'
                    : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/15'
            }`}
          >
            {!doneCountdown.hasDate
              ? 'غير محدد'
              : doneCountdown.isOverdue
                ? `متأخر ${Math.abs(doneCountdown.remainingDays)} يوم`
                : `${doneCountdown.remainingDays} يوم متبقي`}
          </span>
        </div>
      )}
      {isDone && (
        <div className="mt-2 flex items-center justify-between text-[10px]">
          <span className="text-zinc-500">تاريخ/وقت إكمال الاختيار</span>
          <span className="font-black text-cyan-300">
            {selectionCompletedLabel || 'غير متوفر'}
          </span>
        </div>
      )}

      {/* Phone + Quick Share Actions */}
      {!isDone && (
        <div className="mt-2.5 pt-2 border-t border-white/[0.03] flex items-center gap-2 [direction:ltr]">
          {/* Sensitive action (left side): intentionally separated to avoid accidental taps */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const confirmed = window.confirm(
                'سيتم توليد رابط جديد وإبطال الرابط القديم فورًا.\nهل تريد المتابعة؟'
              );
              if (!confirmed) return;
              onGeneratePortalLink(booking);
            }}
            className="w-7 h-7 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center text-amber-400 transition-colors border border-amber-500/20"
            title="توليد رابط جديد وإبطال القديم"
          >
            <Link2 size={11} />
          </button>

          {/* Quick share actions (right side) */}
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end [direction:rtl]">
            {booking.clientPhone && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Phone size={9} className="text-zinc-600 shrink-0" />
                <span className="text-[9px] text-zinc-500 truncate">{booking.clientPhone}</span>
              </div>
            )}
            <div className="flex items-center gap-1 shrink-0">
              {booking.clientPhone && (
                <a
                  href={`tel:${booking.clientPhone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 px-2.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 flex items-center justify-center text-sky-300 transition-colors border border-sky-500/20 text-[9px] font-black"
                  title="اتصال مباشر بالعميل"
                >
                  <Phone size={10} className="ml-1" />
                  اتصال
                </a>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSendPortalLink(booking);
                }}
                className="h-7 px-2.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 flex items-center justify-center text-[#25D366] transition-colors border border-[#25D366]/20 text-[9px] font-black"
                title="إرسال رابط الاختيار عبر واتساب"
              >
                <Send size={10} className="ml-1" />
                إرسال رابط الاختيار
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyPortalLink(booking);
                }}
                className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center text-blue-400 transition-colors border border-blue-500/10"
                title="نسخ رابط الألبوم + رمز الدخول"
              >
                <Copy size={11} />
              </button>
            </div>
          </div>
        </div>
      )}
      {!isDone && sendDelay?.sentAt && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">
              تم إرسال الرابط: {new Date(sendDelay.sentAt).toLocaleDateString('ar-EG')}
            </span>
            <span
              className={`px-2 py-1 rounded-md border font-black ${
                sendDelay.delayedDays >= 30
                  ? 'text-rose-300 border-rose-500/30 bg-rose-500/15'
                  : sendDelay.delayedDays >= 14
                    ? 'text-amber-300 border-amber-500/30 bg-amber-500/15'
                    : 'text-cyan-300 border-cyan-500/30 bg-cyan-500/15'
              }`}
            >
              تأخر العميل: {sendDelay.delayedDays} يوم
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400">السبب: {delayReason}</span>
            <span className="text-zinc-500">
              مرات الإرسال: {selectionLinkSentCount}
            </span>
          </div>
          {lastSelectionLinkSentAt && (
            <div className="text-[9px] text-zinc-600">
              آخر إعادة إرسال: {new Date(lastSelectionLinkSentAt).toLocaleDateString('ar-EG')}
            </div>
          )}
        </div>
      )}
      {!isDone && !sendDelay?.sentAt && (
        <div className="mt-2 flex items-center justify-between text-[10px]">
          <span className="text-zinc-500">السبب: لم يتم إرسال رابط الاختيار بعد</span>
          <span className="px-2 py-1 rounded-md border font-black text-amber-300 border-amber-500/30 bg-amber-500/15">
            بدون إرسال
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default SelectionDashboard;
