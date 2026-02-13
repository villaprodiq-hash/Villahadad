import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Globe,
  Link as LinkIcon,
  Download,
  Eye,
  HardDrive,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string; // رابط المعاينة (Preview/Selection)
  downloadUrl?: string; // رابط التحميل المباشر (NAS/Drive)
  type?: 'folder' | 'image';
  whatsappPhone?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  url,
  downloadUrl,
  type = 'folder',
  whatsappPhone,
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'download'>('view');
  const [copied, setCopied] = useState(false);
  const [customDownloadUrl, setCustomDownloadUrl] = useState(downloadUrl || '');

  const currentUrl = activeTab === 'view' ? url : customDownloadUrl;

  const handleCopy = () => {
    if (!currentUrl) {
      toast.error('لا يوجد رابط للنسخ');
      return;
    }
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    toast.success('تم نسخ الرابط بنجاح');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!currentUrl) {
      toast.error('الرجاء إدخال الرابط أولاً');
      return;
    }

    const text =
      activeTab === 'view'
        ? `مرحباً، إليك رابط ${type === 'folder' ? 'اختيار الصور' : 'معاينة الصورة'}: ${title}\n${currentUrl}\n\nيرجى الدخول واختيار الصور المفضلة.`
        : `مرحباً، صورك جاهزة للتحميل بدقة عالية!\nرابط التحميل: ${currentUrl}\n\nشكراً لاختياركم فيلا حداد.`;

    // تنظيف رقم الهاتف (حذف 0 البداية، إضافة 964)
    let phone = whatsappPhone?.replace(/\D/g, '') || '';
    if (phone.startsWith('0')) phone = phone.substring(1);
    if (phone.length > 0 && !phone.startsWith('964')) phone = '964' + phone;

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    if ((window as any).electronAPI?.openWhatsApp) {
      (window as any).electronAPI.openWhatsApp(waUrl);
    } else {
      window.open(waUrl, '_blank');
    }
  };

  const handleEmail = () => {
    if (!currentUrl) return;
    const subject = `مشاركة ${activeTab === 'view' ? 'للمعاينة' : 'للتحميل'} - ${title}`;
    const body = `مرحباً،\n\nإليك الرابط:\n${currentUrl}\n\nتحياتنا،\nفيلا حداد`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10"
      >
        {/* Header */}
        <div className="bg-gray-50 dark:bg-white/5 px-6 py-4 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
          <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
            <Share2 size={20} className="text-amber-500" />
            مشاركة {type === 'folder' ? 'المجلد' : 'الصورة'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-white dark:bg-white/10 p-1.5 rounded-full shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 mx-6 mt-6 bg-gray-100 dark:bg-black/20 rounded-xl">
          <button
            onClick={() => setActiveTab('view')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'view'
                ? 'bg-white dark:bg-[#2a2d35] text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Eye size={14} />
            رابط المعاينة (Web)
          </button>
          <button
            onClick={() => setActiveTab('download')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'download'
                ? 'bg-white dark:bg-[#2a2d35] text-green-600 dark:text-green-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Download size={14} />
            رابط التحميل (Original)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="text-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-colors ${
                activeTab === 'view'
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-500/20'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-500/20'
              }`}
            >
              {activeTab === 'view' ? (
                <Globe size={32} className="text-amber-500" />
              ) : (
                <HardDrive size={32} className="text-green-500" />
              )}
            </div>
            <h4 className="font-bold text-gray-800 dark:text-white text-lg mb-1">{title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeTab === 'view'
                ? 'رابط سريع للعميل لاختيار الصور وكتابة الملاحظات'
                : 'رابط مباشر لتحميل الصور الأصلية (High Res)'}
            </p>
          </div>

          {/* Copy Link Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center z-10">
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg transition-all ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-300 hover:text-gray-800 hover:bg-gray-300'
                }`}
                title="نسخ"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>

            {activeTab === 'download' ? (
              <input
                type="text"
                value={customDownloadUrl}
                onChange={e => setCustomDownloadUrl(e.target.value)}
                placeholder="أدخل رابط التحميل (Drive/NAS)..."
                className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-14 pr-4 text-sm text-gray-800 dark:text-white font-mono text-left focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all placeholder:text-gray-400"
              />
            ) : (
              <input
                type="text"
                readOnly
                value={url}
                className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-14 pr-4 text-sm text-gray-600 dark:text-gray-300 font-mono text-left focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-default"
              />
            )}
          </div>

          {/* Share Actions Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleWhatsApp}
              disabled={!currentUrl}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all border
                 ${!currentUrl ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400' : 'bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border-[#25D366]/20'}`}
            >
              <MessageCircle size={20} />
              <span>واتساب</span>
            </button>

            <button
              onClick={handleEmail}
              disabled={!currentUrl}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all border
                 ${!currentUrl ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400' : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/20'}`}
            >
              <Mail size={20} />
              <span>إيميل</span>
            </button>
          </div>

          {/* QR Code (Only for View Link) */}
          {activeTab === 'view' && url && (
            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 flex items-center gap-4 border border-gray-100 dark:border-white/5 border-dashed">
              <div className="w-12 h-12 bg-white p-1 rounded-lg shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`}
                  alt="QR Code"
                  className="w-full h-full"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                  مسح رمز QR
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  يمكن للزبون مسح الرمز مباشرة للوصول
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ShareModal;
