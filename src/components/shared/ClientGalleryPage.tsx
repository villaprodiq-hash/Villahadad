/**
 * ClientGalleryPage
 * 
 * A beautiful client-facing gallery page with:
 * - Copyable link to R2 folder
 * - QR code for mobile scanning
 * - Image gallery view
 * - Share link generation
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  ExternalLink,
  Share2,
  Check,
  Image as ImageIcon,
  Download,
  Link2,
  X,
  ZoomIn,
  Grid3X3,
  LayoutGrid,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { openWhatsAppUrl } from '../../utils/whatsapp';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ClientPhoto {
  id: string;
  cloudUrl: string;
  thumbnailUrl?: string;
  fileName: string;
  uploadedAt?: string;
}

interface ClientGalleryPageProps {
  clientName: string;
  sessionId: string;
  photos: ClientPhoto[];
  r2PublicUrl?: string;
  onClose?: () => void;
}

type ViewMode = 'grid' | 'masonry';
type ShareExpiry = '1h' | '24h' | '7d' | 'never';

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

const ClientGalleryPage: React.FC<ClientGalleryPageProps> = ({
  clientName,
  sessionId,
  photos,
  r2PublicUrl = 'https://media.villahadad.org',
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPhoto, setSelectedPhoto] = useState<ClientPhoto | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareExpiry, setShareExpiry] = useState<ShareExpiry>('24h');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Generate folder URL
  const folderUrl = useMemo(() => {
    const firstPhoto = photos[0];
    if (firstPhoto?.cloudUrl) {
      // Extract folder path from first photo URL
      const parts = firstPhoto.cloudUrl.split('/');
      parts.pop(); // Remove filename
      return parts.join('/');
    }
    return `${r2PublicUrl}/sessions/${sessionId}`;
  }, [photos, r2PublicUrl, sessionId]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(text);
      toast.success(`تم نسخ ${label}`);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      toast.error('فشل النسخ');
    }
  };

  // Share via WhatsApp
  const shareViaWhatsApp = (message: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    void openWhatsAppUrl(url);
  };

  // Generate share link with expiry
  const generateShareLink = useCallback(() => {
    const baseUrl = folderUrl;
    const expiryParam = shareExpiry !== 'never' ? `&exp=${shareExpiry}` : '';
    const selectedParam = selectedPhotos.size > 0 
      ? `&photos=${Array.from(selectedPhotos).join(',')}` 
      : '';
    return `${baseUrl}?share=1${expiryParam}${selectedParam}`;
  }, [folderUrl, shareExpiry, selectedPhotos]);

  // Toggle photo selection
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-violet-500/25">
                {clientName.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-black text-white">{clientName}</h1>
                <p className="text-sm text-zinc-400">{photos.length} صورة</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-zinc-800/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-violet-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('masonry')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'masonry' ? 'bg-violet-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {/* Share Button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg border border-violet-500/30 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-bold">مشاركة</span>
              </button>

              {/* Close Button */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Actions Card */}
        <div className="bg-zinc-800/30 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Folder Link */}
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-white">رابط المجلد</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderUrl}
                  readOnly
                  className="flex-1 bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-400 truncate"
                />
                <button
                  onClick={() => copyToClipboard(folderUrl, 'رابط المجلد')}
                  className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all"
                >
                  {copiedLink === folderUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-zinc-900/50 rounded-xl p-4 flex items-center gap-4">
              <div className="bg-white p-2 rounded-lg">
                <QRCodeSVG value={folderUrl} size={64} level="M" />
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">رمز QR</p>
                <p className="text-xs text-zinc-400">امسح للوصول المباشر</p>
              </div>
            </div>

            {/* WhatsApp Share */}
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm font-bold text-white">مشاركة واتساب</span>
              </div>
              <button
                onClick={() => shareViaWhatsApp(`مرحباً ${clientName}،\n\nروابط صورك:\n${folderUrl}\n\nمع تحيات استوديو فيلا حداد`)}
                className="w-full py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-bold transition-all"
              >
                إرسال عبر واتساب
              </button>
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        {selectedPhotos.size > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shadow-2xl z-50"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">
                {selectedPhotos.size} صورة محددة
              </span>
              <button
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-bold hover:bg-violet-600 transition-all"
              >
                مشاركة المحدد
              </button>
              <button
                onClick={() => setSelectedPhotos(new Set())}
                className="px-4 py-2 bg-zinc-700 text-white rounded-lg text-sm font-bold hover:bg-zinc-600 transition-all"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        )}

        {/* Photo Grid */}
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'
          : 'columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3'
        }>
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
              className={`
                relative group cursor-pointer rounded-xl overflow-hidden
                ${viewMode === 'masonry' ? 'break-inside-avoid mb-3' : ''}
                ${selectedPhotos.has(photo.id) ? 'ring-2 ring-violet-500' : ''}
              `}
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.thumbnailUrl || photo.cloudUrl}
                alt={photo.fileName}
                className="w-full object-cover aspect-square"
                loading="lazy"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ZoomIn className="w-8 h-8 text-white" />
              </div>

              {/* Selection Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePhotoSelection(photo.id);
                }}
                className={`
                  absolute top-2 right-2 w-6 h-6 rounded-md border-2 transition-all
                  ${selectedPhotos.has(photo.id) 
                    ? 'bg-violet-500 border-violet-500' 
                    : 'bg-black/50 border-white/50 hover:border-white'
                  }
                `}
              >
                {selectedPhotos.has(photo.id) && (
                  <Check className="w-4 h-4 text-white mx-auto" />
                )}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {photos.length === 0 && (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">لا توجد صور</p>
            <p className="text-zinc-600 text-sm mt-2">لم يتم رفع أي صور بعد</p>
          </div>
        )}
      </main>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setSelectedPhoto(null)}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedPhoto.cloudUrl}
              alt={selectedPhoto.fileName}
              className="max-w-[90vw] max-h-[90vh] object-contain"
            />

            {/* Actions */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-zinc-900/90 backdrop-blur-xl rounded-2xl px-6 py-3">
              <button
                onClick={() => copyToClipboard(selectedPhoto.cloudUrl, 'رابط الصورة')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-bold hover:bg-blue-500/30 transition-all"
              >
                <Copy className="w-4 h-4" />
                نسخ الرابط
              </button>
              <a
                href={selectedPhoto.cloudUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-bold hover:bg-green-500/30 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                فتح
              </a>
              <a
                href={selectedPhoto.cloudUrl}
                download={selectedPhoto.fileName}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg text-sm font-bold hover:bg-violet-500/30 transition-all"
              >
                <Download className="w-4 h-4" />
                تحميل
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">مشاركة الروابط</h2>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Expiry Selection */}
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">صلاحية الرابط</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: '1h', label: 'ساعة' },
                      { value: '24h', label: 'يوم' },
                      { value: '7d', label: 'أسبوع' },
                      { value: 'never', label: 'دائم' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setShareExpiry(option.value as ShareExpiry)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all ${
                          shareExpiry === option.value
                            ? 'bg-violet-500 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generated Link */}
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">الرابط</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generateShareLink()}
                      readOnly
                      className="flex-1 bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-400 truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(generateShareLink(), 'الرابط')}
                      className="px-3 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-all"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center py-4">
                  <div className="bg-white p-4 rounded-xl">
                    <QRCodeSVG value={generateShareLink()} size={150} level="H" />
                  </div>
                </div>

                {/* Share Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      const link = generateShareLink();
                      copyToClipboard(link, 'الرابط');
                    }}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-500/20 text-blue-400 rounded-xl font-bold hover:bg-blue-500/30 transition-all"
                  >
                    <Copy className="w-5 h-5" />
                    نسخ الرابط
                  </button>
                  <button
                    onClick={() => {
                      const link = generateShareLink();
                      const message = selectedPhotos.size > 0
                        ? `مرحباً ${clientName}،\n\nروابط الصور المختارة:\n${link}\n\nمع تحيات استوديو فيلا حداد`
                        : `مرحباً ${clientName}،\n\nروابط صورك:\n${link}\n\nمع تحيات استوديو فيلا حداد`;
                      shareViaWhatsApp(message);
                    }}
                    className="flex items-center justify-center gap-2 py-3 bg-green-500/20 text-green-400 rounded-xl font-bold hover:bg-green-500/30 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    واتساب
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientGalleryPage;
