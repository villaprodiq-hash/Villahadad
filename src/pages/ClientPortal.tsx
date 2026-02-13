import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Image as ImageIcon,
  Loader2,
  Lock,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../services/supabase';

async function callPortal(body: Record<string, unknown>) {
  const fnUrl = (supabase as any).functionsUrl || `${(supabase as any).supabaseUrl}/functions/v1`;
  const anonKey = (supabase as any).supabaseKey;

  const res = await fetch(`${fnUrl}/client-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(errBody || `HTTP ${res.status}`);
  }

  return res.json();
}

type ImageStatus = 'pending' | 'selected' | 'rejected';

interface PortalImage {
  id: string;
  fileName: string;
  cloudUrl: string | null;
  thumbnailUrl: string | null;
  status: ImageStatus;
  liked: number;
  notes: string | null;
  sortOrder: number;
}

interface BookingInfo {
  clientName: string;
  title: string;
  category: string;
  status: string;
}

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error' | 'submitting' | 'submitted';
type DownloadState = 'idle' | 'downloading' | 'done';
type PortalView = 'welcome' | 'gallery' | 'review' | 'done';
type StatusFilter = 'all' | ImageStatus;
type BrandMode = 'classic' | 'vip' | 'simple';

const STATUS_META: Record<ImageStatus, { label: string; badge: string; ring: string }> = {
  selected: {
    label: 'مقبولة',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    ring: 'border-emerald-500 shadow-[0_18px_38px_rgba(16,185,129,0.25)]',
  },
  rejected: {
    label: 'مرفوضة',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    ring: 'border-rose-500 shadow-[0_18px_38px_rgba(244,63,94,0.2)]',
  },
  pending: {
    label: 'معلّقة',
    badge: 'bg-zinc-500/20 text-zinc-200 border-zinc-500/30',
    ring: 'border-white/10 shadow-[0_18px_38px_rgba(0,0,0,0.35)]',
  },
};

const BRAND_PRESETS: Record<
  BrandMode,
  {
    primary: string;
    secondary: string;
    bg: string;
    surface: string;
    border: string;
    glowA: string;
    glowB: string;
  }
> = {
  classic: {
    primary: '#ff4017',
    secondary: '#ff8c42',
    bg: '#0b0b0d',
    surface: '#151519',
    border: 'rgba(255,255,255,0.10)',
    glowA: 'rgba(255,64,23,0.24)',
    glowB: 'rgba(255,140,66,0.14)',
  },
  vip: {
    primary: '#c9a36a',
    secondary: '#f0d39a',
    bg: '#0a0907',
    surface: '#14120f',
    border: 'rgba(201,163,106,0.34)',
    glowA: 'rgba(201,163,106,0.24)',
    glowB: 'rgba(240,211,154,0.14)',
  },
  simple: {
    primary: '#ff4017',
    secondary: '#ff6b3a',
    bg: '#101114',
    surface: '#17191f',
    border: 'rgba(255,255,255,0.08)',
    glowA: 'rgba(255,64,23,0.10)',
    glowB: 'rgba(255,107,58,0.08)',
  },
};

const ClientPortal: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [portalView, setPortalView] = useState<PortalView>('welcome');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [forcedBrandMode, setForcedBrandMode] = useState<BrandMode | null>(null);

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [images, setImages] = useState<PortalImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareZoom, setCompareZoom] = useState(1);
  const [compareOffset, setCompareOffset] = useState({ x: 0, y: 0 });
  const [isCompareDragging, setIsCompareDragging] = useState(false);
  const [compareDragStart, setCompareDragStart] = useState({ x: 0, y: 0 });
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token'));
    const style = params.get('style');
    if (style === 'vip' || style === 'simple' || style === 'classic') {
      setForcedBrandMode(style);
    }
  }, []);

  const brandMode = useMemo<BrandMode>(() => {
    if (forcedBrandMode) return forcedBrandMode;
    const title = `${booking?.title || ''} ${booking?.category || ''}`.toLowerCase();
    if (title.includes('vip')) return 'vip';
    return 'classic';
  }, [booking?.category, booking?.title, forcedBrandMode]);

  const brand = BRAND_PRESETS[brandMode];

  const fetchPhotos = useCallback(async () => {
    if (!token) return;
    setLoadingState('loading');
    setErrorMsg('');

    try {
      const data = await callPortal({ action: 'get_photos', token });
      if (data?.error) throw new Error(data.error);
      setBooking(data.booking);
      setImages(data.images || []);
      setLoadingState('loaded');
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر تحميل الصور.');
      setLoadingState('error');
    }
  }, [token]);

  const handleEnterGallery = useCallback(() => {
    setPortalView('gallery');
    fetchPhotos();
  }, [fetchPhotos]);

  const setImageStatus = useCallback((imageId: string, status: ImageStatus) => {
    setImages(prev => prev.map(img => (img.id === imageId ? { ...img, status } : img)));
  }, []);

  const applyStatusToAll = useCallback((status: ImageStatus | 'pending') => {
    setImages(prev => prev.map(img => ({ ...img, status })));
  }, []);

  const selectedCount = useMemo(() => images.filter(i => i.status === 'selected').length, [images]);
  const rejectedCount = useMemo(() => images.filter(i => i.status === 'rejected').length, [images]);
  const pendingCount = useMemo(() => images.filter(i => i.status === 'pending').length, [images]);
  const totalCount = images.length;

  const filteredImages = useMemo(() => {
    if (statusFilter === 'all') return images;
    return images.filter(img => img.status === statusFilter);
  }, [images, statusFilter]);

  const selectedImages = useMemo(() => images.filter(i => i.status === 'selected'), [images]);
  const compareImages = useMemo(
    () =>
      compareIds
        .map(id => images.find(img => img.id === id))
        .filter((img): img is PortalImage => !!img)
        .slice(0, 2),
    [compareIds, images]
  );

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);

  const currentImage = lightboxIndex !== null ? filteredImages[lightboxIndex] : null;

  const showNextImage = useCallback(() => {
    if (lightboxIndex === null || filteredImages.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % filteredImages.length);
  }, [lightboxIndex, filteredImages.length]);

  const showPrevImage = useCallback(() => {
    if (lightboxIndex === null || filteredImages.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + filteredImages.length) % filteredImages.length);
  }, [lightboxIndex, filteredImages.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showNextImage();
      if (e.key === 'ArrowLeft') showPrevImage();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxIndex, closeLightbox, showNextImage, showPrevImage]);

  const handleGoToReview = useCallback(() => setPortalView('review'), []);

  const handleSubmitSelection = useCallback(async () => {
    if (!token) return;
    setLoadingState('submitting');

    try {
      const selections = images.map(img => ({
        imageId: img.id,
        status: img.status,
        liked: img.status === 'selected',
      }));

      const data = await callPortal({ action: 'update_selection', token, selections });
      if (data?.error) throw new Error(data.error);

      const confirmData = await callPortal({ action: 'confirm_selection', token });
      if (confirmData?.error) throw new Error(confirmData.error);

      setLoadingState('submitted');
      setPortalView('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر إرسال الاختيار.');
      setLoadingState('loaded');
    }
  }, [images, token]);

  const downloadBlobFile = useCallback(async (url: string, fileName: string) => {
    const a = document.createElement('a');
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // CORS-safe fallback for custom CDN domains
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, []);

  const handleDownloadSingle = useCallback(
    async (image: PortalImage) => {
      const url = image.cloudUrl || image.thumbnailUrl;
      if (!url) return;
      try {
        await downloadBlobFile(url, image.fileName);
      } catch {
        // no-op
      }
    },
    [downloadBlobFile]
  );

  const handleDownloadBatch = useCallback(
    async (downloads: Array<{ fileName: string; url: string }>) => {
      if (!downloads.length || downloadState === 'downloading') return;
      setDownloadState('downloading');
      setDownloadProgress({ current: 0, total: downloads.length });

      try {
        for (let i = 0; i < downloads.length; i++) {
          const { fileName, url } = downloads[i];
          try {
            await downloadBlobFile(url, fileName);
          } catch {
            // continue
          }
          setDownloadProgress({ current: i + 1, total: downloads.length });
          if (i < downloads.length - 1) await new Promise(r => setTimeout(r, 250));
        }
        setDownloadState('done');
        setTimeout(() => setDownloadState('idle'), 2500);
      } catch {
        setDownloadState('idle');
      }
    },
    [downloadBlobFile, downloadState]
  );

  const handleDownloadAll = useCallback(async () => {
    if (!token || downloadState === 'downloading') return;

    try {
      const data = await callPortal({ action: 'get_download_urls', token });
      if (data?.error) throw new Error(data.error);

      const downloads: { fileName: string; url: string }[] = data.downloads || [];
      await handleDownloadBatch(downloads);
    } catch {
      setDownloadState('idle');
    }
  }, [downloadState, handleDownloadBatch, token]);

  const handleDownloadVisible = useCallback(async () => {
    const list = filteredImages
      .filter(img => !!(img.cloudUrl || img.thumbnailUrl))
      .map(img => ({ fileName: img.fileName, url: (img.cloudUrl || img.thumbnailUrl) as string }));
    await handleDownloadBatch(list);
  }, [filteredImages, handleDownloadBatch]);

  const toggleCompareCandidate = useCallback((imageId: string) => {
    setCompareIds(prev => {
      if (prev.includes(imageId)) return prev.filter(id => id !== imageId);
      if (prev.length >= 2) return [prev[1], imageId];
      return [...prev, imageId];
    });
  }, []);

  const chooseComparedImage = useCallback(
    (chosenId: string) => {
      const otherId = compareIds.find(id => id !== chosenId);
      setImageStatus(chosenId, 'selected');
      if (otherId) setImageStatus(otherId, 'pending');
      setCompareOpen(false);
      setCompareIds([]);
      setCompareZoom(1);
      setCompareOffset({ x: 0, y: 0 });
    },
    [compareIds, setImageStatus]
  );

  const resetCompareView = useCallback(() => {
    setCompareZoom(1);
    setCompareOffset({ x: 0, y: 0 });
  }, []);

  const zoomCompare = useCallback((direction: 'in' | 'out') => {
    setCompareZoom(prev => {
      const next = direction === 'in' ? prev + 0.2 : prev - 0.2;
      return Math.min(3, Math.max(1, Number(next.toFixed(2))));
    });
  }, []);

  const startCompareDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (compareZoom <= 1) return;
      setIsCompareDragging(true);
      setCompareDragStart({
        x: e.clientX - compareOffset.x,
        y: e.clientY - compareOffset.y,
      });
    },
    [compareOffset.x, compareOffset.y, compareZoom]
  );

  const moveCompareDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isCompareDragging) return;
      setCompareOffset({
        x: e.clientX - compareDragStart.x,
        y: e.clientY - compareDragStart.y,
      });
    },
    [compareDragStart.x, compareDragStart.y, isCompareDragging]
  );

  const endCompareDrag = useCallback(() => {
    setIsCompareDragging(false);
  }, []);

  const onCompareWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setCompareZoom(prev => Math.min(3, Math.max(1, Number((prev + delta).toFixed(2)))));
  }, []);

  return (
    <div
      className="min-h-screen text-white font-[Cairo,sans-serif] relative overflow-x-hidden"
      dir="rtl"
      style={{ backgroundColor: brand.bg }}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${brandMode === 'simple' ? 'opacity-40' : 'opacity-80'}`}
      >
        <div
          className="absolute -top-24 -right-20 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${brand.glowA} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />
        <div
          className="absolute -bottom-24 -left-20 w-[28rem] h-[28rem] rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${brand.glowB} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />
      </div>
      <AnimatePresence mode="wait">
        {portalView === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-10 text-center"
            >
              <div
                className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 ${brandMode === 'simple' ? 'shadow-lg' : 'shadow-2xl'}`}
                style={{
                  background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})`,
                }}
              >
                <Camera size={40} className="text-white" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-[11px] text-zinc-300 mb-4">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: brand.primary }}
                />
                {brandMode === 'vip'
                  ? 'واجهة VIP'
                  : brandMode === 'simple'
                    ? 'واجهة Simple'
                    : 'الهوية الرسمية للاستوديو'}
              </div>
              <h1 className="text-3xl font-black mb-2 tracking-wide">فيلا حداد</h1>
              <p className="text-zinc-300 text-sm">بوابة اختيار الصور</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-md border rounded-3xl p-8 shadow-xl text-center"
              style={{ backgroundColor: brand.surface, borderColor: brand.border }}
            >
              <h2 className="text-xl font-black mb-4">أهلاً وسهلاً</h2>
              <p className="text-zinc-300 mb-8 text-sm leading-relaxed">
                ستشاهد صورك، وتحدد كل صورة: <span className="text-emerald-300">مقبولة</span> أو
                <span className="text-rose-300"> مرفوضة</span> أو
                <span className="text-zinc-300"> معلّقة</span> قبل الإرسال النهائي.
              </p>

              {!token && (
                <div className="flex items-center gap-2 text-rose-400 text-sm mb-4 justify-center">
                  <AlertCircle size={16} />
                  <span>الرابط غير صالح، تواصل مع الاستوديو.</span>
                </div>
              )}

              <button
                disabled={!token}
                className="w-full py-4 disabled:bg-zinc-700 disabled:text-zinc-500
                  text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: brand.primary }}
                onClick={handleEnterGallery}
              >
                دخول المعرض
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
                <Lock size={12} />
                <span>رابط خاص وآمن</span>
              </div>
            </motion.div>
            <footer className="mt-8 text-center text-zinc-500 text-xs">
              &copy; {new Date().getFullYear()} Villa Hadad Studio
            </footer>
          </motion.div>
        )}

        {portalView === 'gallery' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen flex flex-col"
          >
            <header
              className="sticky top-0 z-50 backdrop-blur-md border-b px-4 md:px-6 py-4 border-white/10"
              style={{ backgroundColor: `${brand.bg}d9` }}
            >
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-black text-lg">{booking?.title || 'معرض العميل'}</h2>
                    <p className="text-xs text-zinc-400">
                      {booking?.clientName ? `مرحباً ${booking.clientName}` : 'اختر صورك ثم أرسلها'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                      {selectedCount} مقبولة
                    </span>
                    <span className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/15 text-rose-300">
                      {rejectedCount} مرفوضة
                    </span>
                    <span className="px-2.5 py-1 rounded-lg border border-zinc-500/30 bg-zinc-500/15 text-zinc-200">
                      {pendingCount} معلّقة
                    </span>
                  </div>
                </div>

                {totalCount > 0 && (
                  <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.round(((selectedCount + rejectedCount) / totalCount) * 100)}%`,
                        backgroundImage: `linear-gradient(to left, #10b981, ${brand.secondary})`,
                      }}
                    />
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: 'all', label: `الكل (${totalCount})` },
                        { key: 'selected', label: `مقبولة (${selectedCount})` },
                        { key: 'rejected', label: `مرفوضة (${rejectedCount})` },
                        { key: 'pending', label: `معلقة (${pendingCount})` },
                      ] as Array<{ key: StatusFilter; label: string }>
                    ).map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setStatusFilter(tab.key);
                          setLightboxIndex(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                          statusFilter === tab.key
                            ? 'border text-white'
                            : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                        }`}
                        style={
                          statusFilter === tab.key
                            ? { backgroundColor: brand.primary, borderColor: brand.primary }
                            : undefined
                        }
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => applyStatusToAll('selected')}
                      className="px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"
                    >
                      تحديد الكل مقبول
                    </button>
                    <button
                      onClick={() => applyStatusToAll('pending')}
                      className="px-3 py-1.5 rounded-lg text-xs bg-zinc-500/20 border border-zinc-500/30 text-zinc-200 hover:bg-zinc-500/30"
                    >
                      تصفير
                    </button>
                    <button
                      disabled={downloadState === 'downloading' || selectedCount === 0}
                      onClick={handleDownloadAll}
                      className="px-3 py-1.5 rounded-lg text-xs bg-white/10 border border-white/15 text-zinc-100 hover:bg-white/20 disabled:bg-zinc-700 disabled:text-zinc-500"
                    >
                      تحميل المقبولة
                    </button>
                    <button
                      disabled={downloadState === 'downloading' || filteredImages.length === 0}
                      onClick={handleDownloadVisible}
                      className="px-3 py-1.5 rounded-lg text-xs bg-white/10 border border-white/15 text-zinc-100 hover:bg-white/20 disabled:bg-zinc-700 disabled:text-zinc-500"
                    >
                      تحميل الظاهر
                    </button>
                    <button
                      onClick={() => setCompareOpen(true)}
                      disabled={compareImages.length !== 2}
                      className="px-3 py-1.5 rounded-lg text-xs bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/30 disabled:bg-zinc-700 disabled:border-zinc-600 disabled:text-zinc-500"
                    >
                      مقارنة ({compareImages.length}/2)
                    </button>
                    <button
                      disabled={selectedCount === 0}
                      onClick={handleGoToReview}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Send size={13} /> مراجعة وإرسال
                      </span>
                    </button>
                  </div>
                </div>
                {downloadState === 'downloading' && (
                  <div className="mt-3 text-xs text-zinc-300">
                    جارِ التحميل: {downloadProgress.current}/{downloadProgress.total}
                  </div>
                )}
              </div>
            </header>

            <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
              {loadingState === 'loading' && (
                <div className="flex flex-col items-center justify-center py-32">
                  <Loader2
                    size={44}
                    className="animate-spin mb-4"
                    style={{ color: brand.primary }}
                  />
                  <p className="text-zinc-400 text-sm">جاري تحميل الصور...</p>
                </div>
              )}

              {loadingState === 'error' && (
                <div className="flex flex-col items-center justify-center py-32">
                  <AlertCircle size={44} className="text-rose-400 mb-4" />
                  <p className="text-rose-300 text-sm mb-4">{errorMsg}</p>
                  <button
                    onClick={fetchPhotos}
                    className="px-4 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {loadingState === 'loaded' && filteredImages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <ImageIcon size={44} className="text-zinc-600 mb-4" />
                  <p className="text-zinc-400 text-sm">
                    {images.length === 0
                      ? 'لا توجد صور متاحة حالياً.'
                      : 'لا توجد صور ضمن هذا الفلتر.'}
                  </p>
                </div>
              )}

              {loadingState === 'loaded' && filteredImages.length > 0 && (
                <>
                  <div className="columns-1 sm:columns-2 lg:columns-4 gap-3 [column-fill:_balance]">
                    {filteredImages.map((img, index) => (
                      <motion.div
                        key={img.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.015 }}
                        className="mb-3 break-inside-avoid"
                      >
                        <button
                          onClick={() => openLightbox(index)}
                          className={`group relative w-full overflow-hidden rounded-2xl border transition-all ${STATUS_META[img.status].ring}`}
                        >
                          <img
                            src={img.thumbnailUrl || img.cloudUrl || ''}
                            alt={img.fileName}
                            className="w-full h-auto block object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                          <div className="absolute top-3 right-3">
                            <span
                              className={`px-2 py-1 text-[11px] rounded-full border ${STATUS_META[img.status].badge}`}
                            >
                              {STATUS_META[img.status].label}
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-2 right-2 text-right">
                            <p className="text-[10px] text-white/80 truncate">{img.fileName}</p>
                          </div>
                          <div className="absolute top-3 left-3">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                toggleCompareCandidate(img.id);
                              }}
                              className={`px-2 py-1 rounded-md text-[10px] border ${
                                compareIds.includes(img.id)
                                  ? 'bg-indigo-500 text-white border-indigo-400'
                                  : 'bg-black/40 text-zinc-100 border-white/20 hover:bg-black/70'
                              }`}
                              title="إضافة للمقارنة"
                              aria-label="إضافة للمقارنة"
                            >
                              {compareIds.includes(img.id) ? 'مضاف' : 'قارن'}
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDownloadSingle(img);
                              }}
                              className="w-8 h-8 rounded-lg bg-black/45 hover:bg-black/70 text-white flex items-center justify-center"
                              title="تحميل الصورة"
                              aria-label="تحميل الصورة"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </button>
                      </motion.div>
                    ))}
                  </div>

                  {/* Compare Modal */}
                  <AnimatePresence>
                    {compareOpen && compareImages.length === 2 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1350] bg-black/95 p-4 md:p-8"
                        onClick={() => {
                          setCompareOpen(false);
                          resetCompareView();
                        }}
                      >
                        <div className="max-w-7xl mx-auto h-full flex flex-col">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base md:text-lg font-black">
                              مقارنة صورتين قبل الاختيار
                            </h3>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  zoomCompare('out');
                                }}
                                className="px-2.5 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-sm"
                                title="تصغير"
                              >
                                -
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  zoomCompare('in');
                                }}
                                className="px-2.5 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-sm"
                                title="تكبير"
                              >
                                +
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  resetCompareView();
                                }}
                                className="px-2.5 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-xs"
                              >
                                إعادة ضبط
                              </button>
                              <button
                                onClick={() => {
                                  setCompareOpen(false);
                                  resetCompareView();
                                }}
                                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-400 mb-3">
                            اسحب لمقارنة التفاصيل، واستخدم عجلة الماوس للتكبير/التصغير (x
                            {compareZoom.toFixed(1)})
                          </p>

                          <div
                            className="grid md:grid-cols-2 gap-4 flex-1 min-h-0"
                            onClick={e => e.stopPropagation()}
                            onMouseMove={moveCompareDrag}
                            onMouseUp={endCompareDrag}
                            onMouseLeave={endCompareDrag}
                            onWheel={onCompareWheel}
                          >
                            {compareImages.map((img, idx) => (
                              <div
                                key={img.id}
                                className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col"
                              >
                                <div className="text-xs text-zinc-400 mb-2">
                                  {idx === 0 ? 'الصورة الأولى' : 'الصورة الثانية'}
                                </div>
                                <div
                                  className={`flex-1 min-h-0 rounded-xl overflow-hidden bg-black/35 flex items-center justify-center ${compareZoom > 1 ? 'cursor-grab' : 'cursor-default'} ${isCompareDragging ? '!cursor-grabbing' : ''}`}
                                  onMouseDown={startCompareDrag}
                                >
                                  <img
                                    src={img.cloudUrl || img.thumbnailUrl || ''}
                                    alt={img.fileName}
                                    className="max-h-[56vh] w-auto object-contain select-none"
                                    draggable={false}
                                    style={{
                                      transform: `translate(${compareOffset.x}px, ${compareOffset.y}px) scale(${compareZoom})`,
                                      transformOrigin: 'center center',
                                      transition: isCompareDragging
                                        ? 'none'
                                        : 'transform 120ms ease-out',
                                    }}
                                  />
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-2">
                                  <p className="text-[11px] text-zinc-300 truncate">
                                    {img.fileName}
                                  </p>
                                  <button
                                    onClick={() => chooseComparedImage(img.id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
                                  >
                                    اعتمد هذه الصورة
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {lightboxIndex !== null && currentImage && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1300] bg-black/95"
                        onClick={closeLightbox}
                      >
                        <div className="absolute top-5 left-5 flex items-center gap-2 z-10">
                          <div
                            className="px-3 py-1.5 rounded-full text-white text-sm font-bold inline-flex items-center gap-2"
                            style={{ backgroundColor: brand.primary }}
                          >
                            <Heart size={14} /> {selectedCount} مختارة
                          </div>
                        </div>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            closeLightbox();
                          }}
                          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center z-10"
                        >
                          <X size={18} />
                        </button>

                        <div className="h-full w-full flex flex-col items-center justify-center px-4">
                          <img
                            src={currentImage.cloudUrl || currentImage.thumbnailUrl || ''}
                            alt={currentImage.fileName}
                            className="max-w-[92vw] max-h-[72vh] object-contain rounded-lg"
                          />

                          <div
                            className="mt-4 flex flex-wrap items-center justify-center gap-2"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleDownloadSingle(currentImage)}
                              className="px-4 py-2 rounded-lg text-sm border bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                              تحميل هذه الصورة
                            </button>
                            <button
                              onClick={() => setImageStatus(currentImage.id, 'selected')}
                              className={`px-4 py-2 rounded-lg text-sm border ${currentImage.status === 'selected' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'}`}
                            >
                              مقبولة
                            </button>
                            <button
                              onClick={() => setImageStatus(currentImage.id, 'rejected')}
                              className={`px-4 py-2 rounded-lg text-sm border ${currentImage.status === 'rejected' ? 'bg-rose-500 text-white border-rose-500' : 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'}`}
                            >
                              مرفوضة
                            </button>
                            <button
                              onClick={() => setImageStatus(currentImage.id, 'pending')}
                              className={`px-4 py-2 rounded-lg text-sm border ${currentImage.status === 'pending' ? 'bg-zinc-600 text-white border-zinc-600' : 'bg-zinc-500/15 border-zinc-500/30 text-zinc-200 hover:bg-zinc-500/25'}`}
                            >
                              معلقة
                            </button>
                          </div>
                        </div>

                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              showPrevImage();
                            }}
                            className="w-14 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"
                          >
                            <ChevronRight size={18} />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              showNextImage();
                            }}
                            className="w-14 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center"
                          >
                            <ChevronLeft size={18} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </main>
          </motion.div>
        )}

        {portalView === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen flex flex-col"
          >
            <header
              className="sticky top-0 z-50 backdrop-blur-md border-b border-white/10 px-4 md:px-6 py-4"
              style={{ backgroundColor: `${brand.bg}d9` }}
            >
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-black text-lg">مراجعة الاختيار</h2>
                  <p className="text-xs text-zinc-400">
                    قبل الإرسال النهائي تأكد من الصور المقبولة.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={selectedCount === 0 || downloadState === 'downloading'}
                    className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-sm hover:bg-white/20 disabled:bg-zinc-700 disabled:text-zinc-500"
                    onClick={handleDownloadAll}
                  >
                    {downloadState === 'downloading' ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" /> {downloadProgress.current}/
                        {downloadProgress.total}
                      </span>
                    ) : downloadState === 'done' ? (
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" /> تم التحميل
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Download size={14} /> تحميل المختارة
                      </span>
                    )}
                  </button>

                  <button
                    disabled={selectedCount === 0 || loadingState === 'submitting'}
                    onClick={handleSubmitSelection}
                    className="px-5 py-2 rounded-lg text-white font-bold text-sm disabled:bg-zinc-700 disabled:text-zinc-500"
                    style={{ backgroundColor: brand.primary }}
                  >
                    {loadingState === 'submitting' ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" /> جارٍ الإرسال
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Send size={14} /> تأكيد وإرسال
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </header>

            <div className="max-w-7xl mx-auto w-full p-4 md:p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-center">
                  <p className="text-2xl font-black text-emerald-300">{selectedCount}</p>
                  <p className="text-xs text-zinc-300">مقبولة</p>
                </div>
                <div className="p-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 text-center">
                  <p className="text-2xl font-black text-rose-300">{rejectedCount}</p>
                  <p className="text-xs text-zinc-300">مرفوضة</p>
                </div>
                <div className="p-4 rounded-2xl border border-zinc-500/25 bg-zinc-500/10 text-center">
                  <p className="text-2xl font-black text-zinc-200">{pendingCount}</p>
                  <p className="text-xs text-zinc-300">معلقة</p>
                </div>
                <div className="p-4 rounded-2xl border border-white/10 bg-white/5 text-center">
                  <p className="text-2xl font-black text-white">{totalCount}</p>
                  <p className="text-xs text-zinc-400">إجمالي</p>
                </div>
              </div>

              {selectedImages.length > 0 ? (
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 mb-3">الصور المقبولة:</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {selectedImages.map((img, idx) => (
                      <div
                        key={img.id}
                        className="relative aspect-square rounded-xl overflow-hidden border border-emerald-500/30 group"
                      >
                        <img
                          src={img.thumbnailUrl || img.cloudUrl || ''}
                          alt={img.fileName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <button
                          onClick={() => setImageStatus(img.id, 'pending')}
                          className="absolute top-2 left-2 w-6 h-6 rounded-full bg-rose-500/90 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
                        >
                          <XCircle size={13} />
                        </button>
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <button
                          onClick={() => handleDownloadSingle(img)}
                          className="absolute bottom-2 left-2 w-7 h-7 rounded-md bg-black/45 hover:bg-black/70 text-white flex items-center justify-center"
                          title="تحميل الصورة"
                          aria-label="تحميل الصورة"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-zinc-400">
                  لم تحدد أي صورة كمقبولة بعد. ارجع للمعرض وعدّل الاختيارات.
                </div>
              )}

              <div className="mt-8 flex items-center gap-2">
                <button
                  onClick={() => setPortalView('gallery')}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-sm hover:bg-white/20"
                >
                  رجوع للمعرض
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {portalView === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/20">
              <CheckCircle2 size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-black mb-3">تم إرسال اختيارك بنجاح</h2>
            <p className="text-zinc-300 text-sm max-w-md leading-relaxed mb-7">
              وصلنا اختيارك. تم اعتماد{' '}
              <span className="text-emerald-300 font-bold">{selectedCount}</span> صورة للتعديل.
            </p>

            <button
              disabled={downloadState === 'downloading'}
              className="px-6 py-3 rounded-xl bg-white/10 border border-white/10 text-sm hover:bg-white/20"
              onClick={handleDownloadAll}
            >
              {downloadState === 'downloading' ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> {downloadProgress.current}/
                  {downloadProgress.total}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Download size={14} /> تحميل الصور المقبولة
                </span>
              )}
            </button>
            <p className="mt-8 text-xs text-zinc-500">هوية بصرية: Villa Hadad Client Portal</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientPortal;
