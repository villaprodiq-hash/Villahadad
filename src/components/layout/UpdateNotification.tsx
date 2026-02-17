import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UpdateStatusPayload {
  status: 'idle' | 'available' | 'downloading' | 'ready' | 'error';
  progress?: number;
  error?: string;
}

interface UpdateBridge {
  onUpdateStatus?: (callback: (_event: unknown, data: UpdateStatusPayload) => void) => void;
  restartApp?: () => void;
}

const UpdateNotification: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'available' | 'downloading' | 'ready' | 'error'>(
    'idle'
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const api = window.electronAPI as (typeof window.electronAPI & UpdateBridge) | undefined;
    if (!api) return;

    if (api.onUpdateStatus) {
      api.onUpdateStatus((_event: unknown, data: UpdateStatusPayload) => {
        setStatus(data.status);
        if (data.progress) setProgress(data.progress);
        if (data.error) setError(data.error);
      });
    }
  }, []);

  const handleRestart = () => {
    const api = window.electronAPI as (typeof window.electronAPI & UpdateBridge) | undefined;
    if (api && api.restartApp) {
      api.restartApp();
    }
  };

  if (status === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 z-9999 max-w-sm w-full"
      >
        <div className="bg-[#1a1c22] border border-white/10 rounded-xl shadow-2xl p-4 flex items-center gap-4 relative overflow-hidden">
          <div
            className={`absolute inset-0 opacity-10 ${status === 'ready' ? 'bg-green-500' : 'bg-blue-500'}`}
          />

          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 
                ${status === 'ready' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}
          >
            {status === 'downloading' && <RefreshCw size={20} className="animate-spin" />}
            {status === 'ready' && <Download size={20} />}
            {status === 'available' && <Download size={20} className="animate-bounce" />}
            {status === 'error' && <AlertCircle size={20} className="text-red-400" />}
          </div>

          <div className="flex-1 min-w-0">
            {status === 'available' && (
              <div>
                <h4 className="font-bold text-white text-sm">تحديث جديد متوفر</h4>
                <p className="text-xs text-gray-400">جاري التحضير للتحميل...</p>
              </div>
            )}

            {status === 'downloading' && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-white">جاري التحميل...</span>
                  <span className="text-blue-400 font-mono">{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {status === 'ready' && (
              <div>
                <h4 className="font-bold text-white text-sm mb-1">التحديث جاهز!</h4>
                <button
                  onClick={handleRestart}
                  className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors w-full"
                >
                  إعادة التشغيل والتثبيت
                </button>
              </div>
            )}

            {status === 'error' && (
              <div>
                <h4 className="font-bold text-red-400 text-sm">فشل التحديث</h4>
                <p className="text-[10px] text-gray-500 truncate">{error}</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="text-[10px] text-gray-400 underline mt-1"
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>

          {status !== 'downloading' && (
            <button
              onClick={() => setStatus('idle')}
              className="absolute top-2 left-2 text-gray-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateNotification;
