import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Booking, BookingCategory, BookingStatus, CategoryLabels } from '../../../../types';

interface ProjectQueueViewProps {
  bookings?: Booking[];
  onOpenProject: (bookingId: string) => void;
}

interface QueueImage {
  id: string;
  path: string;
  fileName: string;
}

type UrgencyType = 'urgent' | 'delayed' | 'normal';
type ViewMode = 'catalog' | 'gallery';

interface QueueProject {
  booking: Booking;
  score: number;
  urgencyType: UrgencyType;
  urgencyText: string;
  daysUntilDelivery: number | null;
}

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory?: boolean;
}

const EDITOR_READY_STATUSES: BookingStatus[] = [
  BookingStatus.EDITING,
  BookingStatus.READY_TO_PRINT,
];

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|heic|tiff?|raw|cr2|cr3|nef|arw|dng|orf|rw2)$/i;

const toFileUrl = (targetPath: string): string => {
  if (!targetPath) return '';
  const normalized = targetPath.startsWith('file://') ? targetPath : `file://${targetPath}`;
  return encodeURI(normalized);
};

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

const parseDate = (isoDate?: string): Date | null => {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return date;
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
        const selectedCount = toNumber(item.selected_count ?? item.count ?? 0);
        if (bookingId && selectedCount > 0) result.add(bookingId);
      }

      return result;
    } catch {
      // Try next schema variation
    }
  }

  return result;
};

const getDaysUntilDate = (date: Date | null): number | null => {
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - now.getTime()) / 86400000);
};

const computeProjectScore = (booking: Booking): QueueProject => {
  let score = 0;
  const days = getDaysUntilDate(resolveDeliveryDate(booking));

  let urgencyType: UrgencyType = 'normal';
  let urgencyText = 'طبيعي';

  if (booking.isPriority) {
    score += 100;
    urgencyType = 'urgent';
    urgencyText = 'أولوية قصوى';
  }

  if (days !== null) {
    if (days < 0) {
      score += 80;
      urgencyType = 'delayed';
      urgencyText = `متأخر ${Math.abs(days)} يوم`;
    } else if (days <= 2) {
      score += 60;
      urgencyType = 'urgent';
      urgencyText = `عاجل (${days} يوم)`;
    } else if (days <= 5) {
      score += 30;
      urgencyType = 'urgent';
      urgencyText = `قريب (${days} يوم)`;
    }
  }

  if (booking.isClientDelayed) {
    score += 20;
    urgencyType = 'delayed';
    urgencyText = 'تأخير عميل';
  }

  if (statusEquals(booking.status, BookingStatus.EDITING)) score += 15;
  if (statusEquals(booking.status, BookingStatus.READY_TO_PRINT)) score -= 10;

  return {
    booking,
    score,
    urgencyType,
    urgencyText,
    daysUntilDelivery: days,
  };
};

const resolveSessionPath = async (booking: Booking): Promise<string> => {
  if (booking.folderPath) return booking.folderPath;

  const db = window.electronAPI?.db;
  if (!db?.query) return '';

  const attempts: Array<{ sql: string; params: string[] }> = [
    {
      sql: `SELECT nasPath AS path FROM sessions WHERE bookingId = ? AND nasPath IS NOT NULL ORDER BY updatedAt DESC LIMIT 1`,
      params: [booking.id],
    },
    {
      sql: `SELECT nas_path AS path FROM sessions WHERE booking_id = ? AND nas_path IS NOT NULL ORDER BY updated_at DESC LIMIT 1`,
      params: [booking.id],
    },
  ];

  for (const attempt of attempts) {
    try {
      const rows = await db.query(attempt.sql, attempt.params);
      const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (typeof first === 'object' && first !== null && 'path' in first) {
        const value = (first as { path?: unknown }).path;
        if (typeof value === 'string' && value.trim()) return value;
      }
    } catch {
      // Continue through schema variants
    }
  }

  return '';
};

