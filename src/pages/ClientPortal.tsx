import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Lock,
  ArrowRight,
  Image as ImageIcon,
  Heart,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  AlertCircle,
  Camera,
  Send,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';

// ─── Types ──────────────────────────────────────────────────

interface PortalImage {
  id: string;
  fileName: string;
  cloudUrl: string | null;
  thumbnailUrl: string | null;
  status: 'pending' | 'selected' | 'rejected';
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

// ─── Component ──────────────────────────────────────────────

const ClientPortal: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [portalView, setPortalView] = useState<PortalView>('welcome');

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [images, setImages] = useState<PortalImage[]>([]);
  const [activePreview, setActivePreview] = useState<PortalImage | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  // Extract token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    setToken(t);
  }, []);

  // ─── Fetch photos from Edge Function ──────────────────────

  const fetchPhotos = useCallback(async () => {
    if (!token) return;
    setLoadingState('loading');
    setErrorMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('client-portal', {
        body: { action: 'get_photos', token },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setBooking(data.booking);
      setImages(data.images || []);
      setLoadingState('loaded');
    } catch (err: any) {
      console.error('Portal fetch error:', err);
      setErrorMsg(err.message || 'حدث خطأ في تحميل الصور');
      setLoadingState('error');
    }
  }, [token]);

  // ─── Enter gallery → fetch photos ────────────────────────

  const handleEnterGallery = useCallback(() => {
    setPortalView('gallery');
    fetchPhotos();
  }, [fetchPhotos]);

  // ─── Toggle image selection ───────────────────────────────

  const handleToggleStatus = useCallback((imageId: string) => {
    setImages(prev =>
      prev.map(img => {
        if (img.id !== imageId) return img;
        const newStatus = img.status === 'selected' ? 'pending' : 'selected';
        return { ...img, status: newStatus };
      })
    );
  }, []);

  // ─── Image click: toggle in grid, preview in lightbox ────

  const handleImageClick = useCallback((imageId: string) => {
    handleToggleStatus(imageId);
  }, [handleToggleStatus]);

  // ─── Go to review page ───────────────────────────────────

  const handleGoToReview = useCallback(() => {
    setPortalView('review');
  }, []);

  // ─── Submit selection to Edge Function ────────────────────

  const handleSubmitSelection = useCallback(async () => {
    if (!token) return;
    setLoadingState('submitting');

    try {
      // Send all image statuses
      const selections = images.map(img => ({
        imageId: img.id,
        status: img.status,
        liked: img.status === 'selected',
      }));

      const { data, error } = await supabase.functions.invoke('client-portal', {
        body: { action: 'update_selection', token, selections },
      });

      if (error) throw new Error(error.message);

      // Confirm selection (locks it in, advances booking)
      const { data: confirmData, error: confirmErr } = await supabase.functions.invoke('client-portal', {
        body: { action: 'confirm_selection', token },
      });

      if (confirmErr) throw new Error(confirmErr.message);

      setLoadingState('submitted');
      setPortalView('done');
    } catch (err: any) {
      console.error('Submit error:', err);
      setErrorMsg(err.message || 'حدث خطأ في إرسال الاختيار');
      setLoadingState('loaded'); // Go back to gallery so user can retry
    }
  }, [token, images]);

  // ─── Download all photos ─────────────────────────────────

  const handleDownloadAll = useCallback(async () => {
    if (!token || downloadState === 'downloading') return;
    setDownloadState('downloading');

    try {
      // Get full-res URLs from Edge Function
      const { data, error } = await supabase.functions.invoke('client-portal', {
        body: { action: 'get_download_urls', token },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const downloads: { fileName: string; url: string }[] = data.downloads || [];
      setDownloadProgress({ current: 0, total: downloads.length });

      // Download each image using hidden <a> tags
      for (let i = 0; i < downloads.length; i++) {
        const { fileName, url } = downloads[i];
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);

          setDownloadProgress({ current: i + 1, total: downloads.length });

          // Small delay between downloads to avoid browser throttling
          if (i < downloads.length - 1) {
            await new Promise(r => setTimeout(r, 300));
          }
        } catch {
          console.warn(`Failed to download: ${fileName}`);
        }
      }

      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 3000);
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadState('idle');
    }
  }, [token, downloadState]);

  // ─── Counts ───────────────────────────────────────────────

  const selectedCount = useMemo(
    () => images.filter(i => i.status === 'selected').length,
    [images]
  );

  const totalCount = images.length;

  const selectedImages = useMemo(
    () => images.filter(i => i.status === 'selected'),
    [images]
  );

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans" dir="rtl">
      <AnimatePresence mode="wait">

        {/* ═══ VIEW 1: Welcome Screen ═══ */}
        {portalView === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-12 text-center"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/20">
                <Camera size={40} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2">فيلا حداد</h1>
              <p className="text-gray-400 text-sm">بوابة اختيار الصور</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-md bg-[#1a1a1a] border border-white/5 rounded-3xl p-8 shadow-xl text-center"
            >
              <h2 className="text-xl font-bold mb-4">!اهلا بك</h2>
              <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                أنت على وشك الدخول إلى معرض الصور الخاص بك. اضغط على الصور
                لاختيارها، ثم راجع اختيارك وأرسله. الصور المختارة سيتم تعديلها
                وتجهيزها لك.
              </p>

              {!token && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4 justify-center">
                  <AlertCircle size={16} />
                  <span>رابط غير صالح — يرجى التواصل مع الاستديو</span>
                </div>
              )}

              <button
                disabled={!token}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500
                  text-black font-bold rounded-xl transition-all hover:scale-105 active:scale-95
                  flex items-center justify-center gap-2"
                onClick={handleEnterGallery}
              >
                <span>عرض الصور</span>
                <ArrowRight size={20} />
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                <Lock size={12} />
                <span>رابط آمن وخاص بك</span>
              </div>
            </motion.div>

            <footer className="mt-12 text-center text-gray-600 text-xs">
              &copy; {new Date().getFullYear()} Villa Hadad Studio
            </footer>
          </motion.div>
        )}

        {/* ═══ VIEW 2: Gallery ═══ */}
        {portalView === 'gallery' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen flex flex-col"
          >
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f0f0f]/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div>
                  <h2 className="font-bold text-lg">
                    {booking?.title || 'معرض الصور'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {booking?.clientName ? `مرحبا ${booking.clientName} — اضغط على الصور لاختيارها` : 'اضغط على الصور لاختيارها'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Counter */}
                  <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <Heart size={16} className="text-amber-500 fill-amber-500" />
                    <span className="text-amber-500 font-bold text-sm">
                      {selectedCount}
                      <span className="text-amber-500/50 font-normal"> / {totalCount}</span>
                    </span>
                  </div>

                  {/* Go to Review */}
                  <button
                    disabled={selectedCount === 0}
                    className="bg-white text-black px-5 py-2.5 rounded-xl text-sm font-bold
                      hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600
                      transition-all flex items-center gap-2"
                    onClick={handleGoToReview}
                  >
                    <Send size={16} />
                    <span>مراجعة الاختيار</span>
                  </button>
                </div>
              </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
              {loadingState === 'loading' && (
                <div className="flex flex-col items-center justify-center py-32">
                  <Loader2 size={48} className="text-amber-500 animate-spin mb-4" />
                  <p className="text-gray-400 text-sm">جاري تحميل الصور...</p>
                </div>
              )}

              {loadingState === 'error' && (
                <div className="flex flex-col items-center justify-center py-32">
                  <AlertCircle size={48} className="text-red-400 mb-4" />
                  <p className="text-red-400 text-sm mb-4">{errorMsg}</p>
                  <button onClick={fetchPhotos} className="px-4 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors">
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {loadingState === 'loaded' && images.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32">
                  <ImageIcon size={48} className="text-gray-600 mb-4" />
                  <p className="text-gray-500 text-sm">لا توجد صور بعد — يتم تجهيزها</p>
                </div>
              )}

              {loadingState === 'loaded' && images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {images.map((img) => (
                    <motion.div
                      key={img.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer
                        transition-all duration-200 border-2
                        ${img.status === 'selected'
                          ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                          : 'border-transparent hover:border-white/20'
                        }`}
                      onClick={() => handleImageClick(img.id)}
                    >
                      <img
                        src={img.thumbnailUrl || img.cloudUrl || ''}
                        alt={img.fileName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className={`absolute inset-0 transition-all duration-200 ${
                        img.status === 'selected' ? 'bg-amber-500/10' : 'bg-black/0 hover:bg-black/20'
                      }`} />
                      {img.status === 'selected' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-3 right-3 bg-amber-500 rounded-full p-1.5 shadow-lg"
                        >
                          <CheckCircle2 size={18} className="text-white" />
                        </motion.div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-white/70 font-mono truncate">{img.fileName}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </main>

            {/* Bottom bar */}
            {loadingState === 'loaded' && selectedCount > 0 && (
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="sticky bottom-0 bg-[#0f0f0f]/90 backdrop-blur-md border-t border-white/10 px-6 py-4"
              >
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                  <p className="text-sm text-gray-400">
                    اخترت <span className="text-amber-500 font-bold">{selectedCount}</span> صورة
                    من أصل <span className="text-white font-bold">{totalCount}</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setImages(prev => prev.map(i => ({ ...i, status: 'pending' as const })))}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      إلغاء الكل
                    </button>
                    <button
                      onClick={handleGoToReview}
                      className="bg-amber-500 text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-600 transition-all"
                    >
                      مراجعة وإرسال ({selectedCount})
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══ VIEW 3: Review / Summary ═══ */}
        {portalView === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col"
          >
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0f0f0f]/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPortalView('gallery')}
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <ArrowRight size={18} />
                  </button>
                  <div>
                    <h2 className="font-bold text-lg">مراجعة الاختيار</h2>
                    <p className="text-xs text-gray-400">
                      تأكد من اختيارك قبل الإرسال — {selectedCount} صورة مختارة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Download Selected */}
                  <button
                    disabled={selectedCount === 0 || downloadState === 'downloading'}
                    className="bg-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-medium
                      hover:bg-white/20 disabled:bg-gray-800 disabled:text-gray-600
                      transition-all flex items-center gap-2 border border-white/10"
                    onClick={handleDownloadAll}
                  >
                    {downloadState === 'downloading' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{downloadProgress.current}/{downloadProgress.total}</span>
                      </>
                    ) : downloadState === 'done' ? (
                      <>
                        <CheckCircle2 size={16} className="text-green-400" />
                        <span>تم التحميل</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>تحميل المختارة</span>
                      </>
                    )}
                  </button>

                  {/* Confirm & Send */}
                  <button
                    disabled={selectedCount === 0 || loadingState === 'submitting'}
                    className="bg-amber-500 text-black px-5 py-2.5 rounded-xl text-sm font-bold
                      hover:bg-amber-600 disabled:bg-gray-800 disabled:text-gray-600
                      transition-all flex items-center gap-2"
                    onClick={handleSubmitSelection}
                  >
                    {loadingState === 'submitting' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>تأكيد وإرسال</span>
                  </button>
                </div>
              </div>
            </header>

            {/* Summary Stats */}
            <div className="max-w-7xl mx-auto w-full px-6 py-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-black text-amber-500">{selectedCount}</p>
                  <p className="text-xs text-gray-400 mt-1">صورة مختارة</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-black text-gray-400">{totalCount - selectedCount}</p>
                  <p className="text-xs text-gray-500 mt-1">لم تُختر</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-black text-white">{totalCount}</p>
                  <p className="text-xs text-gray-500 mt-1">إجمالي الصور</p>
                </div>
              </div>

              {/* Selected Photos Grid */}
              <h3 className="text-sm font-bold text-gray-300 mb-3">الصور المختارة:</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {selectedImages.map((img, idx) => (
                  <motion.div
                    key={img.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-amber-500/30 group"
                  >
                    <img
                      src={img.thumbnailUrl || img.cloudUrl || ''}
                      alt={img.fileName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Remove button */}
                    <button
                      onClick={() => handleToggleStatus(img.id)}
                      className="absolute top-2 left-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <XCircle size={14} className="text-white" />
                    </button>
                    {/* Number badge */}
                    <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-black">{idx + 1}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-[9px] text-white/70 font-mono truncate">{img.fileName}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {selectedCount === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <HelpCircle size={40} className="text-gray-600 mb-3" />
                  <p className="text-gray-500 text-sm">لم تختر أي صورة بعد</p>
                  <button
                    onClick={() => setPortalView('gallery')}
                    className="mt-4 px-4 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors"
                  >
                    العودة للمعرض
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ VIEW 4: Done ═══ */}
        {portalView === 'done' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
              className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-green-500/20"
            >
              <CheckCircle2 size={48} className="text-white" />
            </motion.div>

            <h2 className="text-2xl font-bold mb-3">تم إرسال اختيارك!</h2>
            <p className="text-gray-400 text-sm max-w-md leading-relaxed mb-2">
              شكرا لك! تم اختيار{' '}
              <span className="text-amber-500 font-bold">{selectedCount}</span> صورة بنجاح.
              سيتم تعديلها وتجهيزها لك في أقرب وقت.
            </p>
            <p className="text-gray-600 text-xs mb-8">
              سيتم إعلامك عند الانتهاء من التعديل.
            </p>

            {/* Download selected after confirmation */}
            <button
              disabled={downloadState === 'downloading'}
              className="bg-white/10 text-white px-6 py-3 rounded-xl text-sm font-medium
                hover:bg-white/20 transition-all flex items-center gap-2 border border-white/10"
              onClick={handleDownloadAll}
            >
              {downloadState === 'downloading' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{downloadProgress.current}/{downloadProgress.total}</span>
                </>
              ) : downloadState === 'done' ? (
                <>
                  <CheckCircle2 size={16} className="text-green-400" />
                  <span>تم التحميل</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>تحميل الصور المختارة ({selectedCount})</span>
                </>
              )}
            </button>

            <footer className="mt-16 text-center text-gray-600 text-xs">
              &copy; {new Date().getFullYear()} Villa Hadad Studio
            </footer>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default ClientPortal;
