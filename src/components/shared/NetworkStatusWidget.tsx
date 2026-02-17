/**
 * NetworkStatusWidget
 *
 * Unified network status widget containing:
 * - Internet connection status
 * - Synology NAS connection status
 * - R2 Cloud upload status
 *
 * When uploading: icon transforms to cloud with upload effect
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Server,
  Cloud,
  X,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  HardDrive,
  FolderOpen,
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

interface NetworkStatusWidgetProps {
  uploadProgress?: UploadProgress | null;
  isUploading?: boolean;
  className?: string;
  theme?: string;
}

interface NetworkStatus {
  internet: boolean;
  synology: boolean;
  r2: boolean;
  nasRootPath?: string;
  appFolderPath?: string;
}

export const NetworkStatusWidget: React.FC<NetworkStatusWidgetProps> = ({
  uploadProgress,
  isUploading,
  className = '',
  theme: _theme = 'default',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<NetworkStatus>({
    internet: false,
    synology: false,
    r2: false,
    nasRootPath: '',
    appFolderPath: '',
  });
  const [isChecking, setIsChecking] = useState(false);

  // Check network status
  const checkNetworkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      // Check internet
      const internet = navigator.onLine;

      // Check Synology and R2 via electronAPI
      let synology = false;
      let r2 = false;
      let nasRootPath = '';
      let appFolderPath = '';

      if (window.electronAPI?.nasConfig) {
        try {
          const nasStatus = await window.electronAPI.nasConfig.testConnection?.();
          synology = nasStatus?.success ?? false;

          const config = await window.electronAPI.nasConfig.getConfig?.();
          if (config) {
            nasRootPath = config.nasRootPath || '/Volumes/VillaHadad';
            appFolderPath = config.appFolderPath || '';
          }
        } catch {
          synology = false;
        }
      }

      if (window.electronAPI?.sessionLifecycle?.getR2Status) {
        try {
          const r2Status = await window.electronAPI.sessionLifecycle.getR2Status();
          r2 = r2Status?.enabled ?? false;
        } catch {
          r2 = false;
        }
      }

      setStatus({ internet, synology, r2, nasRootPath, appFolderPath });
    } catch (error) {
      console.error('Error checking network status:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Open folder in Finder
  const handleOpenFolder = async () => {
    try {
      await window.electronAPI?.nasConfig?.openAppFolder?.();
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  // Check on mount
  useEffect(() => {
    checkNetworkStatus();

    // Check every 30 seconds
    const interval = setInterval(checkNetworkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkNetworkStatus]);

  // Format bytes
  const formatBytes = (bytes: number | undefined): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Calculate time remaining
  const getTimeRemaining = (): string => {
    if (!uploadProgress?.startTime || !uploadProgress.percent || uploadProgress.percent >= 100)
      return '';
    const elapsed = Date.now() - uploadProgress.startTime;
    const remaining = (elapsed / uploadProgress.percent) * (100 - uploadProgress.percent);
    const seconds = Math.round(remaining / 1000);
    if (seconds < 60) return `${seconds} ثانية`;
    const minutes = Math.round(seconds / 60);
    return `${minutes} دقيقة`;
  };

  // Determine overall status
  const isOnline = status.internet;
  const isFullyConnected = status.internet && status.synology;
  const uploading = isUploading && uploadProgress;

  // Icon based on state
  const renderIcon = () => {
    if (uploading) {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Cloud className="w-4 h-4 text-blue-400" />
        </motion.div>
      );
    }

    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-red-400" />;
    }

    if (!status.synology) {
      return <Wifi className="w-4 h-4 text-amber-400" />;
    }

    return <Wifi className="w-4 h-4 text-emerald-400" />;
  };

  // Status text
  const getStatusText = () => {
    if (uploading) return `جاري الرفع ${uploadProgress?.percent ?? 0}%`;
    if (!isOnline) return 'غير متصل';
    if (!status.synology) return 'متصل جزئياً';
    return 'متصل';
  };

  // Status color
  return (
    <div className={`relative ${className}`}>
      {/* Main Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-full
          ${
            uploading
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : isFullyConnected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                : isOnline
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
          }
        `}
      >
        {renderIcon()}
        <span className="flex-1 text-right">{getStatusText()}</span>
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
            className="absolute top-full right-0 mt-2 w-72 bg-[#1a1a1f]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-bold text-white">حالة الشبكة</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    checkNetworkStatus();
                  }}
                  className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-zinc-400"
                  disabled={isChecking}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
              {/* Internet Status */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs text-zinc-300">الإنترنت</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${status.internet ? 'bg-emerald-400' : 'bg-red-400'}`}
                  />
                  <span
                    className={`text-xs font-medium ${status.internet ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {status.internet ? 'متصل' : 'غير متصل'}
                  </span>
                </div>
              </div>

              {/* Synology Status */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs text-zinc-300">Synology NAS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${status.synology ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  />
                  <span
                    className={`text-xs font-medium ${status.synology ? 'text-emerald-400' : 'text-amber-400'}`}
                  >
                    {status.synology ? 'متصل' : 'غير متصل'}
                  </span>
                </div>
              </div>

              {/* R2 Status / Upload Progress */}
              <div className="p-2 rounded-lg bg-zinc-800/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {uploading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Cloud className="w-4 h-4 text-blue-400" />
                      </motion.div>
                    ) : (
                      <Cloud
                        className={`w-4 h-4 ${status.r2 ? 'text-emerald-400' : 'text-zinc-500'}`}
                      />
                    )}
                    <span className="text-xs text-zinc-300">Cloud R2</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-2 h-2 rounded-full ${status.r2 ? 'bg-emerald-400' : 'bg-zinc-500'}`}
                    />
                    <span
                      className={`text-xs font-medium ${status.r2 ? 'text-emerald-400' : 'text-zinc-500'}`}
                    >
                      {status.r2 ? 'متصل' : 'غير مفعّل'}
                    </span>
                  </div>
                </div>

                {/* Upload Progress Details */}
                {uploading && uploadProgress && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-linear-to-r from-blue-500 to-cyan-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress.percent}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-zinc-700/50 rounded px-2 py-1">
                        <span className="text-zinc-500 block">الملفات</span>
                        <span className="text-white font-bold">
                          {uploadProgress.current ?? 0} / {uploadProgress.total ?? 0}
                        </span>
                      </div>
                      <div className="bg-zinc-700/50 rounded px-2 py-1">
                        <span className="text-zinc-500 block">الحجم</span>
                        <span className="text-white font-bold">
                          {formatBytes(uploadProgress.uploadedBytes)} /{' '}
                          {formatBytes(uploadProgress.totalBytes)}
                        </span>
                      </div>
                      {uploadProgress.bytesPerSecond && uploadProgress.bytesPerSecond > 0 && (
                        <>
                          <div className="bg-zinc-700/50 rounded px-2 py-1">
                            <span className="text-zinc-500 block">السرعة</span>
                            <span className="text-white font-bold">
                              {formatBytes(uploadProgress.bytesPerSecond)}/s
                            </span>
                          </div>
                          <div className="bg-zinc-700/50 rounded px-2 py-1">
                            <span className="text-zinc-500 block">متبقي</span>
                            <span className="text-white font-bold">{getTimeRemaining()}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Status Message */}
                    <p className="text-[10px] text-zinc-500 truncate">{uploadProgress.status}</p>
                  </div>
                )}
              </div>

              {/* Storage Mode */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs text-zinc-400">وضع التخزين</span>
                </div>
                <span className="text-xs text-zinc-300">
                  {uploading ? 'Cloud R2' : status.synology ? 'NAS + Cloud' : 'محلي'}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10 my-2"></div>

              {/* NAS Root Path */}
              <div className="p-2 rounded-lg bg-zinc-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-400">مسار NAS</span>
                </div>
                <code className="block text-[10px] text-blue-400 font-mono truncate">
                  {status.nasRootPath || '/Volumes/VillaHadad'}
                </code>
              </div>

              {/* App Folder Path */}
              <div className="p-2 rounded-lg bg-zinc-800/30">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] text-zinc-400">مجلد التطبيق</span>
                  </div>
                  {status.appFolderPath && (
                    <button
                      onClick={handleOpenFolder}
                      className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-[9px] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      فتح
                    </button>
                  )}
                </div>
                <code className="block text-[10px] text-emerald-400 font-mono truncate">
                  {status.appFolderPath || 'غير محدد'}
                </code>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NetworkStatusWidget;
