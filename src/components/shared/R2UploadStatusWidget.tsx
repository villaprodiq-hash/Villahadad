/**
 * R2UploadStatusWidget
 * 
 * Shows R2 cloud upload status in the status bar
 * Displays: Upload progress, bytes transferred, file count
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  CloudOff,
  Upload,
  X,
  ChevronDown,
  Server,
} from 'lucide-react';

interface UploadProgress {
  percent: number;
  status: string;
  current?: number;
  total?: number;
  startTime?: number;
  bytesPerSecond?: number;
  uploadedBytes?: number;
  totalBytes?: number;
}

interface R2UploadStatusWidgetProps {
  compact?: boolean;
  className?: string;
  uploadProgress?: UploadProgress | null;
  isUploading?: boolean;
}

export const R2UploadStatusWidget: React.FC<R2UploadStatusWidgetProps> = ({
  compact = false,
  className = '',
  uploadProgress: externalProgress,
  isUploading: externalIsUploading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [r2Enabled, setR2Enabled] = useState<boolean | null>(null);
  const [internalProgress, setInternalProgress] = useState<UploadProgress | null>(null);
  const [internalIsUploading, setInternalIsUploading] = useState(false);

  // Use external or internal state
  const progress = externalProgress ?? internalProgress;
  const isUploading = externalIsUploading ?? internalIsUploading;

  // Check R2 status on mount
  useEffect(() => {
    const checkR2 = async () => {
      try {
        const status = await window.electronAPI?.sessionLifecycle?.getR2Status?.();
        setR2Enabled(status?.enabled ?? false);
      } catch (err) {
        setR2Enabled(false);
      }
    };
    checkR2();
  }, []);

  // Listen for upload progress events
  useEffect(() => {
    const handleProgress = (eventOrData: unknown, maybeData?: UploadProgress) => {
      const data = maybeData ?? (eventOrData as UploadProgress);
      if (!data || typeof data.percent !== 'number') return;
      setInternalProgress(data);
      setInternalIsUploading(data.percent < 100);
    };

    const unsubscribe = window.electronAPI?.sessionLifecycle?.onIngestionProgress?.(
      data => handleProgress(data)
    );
    
    return () => {
      unsubscribe?.();
    };
  }, []);

  // Format bytes to human readable
  const formatBytes = (bytes: number | undefined): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Calculate time remaining
  const getTimeRemaining = (): string => {
    if (!progress?.startTime || !progress.percent || progress.percent >= 100) return '';
    const elapsed = Date.now() - progress.startTime;
    const remaining = (elapsed / progress.percent) * (100 - progress.percent);
    const seconds = Math.round(remaining / 1000);
    if (seconds < 60) return `${seconds} ثانية`;
    const minutes = Math.round(seconds / 60);
    return `${minutes} دقيقة`;
  };

  // Compact view - just an icon with status color
  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {isUploading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Cloud className="w-4 h-4 text-blue-400" />
          </motion.div>
        ) : r2Enabled ? (
          <Cloud className="w-4 h-4 text-emerald-400" />
        ) : (
          <CloudOff className="w-4 h-4 text-zinc-500" />
        )}
        {isUploading && progress && (
          <span className="text-[10px] text-blue-400 font-bold">
            {progress.percent}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
          ${isUploading 
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
            : r2Enabled 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 hover:bg-zinc-500/20'
          }
        `}
      >
        {isUploading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Upload className="w-4 h-4" />
          </motion.div>
        ) : r2Enabled ? (
          <Cloud className="w-4 h-4" />
        ) : (
          <CloudOff className="w-4 h-4" />
        )}
        
        <span className="hidden sm:inline">
          {isUploading 
            ? `جاري الرفع ${progress?.percent ?? 0}%`
            : r2Enabled 
              ? 'R2 متصل'
              : 'R2 غير متصل'
          }
        </span>
        
        <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-white">حالة R2</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">الاتصال</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${r2Enabled ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className={`text-xs font-medium ${r2Enabled ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r2Enabled ? 'متصل' : 'غير متصل'}
                  </span>
                </div>
              </div>

              {/* Upload Progress */}
              {isUploading && progress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">التقدم</span>
                    <span className="text-xs font-bold text-blue-400">{progress.percent}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-linear-to-r from-blue-500 to-cyan-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <span className="text-zinc-500 block">الملفات</span>
                      <span className="text-white font-bold">
                        {progress.current ?? 0} / {progress.total ?? 0}
                      </span>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <span className="text-zinc-500 block">الحجم</span>
                      <span className="text-white font-bold">
                        {formatBytes(progress.uploadedBytes)} / {formatBytes(progress.totalBytes)}
                      </span>
                    </div>
                    {progress.bytesPerSecond && progress.bytesPerSecond > 0 && (
                      <>
                        <div className="bg-zinc-800/50 rounded-lg p-2">
                          <span className="text-zinc-500 block">السرعة</span>
                          <span className="text-white font-bold">
                            {formatBytes(progress.bytesPerSecond)}/s
                          </span>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-2">
                          <span className="text-zinc-500 block">متبقي</span>
                          <span className="text-white font-bold">
                            {getTimeRemaining()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status Message */}
                  <p className="text-[10px] text-zinc-500 truncate">
                    {progress.status}
                  </p>
                </div>
              )}

              {/* Not Uploading State */}
              {!isUploading && (
                <div className="text-center py-4">
                  <Cloud className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">
                    {r2Enabled 
                      ? 'لا توجد عمليات رفع حالياً'
                      : 'R2 غير مفعّل - تحقق من الإعدادات'
                    }
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default R2UploadStatusWidget;
