import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, ListChecks, Sparkles, Zap } from 'lucide-react';
import { Booking, BookingStatus, CategoryLabels } from '../../../../types';

interface EditorOverviewViewProps {
  bookings?: Booking[];
  onOpenProjects: () => void;
  onStartProject: (bookingId: string) => void;
}

interface DashboardTaskItem {
  id: string;
  title: string;
  time: string | null;
  priority: string | null;
  type: string | null;
  source: string | null;
  relatedBookingId: string | null;
}

const activeStatuses: BookingStatus[] = [
  BookingStatus.EDITING,
];

const completedStatuses: BookingStatus[] = [
  BookingStatus.READY_TO_PRINT,
  BookingStatus.PRINTING,
  BookingStatus.READY_FOR_PICKUP,
  BookingStatus.DELIVERED,
];
const MAX_WIDGET_ITEMS = 5;
const CALENDAR_WEEK_DAYS = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];
const PHOTO_EDITOR_PROGRESS_EVENT = 'photo-editor:album-progress-changed';

interface AlbumProgressMeta {
  total: number;
  done: number;
  firstDoneAt: string | null;
  lastDoneAt: string | null;
}

const numberValue = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const statusEquals = (value: string | BookingStatus | undefined, target: BookingStatus): boolean =>
  String(value || '').toLowerCase() === String(target).toLowerCase();

const parseDate = (isoDate: string | undefined): Date | null => {
  if (!isoDate) return null;
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return null;
  return target;
};

const resolveDeliveryDate = (booking: Booking): Date | null => {
  const explicitDelivery = parseDate(booking.deliveryDeadline);
  if (explicitDelivery) return explicitDelivery;

  const details = (booking.details as Record<string, unknown> | undefined) || {};
  const selectionCompletedAt =
    typeof details.selectionCompletedAt === 'string' ? details.selectionCompletedAt : undefined;
  const selectionDate =
    parseDate(booking.actualSelectionDate) ||
    parseDate(selectionCompletedAt) ||
    parseDate(booking.updated_at) ||
    parseDate(booking.shootDate);
  if (!selectionDate) return null;

  const fallbackDeadline = new Date(selectionDate);
  fallbackDeadline.setDate(fallbackDeadline.getDate() + 60);
  return fallbackDeadline;
};

const daysUntilDate = (target: Date | null): number | null => {
  if (!target) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
};