const listImageFiles = async (dirPath: string): Promise<DirectoryEntry[]> => {
  const listDirectory = window.electronAPI?.fileSystem?.listDirectory;
  if (!listDirectory) return [];

  try {
    const rows = await listDirectory(dirPath);
    if (!Array.isArray(rows)) return [];

    return rows
      .map(row => {
        if (typeof row === 'string') return { name: row, path: `${dirPath}/${row}` };
        return row;
      })
      .filter(
        (row): row is DirectoryEntry =>
          Boolean(row) &&
          typeof row.path === 'string' &&
          typeof row.name === 'string' &&
          !row.isDirectory &&
          IMAGE_EXTENSIONS.test(row.name)
      );
  } catch {
    return [];
  }
};

const urgencyClass = (type: UrgencyType): string => {
  if (type === 'delayed') return 'border-red-500/40 bg-red-500/15 text-red-200';
  if (type === 'urgent') return 'border-amber-500/40 bg-amber-500/15 text-amber-200';
  return 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200';
};

const ProjectQueueView: React.FC<ProjectQueueViewProps> = ({ bookings = [], onOpenProject }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('catalog');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectionReadyBookingIds, setSelectionReadyBookingIds] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BookingCategory | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyType | 'all'>('all');

  const [images, setImages] = useState<QueueImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>('fit');
  const thumbnailRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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

  const prioritizedProjects = useMemo(() => {
    return bookings
      .filter(booking => {
        if (EDITOR_READY_STATUSES.some(status => statusEquals(booking.status, status))) return true;
        const hasSelectionEvidence = selectionReadyBookingIds.has(booking.id);
        return (
          hasSelectionEvidence &&
          (statusEquals(booking.status, BookingStatus.SELECTION) ||
            statusEquals(booking.status, BookingStatus.SHOOTING_COMPLETED))
        );
      })
      .map(computeProjectScore)
      .sort((a, b) => b.score - a.score);
  }, [bookings, selectionReadyBookingIds]);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(prioritizedProjects.map(project => project.booking.category)));
  }, [prioritizedProjects]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return prioritizedProjects.filter(project => {
      if (categoryFilter !== 'all' && project.booking.category !== categoryFilter) return false;
      if (urgencyFilter !== 'all' && project.urgencyType !== urgencyFilter) return false;

      if (!normalizedSearch) return true;
      const haystack = `${project.booking.title} ${project.booking.clientName}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [categoryFilter, prioritizedProjects, searchTerm, urgencyFilter]);

  const selectedProject = useMemo(
    () => prioritizedProjects.find(project => project.booking.id === selectedProjectId) || null,
    [prioritizedProjects, selectedProjectId]
  );

  useEffect(() => {
    if (!selectedProjectId && prioritizedProjects.length > 0) {
      const firstProject = prioritizedProjects[0];
      if (firstProject) setSelectedProjectId(firstProject.booking.id);
      return;
    }
    if (selectedProjectId && !prioritizedProjects.some(project => project.booking.id === selectedProjectId)) {
      setSelectedProjectId(prioritizedProjects[0]?.booking.id || null);
    }
  }, [prioritizedProjects, selectedProjectId]);

  const currentImage = useMemo(() => {
    if (images.length === 0) return null;
    if (!selectedImageId) return images[0];
    return images.find(image => image.id === selectedImageId) || images[0];
  }, [images, selectedImageId]);

  const currentImageIndex = useMemo(() => {
    if (!currentImage) return -1;
    return images.findIndex(image => image.id === currentImage.id);
  }, [currentImage, images]);

  const loadProjectImages = useCallback(async (booking: Booking) => {
    setLoading(true);
    try {
      const sessionPath = await resolveSessionPath(booking);
      if (!sessionPath) {
        setImages([]);
        setSelectedImageId(null);
        return;
      }

      const selectedDir = `${sessionPath}/02_SELECTED`;
      const rawDir = `${sessionPath}/01_RAW`;
      const editedDir = `${sessionPath}/03_EDITED`;

      let files = await listImageFiles(selectedDir);
      if (files.length === 0) {
        files = await listImageFiles(editedDir);
      }
      if (files.length === 0) {
        files = await listImageFiles(rawDir);
      }

      const mapped: QueueImage[] = files.map((file, index) => ({
        id: `${booking.id}-${index}-${file.name}`,
        path: file.path,
        fileName: file.name,
      }));

      setImages(mapped);
      setSelectedImageId(mapped[0]?.id || null);
    } catch {
      setImages([]);
      setSelectedImageId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode !== 'gallery' || !selectedProject?.booking) return;
    void loadProjectImages(selectedProject.booking);
  }, [loadProjectImages, selectedProject?.booking, viewMode]);

  const goNext = useCallback(() => {
    if (images.length === 0 || currentImageIndex < 0) return;
    const next = (currentImageIndex + 1) % images.length;
    const nextImage = images[next];
    if (nextImage) setSelectedImageId(nextImage.id);
  }, [currentImageIndex, images]);

  const goPrevious = useCallback(() => {
    if (images.length === 0 || currentImageIndex < 0) return;
    const next = (currentImageIndex - 1 + images.length) % images.length;
    const prevImage = images[next];
    if (prevImage) setSelectedImageId(prevImage.id);
  }, [currentImageIndex, images]);

  useEffect(() => {
    if (viewMode !== 'gallery') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrevious, viewMode]);

  useEffect(() => {
    if (viewMode !== 'gallery' || !selectedImageId) return;
    thumbnailRefs.current[selectedImageId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [selectedImageId, viewMode]);

  if (viewMode === 'catalog') {
    return (
      <div className="h-full overflow-auto bg-[#090d16] p-4" dir="rtl">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <section className="rounded-[2rem] border border-white/10 bg-linear-to-br from-[#142238] via-[#10172a] to-[#0a1020] p-5 shadow-[0_30px_70px_rgba(1,6,17,0.55)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-white">معرض المشاريع</h2>
                <p className="mt-1 text-sm text-zinc-300">كروت كبيرة للزبائن، ومن كل كارت تدخل معرض لايتروم</p>
              </div>
              <span className="rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-sm font-bold text-cyan-200">
                {filteredProjects.length} مشروع
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="بحث باسم العميل أو عنوان الحجز..."
                  className="w-full rounded-xl border border-white/15 bg-black/30 py-2.5 pr-10 pl-3 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
                />
              </label>

              <label className="relative block">
                <SlidersHorizontal size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <select
                  value={String(categoryFilter)}
                  onChange={event => setCategoryFilter(event.target.value as BookingCategory | 'all')}
                  className="w-full appearance-none rounded-xl border border-white/15 bg-black/30 py-2.5 pr-10 pl-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="all">كل أنواع الحجز</option>
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>
                      {CategoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="relative block">
                <AlertTriangle size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <select
                  value={urgencyFilter}
                  onChange={event => setUrgencyFilter(event.target.value as UrgencyType | 'all')}
                  className="w-full appearance-none rounded-xl border border-white/15 bg-black/30 py-2.5 pr-10 pl-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="all">كل الأولويات</option>
                  <option value="urgent">عاجل</option>
                  <option value="delayed">متأخر</option>
                  <option value="normal">طبيعي</option>
                </select>
              </label>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredProjects.map(project => (
              <article
                key={project.booking.id}
                onClick={() => {
                  setSelectedProjectId(project.booking.id);
                  setViewMode('gallery');
                }}
                role="button"
                tabIndex={0}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedProjectId(project.booking.id);
                    setViewMode('gallery');
                  }
                }}
                className="group cursor-pointer rounded-[1.8rem] border border-white/10 bg-linear-to-br from-[#151d2e] via-[#121827] to-[#0f1422] p-5 shadow-[0_24px_50px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-1 hover:border-cyan-400/40"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${urgencyClass(project.urgencyType)}`}>
                    {project.urgencyText}
                  </span>
                  {project.booking.isPriority ? (
                    <span className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/15 px-2.5 py-1 text-[11px] font-bold text-fuchsia-200">
                      أولوية قصوى
                    </span>
                  ) : null}
                </div>

                <h3 className="line-clamp-2 text-xl font-black text-white">{project.booking.clientName}</h3>
                <p className="mt-1 line-clamp-1 text-sm text-zinc-300">{project.booking.title}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-black/25 p-2">
                    <p className="text-zinc-400">نوع الحجز</p>
                    <p className="mt-1 font-bold text-cyan-200">{CategoryLabels[project.booking.category]}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/25 p-2">
                    <p className="text-zinc-400">موعد التسليم</p>
                    <p className="mt-1 font-bold text-emerald-200">
                      {project.daysUntilDelivery === null
                        ? 'غير محدد'
                        : project.daysUntilDelivery >= 0
                          ? `${project.daysUntilDelivery} يوم`
                          : `متأخر ${Math.abs(project.daysUntilDelivery)} يوم`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      setSelectedProjectId(project.booking.id);
                      setViewMode('gallery');
                    }}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500"
                  >
                    فتح المعرض
                  </button>
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      onOpenProject(project.booking.id);
                    }}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                  >
                    ابدأ التعديل
                  </button>
                </div>
              </article>
            ))}

            {filteredProjects.length === 0 && (
              <div className="col-span-full rounded-[1.6rem] border border-dashed border-white/15 bg-black/20 p-10 text-center">
                <p className="text-sm font-bold text-zinc-300">لا توجد نتائج مطابقة</p>
                <p className="mt-1 text-xs text-zinc-500">غيّر الفلترة أو نص البحث</p>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden p-4" dir="rtl">
      <section className="mb-4 overflow-hidden rounded-[1.8rem] border border-white/10 bg-linear-to-r from-[#111b2e] via-[#0f1627] to-[#0b111f] shadow-[0_24px_50px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-cyan-300/90">
              <span className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5">وضع المحرر</span>
              <span className="text-zinc-500">/</span>
              <span className="text-zinc-300">لايتروم</span>
            </div>
            <h2 className="truncate text-2xl font-black text-white">
              {selectedProject?.booking.clientName || 'معرض الصور'}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {selectedProject
                ? `${selectedProject.booking.title} • ${CategoryLabels[selectedProject.booking.category]}`
                : 'اختر مشروع'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setViewMode('catalog')}
              className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-xs font-bold text-zinc-100 transition hover:bg-black/40"
            >
              <ArrowLeft size={14} />
              رجوع للكروت
            </button>
            {selectedProject ? (
              <button
                onClick={() => onOpenProject(selectedProject.booking.id)}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
              >
                <Zap size={14} />
                ابدأ التعديل
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 pb-4 md:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs">
            <p className="text-zinc-500">نوع الحجز</p>
            <p className="mt-1 truncate font-bold text-cyan-200">
              {selectedProject ? CategoryLabels[selectedProject.booking.category] : 'غير محدد'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs">
            <p className="text-zinc-500">الأولوية</p>
            <p className={`mt-1 font-bold ${selectedProject ? urgencyClass(selectedProject.urgencyType).split(' ').at(-1) : 'text-zinc-300'}`}>
              {selectedProject?.urgencyText || 'طبيعي'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs">
            <p className="text-zinc-500">التسليم</p>
            <p className="mt-1 font-bold text-emerald-200">
              {selectedProject?.daysUntilDelivery === null || selectedProject?.daysUntilDelivery === undefined
                ? 'غير محدد'
                : selectedProject.daysUntilDelivery >= 0
                  ? `${selectedProject.daysUntilDelivery} يوم`
                  : `متأخر ${Math.abs(selectedProject.daysUntilDelivery)} يوم`}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs">
            <p className="text-zinc-500">عدد الصور</p>
            <p className="mt-1 font-bold text-violet-200">{images.length}</p>
          </div>
        </div>
      </section>

      <section className="grid h-[calc(100%-176px)] grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#111826]">
          <div className="border-b border-white/10 p-4">
            <h3 className="text-base font-black text-white">لوحة المشروع</h3>
            <p className="mt-1 text-xs text-zinc-400">معلومات سريعة قبل التحرير</p>
          </div>

          <div className="space-y-2 p-3 text-xs">
            <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-zinc-400">اسم المشروع</p>
              <p className="mt-1 line-clamp-2 font-bold text-white">{selectedProject?.booking.title || 'غير محدد'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-zinc-400">حالة الحجز</p>
              <p className="mt-1 font-bold text-amber-200">{selectedProject?.booking.status || 'غير محدد'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-zinc-400">المصدر المعروض</p>
              <p className="mt-1 font-bold text-zinc-200">02_SELECTED → 03_EDITED → 01_RAW</p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0f141f]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{currentImage?.fileName || 'لا توجد صورة محددة'}</p>
              <p className="text-[11px] text-zinc-500">
                {images.length > 0 && currentImageIndex >= 0 ? `${currentImageIndex + 1} / ${images.length}` : '--'}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFitMode('fit')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  fitMode === 'fit'
                    ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                    : 'border border-white/15 bg-black/30 text-zinc-300 hover:bg-black/45'
                }`}
              >
                ملاءمة
              </button>
              <button
                onClick={() => setFitMode('fill')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  fitMode === 'fill'
                    ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                    : 'border border-white/15 bg-black/30 text-zinc-300 hover:bg-black/45'
                }`}
              >
                ملء الإطار
              </button>
              <button
                onClick={goPrevious}
                disabled={images.length === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/30 text-zinc-100 disabled:opacity-40"
                aria-label="السابق"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={goNext}
                disabled={images.length === 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/30 text-zinc-100 disabled:opacity-40"
                aria-label="التالي"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>

          <div className="relative flex-1 bg-[#0a0f18]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-zinc-400">جاري تحميل الصور...</div>
            ) : currentImage ? (
              <div className="h-full w-full p-4 md:p-6">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-radial-[ellipse_at_center] from-[#1d2a44]/35 via-[#101827] to-[#090d16]">
                  <img
                    src={toFileUrl(currentImage.path)}
                    alt={currentImage.fileName}
                    className={
                      fitMode === 'fit'
                        ? 'max-h-[56vh] max-w-full object-contain'
                        : 'h-full w-full object-cover'
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Sparkles size={34} className="mb-2 text-zinc-600" />
                <p className="text-sm text-zinc-400">لا توجد صور جاهزة في هذا المشروع</p>
                <p className="mt-1 text-xs text-zinc-500">تأكد من وجود صور في 02_SELECTED أو 03_EDITED أو 01_RAW</p>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
              <span>شريط الصور</span>
              <span>{images.length > 0 ? `${images.length} ملف` : 'فارغ'}</span>
            </div>
            <div className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  ref={element => {
                    thumbnailRefs.current[image.id] = element;
                  }}
                  onClick={() => setSelectedImageId(image.id)}
                  className={`group w-[124px] shrink-0 snap-start rounded-xl border p-1.5 text-right transition-all ${
                    currentImage?.id === image.id
                      ? 'border-cyan-400/80 bg-cyan-500/10'
                      : 'border-white/10 bg-black/20 hover:border-white/30'
                  }`}
                >
                  <div className="h-[74px] w-full overflow-hidden rounded-lg border border-white/10 bg-black/40">
                    <img src={toFileUrl(image.path)} alt={image.fileName} className="h-full w-full object-cover" />
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-zinc-300">{index + 1}</p>
                  <p className="truncate text-[10px] text-zinc-500">{image.fileName}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProjectQueueView;
