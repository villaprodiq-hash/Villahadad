/**
 * NASStatusIndicator
 * 
 * Shows NAS connection status in the header/sidebar
 * Displays: Connected (green), Offline/Local Cache (orange), Error (red)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardDrive,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Server,
} from 'lucide-react';
import { useNASStatus } from '../../hooks/useNASStatus';

interface NASStatusIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

export const NASStatusIndicator: React.FC<NASStatusIndicatorProps> = ({
  compact = false,
  showDetails = false,
  className = '',
}) => {
  const { 
    connected, 
    loading, 
    error, 
    isLocalCache,
    pendingSync,
    appFolderPath,
    refresh,
    openAppFolder,
    mountNas,
    detectNas,
  } = useNASStatus();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounting, setIsMounting] = useState(false);
  const [mountMessage, setMountMessage] = useState<string | null>(null);
  const [detectAttempts, setDetectAttempts] = useState<string[]>([]);
  const [showDetectDetails, setShowDetectDetails] = useState(false);
  
  // R2 Status
  const [r2Status, setR2Status] = useState<{
    enabled: boolean;
    bucket: string | null;
    hasCredentials: boolean;
    lastError?: string | null;
    diagnostics?: {
      awsSdkAvailable: boolean;
      envKeyIdExists: boolean;
      envKeyIdLength: number;
      envSecretExists: boolean;
      envSecretLength: number;
      envBucketExists: boolean;
      envPublicUrlExists: boolean;
      keyIdPrefix: string | null;
    };
  } | null>(null);
  const [isCheckingR2, setIsCheckingR2] = useState(false);

  const checkR2Status = async () => {
    setIsCheckingR2(true);
    try {
      const status = await window.electronAPI?.sessionLifecycle?.getR2Status?.();
      console.log('[R2 Diagnostic]', status);
      setR2Status(
        status
          ? {
              enabled: Boolean(status.enabled),
              bucket: status.bucket ?? null,
              hasCredentials: Boolean(status.enabled && status.bucket),
              lastError: status.lastError ?? null,
            }
          : { enabled: false, bucket: null, hasCredentials: false }
      );
    } catch (err) {
      console.error('[R2 Diagnostic] Failed:', err);
      setR2Status({ enabled: false, bucket: null, hasCredentials: false });
    } finally {
      setIsCheckingR2(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleOpenFolder = async () => {
    await openAppFolder();
  };

  const handleMount = async () => {
    setIsMounting(true);
    setMountMessage(null);
    const result = await mountNas();
    setIsMounting(false);
    if (result?.success) {
      setMountMessage(result.path ? 'تم الاتصال وفتح المسار بنجاح' : 'تم فتح نافذة Finder. اختر Gallery واضغط Connect');
    } else {
      setMountMessage(`فشل الاتصال: ${result?.error ?? 'Unknown error'}`);
    }
    setTimeout(() => setMountMessage(null), 5000);
  };

  const handleDetect = async () => {
    setIsMounting(true);
    setDetectAttempts([]);
    const result = await detectNas();
    setDetectAttempts(result?.attempts ?? []);
    setShowDetectDetails(true);
    setIsMounting(false);
  };

  // Determine status
  const getStatusInfo = () => {
    if (loading) {
      return {
        icon: Loader2,
        color: 'text-gray-400',
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/20',
        dot: 'bg-gray-400',
        label: 'جاري الفحص...',
        labelEn: 'Checking...',
      };
    }

    if (error) {
      return {
        icon: AlertCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        dot: 'bg-red-500',
        label: 'خطأ في الاتصال',
        labelEn: 'Connection Error',
      };
    }

    if (connected && !isLocalCache) {
      return {
        icon: Cloud,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        dot: 'bg-green-500',
        label: 'NAS متصل',
        labelEn: 'NAS Connected',
      };
    }

    return {
      icon: CloudOff,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      dot: 'bg-orange-500',
      label: 'وضع Offline',
      labelEn: 'Offline Mode',
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Compact version (just dot + icon)
  if (compact) {
    return (
      <div 
        className={`flex items-center gap-1.5 cursor-pointer ${className}`}
        onClick={handleRefresh}
        title={`${statusInfo.label} - انقر للتحديث`}
      >
        <span className={`w-2 h-2 rounded-full ${statusInfo.dot} ${connected ? 'animate-pulse' : ''}`} />
        <StatusIcon 
          size={16} 
          className={`${statusInfo.color} ${loading || isRefreshing ? 'animate-spin' : ''}`} 
        />
      </div>
    );
  }

  // Full version with expandable details
  return (
    <div className={`relative ${className}`}>
      {/* Main Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full 
          ${statusInfo.bg} ${statusInfo.border} border
          hover:opacity-90 transition-all duration-200
        `}
      >
        {/* Status Dot */}
        <span className={`w-2 h-2 rounded-full ${statusInfo.dot} ${connected ? 'animate-pulse' : ''}`} />
        
        {/* Icon */}
        <StatusIcon 
          size={16} 
          className={`${statusInfo.color} ${loading ? 'animate-spin' : ''}`} 
        />
        
        {/* Label */}
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>

        {/* Pending Sync Badge */}
        {pendingSync > 0 && (
          <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full border border-orange-500/30">
            {pendingSync}
          </span>
        )}

        {/* Expand Arrow */}
        {showDetails && (
          <ChevronDown 
            size={14} 
            className={`${statusInfo.color} transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          />
        )}
      </button>

      {/* Expanded Details Panel */}
      <AnimatePresence>
        {isExpanded && showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-72 bg-[#1a1c22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className={`px-4 py-3 ${statusInfo.bg} border-b border-white/5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon size={18} className={statusInfo.color} />
                  <span className={`font-bold ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefresh();
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="تحديث"
                >
                  <RefreshCw 
                    size={14} 
                    className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                  />
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3 text-sm">
              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">الحالة</span>
                <span className={`flex items-center gap-1.5 ${statusInfo.color}`}>
                  {connected ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>متصل</span>
                    </>
                  ) : (
                    <>
                      <WifiOff size={14} />
                      <span>غير متصل</span>
                    </>
                  )}
                </span>
              </div>

              {/* Storage Location */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">التخزين</span>
                <span className="text-white text-xs truncate max-w-[150px]" title={appFolderPath || ''}>
                  {isLocalCache ? 'ذاكرة محلية' : 'Synology NAS'}
                </span>
              </div>

              {/* Path */}
              {appFolderPath && (
                <div className="pt-2 border-t border-white/5">
                  <p className="text-gray-500 text-xs mb-1">المسار:</p>
                  <code className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded block truncate" title={appFolderPath}>
                    {appFolderPath}
                  </code>
                </div>
              )}

              {/* Pending Sync */}
              {pendingSync > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-orange-400 text-xs">في انتظار المزامنة</span>
                  <span className="text-orange-400 font-bold">{pendingSync} ملف</span>
                </div>
              )}

              {/* 🔌 Connect NAS Button - Show when offline */}
              {!connected && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <button
                    onClick={handleMount}
                    disabled={isMounting}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isMounting ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                    <span>توصيل NAS</span>
                  </button>
                  
                  <button
                    onClick={handleDetect}
                    disabled={isMounting}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl transition-colors disabled:opacity-50 text-xs"
                  >
                    <HardDrive size={14} />
                    <span>فحص تلقائي للـ NAS</span>
                  </button>

                  {mountMessage && (
                    <p className={`text-xs text-center ${mountMessage.includes('فشل') ? 'text-red-400' : 'text-green-400'}`}>
                      {mountMessage}
                    </p>
                  )}

                  {showDetectDetails && detectAttempts.length > 0 && (
                    <div className="bg-black/30 rounded-lg p-2 text-[10px] font-mono">
                      <p className="text-gray-500 mb-1">نتائج الفحص:</p>
                      {detectAttempts.map((attempt, i) => (
                        <p key={i} className={attempt.includes('✅') ? 'text-green-400' : attempt.includes('❌') ? 'text-red-400' : 'text-gray-400'}>
                          {attempt}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* R2 Status Check Button */}
              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={checkR2Status}
                  disabled={isCheckingR2}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isCheckingR2 ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
                  <span>فحص حالة R2 (Cloud)</span>
                </button>
                
                {r2Status && (
                  <div className="mt-2 bg-black/30 rounded-lg p-2 text-[10px] font-mono">
                    <p className="text-gray-500 mb-1">حالة R2:</p>
                    <p className={r2Status.enabled ? 'text-green-400' : 'text-red-400'}>
                      {r2Status.enabled ? '✅ R2 مفعّل' : '❌ R2 معطّل'}
                    </p>
                    {r2Status.diagnostics && (
                      <div className="mt-1 space-y-0.5 text-gray-400">
                        <p>AWS SDK: {r2Status.diagnostics.awsSdkAvailable ? '✅' : '❌'}</p>
                        <p>Access Key: {r2Status.diagnostics.envKeyIdExists ? `✅ (${r2Status.diagnostics.envKeyIdLength} chars)` : '❌'}</p>
                        <p>Secret Key: {r2Status.diagnostics.envSecretExists ? `✅ (${r2Status.diagnostics.envSecretLength} chars)` : '❌'}</p>
                        <p>Bucket: {r2Status.diagnostics.envBucketExists ? '✅' : '❌'}</p>
                        {r2Status.diagnostics.keyIdPrefix && (
                          <p>Key Prefix: {r2Status.diagnostics.keyIdPrefix}</p>
                        )}
                      </div>
                    )}
                    {r2Status.lastError && (
                      <p className="text-amber-400 mt-1 wrap-break-word">Last Error: {r2Status.lastError}</p>
                    )}
                    {!r2Status.enabled && !r2Status.diagnostics?.envKeyIdExists && (
                      <p className="text-orange-400 mt-1">⚠️ ملف .env.local غير موجود أو غير صحيح</p>
                    )}
                  </div>
                )}
              </div>

              {/* Open Folder Button */}
              <button
                onClick={handleOpenFolder}
                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 transition-colors"
              >
                <FolderOpen size={16} />
                <span>فتح المجلد في Finder</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default NASStatusIndicator;