const completionDateOf = (booking: Booking): Date | null => {
  const details = (booking.details as Record<string, unknown> | undefined) || {};
  const completedAtFromDetails =
    typeof details.photoEditorCompletedAt === 'string' ? details.photoEditorCompletedAt : undefined;
  const candidate = completedAtFromDetails || booking.photoEditCompletedAt || booking.updated_at || booking.shootDate;
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseISOString = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDurationLabel = (minutes: number | null): string => {
  if (minutes === null || !Number.isFinite(minutes)) return 'المدة غير متوفرة';
  if (minutes < 60) return `${minutes} د`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} س ${rest} د` : `${hours} س`;
};

interface CalendarDayCell {
  day: number | null;
  isToday: boolean;
}

const buildCalendarCells = (date: Date): CalendarDayCell[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = date.getDate();

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const cells: CalendarDayCell[] = [];
  for (let index = 0; index < startOffset; index += 1) {
    cells.push({ day: null, isToday: false });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ day, isToday: day === today });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, isToday: false });
  }

  return cells;
};

const isEditorTaskTitle = (title: string): boolean => {
  const normalized = title.toLowerCase();
  return (
    normalized.includes('تعديل') ||
    normalized.includes('تصميم') ||
    normalized.includes('محرر') ||
    normalized.includes('editing') ||
    normalized.includes('editor') ||
    normalized.includes('retouch') ||
    normalized.includes('photoshop')
  );
};

const isReceptionTaskTitle = (title: string): boolean => {
  const normalized = title.toLowerCase();
  return (
    normalized.includes('استقبال') ||
    normalized.includes('حجز') ||
    normalized.includes('دفعة') ||
    normalized.includes('دفع') ||
    normalized.includes('موعد')
  );
};

const sourceBadge = (source: string | null) => {
  const normalized = (source || '').toLowerCase();
  if (normalized.includes('reception') || normalized.includes('استقبال')) return 'من الاستقبال';
  if (normalized.includes('manager') || normalized.includes('مدير')) return 'من المدير';
  if (normalized.includes('supervisor') || normalized.includes('مشرف')) return 'من المشرف';
  if (normalized.includes('admin')) return 'من الإدارة';
  return 'مهمة عامة';
};

const priorityBadgeClass = (priority: string | null) => {
  const normalized = (priority || '').toLowerCase();
  if (normalized.includes('urgent') || normalized.includes('عاجل')) return 'bg-red-500/15 text-red-300 border-red-500/30';
  if (normalized.includes('high') || normalized.includes('عالي')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
};

const querySelectionReadyBookingIds = async (): Promise<Set<string>> => {
  const db = window.electronAPI?.db;
  if (!db?.query) return new Set<string>();

  const result = new Set<string>();
  const attempts: string[] = [
    `SELECT bookingId AS booking_id,
            SUM(CASE
                  WHEN liked = 1
                    OR status IN ('selected', 'approved', 'editing', 'final')
                    OR (notes IS NOT NULL AND TRIM(notes) <> '')
                  THEN 1 ELSE 0 END) AS selected_count
       FROM session_images
      GROUP BY bookingId`,
    `SELECT booking_id,
            SUM(CASE
                  WHEN liked = 1
                    OR status IN ('selected', 'approved', 'editing', 'final')
                    OR (notes IS NOT NULL AND TRIM(notes) <> '')
                  THEN 1 ELSE 0 END) AS selected_count
       FROM session_images
      GROUP BY booking_id`,
  ];

  for (const sql of attempts) {
    try {
      const rows = await db.query(sql);
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
        const selectedCount = numberValue(item.selected_count ?? item.count ?? 0);
        if (bookingId && selectedCount > 0) result.add(bookingId);
      }
      return result;
    } catch {
      // Try next schema variation
    }
  }

  return result;
};

const queryAlbumProgressByBooking = async (): Promise<Record<string, AlbumProgressMeta>> => {
  const db = window.electronAPI?.db;
  if (!db?.query) return {};

  const byBooking: Record<string, AlbumProgressMeta> = {};
  const attempts: string[] = [
    `SELECT bookingId AS booking_id,
            COUNT(*) AS total_count,
            SUM(CASE WHEN status IN ('final','completed','done','editing_done','ready_to_print') THEN 1 ELSE 0 END) AS done_count,
            MIN(CASE WHEN status IN ('final','completed','done','editing_done','ready_to_print') THEN updatedAt END) AS first_done_at,
            MAX(CASE WHEN status IN ('final','completed','done','editing_done','ready_to_print') THEN updatedAt END) AS last_done_at
       FROM session_images
      GROUP BY bookingId`,
    `SELECT booking_id,
            COUNT(*) AS total_count,
            SUM(CASE WHEN status IN ('final','completed','done','editing_done','ready_to_print') THEN 1 ELSE 0 END) AS done_count,
            MIN(CASE WHEN status IN ('final','completed','done','editing_done','ready_to_print') THEN updated_at END) AS first_done_at,
            MAX(CASE WHEN status IN ('final','completed','done','editing_done','ready_to_print') THEN updated_at END) AS last_done_at
       FROM session_images
      GROUP BY booking_id`,
  ];

  for (const sql of attempts) {
    try {
      const rows = await db.query(sql);
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
        if (!bookingId) continue;

        byBooking[bookingId] = {
          total: numberValue(item.total_count ?? item.total ?? 0),
          done: numberValue(item.done_count ?? item.completed ?? 0),
          firstDoneAt: typeof item.first_done_at === 'string' ? item.first_done_at : null,
          lastDoneAt: typeof item.last_done_at === 'string' ? item.last_done_at : null,
        };
      }

      return byBooking;
    } catch {
      // Try next schema variation
    }
  }

  return byBooking;
};

const EditorOverviewView: React.FC<EditorOverviewViewProps> = ({ bookings = [], onOpenProjects, onStartProject }) => {
  const [tasks, setTasks] = useState<DashboardTaskItem[]>([]);
  const [imageCountByBooking, setImageCountByBooking] = useState<Record<string, number>>({});
  const [albumProgressByBooking, setAlbumProgressByBooking] = useState<Record<string, AlbumProgressMeta>>({});
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [selectionReadyBookingIds, setSelectionReadyBookingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const loadSelectionAndProgress = async () => {
      const [ids, progress] = await Promise.all([
        querySelectionReadyBookingIds(),
        queryAlbumProgressByBooking(),
      ]);
      if (!mounted) return;
      setSelectionReadyBookingIds(ids);
      setAlbumProgressByBooking(progress);
    };
    void loadSelectionAndProgress();

    const onProgressChanged = () => {
      void loadSelectionAndProgress();
    };
    window.addEventListener(PHOTO_EDITOR_PROGRESS_EVENT, onProgressChanged as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener(PHOTO_EDITOR_PROGRESS_EVENT, onProgressChanged as EventListener);
    };
  }, [bookings]);

  const isAlbumComplete = useCallback(
    (booking: Booking): boolean => {
      const progress = albumProgressByBooking[booking.id];
      const completeByImages = Boolean(progress && progress.total > 0 && progress.done >= progress.total);
      const completeByStatus = completedStatuses.some(status => statusEquals(booking.status, status));
      return completeByImages || completeByStatus;
    },
    [albumProgressByBooking]
  );

  const trackedAlbums = useMemo(
    () =>
      bookings.filter(booking => {
        const hasSelectionEvidence = selectionReadyBookingIds.has(booking.id);
        const isInEditingFlow =
          activeStatuses.some(status => statusEquals(booking.status, status)) ||
          completedStatuses.some(status => statusEquals(booking.status, status)) ||
          (hasSelectionEvidence &&
            (statusEquals(booking.status, BookingStatus.SELECTION) ||
              statusEquals(booking.status, BookingStatus.SHOOTING_COMPLETED)));
        return isInEditingFlow;
      }),
    [bookings, selectionReadyBookingIds]
  );

  const activeAlbums = useMemo(
    () => trackedAlbums.filter(booking => !isAlbumComplete(booking)),
    [isAlbumComplete, trackedAlbums]
  );

  const completedAlbums = useMemo(
    () => trackedAlbums.filter(booking => isAlbumComplete(booking)),
    [isAlbumComplete, trackedAlbums]
  );

  const activeAlbumIds = useMemo(
    () => new Set(activeAlbums.map(booking => booking.id)),
    [activeAlbums]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadTasks = async () => {
      const db = window.electronAPI?.db;
      if (!db?.query) return;

      const queryAttempts = [
        `SELECT id, title, time, priority, type, source, relatedBookingId, createdAt
         FROM dashboard_tasks
         WHERE completed = 0 AND deletedAt IS NULL
         ORDER BY createdAt DESC
         LIMIT 60`,
        `SELECT id, title, time, priority, type, source, related_booking_id, created_at
         FROM dashboard_tasks
         WHERE completed = 0
         ORDER BY created_at DESC
         LIMIT 60`,
      ];

      for (const sql of queryAttempts) {
        try {
          const rows = await db.query(sql);
          if (!Array.isArray(rows)) continue;

          const mapped = rows
            .map(row => {
              if (typeof row !== 'object' || row === null) return null;
              const item = row as Record<string, unknown>;
              return {
                id: String(item.id || ''),
                title: String(item.title || 'مهمة عامة'),
                time: typeof item.time === 'string' ? item.time : null,
                priority: typeof item.priority === 'string' ? item.priority : null,
                type: typeof item.type === 'string' ? item.type : null,
                source: typeof item.source === 'string' ? item.source : null,
                relatedBookingId:
                  typeof item.relatedBookingId === 'string'
                    ? item.relatedBookingId
                    : typeof item.related_booking_id === 'string'
                      ? item.related_booking_id
                      : null,
              };
            })
            .filter((task): task is DashboardTaskItem => Boolean(task?.id))
            .filter(task => {
              const source = (task.source || '').toLowerCase();
              const type = (task.type || '').toLowerCase();
              const isManagementSource =
                source === 'supervisor' || source === 'manager' || source === 'admin';
              const isEditorType =
                type === 'editing' || type === 'delivery' || type === 'photo_editor';
              const isReceptionOrSystemNoise =
                source === 'system' || source === 'reception' || type === 'booking' || type === 'payment';

              if (task.relatedBookingId) {
                if (!activeAlbumIds.has(task.relatedBookingId)) return false;
                if (isReceptionOrSystemNoise) return false;
                if (isReceptionTaskTitle(task.title)) return false;
                return isEditorType || isEditorTaskTitle(task.title);
              }

              if (isManagementSource) return !isReceptionTaskTitle(task.title);
              if (source === 'manual') return isEditorTaskTitle(task.title);
              if (isReceptionOrSystemNoise) return false;

              // Fallback for legacy rows with missing source.
              return isEditorTaskTitle(task.title) || isEditorType;
            });

          if (mounted) {
            setTasks(mapped);
          }
          return;
        } catch {
          // try next schema variant
        }
      }

      if (mounted) setTasks([]);
    };

    void loadTasks();
    return () => {
      mounted = false;
    };
  }, [activeAlbumIds]);

  useEffect(() => {
    let mounted = true;
    const db = window.electronAPI?.db;
    const bookingIds = activeAlbums.map(booking => booking.id).filter(Boolean);
    if (!db?.query || bookingIds.length === 0) {
      setImageCountByBooking({});
      return;
    }

    const placeholders = bookingIds.map(() => '?').join(',');
    const queryAttempts: Array<{ sql: string; params: string[] }> = [
      {
        sql: `SELECT bookingId AS booking_id, COUNT(*) AS total
              FROM session_images
              WHERE bookingId IN (${placeholders})
              GROUP BY bookingId`,
        params: bookingIds,
      },
      {
        sql: `SELECT booking_id AS booking_id, COUNT(*) AS total
              FROM session_images
              WHERE booking_id IN (${placeholders})
              GROUP BY booking_id`,
        params: bookingIds,
      },
    ];

    const loadCounts = async () => {
      for (const attempt of queryAttempts) {
        try {
          const rows = await db.query(attempt.sql, attempt.params);
          if (!Array.isArray(rows)) continue;
          const nextMap: Record<string, number> = {};

          for (const row of rows) {
            if (typeof row !== 'object' || row === null) continue;
            const item = row as Record<string, unknown>;
            const bookingId =
              typeof item.booking_id === 'string'
                ? item.booking_id
                : typeof item.bookingId === 'string'
                  ? item.bookingId
                  : '';
            if (!bookingId) continue;
            nextMap[bookingId] = numberValue(item.total ?? item.count ?? 0);
          }

          if (mounted) setImageCountByBooking(nextMap);
          return;
        } catch {
          // try next schema variation
        }
      }
      if (mounted) setImageCountByBooking({});
    };

    void loadCounts();
    return () => {
      mounted = false;
    };
  }, [activeAlbums]);

  const upcomingAlbums = useMemo(() => {
    return activeAlbums
      .map(booking => ({
        booking,
        daysLeft: daysUntilDate(resolveDeliveryDate(booking)),
        imageCount: albumProgressByBooking[booking.id]?.total ?? imageCountByBooking[booking.id] ?? 0,
        doneCount: albumProgressByBooking[booking.id]?.done ?? 0,
        isCompleted: isAlbumComplete(booking),
      }))
      .sort((a, b) => {
        const aScore = (a.booking.isPriority ? 300 : 0) + (a.booking.isClientDelayed ? 80 : 0) + (a.daysLeft ?? 999);
        const bScore = (b.booking.isPriority ? 300 : 0) + (b.booking.isClientDelayed ? 80 : 0) + (b.daysLeft ?? 999);
        return aScore - bScore;
      });
  }, [activeAlbums, albumProgressByBooking, imageCountByBooking, isAlbumComplete]);

  const completionRate = useMemo(() => {
    const total = activeAlbums.length + completedAlbums.length;
    if (total === 0) return 0;
    return Math.round((completedAlbums.length / total) * 100);
  }, [activeAlbums.length, completedAlbums.length]);

  const completedThisWeek = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return completedAlbums.filter(booking => {
      const date = completionDateOf(booking);
      return date ? date >= weekStart : false;
    }).length;
  }, [completedAlbums]);

  const completedAlbumInsights = useMemo(() => {
    return completedAlbums
      .map(booking => {
        const details = ((booking.details as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
        const progress = albumProgressByBooking[booking.id];
        const completedByName =
          typeof details.photoEditorCompletedByName === 'string' && details.photoEditorCompletedByName.trim().length > 0
            ? details.photoEditorCompletedByName
            : typeof booking.assignedPhotoEditor === 'string' && booking.assignedPhotoEditor.trim().length > 0
              ? booking.assignedPhotoEditor
              : 'غير محدد';
        const startedAt =
          typeof details.photoEditorStartedAt === 'string'
            ? details.photoEditorStartedAt
            : booking.actualSelectionDate || progress?.firstDoneAt || null;
        const completedAt =
          typeof details.photoEditorCompletedAt === 'string'
            ? details.photoEditorCompletedAt
            : booking.photoEditCompletedAt || progress?.lastDoneAt || null;
        const explicitDuration =
          typeof details.photoEditorDurationMinutes === 'number'
            ? details.photoEditorDurationMinutes
            : null;
        const startDate = parseISOString(startedAt);
        const doneDate = parseISOString(completedAt);
        const derivedDuration =
          explicitDuration !== null
            ? explicitDuration
            : startDate && doneDate
              ? Math.max(0, Math.round((doneDate.getTime() - startDate.getTime()) / 60000))
              : null;

        return {
          booking,
          completedByName,
          durationMinutes: derivedDuration,
          completedAt: doneDate,
        };
      })
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, MAX_WIDGET_ITEMS);
  }, [albumProgressByBooking, completedAlbums]);

  const managementTasks = useMemo(() => {
    const prioritized = tasks.filter(task => {
      const badge = sourceBadge(task.source);
      return badge !== 'مهمة عامة';
    });
    return prioritized.length > 0 ? prioritized : tasks;
  }, [tasks]);

  const visibleUpcomingAlbums = useMemo(
    () => upcomingAlbums.slice(0, MAX_WIDGET_ITEMS),
    [upcomingAlbums]
  );

  const visibleManagementTasks = useMemo(
    () => managementTasks.slice(0, MAX_WIDGET_ITEMS),
    [managementTasks]
  );

  const urgentDeliveriesCount = useMemo(
    () => upcomingAlbums.filter(item => item.daysLeft !== null && item.daysLeft <= 3).length,
    [upcomingAlbums]
  );

  const overdueDeliveriesCount = useMemo(
    () => upcomingAlbums.filter(item => item.daysLeft !== null && item.daysLeft < 0).length,
    [upcomingAlbums]
  );

  const queueImagesCount = useMemo(
    () => upcomingAlbums.reduce((sum, item) => sum + item.imageCount, 0),
    [upcomingAlbums]
  );

  const formattedTime = useMemo(
    () =>
      new Intl.DateTimeFormat('ar-IQ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(currentTime),
    [currentTime]
  );

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat('ar-IQ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(currentTime),
    [currentTime]
  );

  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat('ar-IQ', {
        year: 'numeric',
        month: 'long',
      }).format(currentTime),
    [currentTime]
  );

  const calendarCells = useMemo(() => buildCalendarCells(currentTime), [currentTime]);

  return (
    <div className="h-full overflow-auto bg-[#090d16] p-5" dir="rtl">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-linear-to-br from-[#13253a] via-[#111a2a] to-[#0d1220] p-6 shadow-[0_35px_70px_rgba(1,6,17,0.55)]">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-200">
                <Sparkles size={13} />
                لوحة المحرر الذكية
              </p>
              <h2 className="text-3xl font-black text-white">حالة التعديل اليوم</h2>
              <p className="mt-1 text-sm text-zinc-300">نفس روح الرسبشن لكن بهوية أقوى للمحررين</p>
            </div>
            <button
              onClick={onOpenProjects}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
            >
              الذهاب إلى قسم المشاريع
              <ArrowLeft size={16} />
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-3">
            <p className="text-[11px] text-cyan-100/80">قيد التنفيذ</p>
            <p className="mt-1 text-3xl font-black text-white">{activeAlbums.length}</p>
            <p className="mt-1 text-[11px] text-cyan-200/80">ألبومات جاهزة للمحرر</p>
          </article>
          <article className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3">
            <p className="text-[11px] text-amber-100/80">تسليمات عاجلة</p>
            <p className="mt-1 text-3xl font-black text-white">{urgentDeliveriesCount}</p>
            <p className="mt-1 text-[11px] text-amber-200/80">{overdueDeliveriesCount} متأخر</p>
          </article>
          <article className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-3">
            <p className="text-[11px] text-violet-100/80">صور في الطابور</p>
            <p className="mt-1 text-3xl font-black text-white">{queueImagesCount}</p>
            <p className="mt-1 text-[11px] text-violet-200/80">صور تنتظر التعديل</p>
          </article>
          <article className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3">
            <p className="text-[11px] text-emerald-100/80">نسبة الإنجاز</p>
            <p className="mt-1 text-3xl font-black text-white">{completionRate}%</p>
            <p className="mt-1 text-[11px] text-emerald-200/80">{completedThisWeek} هذا الأسبوع</p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
          <div className="space-y-4">
            <article className="rounded-[1.8rem] border border-white/10 bg-[#121826] p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-lg font-black text-white">
                  <Clock3 size={17} className="text-cyan-300" />
                  الألبومات القادمة
                </h3>
                <span className="rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-bold text-cyan-200">
                  {upcomingAlbums.length} مشروع
                </span>
              </div>
              <div className="space-y-2">
                {visibleUpcomingAlbums.map(item => (
                  <div key={item.booking.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{item.booking.title}</p>
                        <p className="truncate text-xs text-zinc-400">{item.booking.clientName}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                          <span className="rounded-md border border-violet-500/30 bg-violet-500/15 px-2 py-0.5 text-violet-200">
                            {CategoryLabels[item.booking.category] || 'غير محدد'}
                          </span>
                          <span className="rounded-md border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-sky-200">
                            {item.imageCount > 0 ? `${item.doneCount}/${item.imageCount} صورة` : 'عدد الصور غير متوفر'}
                          </span>
                          <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-amber-200">
                            {item.daysLeft === null ? 'موعد غير محدد' : `التسليم خلال ${item.daysLeft} يوم`}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onStartProject(item.booking.id)}
                        disabled={item.isCompleted}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                          item.isCompleted
                            ? 'cursor-default bg-emerald-500/30 text-emerald-100'
                            : 'bg-cyan-600 text-white hover:bg-cyan-500'
                        }`}
                      >
                        <Zap size={12} />
                        {item.isCompleted ? 'تم' : 'ابدأ'}
                      </button>
                    </div>
                  </div>
                ))}
                {upcomingAlbums.length > MAX_WIDGET_ITEMS && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center text-xs font-bold text-zinc-400">
                    +{upcomingAlbums.length - MAX_WIDGET_ITEMS} ألبوم إضافي
                  </div>
                )}
                {upcomingAlbums.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">
                    لا توجد ألبومات بانتظار التعديل الآن
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[1.8rem] border border-white/10 bg-[#121826] p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-lg font-black text-white">
                  <CheckCircle2 size={17} className="text-emerald-300" />
                  الأعمال المنجزة
                </h3>
                <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-200">
                  {completedAlbums.length} منجز
                </span>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p className="text-xs text-zinc-400">نسبة الإنجاز الكلية</p>
                  <p className="mt-1 text-3xl font-black text-white">{completionRate}%</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full bg-linear-to-r from-emerald-400 to-cyan-400" style={{ width: `${completionRate}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-center">
                    <p className="text-[11px] text-emerald-200">تم هذا الأسبوع</p>
                    <p className="text-xl font-black text-white">{completedThisWeek}</p>
                  </div>
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-center">
                    <p className="text-[11px] text-cyan-200">قيد التنفيذ</p>
                    <p className="text-xl font-black text-white">{activeAlbums.length}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {completedAlbumInsights.map(item => (
                    <div key={item.booking.id} className="rounded-xl border border-white/10 bg-[#0f1624] p-2.5">
                      <p className="truncate text-sm font-bold text-white">{item.booking.title}</p>
                      <p className="truncate text-[11px] text-zinc-400">{item.booking.clientName}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-emerald-200">
                          بواسطة: {item.completedByName}
                        </span>
                        <span className="rounded-md border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-cyan-200">
                          المدة: {formatDurationLabel(item.durationMinutes)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {completedAlbumInsights.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/15 p-3 text-center text-xs text-zinc-500">
                      لا توجد أعمال مكتملة لعرض زمن الإنجاز حالياً
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          </div>

          <div className="space-y-4">
            <article className="rounded-[1.8rem] border border-white/10 bg-[#121826] p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-lg font-black text-white">
                  <CalendarDays size={17} className="text-cyan-300" />
                  التقويم والوقت
                </h3>
                <span className="rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-bold text-cyan-200">
                  مباشر
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="text-3xl font-black tracking-tight text-white">{formattedTime}</p>
                <p className="mt-1 text-xs text-zinc-400">{formattedDate}</p>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="mb-2 text-xs font-bold text-cyan-200">{monthTitle}</p>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-500">
                  {CALENDAR_WEEK_DAYS.map(day => (
                    <span key={day} className="rounded-md py-1">
                      {day}
                    </span>
                  ))}
                </div>

                <div className="mt-1 grid grid-cols-7 gap-1">
                  {calendarCells.map((cell, index) => (
                    <span
                      key={`${cell.day || 'empty'}-${index}`}
                      className={`flex h-7 items-center justify-center rounded-md text-[11px] font-bold ${
                        cell.day === null
                          ? 'text-transparent'
                          : cell.isToday
                            ? 'bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400/50'
                            : 'text-zinc-300'
                      }`}
                    >
                      {cell.day ?? '•'}
                    </span>
                  ))}
                </div>
              </div>
            </article>

            <article className="rounded-[1.8rem] border border-white/10 bg-[#121826] p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-lg font-black text-white">
                  <ListChecks size={17} className="text-amber-300" />
                  المهام العامة
                </h3>
                <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-200">
                  {managementTasks.length} مهمة
                </span>
              </div>
              <div className="space-y-2">
                {visibleManagementTasks.map(task => (
                  <div key={task.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <p className="truncate text-sm font-bold text-white">{task.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                      <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-zinc-300">
                        {sourceBadge(task.source)}
                      </span>
                      <span className={`rounded-md border px-2 py-0.5 ${priorityBadgeClass(task.priority)}`}>
                        {task.priority || 'عادي'}
                      </span>
                      {task.time ? (
                        <span className="rounded-md border border-zinc-600 bg-zinc-700/30 px-2 py-0.5 text-zinc-300">
                          {task.time}
                        </span>
                      ) : null}
                    </div>
                    {task.relatedBookingId ? (
                      <button
                        onClick={() => onStartProject(task.relatedBookingId!)}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-black hover:bg-amber-400"
                      >
                        فتح المشروع
                      </button>
                    ) : null}
                  </div>
                ))}
                {managementTasks.length > MAX_WIDGET_ITEMS && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center text-xs font-bold text-zinc-400">
                    +{managementTasks.length - MAX_WIDGET_ITEMS} مهمة إضافية
                  </div>
                )}
                {managementTasks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">
                    لا توجد مهام عامة مضافة حالياً
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EditorOverviewView;
