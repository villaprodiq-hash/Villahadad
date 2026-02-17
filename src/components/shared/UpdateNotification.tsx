import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, RefreshCw, X, CheckCircle2, 
  Sparkles, 
  FileText, Zap, ShieldCheck
} from 'lucide-react';

interface UpdateStatus {
  status: 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'idle';
  progress?: number;
  version?: string;
  releaseNotes?: string;
  error?: string;
  totalSize?: string;
}

type UpdateEventPayload = {
  status: 'available' | 'downloading' | 'ready' | 'error';
  version?: string;
  releaseNotes?: string;
  progress?: number;
};

type DesktopUpdateBridge = {
  onUpdateStatus?: (callback: (data: UpdateEventPayload) => void) => (() => void) | void;
  checkForUpdates?: () => Promise<void> | void;
  downloadUpdate?: () => Promise<void> | void;
  installUpdate?: () => Promise<void> | void;
};

export const UpdateNotification: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdateStatus>({ status: 'idle' });
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const api = window.electronAPI as (typeof window.electronAPI & DesktopUpdateBridge) | undefined;
    if (!api?.onUpdateStatus) return;

    const unsubscribe = api.onUpdateStatus((data: UpdateEventPayload) => {
      if (data.status === 'available') {
        setUpdateState({ 
          status: 'available', 
          version: data.version,
          releaseNotes: data.releaseNotes || 'تحسينات في الأداء وإصلاحات عامة لضمان استقرار النظام.'
        });
        setIsVisible(true);
      } 
      else if (data.status === 'downloading') {
        setUpdateState(prev => ({ 
          ...prev, 
          status: 'downloading', 
          progress: Math.round(data.progress ?? 0) 
        }));
        setIsVisible(true);
      } 
      else if (data.status === 'ready') {
        setUpdateState(prev => ({ ...prev, status: 'downloaded', version: data.version }));
        setIsVisible(true);
      }
      else if (data.status === 'error') {
        setUpdateState({ status: 'error', error: 'فشل الاتصال بخادم التحديث' });
      }
    });

    api.checkForUpdates?.();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleDownload = async () => {
    const api = window.electronAPI as (typeof window.electronAPI & DesktopUpdateBridge) | undefined;
    if (api?.downloadUpdate) {
      setUpdateState(prev => ({ ...prev, status: 'downloading', progress: 0 }));
      await api.downloadUpdate();
    }
  };

  const handleInstall = async () => {
    const api = window.electronAPI as (typeof window.electronAPI & DesktopUpdateBridge) | undefined;
    if (api?.installUpdate) {
      await api.installUpdate();
    }
  };

  if (!isVisible || updateState.status === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="fixed bottom-6 right-6 z-[999] w-[380px]"
        dir="rtl"
      >
        <div className="bg-[#14161c]/90 backdrop-blur-2xl border border-white/10 rounded-4xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          
          {/* Header Area with Status Glow */}
          <div className="p-5 relative">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 pointer-events-none ${
              updateState.status === 'available' ? 'bg-amber-500' : 
              updateState.status === 'downloading' ? 'bg-blue-500' : 'bg-emerald-500'
            }`} />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                        updateState.status === 'available' ? 'bg-amber-500/20 text-amber-400' : 
                        updateState.status === 'downloading' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                        {updateState.status === 'downloading' ? (
                            <RefreshCw className="animate-spin" size={24} />
                        ) : updateState.status === 'downloaded' ? (
                            <ShieldCheck size={24} />
                        ) : (
                            <Sparkles className="animate-pulse" size={24} />
                        )}
                    </div>
                    <div>
                        <h3 className="text-white font-black text-sm tracking-tight">تحديث النظام الذكي</h3>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Villa Hadad v{updateState.version}</p>
                    </div>
                </div>
                <button onClick={() => setIsVisible(false)} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 transition-colors">
                    <X size={18} />
                </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 relative z-10">
                {updateState.status === 'available' && (
                    <>
                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                            <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                                إصدار جديد متاح يتضمن تحسينات هندسية لمركز القيادة والـ NAS.
                            </p>
                            <button 
                                onClick={() => setShowDetails(!showDetails)}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-[#ff6d00] hover:opacity-80 transition-opacity"
                            >
                                <FileText size={12} />
                                {showDetails ? 'إخفاء التفاصيل' : 'عرض سجل التغييرات'}
                            </button>
                            
                            <AnimatePresence>
                                {showDetails && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-3 mt-3 border-t border-white/5 space-y-2">
                                            <div className="flex items-start gap-2">
                                                <Zap size={10} className="text-amber-500 mt-0.5 shrink-0" />
                                                <p className="text-[10px] text-zinc-400">تفعيل نظام الحصانة (Offline Mode) للعمل دون إنترنت.</p>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Zap size={10} className="text-blue-500 mt-0.5 shrink-0" />
                                                <p className="text-[10px] text-zinc-400">أتمتة شريان العمل عبر رؤية الـ NAS الذكية.</p>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Zap size={10} className="text-emerald-500 mt-0.5 shrink-0" />
                                                <p className="text-[10px] text-zinc-400">تحسين واجهة المشرف وربطها بالبيانات الحقيقية.</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button 
                            onClick={handleDownload}
                            className="w-full py-4 bg-[#ff6d00] hover:bg-[#ff8500] text-black font-black rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                        >
                            <Download size={18} />
                            تحميل وتحديث الآن
                        </button>
                    </>
                )}

                {updateState.status === 'downloading' && (
                    <div className="space-y-4 py-2">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-bold text-zinc-400">جاري سحب البيانات...</span>
                            <span className="text-lg font-black text-blue-400 font-mono">{updateState.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-px">
                            <motion.div 
                                className="h-full bg-linear-to-l from-blue-600 to-blue-400 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${updateState.progress}%` }}
                                transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                            />
                        </div>
                        <p className="text-[9px] text-center text-zinc-600">يرجى عدم إغلاق التطبيق لضمان سلامة الملفات</p>
                    </div>
                )}

                {updateState.status === 'downloaded' && (
                    <div className="space-y-4">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                                <CheckCircle2 size={16} />
                            </div>
                            <p className="text-xs text-emerald-400 font-bold">اكتمل التحميل بنجاح! التطبيق جاهز للانطلاق.</p>
                        </div>
                        <button 
                            onClick={handleInstall}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                        >
                            إعادة التشغيل والتثبيت 🚀
                        </button>
                    </div>
                )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
